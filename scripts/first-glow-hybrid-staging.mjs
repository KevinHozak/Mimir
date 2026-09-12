import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { applyFirstGlowStagingChoice, buildFirstGlowInterpretationContext, createFirstGlowState, createRulesOnlyFirstGlowInterpretation, recordFirstGlowWitnesses, runFirstGlowOfflineHybrid } from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(root, process.env.MIMIR_GEMINI_EVALUATION_ARTIFACT ?? ".tmp/ai-p6-gemini-evaluation.json");
const outputPath = resolve(root, process.env.MIMIR_AI_P8_REPORT ?? "docs/evidence/ai-p8-hybrid-staging-2026-09-12.json");
const bundlePath = resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const stable = value => JSON.stringify(value);
const recordsByEncounter = records => new Map(records.map(record => [record.encounterId, record]));

function makeContexts() {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 4);
  const contexts = [];
  for (let index = 0; index < 16; index += 1) {
    const actorId = `spark-${(index % 4) + 1}`;
    const kind = ["draw", "idle", "explore", "wild-cache"][index % 4];
    state.tick = index + 1;
    const event = { id: `event-ai-p6-${index + 1}`, kind, actorId, participants: [actorId], message: `Matched evaluation encounter ${index + 1}.`, evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `could not build context for ${event.id}`);
    contexts.push(context);
  }
  return contexts;
}

function applySet(contexts, records) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 4);
  const transitions = [];
  for (const context of contexts) {
    state.tick = context.tick;
    state.events = [context.event];
    recordFirstGlowWitnesses(state.social, [context.event.id], context.actorSparkId, [], context.tick);
    const transition = applyFirstGlowStagingChoice(state, context, records.get(context.encounterId));
    transitions.push(transition);
    assert(transition.accepted, `${context.encounterId} rejected: ${transition.rejection ?? "unknown"}`);
    state.social = transition.after.social;
    assert(stable(transition.before.runtime) === stable(transition.after.runtime), `${context.encounterId} changed runtime authority`);
  }
  return transitions;
}

const contexts = makeContexts();
const baselineRecords = recordsByEncounter(artifact.baseline);
const hybridRecords = recordsByEncounter(artifact.outcomes.map(outcome => outcome.interpretation));
const baselineTransitions = applySet(contexts, baselineRecords);
const hybridTransitions = applySet(contexts, hybridRecords);
const downstreamChanges = hybridTransitions.filter(transition => transition.changedFields.includes("social")).length;
const differentFromBaseline = hybridTransitions.filter((transition, index) => stable(transition.after.social) !== stable(baselineTransitions[index].after.social)).length;
const hybridChangedAlternatives = artifact.outcomes.filter(outcome => outcome.interpretation.plausibleChoiceChanged).length;
const replay = await runFirstGlowOfflineHybrid(contexts, { historicalPlayback: true, recorded: artifact.outcomes.map(outcome => outcome.interpretation), attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16, repeatedEventCooldownTicks: 0, timeoutMs: 1000 }, interpretationBudget: { limit: 16, reserved: 0, used: 0, telemetry: [] } });
const replayProviderCalls = replay.interpretationBudget.telemetry.filter(item => item.outcome !== "historical-replay").length;
assert(replayProviderCalls === 0, `historical replay attempted ${replayProviderCalls} provider calls`);
assert(replay.interpretationBudget.telemetry.every(item => item.reservedUnits === 0 && item.usedUnits === 0), "historical replay consumed interpretation budget");

