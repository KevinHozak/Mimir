import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { once } from "node:events";
import { checkCost, evaluateCapacityEvidence, runCapacityChecks, capacityCostBound } from "./observer-capacity.mjs";
import { runBoundedRehearsal, assertRedacted } from "./observer-rehearsal.mjs";

function fixture() {
  const processes = count => [{ revision: "fixture", processSession: "process", activeRequests: count, activeUpstreamStreams: count, direct: true }];
  return { schemaVersion: 1, environment: "hosted", approved: true, startedAt: Date.parse("2026-10-23T01:00:00Z"), finishedAt: Date.parse("2026-10-23T01:00:00Z") + 130000,
    run: { maxSessions: 2, peakClients: 2, totalRequests: 2, fullCapacityMs: 119000, durationMs: 120010,
      totalErrors: 0, abortedDueToThreshold: false, callbackFailed: false, activeClientsAtClose: 0, statusCounts: { 200: 2 }, receivedBytes: 1000, clientBytes: [500, 500] },
    telemetry: { complete: true, clockCalibrated: true, samples: Array.from({ length: 14 }, (_, i) => ({ elapsedMs: i * 10000, processes: processes(i === 13 ? 0 : 2) })) },
    cleanup: { upstreamSockets: 0, clients: 0, ownedResourcesAbsent: true, elapsedMs: 130000 },
    metrics: { complete: true, aggregation: "max", coversWholeWindow: true, bridgeCpu: 0.2, bridgeMemory: 0.3, vmCpu: 0.2, vmMemory: 0.3, maxInstances: 1 },
    recovery: { integrity: true, singleWriter: true, paused: true, pulse: 64, historyUnchanged: true, backupsHealthy: true, configurationUnchanged: true },
    cost: { currency: "USD", budgetUsd: 0.1, pricingVerified: true, rateSource: "synthetic-test-pricing", ratesCheckedAt: "2026-10-23T00:00:00Z", windowStartedAt: "2026-10-23T01:00:00Z",
      components: ["bridge", "vm", "storage", "network", "logging"].map(scope => ({ scope, quantityUpperBound: 1, measuredQuantity: 0.5, usdPerUnit: 0.001, unit: "synthetic-unit", boundsVerified: true })),
      billing: { status: "pending" } } };
}

test("bounded capacity passes with delayed billing explicitly blocking an expansion decision", () => {
  const e = fixture(), result = evaluateCapacityEvidence(e);
  assert.equal(result.rehearsalPassed, true); assert.equal(result.decisionReady, false);
  assert.equal(result.cost.estimatedUpperBoundUsd, 0.005); assert.equal(result.cost.attributableUsd, null);
  e.cost.billing = { status: "final", scope: "whole-window", currency: "USD", attributableUsd: 0.006 };
  const final = evaluateCapacityEvidence(e); assert.equal(final.decisionReady, true); assert.equal(final.expansionAuthorized, false);
});

test("missing evidence, mean metrics, cap breaches, stale/missing process zeros and late cleanup fail closed", () => {
  for (const mutate of [
    e => { e.approved = false; }, e => { e.environment = "loopback"; }, e => { e.finishedAt = e.startedAt + 180001; },
    e => { e.run.fullCapacityMs = 1000; }, e => { e.run.totalErrors = 1; }, e => { e.run.callbackFailed = true; },
    e => { e.run.receivedBytes = 0; }, e => { e.run.durationMs = 166000; },
    e => { e.telemetry.complete = false; }, e => { e.telemetry.clockCalibrated = false; },
    e => { e.telemetry.samples[2].processes[0].activeRequests = 3; },
    e => { e.telemetry.samples[13].processes = []; }, e => { e.telemetry.samples.splice(5, 3); },
    e => { e.telemetry.samples[13].processes[0].direct = false; },
    e => { e.telemetry.samples[13].processes[0].activeRequests = 1; },
    e => { e.cleanup.upstreamSockets = 1; }, e => { e.cleanup.elapsedMs = 181000; },
    e => { e.metrics.aggregation = "mean"; }, e => { e.metrics.vmMemory = null; },
    e => { e.metrics.maxInstances = 2; }, e => { e.metrics.bridgeCpu = 0.81; },
    e => { e.cost.components[0].measuredQuantity = 2; }, e => { delete e.cost.components[0].measuredQuantity; },
    e => { e.recovery.historyUnchanged = false; }, e => { e.recovery.paused = false; },
  ]) { const e = fixture(); mutate(e); assert.equal(evaluateCapacityEvidence(e).rehearsalPassed, false); }
  assert.equal(evaluateCapacityEvidence({}).rehearsalPassed, false);
});

