import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createObserverBridgeServer } from "./observer-bridge.mjs";
import { runBoundedRehearsal, assertRedacted } from "./observer-rehearsal.mjs";

async function until(predicate, maxWaitMs = 2000) {
  const deadline = Date.now() + maxWaitMs;
  while (!predicate() && Date.now() < deadline) await delay(10);
  assert.ok(predicate(), `condition reached within ${maxWaitMs} ms`);
}

// Scenario 1: Clean rehearsal with 2 concurrent synthetic clients and window expiration
{
  let upstreamActive = 0;
  const upstream = createServer((req, res) => {
    upstreamActive += 1;
    res.once("close", () => { upstreamActive -= 1; });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write("data: pulse-0\n\n");
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");

  const telemetryRecords = [];
  const bridge = createObserverBridgeServer({
    upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`,
    verifyObserverToken: async token => token === "Bearer approved-synthetic-identity",
    onStreamTelemetry: record => telemetryRecords.push(record),
  });
  bridge.listen(0, "127.0.0.1");
  await once(bridge, "listening");

  try {
    const summary = await runBoundedRehearsal({
      targetOrigin: `http://127.0.0.1:${bridge.address().port}`,
      token: "Bearer approved-synthetic-identity",
      maxSessions: 2,
      windowMs: 500, // bounded short test window
      rampDelayMs: 50,
      maxErrorThreshold: 0,
      onTelemetry: record => {
        assertRedacted(record);
      },
    });

    assert.equal(summary.maxSessions, 2);
    assert.equal(summary.totalRequests, 2);
    assert.equal(summary.totalErrors, 0);
    assert.equal(summary.statusCounts[200], 2);
    assert.equal(summary.abortedDueToThreshold, false);
    assert.equal(summary.activeClientsAtClose, 0);

    // Wait for bridge and upstream cleanup
    await until(() => {
      const snap = bridge.observerStreamSnapshot();
      return snap.activeRequests === 0 && snap.activeUpstreamStreams === 0 && upstreamActive === 0;
    });

    assert.equal(bridge.observerStreamSnapshot().activeRequests, 0);
    assert.equal(bridge.observerStreamSnapshot().activeUpstreamStreams, 0);
    assert.equal(upstreamActive, 0);
  } finally {
    bridge.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise(res => bridge.close(res)),
      new Promise(res => upstream.close(res)),
    ]);
  }
}

// Scenario 2: Immediate stop threshold on auth failure
{
  let upstreamActive = 0;
  const upstream = createServer((req, res) => {
    upstreamActive += 1;
    res.once("close", () => { upstreamActive -= 1; });
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write("data: pulse-0\n\n");
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");

  const bridge = createObserverBridgeServer({
    upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`,
    verifyObserverToken: async token => token === "Bearer valid-token",
  });
  bridge.listen(0, "127.0.0.1");
  await once(bridge, "listening");

  try {
    const summary = await runBoundedRehearsal({
      targetOrigin: `http://127.0.0.1:${bridge.address().port}`,
      token: "Bearer invalid-or-unapproved-identity",
      maxSessions: 2,
      windowMs: 5000,
      maxErrorThreshold: 0, // Stop immediately on 1st error
    });

    assert.equal(summary.abortedDueToThreshold, true);
    assert.match(summary.abortReason, /error-threshold-exceeded: status 401/);
    assert.equal(summary.totalErrors, 1);
    assert.equal(summary.activeClientsAtClose, 0);

    await until(() => bridge.observerStreamSnapshot().activeRequests === 0);
    assert.equal(bridge.observerStreamSnapshot().activeRequests, 0);
    assert.equal(upstreamActive, 0);
  } finally {
    bridge.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise(res => bridge.close(res)),
      new Promise(res => upstream.close(res)),
    ]);
  }
}

console.log("Observer rehearsal harness and stop threshold tests passed");
