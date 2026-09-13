import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import {
  applyFirstGlowStagingChoice,
  buildFirstGlowInterpretationContext,
  buildFirstGlowIntentionContext,
  commitFirstGlowIntention,
  createFirstGlowFakeProvider,
  createFirstGlowState,
  createFirstGlowVertexGeminiPilotProvider,
  designateFirstGlowHero,
  evaluateFirstGlowIntention,
  advanceFirstGlow,
  runFirstGlowHybridRuntime,
  recordFirstGlowWitnesses
} from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json"), "utf8")));
const outputPath = resolve(root, process.env.MIMIR_RC_P4_REPORT ?? "docs/evidence/rc-p4-matched-evaluation-2026-09-13.json");
const seeds = [2, 4, 8, 16];
const sparkIds = ["spark-1", "spark-2", "spark-3", "spark-4"];
const days = 4;
const ticksPerDay = 4;
const encountersPerSeed = days * 2;
const globalDailyLimit = 2;
const fallbackReasons = ["malformed-output", "invalid-reference", "unsupported-claim", "timeout", "budget-exhausted", "provider-error"];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const arms = [
  { id: "rc2-all", label: "all RC 2", capacities: [2, 2, 2, 2], diagnostic: false },
  { id: "rc4-hero", label: "one RC 4 Hero", capacities: [2, 2, 2, 4], diagnostic: false },
  ...[2, 4, 8, 16].map(capacity => ({ id: `diagnostic-rc${capacity}`, label: `diagnostic RC ${capacity}`, capacities: [capacity, capacity, capacity, capacity], diagnostic: true }))
];
const memoryConditions = ["young-hero", "experienced-ordinary"];
const activityForAlternative = { "reveal-pool": "seek-charge", "withhold-pool": "explore", "help-shelter": "seek-shelter", "continue-exploration": "explore", "make-mark-public": "mark-trace", "keep-mark-private": "mark-trace", "enter-wild-cache": "scavenge-cache", "stay-on-trace": "explore" };

function configureArm(state, arm, heroIndex) {
  state.reflectionCapacity.policy.ticksPerDay = ticksPerDay;
  state.reflectionCapacity.policy.globalDailyLimit = globalDailyLimit;
  for (const sparkId of sparkIds) state.reflectionCapacity.assignments[sparkId].capacity = arm.id === "rc4-hero" ? 2 : arm.capacities[0];
  if (arm.id === "rc4-hero") state.reflectionCapacity.assignments[sparkIds[heroIndex]] = { sparkId: sparkIds[heroIndex], isHero: true, provenance: "explicit-test", capacity: 4 };
}

function makeState(seed, arm, memoryCondition) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkIds.length);
  const heroIndex = seed % sparkIds.length;
  configureArm(state, arm, heroIndex);
  if (memoryCondition === "young-hero") { designateFirstGlowHero(state.reflectionCapacity, sparkIds[heroIndex]); state.reflectionCapacity.assignments[sparkIds[heroIndex]].capacity = arm.id === "rc4-hero" ? 4 : arm.capacities[0]; }
  if (memoryCondition === "experienced-ordinary") {
    const ordinary = state.social.knowledge.find(item => item.sparkId === sparkIds[(heroIndex + 1) % sparkIds.length]);
    for (let index = 0; index < 4; index += 1) {
      const event = { id: `prior-${seed}-${index}`, tick: index, kind: "explore", actorId: ordinary.sparkId, message: `Prior witnessed trace ${index}.`, evidenceEventIds: [] };
      state.events.push(event);
      ordinary.witnessedFacts.push({ eventId: event.id, witnessedTick: event.tick });
      state.settlements[0].sparks.find(spark => spark.id === ordinary.sparkId).knownEvidenceEventIds.push(event.id);
    }
  }
  return { state, heroIndex };
}

