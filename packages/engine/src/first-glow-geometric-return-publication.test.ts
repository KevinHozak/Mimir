import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceWorld, initializeGeometricReturnPublication, canPublishGeometricReturnRoute, firstGlowRouteCandidates, canReachRoutePatternTarget, updateRoutePatterns, validateFirstGlowState, type WorldState } from "./index.js";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const base = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true, geometricShardRoutes: true, boundedSharingAdmission: true };
function beforeCompletion(enabled = true): WorldState {
  // Actual survey, funded departure and nearly complete shard leg under a fresh
  // policy. A controlled second Spark then holds the return cache contact.
  let w = createWorldFromBundle(raw, 2, "publication-unit", 1, { ...base, geometricReturnPublication: enabled });
  for (let p = 0; p < 118; p++) w = advanceWorld(w).state;
  const f = w.firstGlowState, s = f.settlements[0], extra = createWorldFromBundle(raw, 2, "publication-owner", 2, base).firstGlowState, owner = extra.settlements[0].sparks[1];
  s.sparks.push(owner); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  owner.position = { x: 5, y: 5 }; owner.carriedCharge = 100; owner.readiness = 100;
  const route = firstGlowRouteCandidates(s, owner, "scavenge-cache", "tiled-106")[0];
  Object.assign(owner, { status: "traveling", intendedActivity: "scavenge-cache", destinationObjectId: route.objectId, destinationSlotId: route.slotId, remainingRoute: route.path.slice(1), remainingCost: 0, plannedNavigationRevision: s.runtime.navigationRevision });
  s.runtime.reservations.push({ actorId: owner.id, objectId: route.objectId, slotId: route.slotId });
  return w;
}

test("return publication is optional, fresh-only and versioned with route-pattern prerequisites", () => {
  const old = createWorldFromBundle(raw); assert.equal(old.firstGlowState.geometricReturnPublicationVersion, undefined);
  assert.throws(() => initializeGeometricReturnPublication(advanceWorld(old).state.firstGlowState), /fresh/);
  const fresh = createWorldFromBundle(raw, 2, "publication-minimal", 1, { geometricReturnPublication: true });
  assert.equal(fresh.firstGlowState.geometricReturnPublicationVersion, "geometric-return-publication-v1"); assert.ok(fresh.firstGlowState.routePatterns); assert.ok(fresh.firstGlowState.wildCacheChoiceVersion);
  assert.equal(fresh.firstGlowState.boundedSharingAdmissionVersion, undefined);
  assert.throws(() => initializeGeometricReturnPublication(fresh.firstGlowState), /fresh/);
  (fresh.firstGlowState as unknown as { geometricReturnPublicationVersion: string }).geometricReturnPublicationVersion = "future";
  assert.throws(() => validateFirstGlowState(fresh.firstGlowState), /geometric return publication/);
  fresh.firstGlowState.geometricReturnPublicationVersion = "geometric-return-publication-v1"; delete fresh.firstGlowState.routePatterns;
  assert.throws(() => validateFirstGlowState(fresh.firstGlowState), /geometric return publication/);
});

test("publication geometry is read-only and does not admit the occupied cache contact", () => {
  const f = beforeCompletion().firstGlowState, s = f.settlements[0], a = s.sparks[0], before = JSON.stringify(f);
  assert.equal(canReachRoutePatternTarget(s, a, "tiled-106"), false);
  assert.equal(canPublishGeometricReturnRoute(s, a, "tiled-106"), true);
  assert.equal(firstGlowRouteCandidates(s, a, "scavenge-cache", "tiled-106").length, 0);
  assert.equal(canPublishGeometricReturnRoute(s, a, "missing-cache"), false);
  assert.equal(canPublishGeometricReturnRoute(s, a, "tiled-104"), false);
  assert.equal(JSON.stringify(f), before); validateFirstGlowState(f);
});

