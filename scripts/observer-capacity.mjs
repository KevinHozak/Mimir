import { setTimeout as delay } from "node:timers/promises";
import { runBoundedRehearsal, validateRehearsalLimits } from "./observer-rehearsal.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const finite = value => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Operator-provided conservative quantities and rates, never a free-tier assumption.
 * All five cost scopes are mandatory, including fixed allocation and ancillary costs.
 */
export function checkCost(cost) {
  const scopes = ["bridge", "vm", "storage", "network", "logging"];
  const known = cost?.currency === "USD" && finite(cost.budgetUsd) && cost.budgetUsd > 0
    && cost.pricingVerified === true && typeof cost.rateSource === "string" && cost.rateSource.length > 0
    && Number.isFinite(Date.parse(cost.ratesCheckedAt)) && Number.isFinite(Date.parse(cost.windowStartedAt))
    && Date.parse(cost.ratesCheckedAt) <= Date.parse(cost.windowStartedAt)
    && Date.parse(cost.windowStartedAt) - Date.parse(cost.ratesCheckedAt) <= 86400000
    && Array.isArray(cost.components) && cost.components.length > 0
    && scopes.every(scope => cost.components.some(c => c.scope === scope))
    && cost.components.every(c => scopes.includes(c.scope) && finite(c.quantityUpperBound) && finite(c.usdPerUnit)
      && typeof c.unit === "string" && c.unit.length > 0 && c.boundsVerified === true);
  const estimatedUpperBoundUsd = known ? cost.components.reduce((sum, c) => sum + c.quantityUpperBound * c.usdPerUnit, 0) : null;
  const withinBudget = known && finite(estimatedUpperBoundUsd) && estimatedUpperBoundUsd <= cost.budgetUsd;
  const billing = cost?.billing;
  const billingComplete = billing?.status === "final" && billing.scope === "whole-window"
    && billing.currency === "USD" && finite(billing.attributableUsd);
  return { known: !!known, estimatedUpperBoundUsd, withinBudget: !!withinBudget,
    billingStatus: billingComplete ? "final" : "pending-or-unavailable",
    attributableUsd: billingComplete ? billing.attributableUsd : null,
    actualWithinBudget: billingComplete && finite(cost?.budgetUsd) && billing.attributableUsd <= cost.budgetUsd };
}

/** Extra vCPU-seconds for the verified 1-to-2 vCPU startup boost, including its ten-second tail. */
export function startupBoostCpuSeconds({ enabled, startups, totalStartupLatencyMs }) {
  if (typeof enabled !== "boolean") throw new Error("Startup boost configuration missing");
  if (!enabled) return 0;
  if (!Number.isInteger(startups) || startups < 0 || !finite(totalStartupLatencyMs)) throw new Error("Startup usage missing");
  return Math.ceil(totalStartupLatencyMs / 1000 + 10 * startups);
}

/** Conservative 600-second repair/run/rollback allocation. Caller verifies live inventory and rates. */
export function capacityCostBound({ checkedAt, inventoryVerified, ratesVerified, priorAttemptUpperBoundUsd, priorAttemptsVerified }) {
  const component = (scope, unit, quantityUpperBound, usdPerUnit) => ({ scope, unit, quantityUpperBound, usdPerUnit, boundsVerified: inventoryVerified === true });
  return { currency: "USD", budgetUsd: 0.10, pricingVerified: ratesVerified === true && priorAttemptsVerified === true && finite(priorAttemptUpperBoundUsd),
    rateSource: "Google Cloud public USD us-central1 on-demand tables; no discounts", ratesCheckedAt: checkedAt, windowStartedAt: checkedAt,
    components: [
      component("bridge", "prior-attempt-allocated-USD", priorAttemptUpperBoundUsd, 1),
      component("bridge", "vCPU-second", 3 * 600, 0.000024),
      component("bridge", "GiB-second", 3 * 0.5 * 600, 0.0000025),
      component("bridge", "request", 1000, 0.40 / 1000000),
      component("vm", "e2-micro-hour", 600 / 3600, 0.008376428),
      component("storage", "pd-standard-GiB-month", 30 * 600 / (672 * 3600), 0.04),
      component("storage", "standard-GiB-hour", 100 * 600 / 3600, 0.000027397),
      component("storage", "class-A-operation", 20, 0.005 / 1000),
      component("network", "outbound-GiB", 48 / 1024, 0.23),
      component("logging", "ingested-GiB", 8 / 1024, 0.50),
    ], billing: { status: "pending" } };
}

