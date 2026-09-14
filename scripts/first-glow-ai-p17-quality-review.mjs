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
  recordFirstGlowWitnesses,
  runFirstGlowHybridRuntime
} from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
const outputPath = resolve(root, process.env.MIMIR_AI_P17_REPORT ?? ".tmp/ai-p17-quality-review.json");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const stable = value => JSON.stringify(value);
const fingerprint = value => `sha256-${createHash("sha256").update(stable(value)).digest("hex")}`;
const seeds = [2, 4, 8, 16];
const encounterCount = 32;
const sparkCount = 4;
const attentionPolicy = { perSparkDailyLimit: 4, globalDailyLimit: 16, pulsesPerDay: 64, repeatedEventCooldownPulses: 0, timeoutMs: 1000 };
const fallbackReasons = ["malformed-output", "invalid-reference", "unsupported-claim", "timeout", "budget-exhausted", "provider-error"];

function makeContexts(seed) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkCount);
  const contexts = [];
  for (let index = 0; index < encounterCount; index += 1) {
    const actorId = `spark-${(index % sparkCount) + 1}`;
    const kind = ["draw", "idle", "explore", "wild-cache"][(index + seed) % 4];
    state.pulse = index + 1;
    const event = { id: `event-ai-p17-${seed}-${index + 1}`, kind, actorId, participants: [actorId], message: `Fixed-seed quality review encounter ${index + 1} for seed ${seed}.`, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.pulse);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Could not build context for seed ${seed} encounter ${index + 1}`);
    contexts.push(context);
  }
  return contexts;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live P17 execution`);
  return value;
}

function selectProvider() {
  if (process.env.MIMIR_AI_P17_LIVE !== "true") {
    return { provider: createFirstGlowFakeProvider({ providerId: "local-deterministic-p17-control" }), authorization: { execution: "deterministic-control", provider: "local fake provider", model: "local-deterministic-control", location: "local", accountId: "not applicable" } };
  }
  assert(required("MIMIR_AI_P17_HOSTED_BOUNDARY") === "private", "P17 live execution requires the private hosted boundary");
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
  assert(config.hardCapCents === 100, "P17 requires the approved $1.00 aggregate hard cap");
  assert(config.killSwitch === "enabled", "P17 requires the enabled kill switch");
  assert(required("MIMIR_GEMINI_DATA_SCOPE") === "spark-local-context-only", "P17 requires the approved data scope");
  assert(required("MIMIR_GEMINI_RETENTION_MODE") === "review-artifact", "P17 requires review-artifact retention");
  return { provider: createFirstGlowVertexGeminiPilotProvider(config), authorization: { execution: "vertex-live", provider: "Google Vertex AI", model: config.model, location: config.location, accountId: "redacted from evidence", projectId: "redacted from evidence", hardCapCents: config.hardCapCents } };
}

function stage(contexts, records, seed) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkCount);
  return contexts.map(context => {
    state.pulse = context.pulse;
    state.events = [context.event];
    recordFirstGlowWitnesses(state.social, [context.event.id], context.actorSparkId, [], context.pulse);
    const transition = applyFirstGlowStagingChoice(state, context, records.get(context.encounterId));
    assert(transition.accepted, `Seed ${seed} ${context.encounterId} rejected: ${transition.rejection ?? "unknown"}`);
    assert(transition.changedFields.every(field => field === "social"), `Seed ${seed} changed canonical runtime authority`);
    state.social = transition.after.social;
    return { encounterId: context.encounterId, alternativeId: transition.alternativeId, changedFields: transition.changedFields, beforeStateFingerprint: fingerprint(transition.before), afterStateFingerprint: fingerprint(transition.after) };
  });
}

