import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceWorld, advanceFirstGlow, advanceFirstGlowState, initializePostProbeContinuation, selectPostProbeContinuation, forecastShardArrival, firstGlowRouteCandidates, postProbeMinimumReadiness, validateFirstGlowState, type WorldState } from "./index.js";
import { preparationFixture } from "./first-glow-pattern-preparation-fixture.js";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true };
function at(pulse = 46) { let w = createWorldFromBundle(raw, 2, "post-unit", 1, options); for (let i = 0; i < pulse; i++) w = advanceWorld(w).state; return w; }
function addCompanion(w: WorldState) {
  const extra = createWorldFromBundle(raw, 2, "post-owner", 2, options).firstGlowState;
  w.firstGlowState.settlements[0].sparks.push(extra.settlements[0].sparks[1]);
  w.firstGlowState.social = extra.social; w.firstGlowState.reflectionCapacity = extra.reflectionCapacity;
  return extra.settlements[0].sparks[1];
}

test("post-probe policy is optional and fresh-only, and goals require an actual survey", () => {
  const old = createWorldFromBundle(raw); assert.equal(old.firstGlowState.postProbeContinuation, undefined);
  assert.throws(() => initializePostProbeContinuation(advanceWorld(old).state.firstGlowState), /fresh/);
  const fresh = at(0); assert.throws(() => initializePostProbeContinuation(fresh.firstGlowState), /fresh/);
  assert.equal(at(45).firstGlowState.postProbeContinuation!.goals.length, 0);
  const f = at().firstGlowState, goal = f.postProbeContinuation!.goals[0];
  assert.equal(goal.createdPulse, 46); assert.equal(goal.surveyEventId, "event-46-spark-1-cache-survey");
  assert.equal(goal.shardObjectId, "tiled-104"); assert.equal(goal.priorActionEventIds.length, 6);
  assert.equal(goal.actions, 0); assert.equal(f.routePatterns!.patterns.length, 0); assert.equal(f.patternGuidedRetry!.attempts.length, 0);
});

test("real recovery funds the surveyed shard before unrelated marking, preserving accounting and completion gates", () => {
  let w = at(0), produced = 0, consumed = 0, sawDraw = false, sawRest = false;
  let expected: ReturnType<typeof forecastShardArrival> | undefined;
  for (let pulse = 1; pulse <= 125; pulse++) {
    const before = JSON.stringify(w), previous = w;
    w = advanceWorld(w).state; assert.equal(JSON.stringify(previous), before);
    const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], goal = f.postProbeContinuation!.goals[0];
    produced += f.ledger.filter(e => e.kind === "production").reduce((n, e) => n + e.amount, 0);
    consumed += f.ledger.filter(e => e.kind === "consumption").reduce((n, e) => n + e.amount, 0);
    assert.equal(24 + produced, s.sourceCharge + s.communalCharge + a.carriedCharge + consumed);
    if (goal && !goal.outcome) assert.equal(f.events.some(e => e.actorId === a.id && e.kind === "mark-trace"), false);
    if (goal?.actionEventIds.includes(`event-${pulse}-spark-1-draw`)) sawDraw = true;
    if (goal?.actionEventIds.includes(`event-${pulse}-spark-1-idle`)) sawRest = true;
    if (pulse === 100) expected = forecastShardArrival(s, a, firstGlowRouteCandidates(s, a, "shape-pattern", goal.shardObjectId)[0]);
    if (goal?.outcome === "completed" && f.events.some(e => e.kind === "shape-pattern")) {
      assert.equal(a.chargeDeficit, 0); assert.equal(a.carriedCharge, expected!.after.charge); assert.equal(a.readiness, expected!.after.readiness);
    }
    assert.ok(!goal || goal.actions + goal.priorActionEventIds.length <= 64);
    assert.equal(f.patternGuidedRetry!.attempts.length, 0);
  }
  const f = w.firstGlowState, goal = f.postProbeContinuation!.goals[0];
  assert.ok(sawDraw && sawRest); assert.equal(goal.actions, 9); assert.equal(goal.committedPulse, 101);
  assert.equal(goal.completionEventId, "event-119-spark-1-shape-pattern"); assert.equal(goal.outcome, "completed");
  assert.equal(f.routePatterns!.patterns[0].createdPulse, 119);
});