/** Consume sanitized measurements only. Missing, delayed or incomplete evidence fails closed. */
export function evaluateCapacityEvidence(evidence) {
  const e = evidence ?? {}, run = e.run ?? {}, cost = checkCost(e.cost), blockers = [];
  const require = (condition, label) => { if (!condition) blockers.push(label); };
  require(e.schemaVersion === 1 && e.environment === "hosted" && e.approved === true, "approved hosted evidence missing");
  require(finite(e.startedAt) && finite(e.finishedAt) && e.finishedAt >= e.startedAt
    && e.finishedAt - e.startedAt <= 180000, "overall window invalid");
  require(run.maxSessions === 2 && run.peakClients === 2 && run.totalRequests === 2
    && finite(run.fullCapacityMs) && run.fullCapacityMs >= 90000 && run.fullCapacityMs <= 165000
    && finite(run.durationMs) && run.durationMs <= 165000 && run.durationMs >= run.fullCapacityMs
    && run.totalErrors === 0 && run.abortedDueToThreshold === false && run.callbackFailed === false
    && run.activeClientsAtClose === 0 && run.statusCounts?.[200] === 2 && finite(run.receivedBytes)
    && run.receivedBytes > 0 && Array.isArray(run.clientBytes) && run.clientBytes.length === 2
    && run.clientBytes.every(n => finite(n) && n > 0), "two-observer steady capacity not verified");
  const telemetry = e.telemetry ?? {};
  const samples = telemetry.samples ?? [];
  const sessions = new Set(), latest = new Map();
  let lastAt = -1, maxGap = 0, maxRequests = 0, maxStreams = 0, valid = Array.isArray(samples) && samples.length > 0;
  if (Array.isArray(samples)) for (const sample of samples) {
    if (!finite(sample.elapsedMs) || sample.elapsedMs < lastAt || sample.elapsedMs > 180000 || !Array.isArray(sample.processes)) { valid = false; continue; }
    maxGap = Math.max(maxGap, sample.elapsedMs - Math.max(0, lastAt)); lastAt = sample.elapsedMs;
    const seen = new Set(); let requests = 0, streams = 0;
    for (const p of sample.processes) {
      const key = `${p.revision}/${p.processSession}`;
      if (typeof p.revision !== "string" || !p.revision || typeof p.processSession !== "string" || !p.processSession
        || seen.has(key) || !Number.isInteger(p.activeRequests) || p.activeRequests < 0
        || !Number.isInteger(p.activeUpstreamStreams) || p.activeUpstreamStreams < 0
        || p.activeUpstreamStreams > p.activeRequests || p.direct !== true) valid = false;
      seen.add(key); sessions.add(key); latest.set(key, p);
      requests += p.activeRequests; streams += p.activeUpstreamStreams;
    }
    // Every previously observed process must remain accounted for, not disappear.
    if ([...sessions].some(key => !seen.has(key))) valid = false;
    maxRequests = Math.max(maxRequests, requests); maxStreams = Math.max(maxStreams, streams);
  }
  require(valid && telemetry.complete === true && telemetry.clockCalibrated === true && maxGap <= 15000
    && lastAt >= run.durationMs && samples[0]?.elapsedMs <= 10000
    && maxRequests === 2 && maxStreams === 2, "continuous direct process accounting missing or over cap");
  require(latest.size > 0 && [...latest.values()].every(p => p.activeRequests === 0 && p.activeUpstreamStreams === 0)
    && e.cleanup?.upstreamSockets === 0 && e.cleanup?.clients === 0 && e.cleanup?.ownedResourcesAbsent === true
    && finite(e.cleanup?.elapsedMs) && e.cleanup.elapsedMs >= run.durationMs && e.cleanup.elapsedMs <= 180000
    && lastAt <= e.cleanup.elapsedMs, "final-zero or socket/resource cleanup missing");
  const metrics = e.metrics ?? {};
  require(metrics.complete === true && metrics.aggregation === "max" && metrics.coversWholeWindow === true
    && ["bridgeCpu", "bridgeMemory", "vmCpu", "vmMemory"].every(k => finite(metrics[k]) && metrics[k] <= 0.8)
    && metrics.maxInstances === 1, "whole-window resource headroom unavailable or exceeded");
  require(e.recovery?.integrity === true && e.recovery?.singleWriter === true && e.recovery?.paused === true
    && e.recovery?.pulse === 64 && e.recovery?.historyUnchanged === true && e.recovery?.backupsHealthy === true
    && e.recovery?.configurationUnchanged === true, "recovery invariants unverified");
  require(cost.withinBudget && finite(e.startedAt) && Math.abs(Date.parse(e.cost?.windowStartedAt) - e.startedAt) <= 1000, "conservative cost envelope missing, stale or over budget");
  // Runtime gates can pass while billing is still delayed. This is never expansion approval.
  require(cost.known && e.cost.components.every(c => finite(c.measuredQuantity) && c.measuredQuantity <= c.quantityUpperBound), "measured usage missing or exceeds cost bounds");
  const rehearsalPassed = blockers.length === 0;
  const decisionBlockers = [...blockers];
  if (!cost.actualWithinBudget) decisionBlockers.push("complete attributable billing missing or over budget");
  return { schemaVersion: 1, rehearsalPassed, blockers, cost,
    measured: { peakRequests: maxRequests, peakStreams: maxStreams, observedProcesses: sessions.size, fullCapacityMs: finite(run.fullCapacityMs) ? run.fullCapacityMs : null },
    decisionReady: decisionBlockers.length === 0, decisionBlockers, expansionAuthorized: false };
}

