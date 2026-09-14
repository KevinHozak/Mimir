import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import {
  applyFirstGlowStagingChoice,
  buildFirstGlowInterpretationContext,
  createFirstGlowFakeProvider,
  createFirstGlowState,
  createFirstGlowVertexGeminiPilotProvider,
  createFirstGlowDecisionCadence,
  decisionBudgetFromAgeDays,
  decisionBudgetFromReadinessTier,
  recordFirstGlowWitnesses,
  runFirstGlowHybridRuntime
} from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
const outputPath = resolve(root, process.env.MIMIR_AI_P19_REPORT ?? ".tmp/ai-p19-determinant-review.json");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const seeds = [2, 4, 8, 16];
const sparkIds = ["spark-1", "spark-2", "spark-3", "spark-4"];
const ageDays = [0, 2, 4, 8];
const encounterCount = 32;
const pulsesPerDay = 64;
const fallbackReasons = ["malformed-output", "invalid-reference", "unsupported-claim", "timeout", "budget-exhausted", "provider-error"];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const stable = value => JSON.stringify(value);
const fingerprint = value => `sha256-${createHash("sha256").update(stable(value)).digest("hex")}`;

function makeContexts(seed) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkIds.length);
  const contexts = [];
  for (let index = 0; index < encounterCount; index += 1) {
    const actorId = sparkIds[index % sparkIds.length];
    const kind = ["draw", "idle", "explore", "wild-cache"][(index + seed) % 4];
    state.pulse = index + 1;
    const event = { id: `event-ai-p19-${seed}-${index + 1}`, kind, actorId, participants: [actorId], message: `Matched determinant review encounter ${index + 1} for seed ${seed}.`, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.pulse);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Could not build context for ${event.id}`);
    contexts.push(context);
  }
  return contexts;
}

function profileFor(basis) {
  return Object.fromEntries(sparkIds.map((sparkId, index) => [sparkId, basis === "readiness" ? decisionBudgetFromReadinessTier(index) : decisionBudgetFromAgeDays(ageDays[index])]));
}

function attentionPolicy(sparkDailyLimits) {
  return { perSparkDailyLimit: 4, sparkDailyLimits, globalDailyLimit: 16, pulsesPerDay, repeatedEventCooldownPulses: 0, spaceOpportunities: true, timeoutMs: 1000 };
}

function gaps(decisions, sparkId) {
  const created = decisions.filter(item => item.sparkId === sparkId && item.created).map(item => item.pulse);
  return created.slice(1).map((pulse, index) => pulse - created[index]);
}

function stage(contexts, records) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkIds.length);
  return contexts.map(context => {
    state.pulse = context.pulse;
    state.events = [context.event];
    recordFirstGlowWitnesses(state.social, [context.event.id], context.actorSparkId, [], context.pulse);
    const transition = applyFirstGlowStagingChoice(state, context, records.get(context.encounterId));
    assert(transition.accepted, `${context.encounterId} rejected: ${transition.rejection ?? "unknown"}`);
    assert(transition.changedFields.every(field => field === "social"), `${context.encounterId} changed canonical runtime authority`);
    state.social = transition.after.social;
    return { alternativeId: transition.alternativeId, changedFields: transition.changedFields, afterStateFingerprint: fingerprint(transition.after) };
  });
}

function createProvider(basis) {
  if (process.env.MIMIR_AI_P19_LIVE !== "true") {
    const fake = createFirstGlowFakeProvider({ providerId: `local-p19-${basis}` });
    return { provider: fake, authorization: { execution: "deterministic-control", provider: "local fake provider", model: fake.providerId, location: "local", hardCapCents: 0 } };
  }
  const required = name => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is required for live P19 execution`);
    return value;
  };
  assert(required("MIMIR_AI_P19_HOSTED_BOUNDARY") === "private", "P19 live execution requires the private hosted boundary");
  const config = {
    accessToken: required("MIMIR_VERTEX_ACCESS_TOKEN"),
    projectId: required("MIMIR_GEMINI_PROJECT_ID"),
    accountId: required("MIMIR_GEMINI_ACCOUNT_ID"),
    location: process.env.MIMIR_VERTEX_LOCATION ?? "us-central1",
    hardCapCents: Number(required("MIMIR_GEMINI_HARD_CAP_CENTS")),
    killSwitch: required("MIMIR_GEMINI_EVALUATION_KILL_SWITCH"),
    runtimeMode: "bounded-internal-pilot",
    billingMode: "vertex-ai",
    dataPolicy: "spark-local-minimized",
    model: "gemini-2.5-flash-lite",
    maxOutputTokens: 128
  };
  assert(config.hardCapCents === 100, "P19 requires the approved $1.00 aggregate hard cap");
  assert(config.killSwitch === "enabled", "P19 requires the enabled kill switch");
  assert(required("MIMIR_GEMINI_DATA_SCOPE") === "spark-local-context-only", "P19 requires the approved data scope");
  assert(required("MIMIR_GEMINI_RETENTION_MODE") === "review-artifact", "P19 requires review-artifact retention");
  return { provider: createFirstGlowVertexGeminiPilotProvider(config), authorization: { execution: "vertex-live", provider: "Google Vertex AI", model: config.model, location: config.location, hardCapCents: config.hardCapCents } };
}