function adjudicate(context, interpretation, usage, stageResult, baselineStage) {
  const evidence = interpretation.evidenceEventIds ?? [];
  const witnessed = new Set(context.witnessedEvidenceEventIds);
  const validEvidence = evidence.length > 0 && evidence.every(id => witnessed.has(id));
  const validAlternative = context.supportedAlternatives.includes(interpretation.alternativeId);
  const boundedSummary = typeof interpretation.summary === "string" && interpretation.summary.length > 0 && interpretation.summary.length <= 240;
  const fallbackReason = usage.reason ?? interpretation.fallbackReason;
  if (fallbackReason) assert(fallbackReasons.includes(fallbackReason), `Unknown fallback reason: ${fallbackReason}`);
  const recorded = usage.outcome === "recorded" && interpretation.source === "ai";
  const changedChoice = stageResult.alternativeId !== baselineStage.alternativeId;
  const changedDownstream = stageResult.afterStateFingerprint !== baselineStage.afterStateFingerprint;
  const quality = usage.outcome === "rules-only"
    ? "deterministic-baseline"
    : recorded && validEvidence && validAlternative && boundedSummary
    ? (changedChoice && changedDownstream ? "useful" : "valid-no-downstream-change")
    : fallbackReason ? "safe-deterministic-fallback" : "review-needed";
  return {
    encounterId: context.encounterId,
    seed: Number(context.event.id.split("-")[3]),
    actorSparkId: context.actorSparkId,
    dilemmaId: context.dilemmaId,
    outcome: usage.outcome,
    fallbackReason: fallbackReason ?? null,
    evidenceEventIds: evidence,
    witnessedEvidenceEventIds: context.witnessedEvidenceEventIds,
    alternativeId: interpretation.alternativeId,
    claim: interpretation.claim,
    summary: interpretation.summary,
    rubric: { evidenceGrounded: validEvidence, alternativeSupported: validAlternative, summaryBounded: boundedSummary, changedChoice, changedDownstream, quality },
    stage: { changedFields: stageResult.changedFields, beforeStateFingerprint: stageResult.beforeStateFingerprint, afterStateFingerprint: stageResult.afterStateFingerprint }
  };
}

