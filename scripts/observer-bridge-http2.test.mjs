import assert from "node:assert/strict";
import { createServer } from "node:http";
import { connect, constants } from "node:http2";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createObserverBridgeServer } from "./observer-bridge.mjs";

let upstreamActive = 0;
const upstream = createServer((request, response) => {
  upstreamActive += 1;
  response.once("close", () => { upstreamActive -= 1; });
  response.writeHead(200, { "content-type": "text/event-stream" });
  response.write("data: synthetic\n\n");
});
upstream.listen(0, "127.0.0.1");
await once(upstream, "listening");
const records = [];
const bridge = createObserverBridgeServer({
  upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`,
  http2: true,
  verifyObserverToken: async token => token === "Bearer synthetic-approved",
  onStreamTelemetry: record => records.push(record),
});
bridge.listen(0, "127.0.0.1");
await once(bridge, "listening");
const session = connect(`http://127.0.0.1:${bridge.address().port}`);
try {
  const rejected = session.request({ ":path": "/api/live" });
  assert.equal((await once(rejected, "response"))[0][":status"], 401);
  rejected.resume();
  await once(rejected, "end");
  assert.equal(upstreamActive, 0);
  const accepted = session.request({ ":path": "/api/live", authorization: "Bearer synthetic-approved" });
  assert.equal((await once(accepted, "response"))[0][":status"], 200);
  assert.match(String((await once(accepted, "data"))[0]), /synthetic/);
  assert.equal(bridge.observerStreamSnapshot().activeUpstreamStreams, 1);
  accepted.close(constants.NGHTTP2_CANCEL);
  const deadline = Date.now() + 2000;
  while ((upstreamActive || bridge.observerStreamSnapshot().activeRequests) && Date.now() < deadline) await delay(10);
  assert.equal(upstreamActive, 0, "HTTP/2 cancellation closes the upstream response");
  assert.equal(bridge.observerStreamSnapshot().activeRequests, 0);
  assert.equal(bridge.observerStreamSnapshot().activeUpstreamStreams, 0);
  assert.equal(records.at(-1).reason, "client-close");
  assert.doesNotMatch(JSON.stringify(records), /synthetic-approved/);
  console.log("Observer HTTP/2 cancellation and authenticated upstream cleanup passed");
} finally {
  session.destroy();
  upstream.closeAllConnections();
  await Promise.all([new Promise(resolve => bridge.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
}