test("cost never interprets unknown, missing scope, stale pricing, invalid units or incomplete billing as zero", () => {
  for (const mutate of [c => { delete c.components; }, c => { c.components.pop(); },
    c => { c.budgetUsd = 0.001; }, c => { c.pricingVerified = false; },
    c => { c.components[0].quantityUpperBound = -1; }, c => { c.components[0].usdPerUnit = null; },
    c => { c.components[0].unit = ""; }, c => { c.components[0].boundsVerified = false; },
    c => { c.ratesCheckedAt = "2026-10-20T00:00:00Z"; }, c => { c.ratesCheckedAt = "2026-10-24T00:00:00Z"; },
  ]) { const c = fixture().cost; mutate(c); assert.equal(checkCost(c).withinBudget, false); }
  const c = fixture().cost;
  c.billing = { status: "final", scope: "partial-window", currency: "USD", attributableUsd: 0 };
  assert.equal(checkCost(c).billingStatus, "pending-or-unavailable");
  c.billing.scope = "whole-window"; c.billing.attributableUsd = 1;
  const e = fixture(); e.cost = c;
  assert.equal(evaluateCapacityEvidence(e).decisionReady, false);
});

test("unsafe limits and unsafe origins fail before any network request", async () => {
  for (const overrides of [{ maxSessions: 3 }, { maxSessions: 1.5 }, { windowMs: 180001 }, { windowMs: NaN }, { rampDelayMs: -1 }, { maxErrorThreshold: 1 }, { targetOrigin: "http://example.com" }, { targetOrigin: "https://user:pass@example.com" }]) {
    await assert.rejects(runBoundedRehearsal({ targetOrigin: "http://127.0.0.1:1", ...overrides }));
  }
});

