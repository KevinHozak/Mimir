import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { buildFirstGlowInterpretationContext, createRulesOnlyFirstGlowInterpretation, evaluateFirstGlowInterpretation, type FirstGlowInterpretationBudget, type FirstGlowInterpretationContext, type FirstGlowInterpretationProvider } from "./first-glow-interpretations.js";
import { firstGlowSparkPersonalityProfile, serializeFirstGlowSparkPersonalityProfile } from "./design.js";
import { createFirstGlowState } from "./structured.js";
import { recordFirstGlowWitnesses } from "./first-glow-social.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("interpretation fixture is not schema 3");
const firstGlowBundle = bundle as FirstGlowWorldBundle;
const budget = (limit: number): FirstGlowInterpretationBudget => ({ limit, reserved: 0, used: 0, telemetry: [] });

function encounters(count: number): { state: ReturnType<typeof createFirstGlowState>; contexts: FirstGlowInterpretationContext[] } {
  const state = createFirstGlowState(firstGlowBundle, "first-glow-region", "Opening region", 2);
  const contexts: FirstGlowInterpretationContext[] = [];
  for (let index = 0; index < count; index += 1) {
    state.tick = index + 1;
    const kinds = ["draw", "idle", "explore", "mark-trace"] as const;
    const event = { id: `event-review-${index + 1}`, kind: kinds[index % kinds.length], actorId: "spark-1", participants: ["spark-1", "spark-2"], message: `Spark 1 made review observation ${index + 1}.` };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants.slice(1), state.tick);
    const context = buildFirstGlowInterpretationContext(state, event);
    assert.ok(context);
    contexts.push(context);
  }
  return { state, contexts };
}

test("context hashes and rules-only records are deterministic and evidence-scoped", () => {
  const first = encounters(1).contexts[0];
  const second = encounters(1).contexts[0];
  assert.equal(first.contextHash, second.contextHash);
  assert.deepEqual(createRulesOnlyFirstGlowInterpretation(first), createRulesOnlyFirstGlowInterpretation(second));
  assert.deepEqual(first.witnessedEvidenceEventIds, [first.event.id]);
  assert.deepEqual(first.communicatedEvidenceEventIds, []);
});

test("personality profiles are versioned, canonical, and bounded to the acting Spark", () => {
  const first = encounters(1).contexts[0];
  const second = encounters(1).contexts[0];
  assert.equal(first.personalityProfile.profileVersion, 1);
  assert.deepEqual(first.personalityProfile, second.personalityProfile);
  assert.equal(first.personalityProfile.name, "Lumen");
  assert.deepEqual(first.personalityProfile.valueTendencies, ["care", "reciprocity"]);
  assert.deepEqual(first.personalityProfile.relevantRelationships.map(relationship => relationship.sparkId), ["spark-ora", "spark-rill"]);
  assert.ok(first.personalityProfile.knowledgeBoundary.doesNotKnow.some(item => item.includes("Why a pool weakens")));
  assert.equal(serializeFirstGlowSparkPersonalityProfile(first.personalityProfile), serializeFirstGlowSparkPersonalityProfile(second.personalityProfile));
  assert.equal(first.personalityProfile.sparkId, first.actorSparkId);
  assert.equal(JSON.stringify(first.personalityProfile).includes("spark-2"), false);
  assert.deepEqual(first.personalityProfile.knowledgeBoundary.knows, ["Visible pool brightness and nearby Spark positions."]);
  assert.deepEqual(firstGlowSparkPersonalityProfile("spark-1"), first.personalityProfile);
});

