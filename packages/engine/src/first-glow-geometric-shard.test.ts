import { preparationFixture } from "./first-glow-pattern-preparation-fixture.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceFirstGlow, advanceWorld, advanceFirstGlowState, initializeGeometricShardRoutes, firstGlowRouteCandidates, shardRouteCandidates, geometricShardSettlement, forecastPatternArrival, selectPostProbeContinuation, validateFirstGlowState, type FirstGlowState } from "./index.js";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true, geometricShardRoutes: true };
function ownShard(f: FirstGlowState) {
  const s = f.settlements[0], owner = s.sparks[1];
  owner.position = { x: 5, y: 5 }; owner.carriedCharge = 100; owner.chargeDeficit = 0; owner.readiness = 100;
  const route = firstGlowRouteCandidates(s, owner, "shape-pattern", "tiled-104")[0];
  owner.status = "traveling"; owner.intendedActivity = "shape-pattern"; owner.destinationObjectId = route.objectId; owner.destinationSlotId = route.slotId;
  owner.remainingRoute = route.path.slice(1); owner.remainingCost = 0; owner.plannedNavigationRevision = s.runtime.navigationRevision;
  s.runtime.reservations.push({ actorId: owner.id, objectId: route.objectId, slotId: route.slotId });
  return owner;
}
function surveyWorld() {
  let w = createWorldFromBundle(raw, 2, "geo-survey", 1, options);
  for (let p = 0; p < 46; p++) w = advanceWorld(w).state;
  const extra = createWorldFromBundle(raw, 2, "geo-owner", 2, options).firstGlowState;
  w.firstGlowState.settlements[0].sparks.push(extra.settlements[0].sparks[1]); w.firstGlowState.social = extra.social; w.firstGlowState.reflectionCapacity = extra.reflectionCapacity;
  return w;
}

test("geometric shard policy is explicit and fresh-only; unknown policy and missing choice reject", () => {
  const old = createWorldFromBundle(raw); assert.equal(old.firstGlowState.geometricShardRoutesVersion, undefined);
  assert.throws(() => initializeGeometricShardRoutes(advanceWorld(old).state.firstGlowState), /fresh/);
  const fresh = createWorldFromBundle(raw, 2, "geo-minimal", 1, { geometricShardRoutes: true });
  assert.equal(fresh.firstGlowState.geometricShardRoutesVersion, "geometric-shard-routes-v1"); assert.ok(fresh.firstGlowState.wildCacheChoiceVersion);
  assert.throws(() => initializeGeometricShardRoutes(fresh.firstGlowState), /fresh/);
  (fresh.firstGlowState as unknown as { geometricShardRoutesVersion: string }).geometricShardRoutesVersion = "future";
  assert.throws(() => validateFirstGlowState(fresh.firstGlowState), /geometric/);
  fresh.firstGlowState.geometricShardRoutesVersion = "geometric-shard-routes-v1"; delete fresh.firstGlowState.wildCacheChoiceVersion;
  assert.throws(() => validateFirstGlowState(fresh.firstGlowState), /geometric/);
});

test("conditional shard geometry preserves reservations and all other contact exclusions", () => {
  const f = createWorldFromBundle(raw, 2, "geo-query", 2, options).firstGlowState, s = f.settlements[0], a = s.sparks[0]; ownShard(f);
  const charge = firstGlowRouteCandidates(s, a, "seek-charge")[0]; s.runtime.reservations.push({ actorId: "spark-2", objectId: charge.objectId, slotId: charge.slotId });
  const before = JSON.stringify(f); assert.equal(firstGlowRouteCandidates(s, a, "shape-pattern").length, 0); assert.equal(shardRouteCandidates(f, s, a).length, 1);
  const conditional = geometricShardSettlement(f, s); assert.ok(conditional.runtime.reservations.some(r => r.objectId === charge.objectId));
  assert.equal(JSON.stringify(f), before);
  const old = { ...f, geometricShardRoutesVersion: undefined }; assert.equal(shardRouteCandidates(old, s, a).length, 0);
});

test("cache arrival surveys busy shard geometry with real probe costs and no shard admission", () => {
  const f = createWorldFromBundle(raw, 2, "geo-arrival", 2, { geometricShardRoutes: true }).firstGlowState, s = f.settlements[0], a = s.sparks[0]; ownShard(f);
  const cache = firstGlowRouteCandidates(s, a, "scavenge-cache")[0]; a.position = cache.target; a.status = "interacting"; a.intendedActivity = "scavenge-cache";
  a.destinationObjectId = cache.objectId; a.destinationSlotId = cache.slotId; a.remainingRoute = []; a.carriedCharge = 12; a.readiness = 81;
  s.runtime.reservations.push({ actorId: a.id, objectId: cache.objectId, slotId: cache.slotId });
  const next = advanceFirstGlowState(f), actor = next.settlements[0].sparks[0];
  assert.equal(actor.wildCacheChoice!.alternative, "probe"); assert.equal(actor.wildCacheChoice!.routeFact!.objectId, "tiled-104");
  assert.ok(next.ledger.some(e => e.actorId === a.id && e.kind === "consumption" && e.reason === "wild-cache-probe" && e.amount === 1));
  assert.ok(next.ledger.some(e => e.actorId === a.id && e.reason === "wild-cache-probe-readiness" && e.amount === 2));
  assert.equal(next.settlements[0].runtime.reservations.find(r => r.objectId === "tiled-104")!.actorId, "spark-2");
});

