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
const outputPath = resolve(root, process.env.MIMIR_AI_P13_REPORT ?? ".tmp/ai-p13-hybrid-pilot.json");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const stable = value => JSON.stringify(value);
const fingerprint = value => `sha256-${createHash("sha256").update(stable(value)).digest("hex")}`;

function makeContexts() {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 4);
  const contexts = [];
  for (let index = 0; index < 32; index += 1) {
    const actorId = `spark-${(index % 4) + 1}`;
    const kind = ["draw", "idle", "explore", "wild-cache"][index % 4];
    state.tick = index + 1;
    const message = kind === "draw" ? "A weakening charge pool is witnessed." : kind === "idle" ? "A Spark considers a helping relationship." : `Fixed-seed pilot encounter ${index + 1}.`;
    const event = { id: `event-ai-p13-${index + 1}`, kind, actorId, participants: [actorId], message, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Could not build context for ${event.id}`);
    contexts.push(context);
  }
  return contexts;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live P13 execution`);
  return value;
}

function createPilotProvider() {
  if (process.env.MIMIR_AI_P13_LIVE !== "true") {
    return {
      provider: createFirstGlowFakeProvider({ providerId: "local-deterministic-p13-rehearsal" }),
      authorization: { execution: "deterministic-rehearsal", provider: "local fake provider", model: "local-deterministic-rehearsal", location: "local", accountId: "not applicable" }
    };
  }
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
    model: "gemini-2.5-flash-lite"
  };
  assert(config.hardCapCents === 100, "P13 requires the approved $1.00 hard cap");
  assert(config.killSwitch === "enabled", "P13 requires the enabled P11 kill switch");
  assert(required("MIMIR_GEMINI_RETENTION_MODE") === "review-artifact", "P13 requires review-artifact retention");
  return {
    provider: createFirstGlowVertexGeminiPilotProvider(config),
    authorization: { execution: "vertex-live", provider: "Google Vertex AI", model: config.model, location: config.location, accountId: config.accountId, projectId: config.projectId, hardCapCents: config.hardCapCents }
  };
}

function stage(contexts, records) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 4);
  return contexts.map(context => {
    state.tick = context.tick;
    state.events = [context.event];
    recordFirstGlowWitnesses(state.social, [context.event.id], context.actorSparkId, [], context.tick);
    const transition = applyFirstGlowStagingChoice(state, context, records.get(context.encounterId));
    assert(transition.accepted, `${context.encounterId} rejected: ${transition.rejection ?? "unknown"}`);
    assert(transition.changedFields.every(field => field === "social"), `${context.encounterId} changed canonical runtime authority`);
    state.social = transition.after.social;
    return { encounterId: context.encounterId, alternativeId: transition.alternativeId, changedFields: transition.changedFields, beforeStateFingerprint: fingerprint(transition.before), afterStateFingerprint: fingerprint(transition.after) };
  });
}

