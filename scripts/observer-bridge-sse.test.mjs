import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createObserverBridgeServer } from "./observer-bridge.mjs";

const upstream = createServer((request, response) => {
  response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
  response.write("data: synthetic-initial-state\n\n");
  response.on("close", () => { if (!response.writableEnded) upstreamDisconnected = true; });
});
let upstreamDisconnected = false;
let upstreamRequests = 0;
upstream.on("request", () => { upstreamRequests += 1; });
upstream.listen(0, "127.0.0.1");
await once(upstream, "listening");
const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
const bridge = createObserverBridgeServer({
  upstreamOrigin: upstreamUrl,
  streamMaxMs: 10000,
  verifyObserverToken: async authorization => authorization === "Bearer synthetic-approved-token",
});
bridge.listen(0, "127.0.0.1");
await once(bridge, "listening");
const bridgeUrl = `http://127.0.0.1:${bridge.address().port}`;

try {
  const rejected = await fetch(`${bridgeUrl}/api/live`, { headers: { authorization: "Bearer synthetic-unapproved-token" } });
  assert.equal(rejected.status, 401, "unapproved synthetic identity is rejected before upstream access");
  assert.equal(upstreamRequests, 0, "rejected identity never opens an upstream SSE connection");

  const controller = new AbortController();
  const accepted = await fetch(`${bridgeUrl}/api/live`, { headers: { authorization: "Bearer synthetic-approved-token" }, signal: controller.signal });
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers.get("content-type") ?? "", /^text\/event-stream/);
  assert.equal(accepted.headers.get("cache-control"), "no-cache");
  const reader = accepted.body.getReader();
  const firstChunk = await reader.read();
  assert.match(new TextDecoder().decode(firstChunk.value), /synthetic-initial-state/);
  controller.abort();
  await assert.rejects(() => reader.read(), error => error?.name === "AbortError");

  const deadline = Date.now() + 2000;
  while (!upstreamDisconnected && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(upstreamDisconnected, true, "client disconnect aborts and closes the upstream SSE request");
  assert.equal(upstreamRequests, 1, "only the approved identity reaches the upstream");
  console.log("Observer bridge authenticated SSE lifecycle checks passed");
} finally {
  bridge.closeAllConnections?.();
  upstream.closeAllConnections?.();
  await Promise.all([new Promise(resolve => bridge.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
}