test("geometric survey does not bypass low charge, deficit or readiness gates", () => {
  for (const [charge, deficit, readiness] of [[2, 0, 81], [12, 1, 81], [12, 0, 74]]) {
    const f = createWorldFromBundle(raw, 2, "geo-low", 1, { geometricShardRoutes: true }).firstGlowState, s = f.settlements[0], a = s.sparks[0];
    const cache = firstGlowRouteCandidates(s, a, "scavenge-cache")[0]; Object.assign(a, { position: cache.target, status: "interacting", intendedActivity: "scavenge-cache", destinationObjectId: cache.objectId, destinationSlotId: cache.slotId, remainingRoute: [], carriedCharge: charge, chargeDeficit: deficit, readiness });
    s.runtime.reservations.push({ actorId: a.id, objectId: cache.objectId, slotId: cache.slotId });
    assert.equal(advanceFirstGlowState(f).settlements[0].sparks[0].wildCacheChoice!.alternative, "conserve");
  }
});

test("cache forecasts distinguish busy shard geometry without changing arrival resource costs", () => {
  const f = createWorldFromBundle(raw, 2, "geo-forecast", 2, options).firstGlowState, s = f.settlements[0], a = s.sparks[0]; ownShard(f);
  a.carriedCharge = 100; a.readiness = 100; const c = firstGlowRouteCandidates(s, a, "scavenge-cache")[0];
  const old = forecastPatternArrival(s, a, c), next = forecastPatternArrival(s, a, c, f);
  assert.equal(old.shardReachable, false); assert.equal(next.shardReachable, true); assert.deepEqual(next.before, old.before); assert.equal(next.minimumCharge, old.minimumCharge);
});

test("funded surveyed shard waits without evicting owner or spending commitment; free admission resumes", () => {
  let w = surveyWorld(); const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], owner = ownShard(f);
  a.position = { x: 27, y: 5 }; a.carriedCharge = 50; a.chargeDeficit = 0; a.readiness = 100; a.status = "choosing"; a.remainingRoute = [];
  const reservation = { ...s.runtime.reservations.find(r => r.objectId === "tiled-104")! };
  w = advanceWorld(w).state; const after = w.firstGlowState, g = after.postProbeContinuation!.goals[0];
  assert.equal(g.phase, "ready"); assert.equal(g.committedPulse, undefined); assert.match(g.reason, /waiting for actual contact/);
  assert.equal(after.settlements[0].sparks[0].waitReason, "shard-contact-wait"); assert.ok(after.settlements[0].runtime.reservations.some(r => r.actorId === reservation.actorId && r.objectId === reservation.objectId));
  assert.equal(after.routePatterns!.patterns.length, 0); validateFirstGlowState(after);
  const free = after.settlements[0], b = free.sparks.find(x => x.id === owner.id)!;
  free.runtime.reservations = free.runtime.reservations.filter(r => r.actorId !== b.id); delete b.destinationObjectId; delete b.destinationSlotId; b.remainingRoute = []; b.status = "choosing";
  w = advanceWorld(w).state; assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].committedPulse, w.pulse);
});

test("busy shard preparation retains urgent rest, care readiness and remaining action bounds", () => {
  const w = surveyWorld(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0]; ownShard(f);
  a.position = { x: 5, y: 5 }; a.carriedCharge = 16; a.chargeDeficit = 0; a.readiness = 69;
  assert.notEqual(selectPostProbeContinuation(f, s, a, "rest"), "seek-charge");
  a.readiness = 83; const trust = f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === "spark-2")!; trust.value = 3;
  assert.equal(selectPostProbeContinuation(f, s, a, "rest"), "seek-charge"); assert.equal(f.postProbeContinuation!.goals[0].careFallbackUsed, true);
  const g = f.postProbeContinuation!.goals[0]; g.actions = 64 - g.priorActionEventIds.length; delete g.signature; s.sourceCharge = 0;
  assert.equal(selectPostProbeContinuation(f, s, a, "rest"), "idle"); assert.equal(g.committedPulse, undefined);
});

test("a committed guided retry probes a busy shard route and retains the once-only retry limit", () => {
  let f = advanceFirstGlow(preparationFixture(60, 100, 0, true, false, true));
  assert.equal(f.patternGuidedRetry!.attempts.length, 1); assert.equal(f.patternGuidedRetry!.attempts[0].choice, undefined);
  const s = f.settlements[0], [owner, reader] = s.sparks;
  const shard = firstGlowRouteCandidates(s, owner, "shape-pattern")[0];
  delete owner.intention; owner.status = "traveling"; owner.intendedActivity = "shape-pattern"; owner.destinationObjectId = shard.objectId; owner.destinationSlotId = shard.slotId; owner.remainingRoute = shard.path.slice(1); owner.remainingCost = 0; owner.plannedNavigationRevision = s.runtime.navigationRevision;
  s.runtime.reservations.push({ actorId: owner.id, objectId: shard.objectId, slotId: shard.slotId });
  const cache = firstGlowRouteCandidates(s, reader, "scavenge-cache", "cache-a")[0];
  reader.position = cache.target; reader.remainingRoute = []; reader.remainingCost = 0; reader.status = "interacting";
  f = advanceFirstGlowState(f);
  assert.equal(f.patternGuidedRetry!.attempts.length, 1); assert.equal(f.patternGuidedRetry!.attempts[0].choice!.alternative, "probe");
  assert.equal(f.settlements[0].runtime.reservations.find(r => r.objectId === shard.objectId)!.actorId, owner.id);
  validateFirstGlowState(f);
});
