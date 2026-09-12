import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowFakeProvider, createFirstGlowState, recordFirstGlowWitnesses } from "@mimir/engine";
import { decodeWorldBundle } from "@mimir/world-data";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  const bundlePath = resolve(process.cwd(), "../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json");
  const bundle = decodeWorldBundle(JSON.parse(readFileSync(bundlePath, "utf8"))) as any;
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.tick = 1;
  const event = { id: "event-1", kind: "draw" as const, actorId: "spark-1", participants: ["spark-1"], message: "A weakening pool dims.", evidenceEventIds: [] };
  state.events = [event];
  recordFirstGlowWitnesses(state.social, [event.id], event.actorId, [], state.tick);
  const beforeKnowledge = structuredClone(state.social.knowledge);\n  const result = await runtime.evaluate(state, state.events);
  assert.equal(result.interpretations.length, 1);
  assert.equal(result.decisions[0].source, "ai");
  assert.equal(result.transitions[0].accepted, true);
  assert.deepEqual(state.social.knowledge, beforeKnowledge);
});
