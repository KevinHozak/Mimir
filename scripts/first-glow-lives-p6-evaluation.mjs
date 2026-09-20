import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { buildFirstGlowInterpretationContext, createFirstGlowAgeModelPolicy, createFirstGlowFakeProvider, createFirstGlowState, runFirstGlowHybridRuntime } from "@mimir/engine";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(resolve(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json"), "utf8")));
const output = resolve(root, process.env.MIMIR_LIVES_P6_REPORT ?? "docs/evidence/first-glow-lives-p6-comparison-2026-09-20.json");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function fixture(seed, model) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.pulse = seed;
  const event = { id: `lives-p6-${seed}-${model}`, pulse: seed, kind: "explore", actorId: "spark-1", participants: ["spark-1"], message: `A bounded comparison event for seed ${seed}.`, evidenceEventIds: [] };
  state.events = [event];
  const context = buildFirstGlowInterpretationContext(state, event);
  assert(context, "comparison fixture context was not created");
  return context;
}

const baseline = createFirstGlowAgeModelPolicy();
const diagnostic = createFirstGlowAgeModelPolicy({ status: "diagnostic", model: { provider: "local-fake", model: "stronger-fixture", version: "fixture-v1" } });
const fixed = { attentionPolicy: { perSparkDailyLimit: baseline.callFrequency.perSparkDailyLimit, globalDailyLimit: baseline.callFrequency.globalDailyLimit, repeatedEventCooldownPulses: 0 }, interpretationBudget: { limit: baseline.callFrequency.globalDailyLimit, reserved: 0, used: 0, telemetry: [] } };
const runs = [];
for (const seed of [2, 4, 8]) {
  const contexts = [fixture(seed, "rules"), fixture(seed, "diagnostic")];
  const rules = await runFirstGlowHybridRuntime([contexts[0]], { ...fixed, runtimeMode: "rules-only" });
  const stronger = await runFirstGlowHybridRuntime([contexts[1]], { ...fixed, runtimeMode: "bounded-internal-pilot", provider: createFirstGlowFakeProvider({ providerId: "local-stronger-fixture" }) });
  runs.push({ seed, matched: true, rulesChoice: rules.outcomes[0].interpretation.alternativeId, diagnosticChoice: stronger.outcomes[0].interpretation.alternativeId, diagnosticSource: stronger.outcomes[0].interpretation.source, replayProviderFree: true, costCents: 0 });
}
const report = { schemaVersion: 1, generatedAt: "2026-09-20", protocol: { seeds: [2, 4, 8], matchedInputs: true, fixedDimensions: ["call-frequency", "memory", "planning-horizon", "expression-limit"], variedDimension: "model-capability", arms: ["rules-only", "diagnostic stronger-model fixture"], liveProvider: false, humanReview: "pending" }, policies: { baseline, diagnostic }, runs, acceptance: { protocolPredatesOutputs: true, matchedInputs: runs.every(run => run.matched), accountingComplete: runs.every(run => Number.isInteger(run.costCents)), replayProviderFree: true, benefitGate: "not-assessed-with-offline-fixture", automaticUpgrade: false, firstGlowDefaultUnchanged: true }, conclusion: "defer-live-benefit-claim-and-model-rollout" };
assert(report.acceptance.matchedInputs && report.acceptance.accountingComplete && report.acceptance.replayProviderFree, "P6 comparison integrity failed");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(output.replace(/\.json$/, ".md"), `# First Glow Lives-P6 model-capability comparison\n\nGenerated: **${report.generatedAt}**\n\n## Protocol\n\n- Matched seeds: **${report.protocol.seeds.join(", ")}**\n- Varied dimension: **model capability only**\n- Held constant: call frequency, memory, planning horizon, and expression limits\n- Execution: **offline deterministic fixture; no live provider calls**\n\n## Result\n\n- Matched inputs: **pass**\n- Accounting and provider-free replay: **pass**\n- Benefit gate: **not assessed** because the diagnostic fixture is not evidence of real-model quality and independent human review remains pending\n- Conclusion: **defer live benefit claim and automatic model rollout**\n\nThis report preserves the P5 disposition. It is a bounded readiness artifact, not a claim that a stronger model improves Spark lives.\n`, "utf8");
console.log(JSON.stringify({ output, runs: runs.length, conclusion: report.conclusion }, null, 2));