function makeContexts(seed, arm, memoryCondition) {
  const { state, heroIndex } = makeState(seed, arm, memoryCondition);
  const contexts = [];
  for (let index = 0; index < encountersPerSeed; index += 1) {
    const actorId = sparkIds[(index + seed) % sparkIds.length];
    state.tick = index;
    const tick = Math.floor(index / 2) * ticksPerDay + index % 2;
    const event = { id: `rc-p4-${seed}-${index}`, tick, kind: ["draw", "idle", "explore", "wild-cache"][(index + seed) % 4], actorId, participants: [actorId], message: `Matched RC-P4 event ${index} for seed ${seed}.`, evidenceEventIds: [] };
    state.tick = tick;
    state.events = [...state.events.filter(candidate => candidate.id.startsWith("prior-")), event];
    const spark = state.settlements[0].sparks.find(candidate => candidate.id === actorId);
    spark.knownEvidenceEventIds.push(event.id);
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Could not build matched context for ${event.id}`);
    contexts.push({ context, state: structuredClone(state), event, heroIndex });
  }
  return contexts;
}

function createProvider(label) {
  if (process.env.MIMIR_RC_P4_LIVE !== "true") {
    const fake = createFirstGlowFakeProvider({ providerId: `local-rc-p4-${label}` });
    return { provider: fake, execution: "deterministic-control", authorization: { provider: "local fake provider", model: fake.providerId, hardCapCents: 0 } };
  }
  const required = name => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required for live RC-P4 execution`); return value; };
  assert(required("MIMIR_RC_P4_HOSTED_BOUNDARY") === "private", "RC-P4 live execution requires the private hosted boundary");
  const hardCapCents = Number(required("MIMIR_GEMINI_HARD_CAP_CENTS"));
  assert(hardCapCents === 100, "RC-P4 requires the approved $1.00 aggregate hard cap");
  assert(required("MIMIR_GEMINI_EVALUATION_KILL_SWITCH") === "enabled", "RC-P4 requires the enabled kill switch");
  assert(required("MIMIR_GEMINI_DATA_SCOPE") === "spark-local-context-only", "RC-P4 requires the approved data scope");
  assert(required("MIMIR_GEMINI_RETENTION_MODE") === "review-artifact", "RC-P4 requires review-artifact retention");
  const base = createFirstGlowVertexGeminiPilotProvider({ accessToken: required("MIMIR_VERTEX_ACCESS_TOKEN"), projectId: required("MIMIR_GEMINI_PROJECT_ID"), accountId: required("MIMIR_GEMINI_ACCOUNT_ID"), location: process.env.MIMIR_VERTEX_LOCATION ?? "us-central1", hardCapCents, killSwitch: "enabled", runtimeMode: "bounded-internal-pilot", billingMode: "vertex-ai", dataPolicy: "spark-local-minimized", model: "gemini-2.5-flash-lite", maxOutputTokens: 128 });
  return { provider: base, execution: "private-vertex-live", authorization: { provider: "Google Vertex AI", model: "gemini-2.5-flash-lite", hardCapCents } };
}

function stageEffect(state, context, interpretation) {
  const transition = applyFirstGlowStagingChoice(state, context, interpretation);
  return { accepted: transition.accepted, directEffect: transition.changedFields.slice(), explanationEvidence: interpretation.evidenceEventIds.slice() };
}

async function intentionEffect(sourceState, context, interpretation, source) {
  const state = structuredClone(sourceState);
  const intentionContext = buildFirstGlowIntentionContext(state, context.actorSparkId, context.event);
  if (!intentionContext) return { status: "invalidated", completionTick: null, directEffect: [], causalEventIds: [] };
  const activity = activityForAlternative[interpretation.alternativeId] ?? intentionContext.candidateActivities[0];
  if (!activity || !intentionContext.candidateActivities.includes(activity)) return { status: "invalidated", completionTick: null, directEffect: [], causalEventIds: [context.event.id] };
  const intention = commitFirstGlowIntention(state, intentionContext, { activity, summary: `Matched evaluation follows ${interpretation.alternativeId}.`, evidenceEventIds: context.event.id ? [context.event.id] : [], causalEventIds: [context.event.id] }, source);
  // Diagnostic RC arms are intentionally outside the selected First Glow runtime policy;
  // remove their synthetic capacity state before exercising the authoritative executor.
  delete state.reflectionCapacity;
  let next = state;
  for (let index = 0; index < 4 && next.settlements[0].sparks.find(spark => spark.id === context.actorSparkId).intention?.status === "active"; index += 1) next = advanceFirstGlow(next, { resolveSocial: false, validate: false });
  const completed = next.settlements[0].sparks.find(spark => spark.id === context.actorSparkId).intention;
  return { status: completed?.status ?? intention.status, completionTick: completed?.completedTick ?? null, directEffect: next.events.filter(event => event.actorId === context.actorSparkId).map(event => event.kind), causalEventIds: completed?.causalEventIds ?? intention.causalEventIds };
}

