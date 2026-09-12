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
const outputPath = resolve(root, process.env.MIMIR_AI_P16_REPORT ?? ".tmp/ai-p16-repeatability.json");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const stable = value => JSON.stringify(value);
const fingerprint = value => `sha256-${createHash("sha256").update(stable(value)).digest("hex")}`;
const seeds = [2, 4, 8, 16];
const encounterCount = 32;
const sparkCount = 4;
const attentionPolicy = { perSparkDailyLimit: 4, globalDailyLimit: 16, ticksPerDay: 64, repeatedEventCooldownTicks: 0, timeoutMs: 1000 };

function makeContexts(seed) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkCount);
  const contexts = [];
  for (let index = 0; index < encounterCount; index += 1) {
    const actorId = `spark-${(index % sparkCount) + 1}`;
    const kind = ["draw", "idle", "explore", "wild-cache"][(index + seed) % 4];
    state.tick = index + 1;
    const event = { id: `event-ai-p16-${seed}-${index + 1}`, kind, actorId, participants: [actorId], message: `Fixed-seed repeatability encounter ${index + 1} for seed ${seed}.`, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Could not build context for seed ${seed} encounter ${index + 1}`);
    contexts.push(context);
  }
  return contexts;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live P16 execution`);
  return value;
}

function selectProvider() {
  if (process.env.MIMIR_AI_P16_LIVE !== "true") {
    return { provider: createFirstGlowFakeProvider({ providerId: "local-deterministic-p16-control" }), authorization: { execution: "deterministic-control", provider: "local fake provider", model: "local-deterministic-control", location: "local", accountId: "not applicable" } };
  }
  assert(required("MIMIR_AI_P16_HOSTED_BOUNDARY") === "private", "P16 live execution requires the private hosted boundary");
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
  assert(config.hardCapCents === 100, "P16 requires the approved $1.00 aggregate hard cap");
  assert(config.killSwitch === "enabled", "P16 requires the enabled kill switch");
  assert(required("MIMIR_GEMINI_DATA_SCOPE") === "spark-local-context-only", "P16 requires the approved data scope");
  assert(required("MIMIR_GEMINI_RETENTION_MODE") === "review-artifact", "P16 requires review-artifact retention");
  return { provider: createFirstGlowVertexGeminiPilotProvider(config), authorization: { execution: "vertex-live", provider: "Google Vertex AI", model: config.model, location: config.location, accountId: "redacted from evidence", projectId: "redacted from evidence", hardCapCents: config.hardCapCents } };
}

function stage(contexts, records, seed) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkCount);
  return contexts.map(context => {
    state.tick = context.tick;
    state.events = [context.event];
    recordFirstGlowWitnesses(state.social, [context.event.id], context.actorSparkId, [], context.tick);
    const transition = applyFirstGlowStagingChoice(state, context, records.get(context.encounterId));
    assert(transition.accepted, `Seed ${seed} ${context.encounterId} rejected: ${transition.rejection ?? "unknown"}`);
    assert(transition.changedFields.every(field => field === "social"), `Seed ${seed} changed canonical runtime authority`);
    state.social = transition.after.social;
    return { encounterId: context.encounterId, alternativeId: transition.alternativeId, changedFields: transition.changedFields, beforeStateFingerprint: fingerprint(transition.before), afterStateFingerprint: fingerprint(transition.after) };
  });
}

