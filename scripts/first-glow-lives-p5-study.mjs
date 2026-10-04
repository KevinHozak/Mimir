import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFirstGlowInterpretationContext, createFirstGlowFakeProvider, createFirstGlowState, runFirstGlowHybridRuntime, recordFirstGlowWitnesses } from "@mimir/engine";
import { decodeWorldBundle } from "@mimir/world-data";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundleHash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const bundlePath = join(root, "assets/world/generated", bundleHash, "world.json");
const protocolPath = join(root, "docs/evidence/first-glow-lives-p5-protocol.md");
const defaultOutput = join(root, "docs/evidence/first-glow-lives-p5-study-2026-09-20.json");
const defaultMarkdown = defaultOutput.replace(/\.json$/, ".md");
const seeds = [2, 4, 8];
const conditions = ["dependable-supply", "scarcity"];
const sparks = ["spark-1", "spark-2", "spark-3", "spark-4", "spark-5", "spark-6"];
const pulsesPerCycle = 64;
const cycles = 4;
const totalPulses = pulsesPerCycle * cycles;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function makeContexts(seed, condition) {
  const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8")));
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparks.length);
  const contexts = [];
  for (let pulse = 0; pulse < totalPulses; pulse += 8) {
    const actorId = sparks[(pulse / 8 + seed) % sparks.length];
    const kind = condition === "scarcity" && pulse % 16 === 0 ? "draw" : ["explore", "draw", "idle", "wild-cache"][(pulse / 8 + seed) % 4];
    const event = { id: `lives-p5-${seed}-${condition}-${pulse}`, pulse, kind, actorId, participants: [actorId], message: condition === "scarcity" && pulse % 16 === 0 ? `Scarcity pressure at pulse ${pulse}.` : `Recorded ${kind} opportunity at pulse ${pulse}.`, evidenceEventIds: [] };
    state.pulse = pulse;
    state.events = [...state.events, event];
    const spark = state.settlements[0].sparks.find(item => item.id === actorId);
    spark.knownEvidenceEventIds.push(event.id);
    recordFirstGlowWitnesses(state.social, [event.id], actorId, [], pulse);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert(context, `Unable to construct context for ${event.id}`);
    contexts.push({ context, input: { event, seed, condition, pulse }, state: structuredClone(state) });
  }
  return contexts;
}

const policy = () => ({ perSparkDailyLimit: 2, globalDailyLimit: 8, repeatedEventCooldownPulses: 0, pulsesPerDay: 16, timeoutMs: 5 });
const sanitizeOutcome = outcome => ({ encounterId: outcome.interpretation.encounterId, contextHash: outcome.interpretation.contextHash, source: outcome.interpretation.source, alternativeId: outcome.interpretation.alternativeId, evidenceEventIds: outcome.interpretation.evidenceEventIds, fallbackReason: outcome.interpretation.fallbackReason, usage: { requestId: outcome.usage.requestId, outcome: outcome.usage.outcome, reason: outcome.usage.reason, reservedUnits: outcome.usage.reservedUnits, usedUnits: outcome.usage.usedUnits, inputTokens: outcome.usage.inputTokens, outputTokens: outcome.usage.outputTokens, latencyMs: outcome.usage.latencyMs }, decision: { trigger: outcome.decision.trigger, validation: outcome.decision.validation, usageOutcome: outcome.decision.usage.outcome } });
const publicArm = arm => ({ arm: arm.arm, outputs: arm.outputs, attention: { decisionCount: arm.attention.decisions.length, createdCount: arm.attention.decisions.filter(item => item.created).length, suppressedCount: arm.attention.decisions.filter(item => !item.created).length, reasons: Object.fromEntries([...new Set(arm.attention.decisions.map(item => item.reason))].sort().map(reason => [reason, arm.attention.decisions.filter(item => item.reason === reason).length])) }, telemetry: arm.telemetry });

async function runArm(contexts, arm, provider = createFirstGlowFakeProvider({ providerId: "local-lives-p5-fake" })) {
  const captured = [];
  const wrapped = { providerId: provider.providerId, interpret: async context => { captured.push(structuredClone(context)); return provider.interpret(context); } };
  const result = await runFirstGlowHybridRuntime(contexts.map(item => item.context), { runtimeMode: arm === "ai" ? "bounded-internal-pilot" : "rules-only", provider: wrapped, attentionPolicy: policy(), interpretationBudget: { limit: 8, reserved: 0, used: 0, telemetry: [] } });
  return { arm, outputs: result.outcomes.map(sanitizeOutcome), captured, attention: result.attentionBudget, telemetry: result.interpretationBudget.telemetry };
}

async function replay(armRun, contexts) {
  let calls = 0;
  const result = await runFirstGlowHybridRuntime(contexts.map(item => item.context), { runtimeMode: "bounded-internal-pilot", historicalPlayback: true, recorded: armRun.outputs, provider: { providerId: "replay-must-not-call", interpret: async () => { calls += 1; throw new Error("provider called during replay"); } }, attentionPolicy: policy(), interpretationBudget: { limit: 8, reserved: 0, used: 0, telemetry: [] } });
  return { calls, outputs: result.outcomes.map(sanitizeOutcome), budgetUsed: result.interpretationBudget.used };
}

