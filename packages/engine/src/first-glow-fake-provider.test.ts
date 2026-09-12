import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { buildFirstGlowInterpretationContext, type FirstGlowInterpretationContext, type FirstGlowInterpretationProvider } from "./first-glow-interpretations.js";
import { createFirstGlowState } from "./structured.js";
import { recordFirstGlowWitnesses } from "./first-glow-social.js";
import { createFirstGlowFakeProvider, runFirstGlowOfflineHybrid } from "./first-glow-fake-provider.js";
import { appendFirstGlowDecision, createFirstGlowHistory, validateFirstGlowHistory } from "./first-glow-history.js";

const decoded = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (decoded.schemaVersion !== 3) throw new Error("fake-provider fixture is not schema 3");
const bundle = decoded as FirstGlowWorldBundle;

function contexts(count = 4): FirstGlowInterpretationContext[] {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const result: FirstGlowInterpretationContext[] = [];
  for (let index = 0; index < count; index += 1) {
    state.tick = index + 1;
    const event = { id: `fake-event-${index}`, kind: (index % 2 ? "mark-trace" : "explore") as "explore" | "mark-trace", actorId: "spark-1", participants: ["spark-1", "spark-2"], message: `Spark 1 observed fixture trace ${index}.` };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], event.actorId, ["spark-2"], state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert.ok(context);
    result.push(context);
  }
  return result;
}

test("offline hybrid loop gates provider calls and records accepted decisions without mutating state", async () => {
  const input = contexts();
  const before = JSON.stringify(input);
  let calls = 0;
  const provider = createFirstGlowFakeProvider({ providerId: "local-fake-test" });
  const wrapped: FirstGlowInterpretationProvider = { providerId: provider.providerId, interpret: async context => { calls += 1; return provider.interpret(context); } };
  const result = await runFirstGlowOfflineHybrid(input, { provider: wrapped, attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16, repeatedEventCooldownTicks: 0 } });
  assert.equal(calls, 4);
  assert.equal(result.outcomes.length, 4);
  assert.ok(result.outcomes.every(outcome => outcome.decision.source === "ai" && outcome.decision.validation === "valid" && outcome.decision.providerId === "local-fake-test"));
  assert.ok(result.outcomes.every(outcome => outcome.decision.candidates.includes(outcome.decision.selectedAlternative ?? "")));
  const history = createFirstGlowHistory();
  result.outcomes.forEach(outcome => appendFirstGlowDecision(history, outcome.decision));
  validateFirstGlowHistory(history, ["spark-1", "spark-2"]);
  assert.equal(JSON.stringify(input), before);
});

test("fake-provider personality changes selection only within server alternatives", async () => {
  const provider = createFirstGlowFakeProvider();
  const context = contexts(1)[0];
  const care = await provider.interpret(context) as { alternativeId: string };
  const curiosityContext = structuredClone(context);
  curiosityContext.personalityProfile.valueTendencies = ["curiosity", "independence"];
  const curious = await provider.interpret(curiosityContext) as { alternativeId: string };
  assert.notEqual(care.alternativeId, curious.alternativeId);
  assert.ok(context.supportedAlternatives.includes(care.alternativeId as never));
  assert.ok(context.supportedAlternatives.includes(curious.alternativeId as never));
});

test("offline hybrid loop records deterministic fallback paths", async () => {
  for (const behavior of ["malformed-output", "invalid-reference", "unsupported-claim", "provider-error"] as const) {
    const result = await runFirstGlowOfflineHybrid(contexts(1), { provider: createFirstGlowFakeProvider({ behavior }), attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16 } });
    assert.equal(result.outcomes[0].interpretation.confidence, "deterministic-fallback");
    assert.equal(result.outcomes[0].decision.validation, "invalid");
    assert.equal(result.outcomes[0].decision.usage.outcome, "fallback");
  }
  const exhausted = await runFirstGlowOfflineHybrid(contexts(1), { provider: createFirstGlowFakeProvider(), interpretationBudget: { limit: 0, reserved: 0, used: 0, telemetry: [] }, attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16 } });
  assert.equal(exhausted.outcomes[0].interpretation.fallbackReason, "budget-exhausted");
  const timed = await runFirstGlowOfflineHybrid(contexts(1), { provider: createFirstGlowFakeProvider({ behavior: "timeout" }), attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16, timeoutMs: 1 } });
  assert.equal(timed.outcomes[0].interpretation.fallbackReason, "timeout");
});

test("offline historical playback returns records without invoking the provider", async () => {
  const first = await runFirstGlowOfflineHybrid(contexts(1), { provider: createFirstGlowFakeProvider(), attentionPolicy: { perSparkDailyLimit: 4, globalDailyLimit: 16 } });
  let calls = 0;
  const forbidden: FirstGlowInterpretationProvider = { providerId: "must-not-run", interpret: async () => { calls += 1; throw new Error("provider called during replay"); } };
  const replay = await runFirstGlowOfflineHybrid(contexts(1), { provider: forbidden, historicalPlayback: true, recorded: [first.outcomes[0].interpretation] });
  assert.equal(calls, 0);
  assert.deepEqual(replay.outcomes[0].interpretation, first.outcomes[0].interpretation);
  assert.equal(replay.outcomes[0].decision.usage.outcome, "historical-replay");
});