test("twenty matched AI-on/off encounters record bounded choice differences without changing world state", async () => {
  const { state, contexts } = encounters(20);
  const before = JSON.stringify({ sourceCharge: state.settlements[0].sourceCharge, communalCharge: state.settlements[0].communalCharge, ledger: state.ledger });
  let calls = 0;
  const provider: FirstGlowInterpretationProvider = { providerId: "local-fake", interpret: async context => { calls += 1; return { alternativeId: context.supportedAlternatives[1], claim: "plausible-choice", summary: "The local fixture finds either path plausible from the witnessed encounter.", evidenceEventIds: [context.event.id] }; } };
  const aiBudget = budget(20);
  const ai = [];
  for (const context of contexts) ai.push((await evaluateFirstGlowInterpretation(context, { provider, budget: aiBudget })).record);
  const rules = contexts.map(createRulesOnlyFirstGlowInterpretation);
  assert.equal(calls, 20);
  assert.equal(ai.length, 20);
  assert.ok(ai.filter((record, index) => record.plausibleChoiceChanged !== rules[index].plausibleChoiceChanged).length >= 1);
  assert.equal(JSON.stringify({ sourceCharge: state.settlements[0].sourceCharge, communalCharge: state.settlements[0].communalCharge, ledger: state.ledger }), before);
  assert.equal(aiBudget.used, 20);
  assert.equal(aiBudget.telemetry.filter(item => item.outcome === "recorded").length, 20);
});

test("malformed, invalid, unsupported, timeout, and exhausted provider paths use deterministic fallback", async () => {
  const context = encounters(1).contexts[0];
  const cases: Array<[string, unknown, string]> = [
    ["malformed", {}, "malformed-output"],
    ["invalid", { alternativeId: context.supportedAlternatives[0], claim: "plausible-choice", summary: "hidden", evidenceEventIds: ["hidden-event"] }, "invalid-reference"],
    ["unsupported", { alternativeId: "invent-a-fact", claim: "plausible-choice", summary: "unsupported", evidenceEventIds: [context.event.id] }, "unsupported-claim"]
  ];
  for (const [, value, reason] of cases) {
    const provider: FirstGlowInterpretationProvider = { providerId: "fixture", interpret: async () => value };
    const result = await evaluateFirstGlowInterpretation(context, { provider, budget: budget(1) });
    assert.equal(result.record.fallbackReason, reason);
    assert.equal(result.usage.outcome, "fallback");
  }
  const timeoutProvider: FirstGlowInterpretationProvider = { providerId: "fixture-timeout", interpret: async () => new Promise(() => undefined) };
  const timed = await evaluateFirstGlowInterpretation(context, { provider: timeoutProvider, budget: budget(1), timeoutMs: 1 });
  assert.equal(timed.record.fallbackReason, "timeout");
  let exhaustedCalls = 0;
  const exhaustedProvider: FirstGlowInterpretationProvider = { providerId: "never-called", interpret: async () => { exhaustedCalls += 1; return {}; } };
  const exhausted = await evaluateFirstGlowInterpretation(context, { provider: exhaustedProvider, budget: budget(0) });
  assert.equal(exhausted.record.fallbackReason, "budget-exhausted");
  assert.equal(exhaustedCalls, 0);
});

test("historical playback returns the recorded interpretation without calling a provider", async () => {
  const context = encounters(1).contexts[0];
  const recorded = createRulesOnlyFirstGlowInterpretation(context);
  let calls = 0;
  const provider: FirstGlowInterpretationProvider = { providerId: "must-not-run", interpret: async () => { calls += 1; throw new Error("AI request during replay"); } };
  const replay = await evaluateFirstGlowInterpretation(context, { provider, budget: budget(20), historicalPlayback: true, recorded: [recorded] });
  assert.deepEqual(replay.record, recorded);
  assert.equal(replay.usage.outcome, "historical-replay");
  assert.equal(calls, 0);
});

test("historical playback falls back without calling a provider when records are absent or malformed", async () => {
  const context = encounters(1).contexts[0];
  let calls = 0;
  const provider: FirstGlowInterpretationProvider = { providerId: "must-not-run", interpret: async () => { calls += 1; return {}; } };
  const absent = await evaluateFirstGlowInterpretation(context, { provider, budget: budget(20), historicalPlayback: true });
  const malformed = await evaluateFirstGlowInterpretation(context, { provider, budget: budget(20), historicalPlayback: true, recorded: [{ ...createRulesOnlyFirstGlowInterpretation(context), evidenceEventIds: ["hidden-event"] }] });
  assert.equal(absent.record.confidence, "deterministic-fallback");
  assert.equal(absent.usage.reason, "provider-error");
  assert.equal(malformed.record.confidence, "deterministic-fallback");
  assert.equal(malformed.usage.reason, "malformed-output");
  assert.equal(calls, 0);
});