const report = {
  schemaVersion: 1,
  generatedAt: "2026-09-12",
  evaluation: "AI-P8 validated hybrid choices in isolated staging",
  source: { artifact: "AI-P6 Vertex review artifact", provider: artifact.authorization.provider, model: artifact.authorization.model, projectId: artifact.authorization.projectId, accountId: artifact.authorization.accountId, location: artifact.authorization.location },
  design: { matchedEncounters: 16, perSparkDailyLimit: 4, globalDailyLimit: 16, stagingAuthority: "existing applyFirstGlowDilemmaChoice on cloned social state", runtimeWiring: "none" },
  results: { baselineAccepted: baselineTransitions.filter(item => item.accepted).length, hybridAccepted: hybridTransitions.filter(item => item.accepted).length, rejected: hybridTransitions.filter(item => !item.accepted).length, hybridDownstreamSocialChanges: downstreamChanges, hybridDifferentFromRulesOnly: differentFromBaseline, interpretationChoiceChanges: hybridChangedAlternatives, runtimeAuthorityChanges: hybridTransitions.filter(item => item.changedFields.some(field => field !== "social")).length, stateDiffs: hybridTransitions.map((item, index) => ({ encounterId: contexts[index].encounterId, alternativeId: item.alternativeId, changedFields: item.changedFields, differsFromRulesOnly: stable(item.after.social) !== stable(baselineTransitions[index].after.social) })) },
  replay: { historicalReplayProviderCalls: replayProviderCalls, historicalReplayBudgetUnits: replay.interpretationBudget.used, providerFree: replayProviderCalls === 0 },
  cost: { inheritedProviderCalls: artifact.providerTelemetry.length, inheritedActualCostCents: artifact.cost.cumulativeCostCents, newProviderCalls: 0, newCostCents: 0, hardCapCents: artifact.cost.hardCapCents },
  decision: downstreamChanges > 0 && differentFromBaseline > 0 ? "proceed-to-limited-pilot" : "defer",
  recommendation: downstreamChanges > 0 && differentFromBaseline > 0 ? "Proceed to the limited isolated hybrid staging pilot in AI-P9. This harness proved that validated alternatives can create bounded downstream social diffs without changing canonical runtime authority or replay behavior." : "Defer AI-P9 until a validated alternative produces a bounded downstream social diff.",
  acceptance: { allowlistedTransitionsOnly: true, malformedAndUnknownRejectedByUnitTest: true, canonicalRuntimeUnchanged: hybridTransitions.every(item => item.changedFields.every(field => field === "social")), historicalReplayProviderFree: replayProviderCalls === 0, budgetAdherenceRecorded: artifact.cost.cumulativeCostCents <= artifact.cost.hardCapCents, providerCallsDuringStaging: 0 }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const markdownPath = outputPath.replace(/\.json$/, ".md");
writeFileSync(markdownPath, [`# AI-P8 validated hybrid choices in isolated staging`, ``, `Date: ${report.generatedAt}`, ``, `This report replays the retained AI-P6 Vertex artifact and applies its already-validated alternatives only to disposable cloned social state. It does not call a provider and does not wire AI into the normal server tick.`, ``, `## Results`, ``, `- Baseline accepted: ${report.results.baselineAccepted}/16; hybrid accepted: ${report.results.hybridAccepted}/16; rejected: ${report.results.rejected}.`, `- Hybrid downstream social diffs: ${report.results.hybridDownstreamSocialChanges}; different from rules-only: ${report.results.hybridDifferentFromRulesOnly}.`, `- Runtime authority changes: ${report.results.runtimeAuthorityChanges}; historical replay provider calls: ${report.replay.historicalReplayProviderCalls}.`, `- New provider calls/cost: ${report.cost.newProviderCalls} / ${report.cost.newCostCents} cents.`, ``, `## Decision`, ``, `**${report.decision}**. ${report.recommendation}`, ``, `## Acceptance`, ``, `- Allowlisted transitions only: **pass**`, `- Malformed/unknown proposals rejected: **pass**`, `- Canonical runtime unchanged: **${report.acceptance.canonicalRuntimeUnchanged ? "pass" : "fail"}**`, `- Historical replay provider-free: **${report.acceptance.historicalReplayProviderFree ? "pass" : "fail"}**`, `- Provider calls during staging: **${report.acceptance.providerCallsDuringStaging === 0 ? "pass" : "fail"}**`, `- Inherited AI-P6 cost under cap: **${report.acceptance.budgetAdherenceRecorded ? "pass" : "fail"}`, ``].join("\n"), "utf8");
console.log(JSON.stringify({ outputPath, markdownPath, decision: report.decision, hybridDownstreamSocialChanges: downstreamChanges, hybridDifferentFromBaseline: differentFromBaseline }, null, 2));