async function evaluateSeed(seed, provider, selected) {
  const contexts = makeContexts(seed);
  const baseline = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "rules-only", attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
  const pilot = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider, attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
  const baselineRecords = new Map(baseline.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
  const pilotRecords = new Map(pilot.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
  const baselineStages = stage(contexts, baselineRecords, seed);
  const pilotStages = stage(contexts, pilotRecords, seed);
  const changedChoices = pilotStages.filter((item, index) => item.alternativeId !== baselineStages[index].alternativeId).length;
  const changedDownstream = pilotStages.filter((item, index) => item.afterStateFingerprint !== baselineStages[index].afterStateFingerprint).length;
  let replayCalls = 0;
  const replayProvider = { providerId: "replay-must-not-call", interpret: async () => { replayCalls += 1; throw new Error("provider called during replay"); } };
  const replay = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: replayProvider, historicalPlayback: true, recorded: pilot.outcomes.map(outcome => outcome.interpretation), attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
  const recorded = pilot.outcomes.filter(item => item.usage.outcome === "recorded").length;
  const fallbacks = pilot.outcomes.filter(item => item.usage.outcome === "fallback").length;
  const validProposals = pilot.outcomes.filter(item => item.interpretation.source === "ai" && item.interpretation.fallbackReason === undefined).length;
  const safety = {
    privateHostedOnly: selected.authorization.execution === "deterministic-control" || process.env.MIMIR_AI_P16_HOSTED_BOUNDARY === "private",
    deterministicAuthority: pilotStages.every(item => item.changedFields.every(field => field === "social")),
    capsAdhered: pilot.attentionBudget.globalUsed <= 16 && Math.max(...Object.values(pilot.attentionBudget.perSparkUsed)) <= 4 && pilot.interpretationBudget.used <= 16,
    replayProviderFree: replayCalls === 0 && replay.interpretationBudget.used === 0,
    proposalValidity: validProposals === recorded,
    noBroaderDeployment: true
  };
  return {
    seed,
    encounters: contexts.length,
    attentionOpportunities: pilot.attentionBudget.decisions.filter(item => item.created).length,
    perSparkMaximumUsed: Math.max(...Object.values(pilot.attentionBudget.perSparkUsed)),
    globalUsed: pilot.attentionBudget.globalUsed,
    interpretationUnitsUsed: pilot.interpretationBudget.used,
    recorded,
    fallbacks,
    changedChoices,
    changedDownstream,
    replayProviderCalls: replayCalls,
    replayRecordsMatched: replay.outcomes.length,
    safety,
    useful: changedChoices > 0 && changedDownstream > 0 && recorded > 0 && safety.proposalValidity,
    fallbackOnly: recorded === 0 && fallbacks > 0
  };
}

const selected = selectProvider();
const seedResults = [];
for (const seed of seeds) seedResults.push(await evaluateSeed(seed, selected.provider, selected));
const telemetry = "telemetry" in selected.provider ? selected.provider.telemetry : [];
const costCents = telemetry.at(-1)?.cumulativeCostCents ?? 0;
const safetyNames = ["privateHostedOnly", "deterministicAuthority", "capsAdhered", "replayProviderFree", "proposalValidity", "noBroaderDeployment"];
const safetyPassed = seedResults.every(result => safetyNames.every(name => result.safety[name]));
const usefulSeeds = seedResults.filter(result => result.useful).length;
const fallbackOnly = selected.authorization.execution === "vertex-live" && seedResults.every(result => result.fallbackOnly);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evaluation: "AI-P16 repeatability evaluation of bounded private-hosted Vertex value",
  fixedSeeds: seeds,
  encountersPerSeed: encounterCount,
  authorization: selected.authorization,
  budgets: { perSparkDailyLimit: 4, globalDailyLimit: 16, hardCapCents: 100, costCents, withinCaps: costCents <= 100 },
  seeds: seedResults,
  summary: { seedCount: seeds.length, usefulSeeds, validSeeds: seedResults.filter(result => result.safety.proposalValidity).length, totalRecorded: seedResults.reduce((sum, result) => sum + result.recorded, 0), totalFallbacks: seedResults.reduce((sum, result) => sum + result.fallbacks, 0), totalChangedChoices: seedResults.reduce((sum, result) => sum + result.changedChoices, 0), totalChangedDownstream: seedResults.reduce((sum, result) => sum + result.changedDownstream, 0) },
  provider: { calls: telemetry.length, model: selected.authorization.model, telemetry: telemetry.map(item => ({ requestId: item.requestId, model: item.model, inputTokens: item.inputTokens, outputTokens: item.outputTokens, latencyMs: item.latencyMs, costCents: item.costCents, cumulativeCostCents: item.cumulativeCostCents, outcome: item.outcome, error: item.error })) },
  decision: selected.authorization.execution === "deterministic-control" ? "live-rehearsal-required" : fallbackOnly ? "live-rehearsal-blocked" : !safetyPassed ? "stop-and-revise" : usefulSeeds >= 3 ? "proceed-to-next-review" : "defer-for-quality",
  acceptance: { safetyPassed, repeatableUsefulValue: usefulSeeds >= 3, providerFreeReplay: seedResults.every(result => result.safety.replayProviderFree), noBroaderDeployment: true }
};
assert(report.acceptance.safetyPassed, "P16 safety rubric failed");
assert(report.budgets.withinCaps, "P16 aggregate hard cap exceeded");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdownPath = outputPath.replace(/\.json$/, ".md");
writeFileSync(markdownPath, [
  "# AI-P16 bounded Vertex repeatability evaluation",
  "",
  `Generated: ${report.generatedAt}`,
  `Execution: **${report.authorization.execution}**`,
  `Fixed seeds: **${seeds.join(", ")}**; encounters per seed: **${encounterCount}**`,
  "",
  "## Results",
  "",
  `- Useful seeds: ${usefulSeeds}/${seeds.length}; valid proposal seeds: ${report.summary.validSeeds}/${seeds.length}.`,
  `- Recorded interpretations: ${report.summary.totalRecorded}; fallbacks: ${report.summary.totalFallbacks}.`,
  `- Choice changes: ${report.summary.totalChangedChoices}; downstream staged changes: ${report.summary.totalChangedDownstream}.`,
  `- Provider calls: ${report.provider.calls}; cumulative cost: ${costCents} cents; hard cap: 100 cents.`,
  "",
  "## Review rubric",
  "",
  "A seed is useful only when it records a valid evidence-grounded proposal and changes both a staged choice and downstream social state. Safety requires private hosting, deterministic authority, caps, provider-free replay, valid proposals, and no broader deployment.",
  "",
  `- Safety gates: **${report.acceptance.safetyPassed ? "pass" : "fail"}**`,
  `- Repeatable useful value: **${report.acceptance.repeatableUsefulValue ? "pass" : "fail"}**`,
  `- Provider-free replay: **${report.acceptance.providerFreeReplay ? "pass" : "fail"}**`,
  `- Decision: **${report.decision}**`,
  ""
].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, markdownPath, execution: report.authorization.execution, seeds, providerCalls: report.provider.calls, costCents, usefulSeeds, decision: report.decision }, null, 2));