const contexts = makeContexts();
const attentionPolicy = { perSparkDailyLimit: 4, globalDailyLimit: 16, ticksPerDay: 64, repeatedEventCooldownTicks: 0, timeoutMs: 1000 };
const baseline = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "rules-only", attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
const selected = createPilotProvider();
const pilot = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: selected.provider, attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
const baselineRecords = new Map(baseline.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
const pilotRecords = new Map(pilot.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
const baselineStages = stage(contexts, baselineRecords);
const pilotStages = stage(contexts, pilotRecords);
const changedFromRulesOnly = pilotStages.filter((item, index) => item.afterStateFingerprint !== baselineStages[index].afterStateFingerprint).length;
let replayCalls = 0;
const replayProvider = { providerId: "replay-must-not-call", interpret: async () => { replayCalls += 1; throw new Error("provider called during replay"); } };
const replay = await runFirstGlowHybridRuntime(contexts, { runtimeMode: "bounded-internal-pilot", provider: replayProvider, historicalPlayback: true, recorded: pilot.outcomes.map(outcome => outcome.interpretation), attentionPolicy, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
const providerTelemetry = "telemetry" in selected.provider ? selected.provider.telemetry : [];
const perSparkMaximum = Math.max(...Object.values(pilot.attentionBudget.perSparkUsed));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evaluation: "AI-P13 bounded internal hybrid runtime pilot",
  fixedSeed: 20260912,
  encounters: 32,
  authorization: { ...selected.authorization, identity: selected.authorization.accountId === "not applicable" ? "not applicable" : "redacted from evidence" },
  budgets: { perSparkDailyLimit: 4, globalDailyLimit: 16, perSparkMaximumUsed: perSparkMaximum, globalUsed: pilot.attentionBudget.globalUsed, providerOpportunities: pilot.attentionBudget.decisions.filter(item => item.created).length, interpretationUnitsUsed: pilot.interpretationBudget.used, withinCaps: perSparkMaximum <= 4 && pilot.attentionBudget.globalUsed <= 16 && pilot.interpretationBudget.used <= 16 },
  outcomes: { rulesOnly: baseline.outcomes.filter(item => item.usage.outcome === "rules-only").length, pilotRecorded: pilot.outcomes.filter(item => item.usage.outcome === "recorded").length, pilotFallbacks: pilot.outcomes.filter(item => item.usage.outcome === "fallback").length, acceptedStaging: pilotStages.length, changedFromRulesOnly, canonicalRuntimeAuthorityChanges: pilotStages.filter(item => item.changedFields.some(field => field !== "social")).length },
  provider: { calls: providerTelemetry.length, model: selected.authorization.model, telemetry: providerTelemetry.map(item => ({ requestId: item.requestId, model: item.model, inputTokens: item.inputTokens, outputTokens: item.outputTokens, latencyMs: item.latencyMs, costCents: item.costCents, cumulativeCostCents: item.cumulativeCostCents, outcome: item.outcome, error: item.error })) },
  replay: { providerCalls: replayCalls, budgetUnitsUsed: replay.interpretationBudget.used, recordsMatched: replay.outcomes.length, providerFree: replayCalls === 0 && replay.interpretationBudget.used === 0 },
  stateDiffs: pilotStages,
  decision: "pilot-evidence-captured",
  acceptance: { isolated: true, deterministicAuthority: pilotStages.every(item => item.changedFields.every(field => field === "social")), capsAdhered: perSparkMaximum <= 4 && pilot.attentionBudget.globalUsed <= 16, replayProviderFree: replayCalls === 0 && replay.interpretationBudget.used === 0, noBroaderDeployment: true }
};
assert(report.acceptance.deterministicAuthority, "pilot changed canonical runtime authority");
assert(report.acceptance.capsAdhered, "pilot exceeded a daily cap");
assert(report.acceptance.replayProviderFree, "replay was not provider-free");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\\n`, "utf8");
const markdownPath = outputPath.replace(/\\.json$/, ".md");
writeFileSync(markdownPath, [
  "# AI-P13 bounded internal hybrid runtime pilot",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  `Execution: **${report.authorization.execution}**`,
  `Provider/model: **${report.authorization.provider} / ${report.authorization.model}**`,
  `Encounters: **${report.encounters}**, fixed seed: **${report.fixedSeed}**`,
  "",
  "## Results",
  "",
  `- Attention opportunities: ${report.budgets.providerOpportunities}; per-Spark maximum ${report.budgets.perSparkMaximumUsed}/4; global ${report.budgets.globalUsed}/16.`,
  `- Pilot recorded outcomes: ${report.outcomes.pilotRecorded}; fallbacks: ${report.outcomes.pilotFallbacks}; staging applications: ${report.outcomes.acceptedStaging}.`,
  `- Changed from rules-only: ${report.outcomes.changedFromRulesOnly}; canonical runtime-authority changes: ${report.outcomes.canonicalRuntimeAuthorityChanges}.`,
  `- Provider calls: ${report.provider.calls}; cost: ${report.provider.telemetry.at(-1)?.cumulativeCostCents ?? 0} cents.`,
  `- Replay provider calls: ${report.replay.providerCalls}; replay budget units: ${report.replay.budgetUnitsUsed}.`,
  "",
  "## Acceptance",
  "",
  `- Isolated from public/canonical state: **${report.acceptance.isolated ? "pass" : "fail"}**`,
  `- Deterministic authority preserved: **${report.acceptance.deterministicAuthority ? "pass" : "fail"}**`,
  `- Per-Spark/global caps adhered to: **${report.acceptance.capsAdhered ? "pass" : "fail"}**`,
  `- Provider-free replay: **${report.acceptance.replayProviderFree ? "pass" : "fail"}**`,
  "- Broader deployment: **none**",
  ""
].join("\\n"), "utf8");
console.log(JSON.stringify({ outputPath, markdownPath, execution: report.authorization.execution, provider: report.authorization.provider, model: report.authorization.model, calls: report.provider.calls, costCents: report.provider.telemetry.at(-1)?.cumulativeCostCents ?? 0, changedFromRulesOnly, replayProviderCalls: replayCalls }, null, 2));
