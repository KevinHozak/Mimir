import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, validateFirstGlowState, createWorldV3 } from "./index.js";
import { buildFirstGlowGoalContext, initializeFirstGlowGoals, requestFirstGlowGoal, selectFirstGlowGoalActivity, summarizeFirstGlowGoals } from "./first-glow-goals.js";
import { buildFirstGlowIntentionContext, commitFirstGlowIntention } from "./first-glow-intentions.js";
import { createGoalFixtureWorld, startGoalFixture } from "./first-glow-goals-fixture.js";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceFirstGlow } from "./index.js";
import { sharingContinuationFixture } from "./first-glow-sharing-continuation-fixture.js";

test("two independently arriving Sparks complete ordered goals through real exploration, encounter and marking", async () => {
  let world = await startGoalFixture();
  const initial = JSON.stringify(world);
  const events = [];
  for (let i = 0; i < 25 && world.firstGlowState.goalLoops!.goals.some(g => g.status === "active"); i++) {
    const before = JSON.stringify(world);
    const input = world;
    const result = advanceWorld(world);
    assert.equal(JSON.stringify(input), before, "advancing must not mutate its input");
    world = result.state;
    events.push(...result.events);
    if (result.events.some(e => e.structuredKind === "meet")) {
      for (const sparkId of ["spark-1", "spark-2"]) assert.equal(world.firstGlowState.ledger.filter(e => e.actorId === sparkId && e.reason === "activity-sustenance").length, 1, "each participant pays once");
    }
  }
  assert.notEqual(JSON.stringify(world), initial);
  assert.equal(world.firstGlowState.goalLoops!.providerAttempts, 2);
  for (const goal of world.firstGlowState.goalLoops!.goals) {
    assert.equal(goal.status, "completed");
    assert.deepEqual(goal.completions.map(c => c.activity), ["explore", "meet", "mark-trace"]);
    for (const completion of goal.completions) assert.ok(events.some(e => e.id === completion.eventId && e.pulse === completion.pulse));
  }
  const meetings = events.filter(e => e.structuredKind === "meet");
  for (const sparkId of ["spark-1", "spark-2"]) assert.ok(events.some(e => e.structuredKind === "movement" && e.actorId === sparkId));
  assert.equal(meetings.length, 1);
  assert.deepEqual(meetings[0].participants, ["spark-1", "spark-2"]);
  assert.equal(world.firstGlowState.history!.conversations!.length, 1);
  assert.ok(world.firstGlowState.social.knowledge.find(k => k.sparkId === "spark-2")!.communicatedClaims.length);
  assert.ok(events.some(e => e.structuredKind === "goal" && e.evidenceEventIds?.length === 3));
  assert.ok(world.firstGlowState.settlements[0].sparks.every(s => s.carriedCharge < 100 && s.readiness < 100));
  assert.equal(summarizeFirstGlowGoals(world.firstGlowState).filter(g => g.status === "completed").length, 2);
});

test("hidden evidence and malformed proposals fall back without granting progress; contexts exclude other Spark state", async () => {
  const world = createGoalFixtureWorld();
  const context = buildFirstGlowGoalContext(world.firstGlowState, "spark-1")!;
  const altered = structuredClone(world.firstGlowState);
  altered.settlements[0].sparks[1].carriedCharge = 999;
  assert.equal(buildFirstGlowGoalContext(altered, "spark-1")!.contextHash, context.contextHash);
  let calls = 0;
  const result = await requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "invalid", propose: async () => { calls++; return { kind: "explore-meet-mark", summary: "Hidden future", evidenceEventIds: ["future-hidden-event"] }; } } });
  assert.equal(calls, 1);
  assert.equal(result.goal?.source, "rules");
  assert.equal(result.goal?.kind, "explore-mark");
  assert.equal(result.goal?.step, 0);
  assert.equal(world.firstGlowState.goalLoops!.goals.length, 0);
  const historical = await requestFirstGlowGoal(result.state, "spark-2", { historicalPlayback: true, provider: { providerId: "must-not-run", propose: async () => { throw Error("called"); } } });
  assert.equal(historical.state, result.state);
  assert.equal(historical.reason, "historical-playback");
});