test("early EOF, HTML success and redirect all fail; hung headers are cancelled at the absolute deadline", async () => {
  let mode = "eof", active = 0;
  const server = createServer((req, res) => {
    active++; res.once("close", () => active--);
    if (mode === "hang") return;
    if (mode === "redirect") { res.writeHead(302, { location: "/private" }); res.end(); return; }
    res.writeHead(200, { "content-type": mode === "html" ? "text/html" : "text/event-stream" }); res.end("data: fixture\n\n");
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    for (mode of ["eof", "html", "redirect", "hang"]) {
      const result = await runBoundedRehearsal({ targetOrigin: `http://127.0.0.1:${server.address().port}`, maxSessions: 1, windowMs: 150, rampDelayMs: 0 });
      assert.equal(result.activeClientsAtClose, 0); assert.ok(result.durationMs < 2000);
      if (mode !== "hang") assert.equal(result.abortedDueToThreshold, true);
      assert.equal(result.fullCapacityMs >= 90000, false);
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  for (let i = 0; i < 100 && active; i++) await delay(10);
  assert.equal(active, 0);
});

test("credential-bearing diagnostics are rejected without echoing their contents", () => {
  for (const text of ["Bearer " + "x".repeat(32), "ya29." + "x".repeat(30), "eyJabc.eyJdef.signature", "-----BEGIN PRIVATE KEY-----"]) assert.throws(() => assertRedacted(text), /Potential credential/);
  assert.doesNotThrow(() => assertRedacted({ event: "token-refresh", activeClients: 2 }));
});


test("automatic polling stops clients on lost measurement confidence and captures cleanup", async () => {
  let active = 0, probes = 0;
  const server = createServer((req,res) => { active++; res.once("close",()=>active--); res.writeHead(200,{"content-type":"text/event-stream"}); res.write("data: fixture\n\n"); });
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  try {
    const { evidence, result } = await runCapacityChecks({ approved: true, targetOrigin: `http://127.0.0.1:${server.address().port}`, cost: { ...fixture().cost, ratesCheckedAt: new Date().toISOString(), windowStartedAt: new Date().toISOString() },
      windowMs: 500, sampleIntervalMs: 50, overallMs: 2000,
      sampleProcesses: async () => { if (++probes === 3) throw new Error("synthetic missing metric"); return [{ revision:"test",processSession:"p",activeRequests:active,activeUpstreamStreams:active,direct:true }]; },
      finalChecks: async () => ({ ...fixture(), clockCalibrated:true, cleanup:{clients:0,upstreamSockets:active,ownedResourcesAbsent:true} }),
    });
    assert.equal(evidence.run.abortReason,"operator-or-measurement-abort"); assert.equal(evidence.run.activeClientsAtClose,0);
    assert.equal(evidence.telemetry.complete,false); assert.equal(result.rehearsalPassed,false); assert.equal(active,0);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});


test("successful automatic sampling records both clients, drains upstream, and never labels loopback hosted", async () => {
  let active = 0;
  const server = createServer((req,res) => { active++;res.once("close",()=>active--);res.writeHead(200,{"content-type":"text/event-stream"});res.write("data: fixture\n\n"); });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  try {
    const {evidence,result} = await runCapacityChecks({approved:true,targetOrigin:`http://127.0.0.1:${server.address().port}`,
      cost:{...fixture().cost,ratesCheckedAt:new Date().toISOString(),windowStartedAt:new Date().toISOString()},windowMs:300,sampleIntervalMs:50,overallMs:2000,
      sampleProcesses:async()=>[{revision:"test",processSession:"p",activeRequests:active,activeUpstreamStreams:active,direct:true}],
      finalChecks:async()=>({...fixture(),clockCalibrated:true,measuredQuantities:[0.2,0.3,0.1,0.1,0.1],billing:{status:"pending"},cleanup:{clients:0,upstreamSockets:active,ownedResourcesAbsent:true}}),
    });
    assert.equal(evidence.environment,"loopback");assert.equal(evidence.telemetry.complete,true);assert.equal(evidence.run.peakClients,2);
    assert.equal(evidence.cleanup.upstreamSockets,0);assert.equal(evidence.cost.components[1].measuredQuantity,0.3);
    assert.equal(result.rehearsalPassed,false);assert.equal(result.expansionAuthorized,false);
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});


test("the fixed conservative allocation stays below ten cents and requires verified live inventory/rates",()=>{
  const cost=capacityCostBound({checkedAt:new Date().toISOString(),inventoryVerified:true,ratesVerified:true,priorAttemptsVerified:true,priorAttemptUpperBoundUsd:0});
  const result=checkCost(cost);assert.equal(result.withinBudget,true);assert.ok(result.estimatedUpperBoundUsd>0.06&&result.estimatedUpperBoundUsd<0.10);
  assert.equal(checkCost(capacityCostBound({checkedAt:new Date().toISOString(),inventoryVerified:false,ratesVerified:true})).withinBudget,false);
  assert.equal(cost.components[1].quantityUpperBound,1800);assert.equal(cost.billing.status,"pending");
});


test("host-side measurement abort closes browser clients before the normal run deadline",async()=>{
 const {watchCapacityBrowser}=await import("./observer-capacity-browser.mjs");let closed=false,saved=false;
 await watchCapacityBrowser({readAbort:async()=>true,state:async()=>({closed,deadline:Date.now()+120000}),close:async()=>{closed=true;},save:async value=>{saved=value.closed;},pause:async()=>assert.fail("abort must not wait")});
 assert.equal(closed,true);assert.equal(saved,true);
});


test("retry allocation includes earlier attempts and refuses unknown or exhausted headroom",()=>{
 const input={checkedAt:new Date().toISOString(),inventoryVerified:true,ratesVerified:true};
 assert.equal(checkCost(capacityCostBound(input)).withinBudget,false);
 assert.equal(checkCost(capacityCostBound({...input,priorAttemptsVerified:true,priorAttemptUpperBoundUsd:0.04})).withinBudget,false);
 const bounded=checkCost(capacityCostBound({...input,priorAttemptsVerified:true,priorAttemptUpperBoundUsd:0.03}));
 assert.equal(bounded.withinBudget,true);assert.ok(bounded.estimatedUpperBoundUsd>0.09);
});


test("startup boost cannot be omitted when configuration or measured startup usage is unknown",async()=>{
 const {startupBoostCpuSeconds}=await import("./observer-capacity.mjs");
 assert.throws(()=>startupBoostCpuSeconds({}));assert.throws(()=>startupBoostCpuSeconds({enabled:true}));
 assert.equal(startupBoostCpuSeconds({enabled:false}),0);
 assert.equal(startupBoostCpuSeconds({enabled:true,startups:4,totalStartupLatencyMs:3257.842}),44);
 assert.equal(startupBoostCpuSeconds({enabled:true,startups:2,totalStartupLatencyMs:1958.538}),22);
});
