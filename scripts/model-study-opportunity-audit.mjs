import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalize } from "@mimir/world-data";
import { createFirstGlowReflectionCapacityState, firstGlowReflectionCadence, requestFirstGlowReflection } from "@mimir/engine";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const stateHash = state => digest(JSON.stringify(canonicalize(state)));

export function auditCandidates(initialRc, candidates, recordedDecisions = []) {
  // Counterfactual accounting only: this clone never becomes a world checkpoint.
  const shadow = structuredClone(initialRc);
  const used = new Set();
  return candidates.slice().sort((a, b) => a.pulse - b.pulse || (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0)).map(candidate => {
    const actor = candidate.sparkId;
    const key = `${actor}:${Math.floor(candidate.pulse / shadow.policy.pulsesPerDay)}`;
    const v2Recorded = recordedDecisions.some(item => item.created && item.sparkId === actor && item.pulse === candidate.pulse);
    if (used.has(key)) return { ...candidate, v2Recorded, shadowCreated: false, shadowReason: "capacity-already-used" };
    const decision = requestFirstGlowReflection(shadow, actor, candidate.pulse);
    if (decision.created) used.add(key);
    return { ...candidate, v2Recorded, shadowCreated: decision.created, shadowReason: decision.reason };
  });
}

export function auditSample(directory) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const manifestBytes = readFileSync(resolve(root, "docs/model-study-protocol.json"));
  const manifest = JSON.parse(manifestBytes);
  const reportBytes = readFileSync(resolve(directory, "report.json"));
  const report = JSON.parse(reportBytes);
  assert.equal(report.protocolHash, digest(manifestBytes));
  assert.equal(report.status, "complete");
  assert.equal(report.mode, "synthetic");
  assert.equal(report.accounting.attempts.length, 0);
  const runtime = "packages/engine/dist/first-glow-reflection-capacity.js";
  assert.equal(digest(readFileSync(resolve(root, runtime))), manifest.sourceFiles[runtime]);
  const inputHashes = { "report.json": digest(reportBytes) };
  let checkpointsVerified = 0;
  for (const run of report.runs) {
    for (const checkpoint of run.checkpoints) {
      const name = `${run.seed}-${run.arm}-${checkpoint.pulse}.json`;
      const bytes = readFileSync(resolve(directory, name));
      assert.equal(stateHash(JSON.parse(bytes)), checkpoint.hash);
      inputHashes[name] = digest(bytes);
      checkpointsVerified++;
    }
  }
  const seeds = manifest.seeds.map(plan => {
    const name = `${plan.seed}-model-last-state.json`;
    const finalBytes = readFileSync(resolve(directory, name));
    const finalState = JSON.parse(finalBytes);
    assert.equal(stateHash(finalState), report.runs.find(run => run.seed === plan.seed && run.arm === "model").checkpoints.find(item => item.pulse === 80).hash);
    const final = finalState.firstGlowState;
    inputHashes[name] = digest(finalBytes);
    const journalName = `${plan.seed}-model-outcomes.jsonl`;
    const journalBytes = readFileSync(resolve(directory, journalName));
    const rows = journalBytes.toString().trim().split("\n").map(line => JSON.parse(line));
    inputHashes[journalName] = digest(journalBytes);
    const candidates = final.history.decisions.filter(item => item.usage.outcome === "fallback" && rows.some(row => row.rcSuppressions.some(entry => entry.sparkId === item.sparkId && entry.pulse === item.pulse))).map(item => ({ sparkId: item.sparkId, pulse: item.pulse, eventId: item.eventId, trigger: item.trigger }));
    assert.equal(candidates.length, rows.reduce((sum, row) => sum + row.rcSuppressions.length, 0), "ambiguous candidate/suppression join");
    const sparkIds = final.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id)).sort();
    const initialRc = JSON.parse(readFileSync(resolve(directory, `${plan.seed}-model-0.json`))).firstGlowState.reflectionCapacity;
    assert.deepEqual(initialRc, createFirstGlowReflectionCapacityState(sparkIds));
    const trace = auditCandidates(initialRc, candidates, final.reflectionCapacity.scheduler.decisions);
    return { seed: plan.seed, rcDecisionCount: final.reflectionCapacity.scheduler.decisions.length, rcCreatedCount: final.reflectionCapacity.scheduler.decisions.filter(item => item.created).length, legacyCandidates: candidates.length, trace };
  });
  return {
    schemaVersion: 1, date: "2026-11-08", sourceProtocolHash: report.protocolHash,
    kind: "read-only-artifact-audit-with-disposable-shadow-accounting", providerCalls: 0,
    checkpointsVerified, inputHashes,
    phaseOffsets: Object.fromEntries(Object.keys(JSON.parse(readFileSync(resolve(directory, "2-model-0.json"))).firstGlowState.reflectionCapacity.assignments).map(id => [id, firstGlowReflectionCadence(id, 1).phaseOffset])),
    seeds,
    limitations: ["Shadow-created slots are counterfactual feasibility estimates, not recorded world outcomes or provider calls.", "An integrated scheduler changes later state; this audit cannot predict all later contexts or establish model benefit."]
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 4, "usage: node scripts/model-study-opportunity-audit.mjs <saved-run> <new-report.json>");
  const result = auditSample(resolve(process.argv[2]));
  writeFileSync(resolve(process.argv[3]), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ checkpointsVerified: result.checkpointsVerified, seeds: result.seeds, phaseOffsets: result.phaseOffsets }, null, 2));
}