test("active goals continue without another provider call; need recovery does not advance a goal", async () => {
  const world = await startGoalFixture();
  const duplicate = await requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "must-not-run", propose: async () => { throw Error("called"); } } });
  assert.equal(duplicate.reason, "existing-activity-continues");
  world.firstGlowState.settlements[0].sparks[0].carriedCharge = 0;
  world.firstGlowState.settlements[0].sparks[0].chargeDeficit = 1;
  const next = advanceWorld(world).state;
  const spark = next.firstGlowState.settlements[0].sparks[0];
  assert.equal(spark.intendedActivity, "seek-charge");
  assert.equal(next.firstGlowState.goalLoops!.goals[0].step, 0);
});

test("a missing companion never becomes a meeting; bounded expiry releases owned contacts", async () => {
  let world = createGoalFixtureWorld();
  world.firstGlowState = (await requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "solo-meet", propose: async c => ({ kind: "explore-meet-mark", summary: "Seek company", evidenceEventIds: c.evidenceEventIds.slice(0, 1) }) } })).state;
  const other = world.firstGlowState.settlements[0].sparks[1];
  other.position = { x: 1, y: 1 };
  const events = [];
  for (let i = 0; i < 130 && world.firstGlowState.goalLoops!.goals[0].status === "active"; i++) {
    const result = advanceWorld(world); world = result.state; events.push(...result.events);
  }
  const goal = world.firstGlowState.goalLoops!.goals[0];
  assert.equal(goal.status, "interrupted");
  assert.equal(goal.reason, "goal-expired");
  assert.equal(goal.step, 1);
  assert.equal(events.some(e => e.structuredKind === "meet"), false);
  assert.equal(world.firstGlowState.settlements[0].runtime.reservations.some(r => r.actorId === "spark-1"), false);
});

test("versions, reordered progress and duplicate active goals reject; old histories stay untagged", async () => {
  const world = await startGoalFixture();
  const bad = structuredClone(world.firstGlowState);
  (bad.goalLoops as any).version = "unknown";
  assert.throws(() => validateFirstGlowState(bad), /goal checkpoint/);
  const duplicate = structuredClone(world.firstGlowState);
  duplicate.goalLoops!.goals.push({ ...structuredClone(duplicate.goalLoops!.goals[0]), id: "duplicate-active" });
  assert.throws(() => validateFirstGlowState(duplicate), /goal checkpoint/);
  const malformed = structuredClone(world.firstGlowState);
  malformed.goalLoops!.goals[0].completions.push({ activity: "mark-trace", eventId: "invented", pulse: 1 });
  assert.throws(() => validateFirstGlowState(malformed), /goal checkpoint/);
  assert.throws(() => initializeFirstGlowGoals(world.firstGlowState), /fresh history/);
  const old = createWorldV3(world.firstGlowState.settlements[0].bundle);
  assert.equal(advanceWorld(old).state.firstGlowState.goalLoops, undefined);
});

test("provider timeout and exhausted attempt allowance select rules without retries", async () => {
  const world = createGoalFixtureWorld();
  const timed = await requestFirstGlowGoal(world.firstGlowState, "spark-1", { timeoutMs: 1, provider: { providerId: "never", propose: () => new Promise(() => {}) } });
  assert.equal(timed.goal?.fallbackReason, "provider-failed-or-timeout");
  assert.equal(timed.state.goalLoops!.providerAttempts, 1);
  const capped = structuredClone(world.firstGlowState);
  capped.goalLoops!.providerAttempts = 16;
  const result = await requestFirstGlowGoal(capped, "spark-1", { provider: { providerId: "must-not-run", propose: async () => { throw Error("called"); } } });
  assert.equal(result.goal?.fallbackReason, "provider-attempt-limit");
  assert.equal(result.state.goalLoops!.providerAttempts, 16);
});