test("real completion publishes while the cache traveler retains ownership and all resource costs balance", () => {
  const w = beforeCompletion(), s = w.firstGlowState.settlements[0];
  const total = (site: typeof s) => site.sourceCharge + site.communalCharge + site.sparks.reduce((n, a) => n + a.carriedCharge, 0);
  const next = advanceWorld(w).state, f = next.firstGlowState, pattern = f.routePatterns!.patterns[0];
  assert.equal(pattern.createdPulse, 119); assert.equal(pattern.creatorId, "spark-1");
  assert.deepEqual(pattern.sourceEventIds, ["event-46-spark-1-cache-survey", "event-119-spark-1-shape-pattern"]);
  assert.deepEqual(pattern.encounters, []); assert.equal(f.postProbeContinuation!.goals[0].outcome, "completed");
  assert.equal(f.settlements[0].runtime.reservations.find(r => r.objectId === "tiled-106")!.actorId, "spark-2");
  assert.equal(canReachRoutePatternTarget(f.settlements[0], f.settlements[0].sparks[0], "tiled-106"), false);
  const produced = f.ledger.filter(e => e.kind === "production").reduce((n, e) => n + e.amount, 0), consumed = f.ledger.filter(e => e.kind === "consumption").reduce((n, e) => n + e.amount, 0);
  assert.equal(total(s) + produced, total(f.settlements[0]) + consumed);
  assert.equal(f.patternGuidedRetry!.attempts.length, 0); validateFirstGlowState(f);
});

test("absent-policy completion retains its original dropped-publication behavior after contact release", () => {
  let w = advanceWorld(beforeCompletion(false)).state; assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].outcome, "completed"); assert.equal(w.firstGlowState.routePatterns!.patterns.length, 0);
  const s = w.firstGlowState.settlements[0], owner = s.sparks[1]; s.runtime.reservations = s.runtime.reservations.filter(r => r.actorId !== owner.id);
  delete owner.destinationObjectId; delete owner.destinationSlotId; owner.remainingRoute = []; owner.status = "choosing";
  w = advanceWorld(w).state; assert.equal(w.firstGlowState.routePatterns!.patterns.length, 0); assert.equal(w.firstGlowState.events.some(e => e.actorId === "spark-1" && e.kind === "shape-pattern"), false);
});

test("survey knowledge and geometric reachability do not fabricate a completion", () => {
  const f = beforeCompletion().firstGlowState, before = JSON.stringify(f);
  assert.equal(f.settlements[0].sparks[0].wildCacheChoice!.alternative, "probe");
  updateRoutePatterns(f, () => false); assert.equal(f.routePatterns!.patterns.length, 0); assert.equal(JSON.stringify(f), before);
});

test("publication still requires the actual shard, probe and recorded origin", () => {
  const completed = advanceWorld(beforeCompletion()).state.firstGlowState;
  for (const missing of ["shard", "probe", "origin", "completion"] as const) {
    const f = structuredClone(completed), a = f.settlements[0].sparks[0]; f.routePatterns!.patterns = [];
    // Isolated invalid-source controls, not persisted or claimed as histories.
    if (missing === "shard") a.position = { x: 5, y: 5 };
    if (missing === "probe") a.wildCacheChoice!.alternative = "conserve";
    if (missing === "origin") delete a.wildCacheChoice!.routeFact!.originObjectId;
    if (missing === "completion") f.events = f.events.filter(e => e.actorId !== a.id || e.kind !== "shape-pattern");
    updateRoutePatterns(f, () => true); assert.equal(f.routePatterns!.patterns.length, 0, missing);
  }
});

test("blocked return topology still prevents publication despite ignored contact reservations", () => {
  const f = advanceWorld(beforeCompletion()).state.firstGlowState, s = f.settlements[0], a = s.sparks[0];
  f.routePatterns!.patterns = []; s.runtime.objects.push({ objectId: "tiled-106", blocked: true }); s.runtime.navigationRevision++;
  assert.equal(canPublishGeometricReturnRoute(s, a, "tiled-106"), false);
  updateRoutePatterns(f, () => true); assert.equal(f.routePatterns!.patterns.length, 0);
});

test("one artifact per creator and the 64-artifact limit remain authoritative", () => {
  const f = advanceWorld(beforeCompletion()).state.firstGlowState, pattern = f.routePatterns!.patterns[0];
  updateRoutePatterns(f, () => true); assert.equal(f.routePatterns!.patterns.length, 1);
  // Saturated store is an isolated cap control; it is not ordinary-history data.
  f.routePatterns!.patterns = Array.from({ length: 64 }, (_, i) => ({ ...pattern, id: `cap-${i}`, creatorId: `cap-creator-${i}`, encounters: [] }));
  updateRoutePatterns(f, () => true); assert.equal(f.routePatterns!.patterns.length, 64);
  assert.equal(f.routePatterns!.patterns.some(p => p.creatorId === "spark-1"), false);
});
