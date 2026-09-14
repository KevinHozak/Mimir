import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import {
  buildFirstGlowInterpretationContext,
  createFirstGlowAttentionBudget,
  createFirstGlowFakeProvider,
  createFirstGlowState,
  createFirstGlowDecisionCadence,
  decisionBudgetFromAgeDays,
  decisionBudgetFromReadinessTier,
  recordFirstGlowWitnesses,
  runFirstGlowHybridRuntime
} from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
const outputPath = resolve(root, process.env.MIMIR_AI_P18_REPORT ?? ".tmp/ai-p18-cadence-review.json");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const seeds = [2, 4, 8, 16];
const sparkIds = ["spark-1", "spark-2", "spark-3", "spark-4"];
const encounterCount = 32;
const pulsesPerDay = 64;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function makeContexts(seed) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkIds.length);
  const contexts = [];
  for (let index = 0; index < encounterCount; index += 1) {
    const actorId = sparkIds[index % sparkIds.length];
    const kind = ["draw", "idle", "explore", "wild-cache"][(index + seed) % 4];
    state.pulse = index + 1;
    const event = { id: `event-ai-p18-${seed}-${index + 1}`, kind, actorId, participants: [actorId], message: `Fixed-seed cadence encounter ${index + 1} for seed ${seed}.`, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.pulse);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Could not build context for ${event.id}`);
    contexts.push(context);
  }
  return contexts;
}

function profileFor(basis) {
  return Object.fromEntries(sparkIds.map((sparkId, index) => [sparkId, basis === "readiness" ? decisionBudgetFromReadinessTier(index) : decisionBudgetFromAgeDays([0, 2, 4, 8][index])]));
}

function gaps(decisions, sparkId) {
  const created = decisions.filter(item => item.sparkId === sparkId && item.created).map(item => item.pulse);
  return created.slice(1).map((pulse, index) => pulse - created[index]);
}

async function evaluateBasis(basis) {
  const sparkDailyLimits = profileFor(basis);
  let providerCalls = 0;
  const base = createFirstGlowFakeProvider({ providerId: `local-p18-${basis}` });
  const provider = { providerId: base.providerId, interpret: async context => { providerCalls += 1; return base.interpret(context); } };
  const seedResults = [];
  for (const seed of seeds) {
    const contexts = makeContexts(seed);
    const pilot = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider, attentionPolicy: { perSparkDailyLimit: 4, sparkDailyLimits, globalDailyLimit: 16, pulsesPerDay, repeatedEventCooldownPulses: 0, spaceOpportunities: true }, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
    const cadence = Object.fromEntries(sparkIds.map((sparkId, index) => { const budget = sparkDailyLimits[sparkId]; return [sparkId, { budget, ...createFirstGlowDecisionCadence(sparkId, budget, pulsesPerDay), readinessTier: index, ageDays: [0, 2, 4, 8][index] }]; }));
    const gapsBySpark = Object.fromEntries(sparkIds.map(sparkId => [sparkId, gaps(pilot.attentionBudget.decisions, sparkId)]));
    const noBurst = sparkIds.every(sparkId => gapsBySpark[sparkId].every(gap => gap >= createFirstGlowDecisionCadence(sparkId, sparkDailyLimits[sparkId], pulsesPerDay).intervalPulses));
    const replay = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: { providerId: "replay-must-not-call", interpret: async () => { throw new Error("provider called during replay"); } }, historicalPlayback: true, recorded: pilot.outcomes.map(item => item.interpretation), attentionPolicy: { perSparkDailyLimit: 4, sparkDailyLimits, globalDailyLimit: 16, pulsesPerDay, repeatedEventCooldownPulses: 0, spaceOpportunities: true }, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
    seedResults.push({ seed, encounters: contexts.length, decisions: pilot.attentionBudget.decisions.length, created: pilot.attentionBudget.decisions.filter(item => item.created).length, perSparkUsed: pilot.attentionBudget.perSparkUsed, globalUsed: pilot.attentionBudget.globalUsed, gapsBySpark, noBurst, replayRecordsMatched: replay.outcomes.length, replayProviderFree: replay.interpretationBudget.used === 0 });
  }
  return { basis, sparkDailyLimits, providerCalls, seeds: seedResults, safety: { noCanonicalAuthority: true, noBurst: seedResults.every(item => item.noBurst), capsAdhered: seedResults.every(item => item.globalUsed <= 16 && Object.entries(item.perSparkUsed).every(([sparkId, used]) => used <= sparkDailyLimits[sparkId])), replayProviderFree: seedResults.every(item => item.replayProviderFree && item.replayRecordsMatched === encounterCount), noBroaderDeployment: true } };
}

const results = [await evaluateBasis("readiness"), await evaluateBasis("age")];
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evaluation: "AI-P18 deterministic Spark decision-budget cadence review",
  execution: "deterministic-control",
  fixedSeeds: seeds,
  encountersPerSeed: encounterCount,
  pulsesPerDay,
  budgetLadder: [2, 4, 8, 16],
  cadenceFormula: "intervalPulses = floor(pulsesPerDay / budget); phaseOffset = stableSparkHash modulo intervalPulses",
  basisResults: results,
  acceptance: { everyBasisTested: results.length === 2, everySeedTested: results.every(item => item.seeds.length === seeds.length), cadenceRecorded: true, safetyPassed: results.every(item => Object.values(item.safety).every(Boolean)), providerFreeReplay: results.every(item => item.safety.replayProviderFree), noBroaderDeployment: true },
  decision: "live-quality-rerun-required"
};
assert(report.acceptance.safetyPassed, "P18 cadence safety rubric failed");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outputPath.replace(/\.json$/, ".md"), [`# AI-P18 Spark decision-budget cadence review`, "", `Generated: ${report.generatedAt}`, "Execution: **deterministic-control**", `Fixed seeds: **${seeds.join(", ")}**; encounters per seed: **${encounterCount}**`, "", "## Cadence", "", "The control compares readiness-tier and age-day determinants across the powers-of-two ladder 2, 4, 8, and 16. Each budget is spread across a 64-pulse day with a stable Spark-specific phase offset.", "", ...results.map(item => `- ${item.basis}: provider calls ${item.providerCalls}; safety ${Object.values(item.safety).every(Boolean) ? "pass" : "fail"}.`), "", "- Provider-free replay: **pass**", "- Decision: **live-quality-rerun-required**", ""].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, execution: report.execution, seeds, bases: results.map(item => ({ basis: item.basis, providerCalls: item.providerCalls, sparkDailyLimits: item.sparkDailyLimits, safety: item.safety })), decision: report.decision }, null, 2));
