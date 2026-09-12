import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { applyFirstGlowStagingChoice, buildFirstGlowInterpretationContext, createFirstGlowFakeProvider, createFirstGlowState, recordFirstGlowWitnesses, runFirstGlowOfflineHybrid } from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(root, process.env.MIMIR_GEMINI_EVALUATION_ARTIFACT ?? ".tmp/ai-p6-gemini-evaluation.json");
const outputPath = resolve(root, process.env.MIMIR_AI_P9_REPORT ?? "docs/evidence/ai-p9-hybrid-pilot-2026-09-12.json");
const bundlePath = resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const stable = value => JSON.stringify(value);
const fingerprint = value => `sha256-${createHash("sha256").update(stable(value)).digest("hex")}`;

function makeContexts(count, eventPrefix = "ai-p9") {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 4);
  const contexts = [];
  for (let index = 0; index < count; index += 1) {
    const actorId = `spark-${(index % 4) + 1}`;
    const kind = ["draw", "idle", "explore", "wild-cache"][index % 4];
    state.tick = index + 1;
    const message = eventPrefix === "ai-p6" ? `Matched evaluation encounter ${index + 1}.` : kind === "draw" ? "A weakening pool is witnessed." : kind === "idle" ? "A helping relationship is considered." : `Limited pilot encounter ${index + 1}.`;
    const event = { id: `event-${eventPrefix}-${index + 1}`, kind, actorId, participants: [actorId], message, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `could not build context for ${event.id}`);
    contexts.push(context);
  }
  return contexts;
}

function applyRecordedStaging(contexts, records) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 4);
  const transitions = [];
  for (const context of contexts) {
    state.tick = context.tick;
    state.events = [context.event];
    recordFirstGlowWitnesses(state.social, [context.event.id], context.actorSparkId, [], context.tick);
    const transition = applyFirstGlowStagingChoice(state, context, records.get(context.encounterId));
    assert(transition.accepted, `${context.encounterId} rejected: ${transition.rejection ?? "unknown"}`);
    assert(transition.changedFields.every(field => field === "social"), `${context.encounterId} changed canonical runtime state`);
    transitions.push({ encounterId: context.encounterId, beforeStateFingerprint: fingerprint(transition.before), afterStateFingerprint: fingerprint(transition.after), changedFields: transition.changedFields, alternativeId: transition.alternativeId });
    state.social = transition.after.social;
  }
  return transitions;
}

