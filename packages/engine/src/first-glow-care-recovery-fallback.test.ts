import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceWorld, initializeCareRecoveryFallback, selectPostProbeContinuation, validateFirstGlowState, postProbeMinimumReadiness, admitRecoveryRequests, cancelObsoleteRecoveryRequests } from "./index.js";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true };

function fixture(readiness = 83, charge = 16) {
  // Explicit fresh opt-in before producing a real survey. Later resource/position
  // setup is a controlled unit fixture, never a purported ordinary continuation.
  let w = createWorldFromBundle(raw, 2, "care-fallback-unit", 1, options);
  for (let i = 0; i < 46; i++) w = advanceWorld(w).state;
  const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
  const extra = createWorldFromBundle(raw, 2, "care-unit-companion", 2, options).firstGlowState, other = extra.settlements[0].sparks[1];
  other.carriedCharge = 100; s.sparks.push(other); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  Object.assign(f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === other.id)!, { value: 3, evidenceEventIds: [a.wildCacheChoice!.outcomeEventId], lastUpdatedPulse: f.pulse });
  a.position = { x: 5, y: 5 }; a.carriedCharge = charge; a.chargeDeficit = 0; a.readiness = readiness;
  a.status = "choosing"; a.intendedActivity = "seek-charge";
  return w;
}

test("fallback is optional, fresh-only and cannot be attached to recorded v1 histories", () => {
  const old = createWorldFromBundle(raw, 2, "old", 1, { postProbeContinuation: true });
  assert.equal(old.firstGlowState.careRecoveryFallbackVersion, undefined);
  assert.throws(() => initializeCareRecoveryFallback(advanceWorld(old).state.firstGlowState), /fresh/);
  const fresh = createWorldFromBundle(raw, 2, "minimal", 1, { careRecoveryFallback: true });
  assert.equal(fresh.firstGlowState.careRecoveryFallbackVersion, "care-recovery-fallback-v1");
  assert.ok(fresh.firstGlowState.postProbeContinuation); assert.equal(fresh.firstGlowState.postProbeContinuation!.goals.length, 0);
  assert.throws(() => initializeCareRecoveryFallback(fresh.firstGlowState), /fresh/);
});

test("nonurgent care-first infeasibility selects bounded charge then rest without free resources", () => {
  const w = fixture(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
  const before = [a.carriedCharge, a.chargeDeficit, a.readiness, s.sourceCharge];
  assert.equal(selectPostProbeContinuation(f, s, a, "rest"), "seek-charge");
  assert.equal(a.postProbeDestination!.careFallback, true);
  assert.equal(f.postProbeContinuation!.goals[0].careFallbackUsed, true);
  assert.equal(f.postProbeContinuation!.goals[0].careRestEventId, undefined);
  assert.equal(f.postProbeContinuation!.goals[0].actions, 0);
  assert.equal(postProbeMinimumReadiness(f, s, a), 90);
  assert.deepEqual([a.carriedCharge, a.chargeDeficit, a.readiness, s.sourceCharge], before);
  validateFirstGlowState(f);
});

test("urgent rest below 70 never selects the fallback", () => {
  for (const readiness of [0, 62, 69]) {
    const f = fixture(readiness).firstGlowState, s = f.settlements[0], a = s.sparks[0];
    const result = selectPostProbeContinuation(f, s, a, "rest");
    assert.notEqual(result, "seek-charge"); assert.equal(a.postProbeDestination?.careFallback, undefined);
    assert.equal(f.postProbeContinuation!.goals[0].careFallbackUsed, undefined);
  }
});

test("a feasible rest-first plan remains preferred even if every shelter contact is busy", () => {
  const f = fixture(83, 100).firstGlowState, s = f.settlements[0], a = s.sparks[0];
  const extra = createWorldFromBundle(raw, 2, "care-busy-owners", 6, options).firstGlowState;
  s.sparks = [a, ...extra.settlements[0].sparks.slice(1)]; f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  Object.assign(f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === "spark-2")!, { value: 3, evidenceEventIds: [a.wildCacheChoice!.outcomeEventId], lastUpdatedPulse: f.pulse });
  // Conditional forecast cannot evict the current owner or turn waiting into charging.
  const contacts = s.bundle.objects.filter(o => ["tiled-102", "tiled-107"].includes(o.id)).flatMap(shelter => s.bundle.objectDefinitions[shelter.definitionId].slots.map(slot => ({ shelter, slot })));
  assert.equal(contacts.length, 5);
  s.runtime.reservations = contacts.map(({ shelter, slot }, i) => {
    const owner = s.sparks[i + 1]; owner.position = { x: shelter.origin.x + slot.offset.x, y: shelter.origin.y + slot.offset.y };
    owner.carriedCharge = 100; owner.status = "interacting"; owner.intendedActivity = "seek-shelter"; owner.destinationObjectId = shelter.id; owner.destinationSlotId = slot.id;
    return { actorId: owner.id, objectId: shelter.id, slotId: slot.id };
  });
  const before = JSON.stringify(s.runtime.reservations);
  assert.equal(selectPostProbeContinuation(f, s, a, "rest"), "seek-shelter");
  assert.equal(a.postProbeDestination!.careFallback, undefined);
  assert.equal(f.postProbeContinuation!.goals[0].careFallbackUsed, undefined);
  assert.equal(JSON.stringify(s.runtime.reservations), before);
  a.intendedActivity = "seek-shelter";
  assert.ok(admitRecoveryRequests(f).has(a.id));
  assert.equal(JSON.stringify(s.runtime.reservations), before); validateFirstGlowState(f);
});