test("care retains its 90 readiness preference and immediate rest priority", () => {
  const w = at(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], other = addCompanion(w);
  other.position = { x: 1, y: 1 }; other.carriedCharge = 1;
  Object.assign(f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === other.id)!, { value: 3, evidenceEventIds: [a.wildCacheChoice!.outcomeEventId], lastUpdatedPulse: f.pulse });
  a.carriedCharge = 100; a.readiness = 89;
  assert.equal(postProbeMinimumReadiness(f, s, a), 90);
  assert.equal(forecastShardArrival(s, a, firstGlowRouteCandidates(s, a, "shape-pattern")[0], 90).eligible, false);
  assert.equal(selectPostProbeContinuation(f, s, a, "rest"), "seek-shelter");
  const next = advanceWorld(w).state;
  assert.equal(next.firstGlowState.settlements[0].sparks[0].intendedActivity, "seek-shelter");
  assert.equal(next.firstGlowState.postProbeContinuation!.goals[0].committedPulse, undefined);
});

test("dispatch rechecks actual resources and care, keeping the uncommitted survey objective", () => {
  for (const cause of ["charge", "readiness"]) {
    const f = at().firstGlowState, s = f.settlements[0], a = s.sparks[0]; a.carriedCharge = 50; a.readiness = 100;
    a.intendedActivity = selectPostProbeContinuation(f, s, a)!; assert.equal(a.intendedActivity, "shape-pattern");
    if (cause === "charge") a.carriedCharge = 0; else a.readiness = 69;
    const next = advanceFirstGlowState(f), goal = next.postProbeContinuation!.goals[0];
    assert.equal(goal.phase, "deferred"); assert.equal(goal.committedPulse, undefined);
    assert.equal(next.events.some(e => e.actorId === a.id && e.kind === "shape-pattern"), false);
  }
});

test("occupied shard contacts defer without evicting their owner or inventing completion", () => {
  const w = at(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], owner = addCompanion(w);
  owner.position = { x: 22, y: 23 }; owner.status = "interacting"; owner.intendedActivity = "shape-pattern"; owner.carriedCharge = 1;
  owner.destinationObjectId = "tiled-104"; owner.destinationSlotId = "examine";
  s.runtime.reservations = [{ actorId: owner.id, objectId: "tiled-104", slotId: "examine" }];
  const before = JSON.stringify(s.runtime.reservations), resources = [a.carriedCharge, a.readiness, s.sourceCharge];
  assert.equal(selectPostProbeContinuation(f, s, a), "idle");
  assert.equal(JSON.stringify(s.runtime.reservations), before); assert.deepEqual([a.carriedCharge, a.readiness, s.sourceCharge], resources);
  assert.equal(f.postProbeContinuation!.goals[0].phase, "deferred"); assert.equal(f.postProbeContinuation!.goals[0].completionEventId, undefined);
});

test("empty source and the shared remaining action allowance cannot grant free preparation", () => {
  for (const cause of ["source", "bound"]) {
    const f = at().firstGlowState, s = f.settlements[0], a = s.sparks[0], g = f.postProbeContinuation!.goals[0];
    if (cause === "source") s.sourceCharge = 0;
    else { g.actions = 58; g.actionEventIds = Array.from({ length: 58 }, (_, i) => `controlled-post-action-${i}`); a.knownEvidenceEventIds.push(...g.actionEventIds); }
    const before = [a.carriedCharge, a.chargeDeficit, a.readiness, s.sourceCharge];
    assert.equal(selectPostProbeContinuation(f, s, a), "idle"); assert.equal(g.phase, "deferred");
    assert.deepEqual([a.carriedCharge, a.chargeDeficit, a.readiness, s.sourceCharge], before); assert.equal(g.committedPulse, undefined);
    if (cause === "source") { s.sourceCharge = 400; assert.ok(["seek-charge", "seek-shelter"].includes(selectPostProbeContinuation(f, s, a)!)); }
  }
});

test("changed navigation invalidates prepared and committed continuation without moving other owners", () => {
  for (const pulse of [46, 105]) {
    let w = at(pulse); const s = w.firstGlowState.settlements[0]; s.runtime.navigationRevision++;
    w = advanceWorld(w).state;
    const g = w.firstGlowState.postProbeContinuation!.goals[0]; assert.equal(g.outcome, "invalidated");
    assert.equal(g.completionEventId, undefined); assert.equal(w.firstGlowState.events.some(e => e.kind === "shape-pattern"), false);
    assert.equal(w.firstGlowState.settlements[0].runtime.reservations.some(r => r.actorId === "spark-1"), false);
  }
});

test("actual arrival resource loss interrupts the committed leg rather than awarding a pattern", () => {
  let w = at(118); w.firstGlowState.settlements[0].sparks[0].carriedCharge = 0;
  w = advanceWorld(w).state;
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].outcome, "interrupted");
  assert.equal(w.firstGlowState.events.some(e => e.kind === "shape-pattern"), false);
  assert.equal(w.firstGlowState.routePatterns!.patterns.length, 0);
  const spent = w.firstGlowState.postProbeContinuation!.goals[0].departureEventId;
  for (let i = 0; i < 10; i++) w = advanceWorld(w).state;
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].departureEventId, spent);
});

