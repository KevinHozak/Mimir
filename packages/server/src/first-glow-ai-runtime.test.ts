import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowFakeProvider } from "@mimir/engine";
import { createFirstGlowServerAIConfig, FirstGlowServerAIRuntime } from "./first-glow-ai-runtime.js";

test("server AI config is rules-only unless every operator gate is explicit", () => {
  const disabled = createFirstGlowServerAIConfig({ AI_ENABLED: "true", AI_RUNTIME_MODE: "bounded-internal-pilot", AI_ROLLOUT: "internal" });
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.runtimeMode, "rules-only");
  assert.equal(disabled.reason, "provider-access-not-configured");
  const off = createFirstGlowServerAIConfig({});
  assert.equal(off.enabled, false);
  assert.equal(off.reason, "operator-disabled");
});

test("server runtime accepts an injected bounded provider without exposing canonical state", async () => {
  const config = {
    requested: true,
    enabled: true,
    runtimeMode: "bounded-internal-pilot" as const,
    rollout: "internal" as const,
    providerId: "local-test",
    model: "local-test-model",
    hardCapCents: 100,
    reason: "test",
    provider: createFirstGlowFakeProvider({ providerId: "local-test" })
  };
  const runtime = new FirstGlowServerAIRuntime(config);
  const state = {
    tick: 1,
    social: { knowledge: [{ sparkId: "spark-1", witnessedFacts: [{ eventId: "event-1", tick: 1 }], communicatedClaims: [], uncertainInferences: [] }] },
    events: [{ id: "event-1", kind: "draw", actorId: "spark-1", participants: ["spark-1"], message: "A weakening pool dims.", evidenceEventIds: ["event-1"] }],
    settlements: [{
      id: "settlement-1",
      sparks: [{
        id: "spark-1", name: "Lumen", carriedCharge: 4, chargeDeficit: 0, readiness: 4, position: { x: 0, y: 0 }, activity: "idle",
        valueTendencies: ["care"], practicalNeeds: ["charge"], relationships: [], knowledgeBoundary: { knows: ["event-1"], doesNotKnow: [] }
      }, {
        id: "spark-2", name: "Glow", carriedCharge: 4, chargeDeficit: 0, readiness: 4, position: { x: 1, y: 0 }, activity: "idle",
        valueTendencies: ["caution"], practicalNeeds: ["charge"], relationships: [], knowledgeBoundary: { knows: ["event-1"], doesNotKnow: [] }
      }],
      bundle: { schemaVersion: 3, bundle: { contentHash: "sha256-test" }, objects: [], objectDefinitions: {}, spawns: [], width: 1, height: 1, layers: [] },
      runtime: { navigationRevision: 0, objects: [] }
    }]
  };
  const result = await runtime.evaluate(state, state.events);
  assert.equal(result.interpretations.length, 1);
  assert.equal(result.decisions[0].source, "ai");
  assert.equal(result.transitions[0].accepted, true);
  assert.deepEqual(state.social.knowledge, [{ sparkId: "spark-1", witnessedFacts: [{ eventId: "event-1", tick: 1 }], communicatedClaims: [], uncertainInferences: [] }]);
});