test("fair admission rechecks a fallback and refuses charging after urgent rest becomes necessary", () => {
  const f = fixture().firstGlowState, s = f.settlements[0], a = s.sparks[0];
  a.intendedActivity = selectPostProbeContinuation(f, s, a, "rest")!;
  a.readiness = 69; const stock = s.sourceCharge;
  const blocked = admitRecoveryRequests(f);
  assert.ok(blocked.has(a.id)); assert.equal(s.runtime.reservations.some(r => r.actorId === a.id), false);
  assert.equal(s.sourceCharge, stock); assert.equal(a.carriedCharge, 16);
  assert.equal(f.postProbeContinuation!.goals[0].committedPulse, undefined);
});

test("a changed request cannot admit its stale charge contact or retain queue age after switching to rest", () => {
  const f = fixture().firstGlowState, s = f.settlements[0], a = s.sparks[0];
  a.intendedActivity = selectPostProbeContinuation(f, s, a, "rest")!;
  f.recoveryAdmission!.requests = [{ sparkId: a.id, settlementId: s.id, activity: "seek-charge", sincePulse: 40 }];
  a.carriedCharge = 100;
  assert.ok(admitRecoveryRequests(f).has(a.id));
  assert.equal(s.runtime.reservations.some(r => r.actorId === a.id), false);
  a.intendedActivity = "seek-shelter"; cancelObsoleteRecoveryRequests(f);
  assert.equal(f.recoveryAdmission!.requests.some(r => r.sparkId === a.id), false);
});

test("real draws, rest and funded completion preserve 90 readiness and charge accounting", () => {
  let w = fixture(), first = w.firstGlowState.settlements[0], produced = 0, consumed = 0;
  const initialTotal = first.sourceCharge + first.communalCharge + first.sparks.reduce((n, a) => n + a.carriedCharge, 0);
  let sawFallback = false, sawRest = false, completed = false;
  for (let i = 0; i < 100; i++) {
    const previous = w, before = JSON.stringify(w); w = advanceWorld(w).state; assert.equal(JSON.stringify(previous), before);
    const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], g = f.postProbeContinuation!.goals[0];
    produced += f.ledger.filter(e => e.kind === "production").reduce((n, e) => n + e.amount, 0);
    consumed += f.ledger.filter(e => e.kind === "consumption").reduce((n, e) => n + e.amount, 0);
    assert.equal(initialTotal + produced, s.sourceCharge + s.communalCharge + s.sparks.reduce((n, a) => n + a.carriedCharge, 0) + consumed);
    sawFallback ||= Boolean(g.careFallbackUsed); sawRest ||= Boolean(g.careRestEventId);
    if (g.committedPulse === f.pulse) {
      assert.ok(g.careRestEventId); assert.ok(previous.firstGlowState.settlements[0].sparks[0].readiness >= 90);
    }
    assert.ok(g.actions + g.priorActionEventIds.length <= 64);
    if (g.outcome === "completed") { completed = true; assert.equal(a.chargeDeficit, 0); assert.ok(a.readiness > 0); break; }
  }
  assert.ok(sawFallback && sawRest && completed);
});

test("fallback care is retained if social preference changes and departure requires actual rest evidence", () => {
  const w = fixture(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
  selectPostProbeContinuation(f, s, a, "rest");
  f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === s.sparks[1].id)!.value = -3;
  assert.equal(postProbeMinimumReadiness(f, s, a), 90);
  a.carriedCharge = 100; a.readiness = 100;
  assert.equal(selectPostProbeContinuation(f, s, a), "seek-shelter");
  assert.equal(f.postProbeContinuation!.goals[0].careRestEventId, undefined);
  a.carriedCharge = 16; a.readiness = 83; s.sourceCharge = 0;
  const next = advanceWorld(w).state;
  assert.equal(next.firstGlowState.settlements[0].sparks[0].intendedActivity, "seek-shelter");
});

test("empty source and remaining shared action bound defer without activating a free fallback", () => {
  for (const cause of ["source", "budget"]) {
    const f = fixture().firstGlowState, s = f.settlements[0], a = s.sparks[0], g = f.postProbeContinuation!.goals[0];
    if (cause === "source") s.sourceCharge = 0;
    else { g.actions = 57; g.actionEventIds = Array.from({ length: 57 }, (_, i) => `controlled-care-action-${i}`); a.knownEvidenceEventIds.push(...g.actionEventIds); }
    const resources = [a.carriedCharge, a.readiness, s.sourceCharge];
    assert.equal(selectPostProbeContinuation(f, s, a, "rest"), "idle");
    assert.equal(g.careFallbackUsed, undefined); assert.equal(a.postProbeDestination, undefined);
    assert.deepEqual([a.carriedCharge, a.readiness, s.sourceCharge], resources);
  }
});

test("unknown policy and malformed fallback/rest provenance reject at normalization boundaries", () => {
  const f = fixture().firstGlowState, s = f.settlements[0], a = s.sparks[0]; selectPostProbeContinuation(f, s, a, "rest");
  for (const mutate of [
    (c: any) => c.careRecoveryFallbackVersion = "future",
    (c: any) => delete c.careRecoveryFallbackVersion,
    (c: any) => c.postProbeContinuation.goals[0].careFallbackUsed = false,
    (c: any) => c.postProbeContinuation.goals[0].careRestEventId = "invented-idle",
    (c: any) => c.settlements[0].sparks[0].postProbeDestination.careFallback = false
  ]) { const c = structuredClone(f); mutate(c); assert.throws(() => validateFirstGlowState(c), /care|Care/); }
});
