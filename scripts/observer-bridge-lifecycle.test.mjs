import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createObserverBridgeServer } from "./observer-bridge.mjs";

async function until(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate() && Date.now() < deadline) await delay(10);
  assert.ok(predicate(), "lifecycle reached expected state within two seconds");
}

async function scenario(mode, action, streamMaxMs = 10000) {
  let upstreamActive = 0;
  const records = [];
  const upstream = createServer((request, response) => {
    upstreamActive += 1;
    response.once("close", () => { upstreamActive -= 1; });
    if (mode === "rejected") return response.writeHead(503).end("unavailable");
    if (mode === "pending") return;
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write("data: synthetic\n\n");
    if (mode === "complete") response.end();
    if (mode === "failure") setTimeout(() => response.destroy(), 50);
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const bridge = createObserverBridgeServer({
    upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`,
    streamMaxMs,
    verifyObserverToken: async token => token === "Bearer private-synthetic-token",
    onStreamTelemetry: record => { records.push(record); },
  });
  bridge.listen(0, "127.0.0.1");
  await once(bridge, "listening");
  const connect = (signal, method = "GET", token = "Bearer private-synthetic-token") => fetch(`http://127.0.0.1:${bridge.address().port}/api/live`, { method, signal, headers: { authorization: token } });
  const counts = () => [bridge.observerStreamSnapshot().activeRequests, bridge.observerStreamSnapshot().activeUpstreamStreams];
  try {
    assert.deepEqual(counts(), [0, 0]);
    await action({ connect, counts, records, upstreamCount: () => upstreamActive });
    await until(() => counts().every(value => value === 0) && upstreamActive === 0);
    assert.ok(records.every(record => record.activeRequests >= 0 && record.activeUpstreamStreams >= 0));
    assert.doesNotMatch(JSON.stringify(records), /private-synthetic-token|authorization|http:|email/i);
    assert.equal(new Set(records.map(record => record.processSession)).size, records.length ? 1 : 0);
  } finally {
    bridge.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => bridge.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
}

await scenario("stream", async ({ connect, counts, records, upstreamCount }) => {
  const rejected = await connect(undefined, "GET", "Bearer unapproved");
  assert.equal(rejected.status, 401);
  assert.deepEqual(counts(), [0, 0]);
  assert.equal(records.length, 0);
  const controllers = [new AbortController(), new AbortController()];
  const responses = await Promise.all(controllers.map(controller => connect(controller.signal)));
  assert.deepEqual(counts(), [2, 2]);
  controllers[0].abort();
  await until(() => counts()[0] === 1 && upstreamCount() === 1);
  assert.deepEqual(counts(), [1, 1]);
  controllers[1].abort();
  await until(() => counts()[0] === 0 && upstreamCount() === 0);
  assert.equal(records.filter(record => record.event === "request-close").length, 2);
  assert.ok(records.filter(record => record.event === "request-close").every(record => record.reason === "client-close"));
  await Promise.all(responses.map(response => response.body.cancel().catch(() => {})));
});

await scenario("stream", async ({ connect, records }) => {
  const response = await connect();
  await assert.rejects(() => response.text());
  await until(() => records.some(record => record.event === "request-close"));
  assert.equal(records.at(-1).reason, "timeout");
}, 150);

await scenario("pending", async ({ connect, counts, upstreamCount, records }) => {
  const controller = new AbortController();
  const pending = connect(controller.signal);
  await until(() => upstreamCount() === 1);
  assert.deepEqual(counts(), [1, 0]);
  controller.abort();
  await assert.rejects(() => pending, error => error.name === "AbortError");
  await until(() => records.some(record => record.event === "request-close"));
  assert.equal(records.at(-1).reason, "client-close");
});

await scenario("complete", async ({ connect, records }) => {
  assert.match(await (await connect()).text(), /synthetic/);
  await until(() => records.some(record => record.event === "request-close"));
  assert.equal(records.at(-1).reason, "completed");
});
await scenario("rejected", async ({ connect, records }) => {
  const response = await connect();
  assert.equal(response.status, 503);
  await response.text();
  await until(() => records.some(record => record.event === "request-close"));
  assert.equal(records.at(-1).reason, "upstream-rejected");
  assert.equal(records.some(record => record.event === "stream-open"), false);
});
await scenario("failure", async ({ connect, records }) => {
  await assert.rejects(async () => (await connect()).text());
  await until(() => records.some(record => record.event === "request-close"));
  assert.equal(records.at(-1).activeUpstreamStreams, 0);
  assert.equal(records.at(-1).reason, "upstream-error");
});
await scenario("complete", async ({ connect, records }) => {
  assert.equal((await connect(undefined, "HEAD")).status, 200);
  assert.equal(records.length, 0, "HEAD requests are not SSE streams");
});
console.log("Observer stream counters and upstream lifecycle regression checks passed");
