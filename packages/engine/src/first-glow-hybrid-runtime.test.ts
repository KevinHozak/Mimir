import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowFakeProvider } from "./first-glow-fake-provider.js";
import { runFirstGlowHybridRuntime } from "./first-glow-hybrid-runtime.js";
import type { FirstGlowInterpretationContext } from "./first-glow-interpretations.js";

const context = {
  schemaVersion: 2,
  personalityProfileVersion: 1,
  encounterId: "encounter-1-event-1",
  contextHash: "sha256-context",
  pulse: 1,
  event: { id: "event-1", kind: "draw", actorId: "spark-1", participants: ["spark-1"], message: "A pool dims.", evidenceEventIds: ["event-1"] },
  dilemmaId: "weakening-pool-report",
  supportedAlternatives: ["reveal-pool", "withhold-pool"],
  actorSparkId: "spark-1",
  personalityProfile: { profileVersion: 1, sparkId: "spark-1", name: "Lumen", valueTendencies: ["care"], practicalNeeds: ["charge"], relevantRelationships: [], knowledgeBoundary: { knows: ["event-1"], doesNotKnow: ["why"] }, description: "Notices dimming Sparks.", openingQuestion: "Who needs help?" },
  witnessedEvidenceEventIds: ["event-1"],
  communicatedEvidenceEventIds: [],
  uncertainInferenceEvidenceEventIds: []
} as unknown as FirstGlowInterpretationContext;

test("hybrid runtime stays rules-only without the explicit pilot mode", async () => {
  let calls = 0;
  const provider = { providerId: "test-provider", interpret: async () => { calls += 1; return {}; } };
  const result = await runFirstGlowHybridRuntime([context], { provider });
  assert.equal(calls, 0);
  assert.equal(result.outcomes[0].interpretation.source, "rules");
  assert.equal(result.outcomes[0].usage.outcome, "rules-only");
});

test("bounded pilot gates provider calls through attention and records accepted output", async () => {
  let calls = 0;
  const base = createFirstGlowFakeProvider({ providerId: "bounded-test" });
  const provider = { providerId: base.providerId, interpret: async (value: FirstGlowInterpretationContext) => { calls += 1; return base.interpret(value); } };
  const result = await runFirstGlowHybridRuntime([context], {
    runtimeMode: "bounded-internal-pilot",
    provider,
    attentionPolicy: { repeatedEventCooldownPulses: 0 }
  });
  assert.equal(calls, 1);
  assert.equal(result.outcomes[0].attention.created, true);
  assert.equal(result.outcomes[0].interpretation.source, "ai");
  assert.equal(result.outcomes[0].decision.providerId, "bounded-test");
  assert.equal(result.outcomes[0].decision.resultingEventId, "event-1");
});

test("historical playback uses the recorded interpretation without calling the provider", async () => {
  let calls = 0;
  const result = await runFirstGlowHybridRuntime([context], {
    runtimeMode: "bounded-internal-pilot",
    provider: { providerId: "must-not-run", interpret: async () => { calls += 1; throw new Error("provider called during replay"); } },
    historicalPlayback: true
  });
  assert.equal(calls, 0);
  assert.equal(result.outcomes[0].usage.outcome, "historical-replay");
  assert.equal(result.outcomes[0].interpretation.source, "rules");
});

test("provider failures remain deterministic fallback records", async () => {
  const result = await runFirstGlowHybridRuntime([context], {
    runtimeMode: "bounded-internal-pilot",
    provider: createFirstGlowFakeProvider({ behavior: "provider-error" })
  });
  assert.equal(result.outcomes[0].interpretation.source, "rules");
  assert.equal(result.outcomes[0].interpretation.fallbackReason, "provider-error");
  assert.equal(result.outcomes[0].usage.outcome, "fallback");
});