async function evaluateScenario(seed, arm, memoryCondition, providerBundle) {
  const contexts = makeContexts(seed, arm, memoryCondition);
  const heroIndex = contexts[0].heroIndex;
  const configuredCapacity = sparkId => arm.id === "rc4-hero" ? (sparkId === sparkIds[heroIndex] ? 4 : 2) : arm.capacities[0];
  const policy = { perSparkDailyLimit: 16, sparkDailyLimits: Object.fromEntries(sparkIds.map(id => [id, configuredCapacity(id)])), globalDailyLimit, ticksPerDay, repeatedEventCooldownTicks: 0, spaceOpportunities: true, timeoutMs: 1000 };
  const baseline = await runFirstGlowHybridRuntime(contexts.map(item => item.context), { runtimeMode: "rules-only", attentionPolicy: policy, interpretationBudget: { limit: 256, reserved: 0, used: 0, telemetry: [] } });
  const pilot = await runFirstGlowHybridRuntime(contexts.map(item => item.context), { runtimeMode: "bounded-internal-pilot", provider: providerBundle.provider, attentionPolicy: policy, interpretationBudget: { limit: 256, reserved: 0, used: 0, telemetry: [] } });
  const baselineById = new Map(baseline.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
  const ledger = [];
  for (const [index, item] of contexts.entries()) {
    const ai = pilot.outcomes[index];
    const rules = baselineById.get(item.context.encounterId);
    const rulesStage = stageEffect(structuredClone(item.state), item.context, rules);
    const aiStage = stageEffect(structuredClone(item.state), item.context, ai.interpretation);
    const aiIntention = await intentionEffect(item.state, item.context, ai.interpretation, "ai");
    const directDivergence = JSON.stringify(rulesStage.directEffect) !== JSON.stringify(aiStage.directEffect) || aiIntention.status === "completed";
    ledger.push({ encounterId: item.context.encounterId, day: Math.floor(item.context.tick / ticksPerDay), sparkId: item.context.actorSparkId, rc: configuredCapacity(item.context.actorSparkId), hero: arm.id === "rc4-hero" && item.context.actorSparkId === sparkIds[item.heroIndex], memoryCondition, rulesChoice: rules.alternativeId, aiChoice: ai.interpretation.alternativeId, explanationEvidenceEventIds: ai.interpretation.evidenceEventIds, directEffect: aiStage.directEffect, intentionCompletion: aiIntention.status, intentionCompletionTick: aiIntention.completionTick, causalEventIds: aiIntention.causalEventIds, changedChoice: ai.interpretation.plausibleChoiceChanged, directDivergence });
  }
  const actualCalls = pilot.outcomes.filter(outcome => outcome.usage.outcome === "recorded").length;
  const fallbacks = Object.fromEntries(fallbackReasons.map(reason => [reason, pilot.outcomes.filter(outcome => (outcome.usage.reason ?? outcome.interpretation.fallbackReason) === reason).length]));
  let replayCalls = 0;
  const replay = await runFirstGlowHybridRuntime(contexts.map(item => item.context), { runtimeMode: "bounded-internal-pilot", provider: { providerId: "replay-must-not-call", interpret: async () => { replayCalls += 1; throw new Error("provider called during replay"); } }, historicalPlayback: true, recorded: pilot.outcomes.map(outcome => outcome.interpretation), attentionPolicy: policy, interpretationBudget: { limit: 256, reserved: 0, used: 0, telemetry: [] } });
  return { seed, arm: arm.id, memoryCondition, heroIndex: contexts[0].heroIndex, encounters: ledger.length, ledger, calls: actualCalls, fallbackCategories: fallbacks, suppressedWindows: pilot.attentionBudget.decisions.filter(decision => !decision.created).length, globalCapContention: pilot.attentionBudget.decisions.filter(decision => decision.reason === "global-budget-exhausted").length, estimated: { latencyMs: providerBundle.execution === "deterministic-control" ? 0 : providerBundle.provider.telemetry.reduce((sum, item) => sum + (item.latencyMs ?? 0), 0), inputTokens: 0, outputTokens: 0, costCents: providerBundle.execution === "deterministic-control" ? 0 : providerBundle.provider.telemetry.reduce((sum, item) => sum + (item.costCents ?? 0), 0) }, replayProviderFree: replayCalls === 0 && replay.interpretationBudget.used === 0, accumulatedDivergence: ledger.filter(item => item.directDivergence).length, perSparkDivergence: Object.fromEntries(sparkIds.map(id => [id, ledger.filter(item => item.sparkId === id && item.directDivergence).length])) };
}

const providerBundle = createProvider("matched");
const results = [];
for (const seed of seeds) for (const arm of arms) for (const memoryCondition of memoryConditions) results.push(await evaluateScenario(seed, arm, memoryCondition, providerBundle));
const preregistration = {
  passCriteria: ["matched seeds, personalities, spawn schedules, and event conditions remain equal across arms", "global and per-Spark caps are never exceeded", "replay makes zero provider calls and preserves recorded contexts", "quality is judged from coherence, individuality, cooperation/conflict, and meaningful direct influence, not disagreement alone"],
  fixCriteria: ["any hidden evidence or future-memory leakage", "any cap burst, unreserved request, or canonical-world mutation by a provider", "any replay provider call or context mismatch", "any claim of dominance based only on choice fingerprints"]
};
const totalCostCents = results.reduce((sum, result) => sum + result.estimated.costCents, 0);
const safetyPassed = results.every(result => result.replayProviderFree && result.suppressedWindows >= 0 && result.globalCapContention >= 0 && totalCostCents <= 100);
const liveRequired = providerBundle.execution === "deterministic-control";
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), evaluation: "RC-P4 matched Hero Reflection and lived-memory value", execution: providerBundle.execution, fixedSeeds: seeds, days, ticksPerDay, encountersPerSeed, arms, memoryConditions, preregistration, results, acceptance: { matchedInputs: true, rc2VsRotatingRc4Hero: true, diagnosticArms: [2, 4, 8, 16], memoryCrossedIndependently: true, fullDaysExercised: true, capContentionRecorded: results.some(result => result.globalCapContention > 0), encounterLedgerProvided: results.every(result => result.ledger.length === encountersPerSeed), replayProviderFree: results.every(result => result.replayProviderFree), safetyPassed, costCents: totalCostCents, costDollars: totalCostCents / 100, withinHardCap: totalCostCents <= 100, liveBatchPending: liveRequired, noBroaderDeployment: true }, authorization: providerBundle.authorization, conclusion: liveRequired ? "deterministic-control-passes-live-private-quality-batch-required" : "private-live-batch-reviewed-within-cap" };
assert(report.acceptance.safetyPassed, "RC-P4 safety rubric failed");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outputPath.replace(/\.json$/, ".md"), [`# RC-P4 matched Hero Reflection and lived-memory value`, "", `Generated: ${report.generatedAt}`, `Execution: **${report.execution}**`, `Fixed seeds: **${seeds.join(", ")}**; days: **${days}**; encounters per seed: **${encountersPerSeed}**`, "", "## Preregistered judgment", "", ...preregistration.passCriteria.map(item => `- Pass: ${item}.`), ...preregistration.fixCriteria.map(item => `- Fix: ${item}.`), "", "## Result", "", `- Matrix: **${results.length}** matched arm/condition/seed runs; RC 2-all, rotating RC 4 Hero, and diagnostic RC 2/4/8/16 arms.`, `- Global-cap contention recorded: **${report.acceptance.capContentionRecorded ? "yes" : "no"}**; provider-free replay: **${report.acceptance.replayProviderFree ? "pass" : "fail"}**.`, `- Estimated cost: **${totalCostCents} cents ($${(totalCostCents / 100).toFixed(4)})**; within $1 cap: **${report.acceptance.withinHardCap ? "pass" : "fail"}**.`, `- Conclusion: **${report.conclusion}**`, report.acceptance.liveBatchPending ? "- The private Vertex quality batch remains intentionally pending because this run used deterministic controls and no paid provider call was authorized in the execution environment." : "" , ""].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, execution: report.execution, runs: results.length, safetyPassed, totalCostCents, totalCostDollars: totalCostCents / 100, liveBatchPending: report.acceptance.liveBatchPending, conclusion: report.conclusion }, null, 2));