async function evaluateBasis(basis) {
  const sparkDailyLimits = profileFor(basis);
  const selected = createProvider(basis);
  const seedResults = [];
  for (const seed of seeds) {
    const contexts = makeContexts(seed);
    const policy = attentionPolicy(sparkDailyLimits);
    const baseline = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "rules-only", attentionPolicy: policy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
    const pilot = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: selected.provider, attentionPolicy: policy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
    const baselineRecords = new Map(baseline.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
    const pilotRecords = new Map(pilot.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
    const baselineStages = stage(contexts, baselineRecords);
    const pilotStages = stage(contexts, pilotRecords);
    const perSpark = Object.fromEntries(sparkIds.map(sparkId => [sparkId, { budget: sparkDailyLimits[sparkId], opportunities: 0, recorded: 0, fallbacks: 0, useful: 0, changedChoices: 0, downstreamChanges: 0, suppressionReasons: {} }]));
    const reviews = pilot.outcomes.map((outcome, index) => {
      const spark = perSpark[outcome.attention.sparkId];
      const changedChoice = outcome.interpretation.plausibleChoiceChanged;
      const changedDownstream = pilotStages[index].afterStateFingerprint !== baselineStages[index].afterStateFingerprint;
      const useful = outcome.usage.outcome === "recorded" && changedChoice && changedDownstream;
      const fallbackReason = outcome.usage.reason ?? outcome.interpretation.fallbackReason ?? null;
      spark.opportunities += outcome.attention.created ? 1 : 0;
      spark.recorded += outcome.usage.outcome === "recorded" ? 1 : 0;
      spark.fallbacks += outcome.usage.outcome === "fallback" ? 1 : 0;
      spark.useful += useful ? 1 : 0;
      spark.changedChoices += changedChoice ? 1 : 0;
      spark.downstreamChanges += changedDownstream ? 1 : 0;
      if (!outcome.attention.created) spark.suppressionReasons[outcome.attention.reason] = (spark.suppressionReasons[outcome.attention.reason] ?? 0) + 1;
      return { sparkId: outcome.attention.sparkId, changedChoice, changedDownstream, useful, fallbackReason };
    });
    const gapsBySpark = Object.fromEntries(sparkIds.map(sparkId => [sparkId, gaps(pilot.attentionBudget.decisions, sparkId)]));
    const noBurst = sparkIds.every(sparkId => gapsBySpark[sparkId].every(gap => gap >= createFirstGlowDecisionCadence(sparkId, sparkDailyLimits[sparkId], pulsesPerDay).intervalPulses));
    let replayProviderCalls = 0;
    const replay = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: { providerId: "replay-must-not-call", interpret: async () => { replayProviderCalls += 1; throw new Error("provider called during replay"); } }, historicalPlayback: true, recorded: pilot.outcomes.map(item => item.interpretation), attentionPolicy: policy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
    const fallbackTotals = Object.fromEntries(fallbackReasons.map(reason => [reason, reviews.filter(item => item.fallbackReason === reason).length]));
    seedResults.push({ seed, decisions: pilot.attentionBudget.decisions.length, created: pilot.attentionBudget.decisions.filter(item => item.created).length, perSpark, gapsBySpark, noBurst, fallbackTotals, replayRecordsMatched: replay.outcomes.length, replayProviderFree: replayProviderCalls === 0 && replay.interpretationBudget.used === 0 });
  }
  const telemetry = selected.provider.telemetry ?? [];
  const perSparkTotals = Object.fromEntries(sparkIds.map(sparkId => {
    const total = { budget: sparkDailyLimits[sparkId], opportunities: 0, recorded: 0, fallbacks: 0, useful: 0, changedChoices: 0, downstreamChanges: 0, suppressionReasons: {} };
    for (const result of seedResults) {
      const current = result.perSpark[sparkId];
      for (const key of ["opportunities", "recorded", "fallbacks", "useful", "changedChoices", "downstreamChanges"]) total[key] += current[key];
      for (const [reason, count] of Object.entries(current.suppressionReasons)) total.suppressionReasons[reason] = (total.suppressionReasons[reason] ?? 0) + count;
    }
    return [sparkId, total];
  }));
  const topSpark = sparkIds.at(-1);
  const lowerSparks = sparkIds.slice(0, -1);
  const universallyDominant = perSparkTotals[topSpark].downstreamChanges > 0 && lowerSparks.every(sparkId => perSparkTotals[sparkId].downstreamChanges === 0);
  return {
    basis,
    sparkDailyLimits,
    profiles: Object.fromEntries(sparkIds.map((sparkId, index) => [sparkId, { budget: sparkDailyLimits[sparkId], readinessTier: index, ageDays: ageDays[index], ...createFirstGlowDecisionCadence(sparkId, sparkDailyLimits[sparkId], pulsesPerDay) }])),
    perSpark: perSparkTotals,
    seeds: seedResults,
    provider: { calls: telemetry.length, latencyMs: telemetry.reduce((sum, item) => sum + (item.latencyMs ?? 0), 0), costCents: telemetry.reduce((sum, item) => sum + (item.costCents ?? 0), 0), fallbackTotals: Object.fromEntries(fallbackReasons.map(reason => [reason, telemetry.filter(item => item.outcome === "fallback" && item.reason === reason).length])) },
    summary: { recorded: Object.values(perSparkTotals).reduce((sum, item) => sum + item.recorded, 0), fallbacks: Object.values(perSparkTotals).reduce((sum, item) => sum + item.fallbacks, 0), useful: Object.values(perSparkTotals).reduce((sum, item) => sum + item.useful, 0), changedChoices: Object.values(perSparkTotals).reduce((sum, item) => sum + item.changedChoices, 0), downstreamChanges: Object.values(perSparkTotals).reduce((sum, item) => sum + item.downstreamChanges, 0) },
    fairness: { highestBudgetSpark: topSpark, universallyDominant, lowerBudgetDownstreamChanges: lowerSparks.reduce((sum, sparkId) => sum + perSparkTotals[sparkId].downstreamChanges, 0) },
    safety: { noCanonicalAuthority: true, noBurst: seedResults.every(item => item.noBurst), capsAdhered: seedResults.every(item => item.created <= 16 && Object.entries(item.perSpark).every(([sparkId, item]) => item.opportunities <= sparkDailyLimits[sparkId])), replayProviderFree: seedResults.every(item => item.replayProviderFree && item.replayRecordsMatched === encounterCount), noBroaderDeployment: true },
    authorization: selected.authorization
  };
}

const results = [await evaluateBasis("readiness"), await evaluateBasis("age")];
const profilesEquivalent = stable(results[0].sparkDailyLimits) === stable(results[1].sparkDailyLimits);
const safetyPassed = results.every(result => Object.values(result.safety).every(Boolean));
const totalCostCents = results.reduce((sum, result) => sum + result.provider.costCents, 0);
const execution = results[0].authorization.execution;
const decision = execution !== "vertex-live" ? "live-quality-rerun-required" : !safetyPassed ? "stop-and-revise" : profilesEquivalent ? "defer-for-determinant" : "proceed-to-determinant-selection";
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evaluation: "AI-P19 matched Spark decision-budget determinant review",
  execution,
  fixedSeeds: seeds,
  encountersPerSeed: encounterCount,
  pulsesPerDay,
  budgetLadder: [2, 4, 8, 16],
  profilesEquivalent,
  basisResults: results,
  acceptance: { bothDeterminantsTested: results.length === 2, matchedSeeds: results.every(item => item.seeds.length === seeds.length), cadenceMeasured: results.every(item => item.seeds.every(seed => seed.gapsBySpark)), qualityMeasured: true, fairnessMeasured: true, safetyPassed, providerFreeReplay: results.every(item => item.safety.replayProviderFree), hardCapCents: execution === "vertex-live" ? 100 : 0, costCents: totalCostCents, withinHardCap: execution !== "vertex-live" || totalCostCents <= 100, noBroaderDeployment: true },
  decision,
  nextStep: profilesEquivalent ? "Use a follow-up fixture with determinant-varying Spark state before selecting a readiness or age determinant." : "Review determinant-selection evidence before bounded runtime integration."
};
assert(report.acceptance.safetyPassed, "P19 safety rubric failed");
assert(report.acceptance.withinHardCap, "P19 aggregate hard cap exceeded");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(outputPath.replace(/\.json$/, ".md"), [
  "# AI-P19 matched Spark decision-budget determinant review",
  "",
  `Generated: ${report.generatedAt}`,
  `Execution: **${execution}**`,
  `Fixed seeds: **${seeds.join(", ")}**; encounters per seed: **${encounterCount}**`,
  "",
  "## Result",
  "",
  `- Readiness and age profiles tested: **${report.acceptance.bothDeterminantsTested ? "pass" : "fail"}**; matched inputs: **${report.acceptance.matchedSeeds ? "pass" : "fail"}**.`,
  `- Profile mappings behaviorally equivalent in this fixture: **${profilesEquivalent ? "yes" : "no"}**.`,
  `- Cost: ${totalCostCents} cents; hard-cap check: **${report.acceptance.withinHardCap ? "pass" : "fail"}**.`,
  `- Provider-free replay: **${report.acceptance.providerFreeReplay ? "pass" : "fail"}**; fairness measured: **${report.acceptance.fairnessMeasured ? "pass" : "fail"}**.`,
  `- Decision: **${decision}**`,
  `- Next step: ${report.nextStep}`,
  ""
].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, execution, fixedSeeds: seeds, profilesEquivalent, results: results.map(item => ({ basis: item.basis, providerCalls: item.provider.calls, costCents: item.provider.costCents, summary: item.summary, fairness: item.fairness, safety: item.safety })), decision, nextStep: report.nextStep }, null, 2));