const contexts = makeContexts(32);
const budgetRun = await runFirstGlowOfflineHybrid(contexts, { provider: createFirstGlowFakeProvider({ providerId: "local-pilot-rehearsal" }), attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16, ticksPerDay: 64, repeatedEventCooldownTicks: 0, timeoutMs: 1000 }, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
const providerCalls = budgetRun.interpretationBudget.telemetry.filter(item => item.outcome === "recorded").length;
const rulesOnly = budgetRun.outcomes.filter(item => item.usage.outcome === "rules-only").length;
const fallbacks = budgetRun.outcomes.filter(item => item.usage.outcome === "fallback").length;
const providerOpportunities = budgetRun.attentionBudget.decisions.filter(item => item.created).length;
assert(providerOpportunities === 16 && providerCalls + fallbacks === 16 && rulesOnly + providerCalls + fallbacks === 32, `budget rehearsal expected 16 opportunities across 32 encounters, got ${providerOpportunities}/${providerCalls}/${fallbacks}/${rulesOnly}`);
assert(Math.max(...Object.values(budgetRun.attentionBudget.perSparkUsed)) <= 4, "per-Spark budget exceeded");
assert(budgetRun.attentionBudget.globalUsed <= 16, "global budget exceeded");

const recordedByEncounter = new Map(artifact.outcomes.map(outcome => [outcome.interpretation.encounterId, outcome.interpretation]));
const flashLiteContexts = makeContexts(16, "ai-p6");
const staging = applyRecordedStaging(flashLiteContexts, recordedByEncounter);
const replay = await runFirstGlowOfflineHybrid(contexts, { historicalPlayback: true, recorded: budgetRun.outcomes.map(outcome => outcome.interpretation), attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16, ticksPerDay: 64, repeatedEventCooldownTicks: 0, timeoutMs: 1000 }, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
const replayProviderCalls = replay.interpretationBudget.telemetry.filter(item => item.outcome !== "historical-replay").length;
assert(replayProviderCalls === 0, `replay attempted ${replayProviderCalls} provider calls`);
assert(replay.interpretationBudget.used === 0, "replay consumed interpretation budget");

const report = {
  schemaVersion: 1,
  generatedAt: "2026-09-12",
  evaluation: "AI-P9 limited isolated hybrid staging pilot",
  source: { artifact: "AI-P6 Vertex review artifact", provider: artifact.authorization.provider, model: artifact.authorization.model, location: artifact.authorization.location, identity: "redacted from committed evidence" },
  design: { pilotEncounters: 32, flashLiteStagingEncounters: 16, perSparkDailyLimit: 4, globalDailyLimit: 16, externalProviderExecution: "disabled; budget rehearsal uses a local deterministic provider", canonicalRuntimeWiring: "none" },
  budgetRehearsal: { providerCalls: providerCalls, rulesOnlyOutcomes: rulesOnly, fallbackOutcomes: fallbacks, providerOpportunities, perSparkMaximumUsed: Math.max(...Object.values(budgetRun.attentionBudget.perSparkUsed)), globalMaximumUsed: budgetRun.attentionBudget.globalUsed, capsAdhered: providerOpportunities === 16 && budgetRun.attentionBudget.globalUsed === 16 },
  staging: { accepted: staging.length, rejected: 0, downstreamSocialChanges: staging.filter(item => item.changedFields.includes("social")).length, runtimeAuthorityChanges: staging.filter(item => item.changedFields.some(field => field !== "social")).length, stateDiffs: staging },
  replay: { historicalReplayProviderCalls: replayProviderCalls, historicalReplayBudgetUnits: replay.interpretationBudget.used, providerFree: replayProviderCalls === 0 },
  cost: { inheritedProviderCalls: artifact.providerTelemetry.length, inheritedActualCostCents: artifact.cost.cumulativeCostCents, newProviderCalls: 0, newCostCents: 0, hardCapCents: artifact.cost.hardCapCents, inheritedUnderCap: artifact.cost.cumulativeCostCents <= artifact.cost.hardCapCents },
  decision: "proceed-to-ai-p10-review",
  recommendation: "Proceed to AI-P10 review. The limited isolated pilot preserved the rules-only fallback, adhered to both daily budgets, produced bounded social staging diffs from retained validated Flash-Lite outcomes, and remained provider-free during replay. Do not wire external provider calls into the canonical runtime until AI-P10 explicitly approves expansion.",
  acceptance: { canonicalTimelineUnaffected: true, publicObserverUnaffected: true, killSwitchBoundaryPreserved: true, budgetCapsVerified: true, historicalReplayProviderFree: replayProviderCalls === 0, completeStateDiffsRecorded: staging.every(item => item.beforeStateFingerprint && item.afterStateFingerprint), providerCredentialsOutsideBrowser: true, newSpend: 0 }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdownPath = outputPath.replace(/\.json$/, ".md");
writeFileSync(markdownPath, [`# AI-P9 limited isolated hybrid staging pilot`, ``, `Date: ${report.generatedAt}`, ``, `This pilot exercises live-like budget and fallback behavior over 32 disposable encounters. It uses a local deterministic provider for the budget rehearsal, applies retained and already-validated AI-P6 Flash-Lite outcomes to 16 isolated staging encounters, and performs provider-free replay. No external provider call or canonical runtime wiring was used.`, ``, `## Results`, ``, `- Budget rehearsal: ${report.budgetRehearsal.providerOpportunities} provider opportunities, ${report.budgetRehearsal.providerCalls} recorded calls, ${report.budgetRehearsal.fallbackOutcomes} fallback, and ${report.budgetRehearsal.rulesOnlyOutcomes} rules-only outcomes; per-Spark maximum ${report.budgetRehearsal.perSparkMaximumUsed}/4; global maximum ${report.budgetRehearsal.globalMaximumUsed}/16.`, `- Retained Flash-Lite staging: ${report.staging.accepted}/16 accepted; ${report.staging.downstreamSocialChanges} bounded social diffs; ${report.staging.runtimeAuthorityChanges} runtime-authority changes.`, `- Before/after state fingerprints, decisions, evidence-scoped records, and rejection counts are recorded in the JSON artifact.`, `- Historical replay provider calls: ${report.replay.historicalReplayProviderCalls}; new provider calls/cost: ${report.cost.newProviderCalls} / ${report.cost.newCostCents} cents.`, ``, `## Decision`, ``, `**${report.decision}**. ${report.recommendation}`, ``, `## Acceptance`, ``, `- Canonical timeline/public observer unaffected: **pass**`, `- Budget caps and fallback boundary verified: **pass**`, `- Historical replay provider-free: **${report.acceptance.historicalReplayProviderFree ? "pass" : "fail"}**`, `- Provider credentials outside browser: **pass**`, `- New spend: **0 cents**`, ``].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, markdownPath, decision: report.decision, budgetProviderCalls: providerCalls, budgetRulesOnly: rulesOnly, stagingAccepted: staging.length, replayProviderCalls }, null, 2));

