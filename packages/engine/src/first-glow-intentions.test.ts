import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowActivity, type FirstGlowWorldBundle } from "@mimir/world-data";
import { createFirstGlowState, validateFirstGlowState } from "./structured.js";
import { buildFirstGlowIntentionContext, commitFirstGlowIntention, evaluateFirstGlowIntention } from "./first-glow-intentions.js";
import { createFirstGlowHistory } from "./first-glow-history.js";
import { advanceFirstGlow } from "./first-glow-actions.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8"))) as FirstGlowWorldBundle;

test("a feasible intention persists, executes across ticks, and records causal completion", async () => {
  const state = createFirstGlowState(bundle);
  state.reflectionCapacity!.policy.ticksPerDay = 1;
  const spark = state.settlements[0].sparks[0];
  spark.knownEvidenceEventIds = ["seed-event"];
  const context = buildFirstGlowIntentionContext(state, spark.id, { id: "seed-event", tick: 0, kind: "explore", actorId: spark.id, message: "A witnessed trace." });
  assert.ok(context);
  const activity = context.candidateActivities[0];
  const evaluation = await evaluateFirstGlowIntention(state, spark.id, { triggerEvent: { id: "seed-event", tick: 0, kind: "explore", actorId: spark.id, message: "A witnessed trace." }, provider: { providerId: "test-intention-provider", propose: async () => ({ activity, summary: "Continue toward the witnessed opportunity.", evidenceEventIds: ["seed-event"], causalEventIds: ["seed-event"] }) }, budget: { limit: 1, reserved: 0, used: 0 } });
  assert.equal(evaluation.record?.source, "ai");
  assert.equal(evaluation.record?.status, "active");
  const intention = commitFirstGlowIntention(state, context, evaluation.proposal!, "ai");
  assert.equal(intention.status, "active");
  let continuationCalls = 0;
  const continuation = await evaluateFirstGlowIntention(state, spark.id, { provider: { providerId: "must-not-run", propose: async () => { continuationCalls += 1; return {}; } }, triggerEvent: { id: "seed-event", tick: 0, kind: "explore", actorId: spark.id, message: "A witnessed trace." } });
  assert.equal(continuationCalls, 0);
  assert.equal(continuation.record?.reason, "intention-continues");
  let advanced = state;
  for (let tick = 0; tick < 30 && advanced.settlements[0].sparks[0].intention?.status === "active"; tick += 1) advanced = advanceFirstGlow(advanced, { resolveSocial: false });
  assert.equal(advanced.settlements[0].sparks[0].intention?.status, "completed");
  assert.ok(advanced.history?.intentions?.find(record => record.id === intention.id && record.status === "completed"));
  const restored = JSON.parse(JSON.stringify(advanced));
  validateFirstGlowState(restored);
  assert.deepEqual(JSON.parse(JSON.stringify(advanceFirstGlow(restored, { resolveSocial: false }))), JSON.parse(JSON.stringify(advanceFirstGlow(advanced, { resolveSocial: false }))));
});

test("invalid provider output falls back to one feasible rules intention without extra calls", async () => {
  const state = createFirstGlowState(bundle);
  state.reflectionCapacity!.policy.ticksPerDay = 1;
  const spark = state.settlements[0].sparks[0];
  spark.knownEvidenceEventIds = ["seed-event"];
  state.history = createFirstGlowHistory();
  const evaluation = await evaluateFirstGlowIntention(state, spark.id, { triggerEvent: { id: "seed-event", tick: 0, kind: "idle", actorId: spark.id, message: "A routine pause." }, provider: { providerId: "invalid-provider", propose: async () => ({ activity: "invented-activity", summary: "Not feasible.", evidenceEventIds: ["seed-event"] }) }, budget: { limit: 1, reserved: 0, used: 0 } });
  assert.equal(evaluation.record?.source, "rules");
  assert.equal(evaluation.record?.status, "active");
  assert.ok(evaluation.proposal && evaluation.context?.candidateActivities.includes(evaluation.proposal.activity as FirstGlowActivity));
});

test("historical intention evaluation is provider-free and reconstructs from the context hash", async () => {
  const state = createFirstGlowState(bundle);
  state.reflectionCapacity!.policy.ticksPerDay = 1;
  const spark = state.settlements[0].sparks[0];
  spark.knownEvidenceEventIds = ["seed-event"];
  const triggerEvent = { id: "seed-event", tick: 0, kind: "idle" as const, actorId: spark.id, message: "A routine pause." };
  const context = buildFirstGlowIntentionContext(state, spark.id, triggerEvent)!;
  const recorded = { id: `intention-${context.tick}-${context.sparkId}-${context.contextHash.slice(-12)}`, tick: 0, sparkId: spark.id, contextHash: context.contextHash, source: "rules" as const, status: "active" as const, reflection: { sparkId: spark.id, tick: 0, simulatedDay: 0, created: true, reason: "created" as const, capacity: 1, intervalTicks: 1, phaseOffset: 0, windowIndex: 0, nextEligibleTick: 0, sparkUsed: 1, globalUsed: 1 } };
  let calls = 0;
  const evaluation = await evaluateFirstGlowIntention(state, spark.id, { historicalPlayback: true, recorded: [recorded], provider: { providerId: "must-not-run", propose: async () => { calls += 1; throw new Error("provider called"); } }, triggerEvent });
  assert.equal(calls, 0);
  assert.equal(evaluation.record?.id, recorded.id);
  assert.equal(evaluation.record?.contextHash, context.contextHash);
});