async function evaluateSeed(seed, provider, selected) {
  const contexts = makeContexts(seed);
  const baseline = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "rules-only", attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
  const pilot = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider, attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
  const baselineRecords = new Map(baseline.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
  const pilotRecords = new Map(pilot.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
  const baselineStages = stage(contexts, baselineRecords, seed);
  const pilotStages = stage(contexts, pilotRecords, seed);
  const reviews = pilot.outcomes.map((outcome, index) => adjudicate(contexts[index], outcome.interpretation, outcome.usage, pilotStages[index], baselineStages[index]));
  let replayCalls = 0;
  const replayProvider = { providerId: "replay-must-not-call", interpret: async () => { replayCalls += 1; throw new Error("provider called during replay"); } };
  const replay = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: replayProvider, historicalPlayback: true, recorded: pilot.outcomes.map(outcome => outcome.interpretation), attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
  const recorded = reviews.filter(item => item.outcome === "recorded").length;
  const fallbacks = reviews.filter(item => item.outcome === "fallback").length;
  const useful = reviews.filter(item => item.rubric.quality === "useful").length;
  return {
    seed,
    encounters: contexts.length,
    recorded,
    fallbacks,
    useful,
    fallbackReasons: Object.fromEntries(fallbackReasons.map(reason => [reason, reviews.filter(item => item.fallbackReason === reason).length])),
    reviews,
    replayProviderCalls: replayCalls,
    replayRecordsMatched: replay.outcomes.length,
    safety: { deterministicAuthority: pilotStages.every(item => item.changedFields.every(field => field === "social")), replayProviderFree: replayCalls === 0 && replay.interpretationBudget.used === 0, rubricComplete: reviews.length === contexts.length, noBroaderDeployment: true }
  };
}

const selected = selectProvider();
const seedResults = [];
for (const seed of seeds) seedResults.push(await evaluateSeed(seed, selected.provider, selected));
const telemetry = "telemetry" in selected.provider ? selected.provider.telemetry : [];
const costCents = telemetry.at(-1)?.cumulativeCostCents ?? 0;
const allReviews = seedResults.flatMap(result => result.reviews);
const fallbackTotals = Object.fromEntries(fallbackReasons.map(reason => [reason, allReviews.filter(item => item.fallbackReason === reason).length]));
const safetyPassed = seedResults.every(result => Object.values(result.safety).every(Boolean));
const usefulCount = allReviews.filter(item => item.rubric.quality === "useful").length;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evaluation: "AI-P17 bounded Vertex interpretation quality adjudication",
  fixedSeeds: seeds,
  encountersPerSeed: encounterCount,
  authorization: selected.authorization,
  budgets: { perSparkDailyLimit: 4, globalDailyLimit: 16, hardCapCents: 100, costCents, withinCaps: costCents <= 100 },
  rubric: { dimensions: ["evidence-grounding", "spark-local-usefulness", "downstream-plausibility", "ambiguity-and-harm", "latency-fallback-validity"], fallbackReasons },
  seeds: seedResults.map(({ reviews, ...result }) => ({ ...result, reviewCount: reviews.length })),
  reviewRecords: allReviews,
  fallbackTotals,
  provider: { calls: telemetry.length, model: selected.authorization.model, telemetry: telemetry.map(item => ({ requestId: item.requestId, model: item.model, inputTokens: item.inputTokens, outputTokens: item.outputTokens, latencyMs: item.latencyMs, costCents: item.costCents, cumulativeCostCents: item.cumulativeCostCents, outcome: item.outcome, error: item.error })) },
  summary: { totalReviews: allReviews.length, totalRecorded: allReviews.filter(item => item.outcome === "recorded").length, totalFallbacks: allReviews.filter(item => item.outcome === "fallback").length, usefulInterpretations: usefulCount },
  decision: selected.authorization.execution === "deterministic-control" ? "live-review-required" : !safetyPassed ? "stop-and-revise" : usefulCount >= 3 ? "proceed-to-next-review" : "defer-for-quality",
  acceptance: { safetyPassed, everyEncounterAdjudicated: allReviews.length === seeds.length * encounterCount, fallbackCategoriesComplete: allReviews.filter(item => item.outcome === "fallback").every(item => fallbackReasons.includes(item.fallbackReason)), providerFreeReplay: seedResults.every(result => result.safety.replayProviderFree), noBroaderDeployment: true }
};
assert(report.acceptance.safetyPassed, "P17 safety rubric failed");
assert(report.acceptance.everyEncounterAdjudicated, "P17 did not adjudicate every encounter");
assert(report.acceptance.fallbackCategoriesComplete, "P17 fallback categorization is incomplete");
assert(report.budgets.withinCaps, "P17 aggregate hard cap exceeded");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdownPath = outputPath.replace(/\.json$/, ".md");
writeFileSync(markdownPath, [
  "# AI-P17 bounded Vertex interpretation quality adjudication",
  "",
  `Generated: ${report.generatedAt}`,
  `Execution: **${report.authorization.execution}**`,
  `Fixed seeds: **${seeds.join(", ")}**; encounters per seed: **${encounterCount}**`,
  "",
  "## Results",
  "",
  `- Every encounter adjudicated: **${report.acceptance.everyEncounterAdjudicated ? "pass" : "fail"}** (${report.summary.totalReviews}).`,
  `- Recorded interpretations: ${report.summary.totalRecorded}; fallbacks: ${report.summary.totalFallbacks}.`,
  `- Useful interpretations: ${report.summary.usefulInterpretations}.`,
  `- Fallback categories: ${Object.entries(fallbackTotals).filter(([, count]) => count > 0).map(([reason, count]) => `${reason}=${count}`).join(", ") || "none"}.`,
  `- Provider calls: ${report.provider.calls}; cumulative cost: ${costCents} cents; hard cap: 100 cents.`,
  "",
  "## Rubric",
  "",
  "Each record checks witnessed evidence, supported alternatives, bounded summary text, downstream staging effect, and an explicit fallback category. AI proposals remain staged social interpretations; they never write canonical runtime state.",
  "",
  `- Safety gates: **${report.acceptance.safetyPassed ? "pass" : "fail"}**`,
  `- Provider-free replay: **${report.acceptance.providerFreeReplay ? "pass" : "fail"}**`,
  `- Decision: **${report.decision}**`,
  ""
].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, markdownPath, execution: report.authorization.execution, seeds, encounters: report.summary.totalReviews, providerCalls: report.provider.calls, costCents, usefulInterpretations: report.summary.usefulInterpretations, fallbackTotals, decision: report.decision }, null, 2));