test("a source change while the provider is running rejects the stale candidate checkpoint", async () => {
  const world = createGoalFixtureWorld();
  await assert.rejects(requestFirstGlowGoal(world.firstGlowState, "spark-1", { provider: { providerId: "stale", propose: async c => {
    world.firstGlowState.settlements[0].sparks[1].readiness--;
    return { kind: "explore-mark", summary: "Stale plan", evidenceEventIds: c.evidenceEventIds.slice(0, 1) };
  } } }), /source changed/);
  assert.equal(world.firstGlowState.goalLoops!.goals.length, 0);
});

test("urgent rest and care precede discretionary trip funding; a separate intention cannot steal a goal", async () => {
  const world = await startGoalFixture();
  const state = world.firstGlowState, settlement = state.settlements[0], spark = settlement.sparks[0];
  spark.carriedCharge = 1; spark.readiness = 69;
  selectFirstGlowGoalActivity(state, settlement, spark);
  assert.equal(spark.intendedActivity, "seek-shelter");
  assert.equal(spark.carriedCharge, 1);
  assert.equal(spark.readiness, 69);
  spark.carriedCharge = 100; spark.readiness = 83;
  Object.assign(state.social.trust.find(t => t.sourceSparkId === spark.id && t.targetSparkId === "spark-2")!, { value: 3, evidenceEventIds: [spark.knownEvidenceEventIds[0]], lastUpdatedPulse: state.pulse });
  selectFirstGlowGoalActivity(state, settlement, spark);
  assert.equal(spark.intendedActivity, "seek-shelter");
  const context = buildFirstGlowIntentionContext(state, spark.id)!;
  assert.throws(() => commitFirstGlowIntention(state, context, { activity: "explore", summary: "Another intention", evidenceEventIds: context.knownEvidenceEventIds.slice(0, 1) }), /already owns/);
});

test("fresh ordinary goal worlds resume sharing participants without stranded contacts or free arrivals", () => {
  const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  let world = createWorldFromBundle(raw, 2, "goal-sharing-regression", 6, { goalLoops: true });
  assert.equal(world.firstGlowState.sharingRouteContinuationVersion, "sharing-route-continuation-v1");
  assert.equal(createWorldFromBundle(raw).firstGlowState.sharingRouteContinuationVersion, undefined);
  let restoredTravel = false;
  for (let p = 0; p < 24; p++) {
    const next = advanceWorld(world);
    world = next.state;
    restoredTravel ||= next.events.some(e => e.structuredKind === "sharing-continuation");
    for (const region of world.firstGlowState.settlements) for (const spark of region.sparks) assert.ok(!(spark.status === "choosing" && spark.destinationObjectId && spark.remainingRoute.length), `${spark.id} retained a stranded route at ${world.pulse}`);
  }
  assert.ok(restoredTravel);
  assert.ok(world.firstGlowState.settlements[0].sparks[0].position.x !== 5 || world.firstGlowState.settlements[0].sparks[0].position.y !== 5);
});

test("recorded goal states without the sharing marker retain legacy continuation", () => {
  const old = sharingContinuationFixture(false);
  // A serialized earlier goal policy, not a call to the new fresh constructor.
  old.activityCompletionVersion = "validated-activity-completion-v1";
  old.goalLoops = { version: "spark-goal-loop-v1", providerAttempts: 0, goals: [] };
  const next = advanceFirstGlow(old);
  assert.equal(next.sharingRouteContinuationVersion, undefined);
  assert.equal(next.settlements[0].sparks[1].status, "choosing");
  assert.equal(next.settlements[0].sparks[1].remainingRoute.length, 1);
  assert.throws(() => initializeFirstGlowGoals(next), /fresh history/);
});