/** Read-only measurement adapters must honor AbortSignal. No cloud mutation adapter exists.
 * Preparation supplies approved limits/rates and fresh adapters; missing probes stop clients.
 */
export async function runCapacityChecks({ approved, targetOrigin, token, cost, sampleProcesses, finalChecks,
  windowMs = 120000, sampleIntervalMs = 5000, overallMs = 180000 }) {
  validateRehearsalLimits({ maxSessions: 2, windowMs, rampDelayMs: Math.min(200, windowMs / 10), maxErrorThreshold: 0 });
  if (approved !== true || !checkCost(cost).withinBudget || typeof sampleProcesses !== "function" || typeof finalChecks !== "function"
    || !finite(sampleIntervalMs) || sampleIntervalMs < 10 || sampleIntervalMs > 10000
    || !finite(overallMs) || overallMs > 180000 || overallMs <= windowMs) throw new Error("Capacity preflight incomplete");
  const startedAt = Date.now(), started = performance.now(), abort = new AbortController();
  cost = { ...cost, windowStartedAt: new Date(startedAt).toISOString() };
  if (!checkCost(cost).withinBudget) throw new Error("Pricing is not fresh for this run");
  let done = false, complete = true;
  const samples = [], elapsed = () => performance.now() - started;
  const bounded = async operation => {
    const remaining = Math.floor(Math.min(5000, overallMs - elapsed()));
    if (remaining <= 0) throw new Error("Overall deadline");
    const signal = AbortSignal.timeout(remaining);
    let timeout;
    try {
      return await Promise.race([operation(signal), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Measurement deadline")), remaining); })]);
    } finally { clearTimeout(timeout); }
  };
  const sample = async () => {
    const processes = await bounded(signal => sampleProcesses(signal));
    if (!Array.isArray(processes) || !processes.length || processes.some(p => !Number.isInteger(p.activeRequests) || p.activeRequests < 0 || !Number.isInteger(p.activeUpstreamStreams) || p.activeUpstreamStreams < 0 || p.direct !== true)
      || processes.reduce((n,p) => n+p.activeRequests,0) > 2 || processes.reduce((n,p) => n+p.activeUpstreamStreams,0) > 2) throw new Error("Unsafe process sample");
    samples.push({ elapsedMs: elapsed(), processes });
  };
  // Acquire a real zero baseline before opening either client.
  await sample();
  if (samples[0].processes.some(p => p.activeRequests !== 0 || p.activeUpstreamStreams !== 0)) throw new Error("Existing observers present");
  const polling = (async () => {
    try { while (!done) { await delay(sampleIntervalMs); if (!done) await sample(); } }
    catch { complete = false; abort.abort(); }
  })();
  let run;
  try { run = await runBoundedRehearsal({ targetOrigin, token, windowMs, rampDelayMs: Math.min(200, windowMs / 10), signal: abort.signal }); }
  finally { done = true; await polling; }
  let final = {};
  try {
    do { await sample(); if (samples.at(-1).processes.every(p => p.activeRequests === 0 && p.activeUpstreamStreams === 0)) break; await delay(100); } while (elapsed() < overallMs - 5000);
    final = await bounded(signal => finalChecks(signal));
  } catch { complete = false; }
  cost = { ...cost, components: cost.components.map((c, i) => ({ ...c, measuredQuantity: final.measuredQuantities?.[i] ?? null })), billing: final.billing ?? { status: "pending" } };
  const evidence = { schemaVersion: 1, environment: new URL(targetOrigin).protocol === "https:" ? "hosted" : "loopback", approved, startedAt, finishedAt: Date.now(), run,
    telemetry: { samples, complete, clockCalibrated: final.clockCalibrated === true },
    cleanup: { ...final.cleanup, elapsedMs: elapsed() }, metrics: final.metrics, recovery: final.recovery, cost };
  return { evidence, result: evaluateCapacityEvidence(evidence) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, output] = process.argv.slice(2);
    if (!input || !output || resolve(input) === resolve(output)) throw new Error("Expected distinct input/output paths");
    const result = evaluateCapacityEvidence(JSON.parse(await readFile(input, "utf8")));
    await writeFile(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ rehearsalPassed: result.rehearsalPassed, decisionReady: result.decisionReady, expansionAuthorized: false }));
    if (!result.rehearsalPassed) process.exitCode = 1;
  } catch { console.error("Capacity evidence unavailable or invalid; no approval recorded"); process.exitCode = 1; }
}