test("sharing pauses preserve a committed shard route and its spent commitment", () => {
  let w = at(105); const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], donor = addCompanion(w);
  a.carriedCharge = 0; donor.position = { ...a.position }; donor.carriedCharge = 5;
  const route = structuredClone(a.remainingRoute), cost = a.remainingCost;
  w = advanceWorld(w).state; const after = w.firstGlowState.settlements[0].sparks[0];
  assert.equal(after.status, "traveling"); assert.deepEqual(after.remainingRoute, route); assert.equal(after.remainingCost, cost);
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].outcome, undefined);
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].committedPulse, 101);
});

test("policy, survey provenance, preceding budgets and orphan destination validation reject malformed states", () => {
  const f = at().firstGlowState; f.settlements[0].sparks[0].carriedCharge = 50; f.settlements[0].sparks[0].readiness = 100;
  selectPostProbeContinuation(f, f.settlements[0], f.settlements[0].sparks[0]);
  for (const mutate of [
    (c: any) => c.postProbeContinuation.version = "future",
    (c: any) => c.postProbeContinuation.goals[0].surveyEventId = "invented-survey",
    (c: any) => c.postProbeContinuation.goals[0].priorActionEventIds = [],
    (c: any) => c.postProbeContinuation.goals[0].actions = 65,
    (c: any) => c.postProbeContinuation.goals.push(c.postProbeContinuation.goals[0]),
    (c: any) => c.settlements[0].sparks[0].postProbeDestination.slotId = "missing",
    (c: any) => delete c.postProbeContinuation
  ]) { const c = structuredClone(f); mutate(c); assert.throws(() => validateFirstGlowState(c), /post-probe|Post-probe/); }
});

test("post-probe recovery waits in the shared queue with stable age and intact traveler ownership", () => {
  let w = at(); const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
  const extra = createWorldFromBundle(raw, 2, "post-queue-owners", 6, options).firstGlowState;
  s.sparks.push(...extra.settlements[0].sparks.slice(1)); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  a.carriedCharge = 100; a.readiness = 40;
  const contacts = firstGlowRouteCandidates(s, a, "seek-shelter"); assert.equal(contacts.length, 5);
  for (const [i, c] of contacts.entries()) {
    const owner = s.sparks[i + 1]; owner.carriedCharge = 1; owner.status = "traveling"; owner.intendedActivity = "seek-shelter";
    owner.destinationObjectId = c.objectId; owner.destinationSlotId = c.slotId;
    owner.remainingRoute = firstGlowRouteCandidates(s, owner, "seek-shelter").find(x => x.slotId === c.slotId)!.path.slice(1); owner.remainingCost = 100;
    s.runtime.reservations.push({ actorId: owner.id, objectId: c.objectId, slotId: c.slotId });
  }
  const owners = structuredClone(s.runtime.reservations);
  w = advanceWorld(w).state;
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].phase, "rest");
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].actions, 0);
  assert.deepEqual(w.firstGlowState.settlements[0].runtime.reservations, owners);
  const request = w.firstGlowState.recoveryAdmission!.requests.find(r => r.sparkId === a.id)!; assert.ok(request);
  w = advanceWorld(w).state;
  assert.equal(w.firstGlowState.recoveryAdmission!.requests.find(r => r.sparkId === a.id)!.sincePulse, request.sincePulse);
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].committedPulse, undefined);
});

test("pattern-guided surveys carry their actual preparation budgets without granting extra retries", () => {
  for (const retry of [false, true]) {
    let f = preparationFixture(0, 60, 10, true, true);
    if (!retry) delete f.settlements[0].sparks[1].wildCacheChoice;
    for (let i = 0; i < 60 && !f.postProbeContinuation!.goals.some(g => g.sparkId === "spark-2"); i++) f = advanceFirstGlow(f, { sourceCharge: 8 });
    const goal = f.postProbeContinuation!.goals.find(g => g.sparkId === "spark-2")!;
    assert.ok(goal); assert.equal(f.patternGuidedRetry!.attempts.length, retry ? 1 : 0);
    if (retry) assert.equal(f.patternGuidedRetry!.attempts[0].choice!.alternative, "probe");
    const prior = f.patternPreparation!.goals.find(g => g.sparkId === "spark-2")!;
    assert.ok(prior.actions > 0); assert.deepEqual(goal.priorActionEventIds, prior.actionEventIds);
    validateFirstGlowState(f);
  }
});
