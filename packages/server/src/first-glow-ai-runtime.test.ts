import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowFakeProvider, createFirstGlowState, recordFirstGlowWitnesses, initializeFirstGlowEventAdmission, firstGlowReflectionCadence, rulesOnlyFirstGlowInterpretation, buildFirstGlowInterpretationContext, runFirstGlowHybridRuntime } from "@mimir/engine";
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

test("shared event RC admission is paired, persisted and separate from provider failures", async () => {
  const bundle = decodeWorldBundle(JSON.parse(readFileSync(resolve(process.cwd(), "../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json"), "utf8"))) as any;
  const opening = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  opening.reflectionCapacity = initializeFirstGlowEventAdmission(opening.reflectionCapacity!, 0);
  let calls = 0;
  const config = { requested: true, enabled: true, runtimeMode: "bounded-internal-pilot" as const, rollout: "internal" as const, providerId: "rules-equivalent-synthetic", model: "synthetic", hardCapCents: 100, reason: "test", provider: { providerId: "rules-equivalent-synthetic", interpret: async (context: Parameters<typeof rulesOnlyFirstGlowInterpretation>[0]) => { calls++; return rulesOnlyFirstGlowInterpretation(context); } } };
  const rules = new FirstGlowServerAIRuntime({ ...config, runtimeMode: "rules-only" }, { rcAdmission: "event-rc-v1" });
  const model = new FirstGlowServerAIRuntime(config, { rcAdmission: "event-rc-v1" });
  const phase = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  function atPulse(pulse: number, id: string) {
    const state = structuredClone(opening);
    state.pulse = pulse;
    const event = { id, pulse, kind: "draw" as const, actorId: "spark-1", participants: ["spark-1"], message: "A weakening pool dims.", evidenceEventIds: [] };
    state.events = [event];
    recordFirstGlowWitnesses(state.social, [event.id], event.actorId, [], pulse);
    return state;
  }
  const early = atPulse(phase - 1, "early-event");
  const denied = await model.evaluate(early, early.events);
  assert.equal(calls, 0);
  assert.equal(denied.decisions[0].usage.outcome, "rules-only");
  assert.equal(denied.decisions[0].fallbackReason, undefined);
  assert.equal(denied.state.reflectionCapacity!.eventAdmission!.records[0].reason, "cadence-window-not-ready");
  assert.equal(early.reflectionCapacity!.eventAdmission!.records.length, 0, "candidate evaluation must not mutate its input");
  const current = atPulse(phase + 4, "admitted-event");
  const [a, b] = await Promise.all([rules.evaluate(current, current.events), model.evaluate(current, current.events)]);
  assert.equal(calls, 1);
  assert.deepEqual(a.state.social, b.state.social, "rules-equivalent synthetic response must preserve objective effects");
  assert.deepEqual(a.state.reflectionCapacity, b.state.reflectionCapacity);
  assert.equal(a.decisions[0].source, "rules");
  assert.equal(b.decisions[0].source, "ai");
  const restored = JSON.parse(JSON.stringify(b.state));
  const beforeReplay = JSON.stringify(restored.reflectionCapacity);
  const replay = await runFirstGlowHybridRuntime([buildFirstGlowInterpretationContext(current, current.events[0])!], { historicalPlayback: true, runtimeMode: "bounded-internal-pilot", recorded: b.interpretations, reflectionCapacity: restored.reflectionCapacity, provider: { providerId: "replay-forbidden", interpret: async () => { throw new Error("replay must not call a provider"); } } });
  assert.equal(replay.outcomes[0].usage.outcome, "historical-replay");
  assert.equal(replay.outcomes[0].interpretation.source, "ai");
  assert.equal(JSON.stringify(restored.reflectionCapacity), beforeReplay);
  const restarted = new FirstGlowServerAIRuntime(config, { rcAdmission: "event-rc-v1" });
  const duplicate = await restarted.evaluate(restored, current.events);
  assert.equal(calls, 1);
  assert.deepEqual(duplicate.state.social, restored.social);
  assert.deepEqual(duplicate.state.history, restored.history, "duplicate event must not rewrite its committed decision");
  assert.equal(duplicate.interpretations.length, 0);
  const continued = JSON.parse(JSON.stringify(b.state));
  continued.pulse++;
  const nextEvent = { ...current.events[0], id: "post-restart-event", pulse: continued.pulse };
  continued.events.push(nextEvent);
  recordFirstGlowWitnesses(continued.social, [nextEvent.id], "spark-1", [], continued.pulse);
  const freshRuntime = new FirstGlowServerAIRuntime(config, { rcAdmission: "event-rc-v1" });
  const [uninterrupted, afterRestart] = await Promise.all([model.evaluate(continued, [nextEvent]), freshRuntime.evaluate(JSON.parse(JSON.stringify(continued)), [nextEvent])]);
  assert.deepEqual(afterRestart.state, uninterrupted.state, "persisted attention/RC state must preserve restart equivalence");
  const legacy = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  await assert.rejects(restarted.evaluate(legacy, current.events), /policy mismatch/);
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
  state.pulse = 1;
  const event = { id: "event-1", kind: "draw" as const, actorId: "spark-1", participants: ["spark-1"], message: "A weakening pool dims.", evidenceEventIds: [] };
  state.events = [event];
  recordFirstGlowWitnesses(state.social, [event.id], event.actorId, [], state.pulse);
  const beforeKnowledge = structuredClone(state.social.knowledge);
  const result = await runtime.evaluate(state, state.events);
  assert.equal(result.interpretations.length, 1);
  assert.equal(result.decisions[0].source, "ai");
  assert.equal(result.transitions[0].accepted, true);
  assert.deepEqual(state.social.knowledge, beforeKnowledge);
  const slowProvider = { providerId: "slow-synthetic", interpret: async (context: Parameters<typeof config.provider.interpret>[0]) => {
    await new Promise(resolve => setTimeout(resolve, 30));
    return config.provider.interpret(context);
  } };
  const short = new FirstGlowServerAIRuntime({ ...config, provider: slowProvider }, { interpretationTimeoutMs: 5 });
  const timedOut = await short.evaluate(state, state.events);
  assert.equal(timedOut.interpretations[0].fallbackReason, "timeout");
  const longer = new FirstGlowServerAIRuntime({ ...config, provider: slowProvider }, { interpretationTimeoutMs: 100 });
  assert.equal((await longer.evaluate(state, state.events)).interpretations[0].source, "ai");
  assert.throws(() => new FirstGlowServerAIRuntime(config, { interpretationTimeoutMs: 10001 }), /invalid interpretation timeout/);
});