const repoRelative = path => relative(root, path).replace(/\\/g, "/");
const manifestFor = (run, outputPath) => {
  const relPath = repoRelative(outputPath);
  return {
    runId: run.runId,
    configuration: run.configuration,
    sanitizedOutputs: relPath,
    replayInputs: `${relPath}#runs/${run.runId}/ai/outputs`,
    telemetry: `${relPath}#runs/${run.runId}/ai/telemetry`,
    reviewArtifacts: ["docs/evidence/first-glow-lives-p5-protocol.md", "docs/living-lives-plan.md"],
    status: run.status,
  };
};

export async function runStudy({ outputPath = defaultOutput, failureAfterRun = null, resume = null } = {}) {
  assert(existsSync(protocolPath), "Prerequisite protocol is missing");
  const plans = seeds.flatMap(seed => conditions.map(condition => ({ seed, condition })));
  const runs = [...(resume?.runs ?? [])];
  for (let index = runs.length; index < plans.length; index += 1) {
    if (failureAfterRun !== null && index >= failureAfterRun) return { status: "incomplete", runs, resumeToken: { runs } };
    const plan = plans[index];
    const contexts = makeContexts(plan.seed, plan.condition);
    const rules = await runArm(contexts, "rules");
    const ai = await runArm(contexts, "ai");
    const watched = await runArm(contexts, "ai");
    const aiReplay = await replay(ai, contexts);
    const watchedReplay = await replay(watched, contexts);
    const sameInputs = ai.captured.every((item, i) => JSON.stringify(item) === JSON.stringify(watched.captured[i]));
    const futureIds = contexts.map(item => item.input.event.id);
    const noFutureKnowledge = ai.captured.every(item => {
      const contextIndex = contexts.findIndex(candidate => candidate.context.encounterId === item.encounterId);
      return contextIndex >= 0 && futureIds.slice(contextIndex + 1).every(id => !JSON.stringify(item).includes(id));
    });
    const accountingComplete = ai.outputs.every(item => item.usage && Number.isFinite(item.usage.latencyMs) && Number.isFinite(item.usage.usedUnits));
    runs.push({ runId: `${plan.seed}-${plan.condition}`, configuration: { ...plan, sparks: sparks.length, cycles, pulsesPerCycle, bundleHash, simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2" }, rules: publicArm(rules), ai: publicArm(ai), watched: publicArm(watched), replay: { ai: aiReplay, watched: watchedReplay }, checks: { sameInputs, noFutureKnowledge, accountingComplete, replayProviderFree: aiReplay.calls === 0 && watchedReplay.calls === 0, replayBudgetFree: aiReplay.budgetUsed === 0 && watchedReplay.budgetUsed === 0, noViewingAdvantage: JSON.stringify(ai.outputs.map(item => item.alternativeId)) === JSON.stringify(watched.outputs.map(item => item.alternativeId)), completeManifest: true }, status: "complete" });
  }
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), protocol: { path: "docs/evidence/first-glow-lives-p5-protocol.md", preregistered: true }, study: { seeds, conditions, arms: ["rules-only", "authorized-ai-offline-fixture"], population: sparks.length, cycles, pulsesPerCycle, totalPulses }, runs, manifests: runs.map(run => manifestFor(run, outputPath)), integrity: { allRunsComplete: runs.length === plans.length && runs.every(run => run.status === "complete"), allReplayProviderFree: runs.every(run => run.checks.replayProviderFree), allReplayBudgetFree: runs.every(run => run.checks.replayBudgetFree), allMatchedInputs: runs.every(run => run.checks.sameInputs), allKnowledgeBounded: runs.every(run => run.checks.noFutureKnowledge), allAccountingComplete: runs.every(run => run.checks.accountingComplete), noViewingAdvantage: runs.every(run => run.checks.noViewingAdvantage) }, review: { independentHumanReview: "pending", humanEngagementClaims: "not assessed", views: ["World", "Follow", "Chronicle"] }, decision: "defer", nextImprovement: null, limitations: ["The fake provider validates harness integrity, not real-model quality.", "No human review was authorized or conducted.", "This report cannot pass the AI benefit gate or authorize model/age rollout."] };
  const markdownPath = outputPath.endsWith(".json") ? outputPath.slice(0, -5) + ".md" : `${outputPath}.md`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, `# First Glow Lives-P5 Study\n\nGenerated: ${report.generatedAt}\n\nProtocol: preregistered before outputs\n\nRuns: **${runs.length}** complete matched seed/condition studies\n\nIntegrity: replay provider-free **${report.integrity.allReplayProviderFree ? "pass" : "fail"}**, matched inputs **${report.integrity.allMatchedInputs ? "pass" : "fail"}**, no viewing advantage **${report.integrity.noViewingAdvantage ? "pass" : "fail"}**\n\nDecision: **defer**\n\nThe offline fake-provider harness is complete, but live AI quality and independent human review remain pending. No benefit claim or model rollout is authorized.\n`, "utf8");
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await runStudy({ outputPath: process.env.MIMIR_LIVES_P5_REPORT ? resolve(root, process.env.MIMIR_LIVES_P5_REPORT) : defaultOutput });
  console.log(JSON.stringify({ status: report.integrity.allRunsComplete ? "complete" : "incomplete", runs: report.runs.length, integrity: report.integrity, decision: report.decision }, null, 2));
}
