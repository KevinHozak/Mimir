import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { advanceWorld, createWorldFromBundle, initializeBoundedSharingAdmission, sharingAdmissionRefusal, selectPostProbeContinuation, forecastPatternArrival, firstGlowRouteCandidates, selectPatternPreparation, selectInitialCachePreparation, validateFirstGlowState, type WorldState } from "./index.js";
import { preparationFixture } from "./first-glow-pattern-preparation-fixture.js";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true, postProbeContinuation: true, careRecoveryFallback: true, geometricShardRoutes: true, boundedSharingAdmission: true };
function fixture(charge = 19, readiness = 84): WorldState {
  // Fresh policy, actual survey, then explicit controlled resources/co-presence.
  let w = createWorldFromBundle(raw, 2, "sharing-budget-unit", 1, options);
  for (let p = 0; p < 46; p++) w = advanceWorld(w).state;
  const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], extra = createWorldFromBundle(raw, 2, "sharing-recipient", 2, options).firstGlowState;
  const b = extra.settlements[0].sparks[1]; s.sparks.push(b); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  Object.assign(f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === b.id)!, { value: 3, evidenceEventIds: [a.wildCacheChoice!.outcomeEventId], lastUpdatedPulse: f.pulse });
  Object.assign(a, { position: { x: 25, y: 5 }, carriedCharge: charge, chargeDeficit: 0, readiness, status: "choosing", remainingRoute: [] });
  Object.assign(b, { position: { x: 25, y: 5 }, carriedCharge: 0, chargeDeficit: 1, readiness: 57, status: "choosing", remainingRoute: [] });
  return w;
}

test("bounded sharing is optional and fresh-only; unknown version rejects", () => {
  const old = createWorldFromBundle(raw); assert.equal(old.firstGlowState.boundedSharingAdmissionVersion, undefined);
  assert.throws(() => initializeBoundedSharingAdmission(advanceWorld(old).state.firstGlowState), /fresh/);
  const fresh = createWorldFromBundle(raw, 2, "sharing-minimal", 1, { boundedSharingAdmission: true });
  assert.equal(fresh.firstGlowState.boundedSharingAdmissionVersion, "bounded-sharing-admission-v1");
  assert.throws(() => initializeBoundedSharingAdmission(fresh.firstGlowState), /fresh/);
  (fresh.firstGlowState as unknown as { boundedSharingAdmissionVersion: string }).boundedSharingAdmissionVersion = "future";
  assert.throws(() => validateFirstGlowState(fresh.firstGlowState), /bounded sharing/);
});

test("same-cell care rest and complete shard budget cannot be spent on a gift", () => {
  const w = fixture(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], before = JSON.stringify(f);
  assert.match(sharingAdmissionRefusal(f, s, a)!, /unfund/); assert.equal(JSON.stringify(f), before);
  const next = advanceWorld(w).state.firstGlowState;
  assert.equal(next.events.some(e => e.kind === "share" && e.actorId === a.id), false);
  assert.ok(next.events.some(e => e.kind === "idle" && e.actorId === a.id));
  assert.equal(next.settlements[0].sparks[0].carriedCharge, 19); assert.equal(next.settlements[0].sparks[0].readiness, 94);
  assert.ok(next.events.some(e => e.kind === "sharing-admission" && e.actorId === a.id));
});

test("gift plus upkeep is assessed even when the one-unit transfer alone fits", () => {
  const f = fixture(20, 94).firstGlowState, s = f.settlements[0], a = s.sparks[0];
  assert.match(sharingAdmissionRefusal(f, s, a)!, /unfund/);
  a.carriedCharge = 21; assert.equal(sharingAdmissionRefusal(f, s, a), undefined);
});

test("surplus gift keeps original transfer and both sustenance costs; the next unfunded gift is refused", () => {
  let w = fixture(21, 94); w = advanceWorld(w).state;
  const f = w.firstGlowState, [a, b] = f.settlements[0].sparks;
  assert.equal(a.carriedCharge, 19); assert.equal(b.carriedCharge, 0); assert.equal(b.chargeDeficit, 1);
  assert.ok(f.ledger.some(e => e.kind === "share" && e.actorId === a.id && e.recipientId === b.id && e.amount === 1));
  for (const id of [a.id, b.id]) assert.ok(f.ledger.some(e => e.kind === "consumption" && e.actorId === id && e.reason === "activity-sustenance" && e.amount === 1));
  w = advanceWorld(w).state; assert.equal(w.firstGlowState.events.some(e => e.kind === "share" && e.actorId === a.id), false);
  assert.equal(w.firstGlowState.postProbeContinuation!.goals[0].committedPulse, w.pulse);
});

test("protected recovery completes through real care rest with conserved charge accounting and shared allowance", () => {
  let w = fixture(); const s = w.firstGlowState.settlements[0], initial = s.sourceCharge + s.communalCharge + s.sparks.reduce((n, a) => n + a.carriedCharge, 0); let produced = 0, consumed = 0, complete = false;
  for (let p = 0; p < 70; p++) {
    const previous = w; w = advanceWorld(w).state; const f = w.firstGlowState, site = f.settlements[0], g = f.postProbeContinuation!.goals[0];
    produced += f.ledger.filter(e => e.kind === "production").reduce((n, e) => n + e.amount, 0); consumed += f.ledger.filter(e => e.kind === "consumption").reduce((n, e) => n + e.amount, 0);
    assert.equal(initial + produced, site.sourceCharge + site.communalCharge + site.sparks.reduce((n, a) => n + a.carriedCharge, 0) + consumed);
    assert.ok(g.actions + g.priorActionEventIds.length <= 64);
    if (g.committedPulse === f.pulse) assert.ok(previous.firstGlowState.settlements[0].sparks[0].readiness >= 90);
    if (g.outcome === "completed") { complete = true; break; }
  }
  assert.ok(complete);
});

test("urgent rest, care preference and current deficit remain protected without an expedition goal", () => {
  const f = createWorldFromBundle(raw, 2, "sharing-needs", 2, { boundedSharingAdmission: true }).firstGlowState, s = f.settlements[0], a = s.sparks[0]; a.carriedCharge = 100;
  a.readiness = 69; assert.match(sharingAdmissionRefusal(f, s, a)!, /urgent rest/);
  a.readiness = 89; f.social.trust.find(t => t.sourceSparkId === a.id && t.targetSparkId === "spark-2")!.value = 3; assert.match(sharingAdmissionRefusal(f, s, a)!, /care rest/);
  a.readiness = 100; a.chargeDeficit = 1; assert.match(sharingAdmissionRefusal(f, s, a)!, /own need/);
  a.chargeDeficit = 0; a.carriedCharge = 2; assert.ok(sharingAdmissionRefusal(f, s, a)); a.carriedCharge = 3; assert.equal(sharingAdmissionRefusal(f, s, a), undefined);
});

test("no feasible or remaining bounded itinerary cannot authorize speculative sharing", () => {
  const f = fixture(16, 83).firstGlowState, s = f.settlements[0], a = s.sparks[0]; s.sourceCharge = 0;
  assert.match(sharingAdmissionRefusal(f, s, a)!, /no currently verified/);
  a.carriedCharge = 100; const g = f.postProbeContinuation!.goals[0]; g.actions = 64 - g.priorActionEventIds.length;
  assert.match(sharingAdmissionRefusal(f, s, a)!, /no currently verified/);
});

test("initial expedition and pattern reader budgets receive the same protection", () => {
  let w = createWorldFromBundle(raw, 2, "sharing-initial", 1, options); for (let p = 0; p < 6; p++) w = advanceWorld(w).state;
  const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0]; a.position = { x: 27, y: 5 }; a.readiness = 100;
  const cache = firstGlowRouteCandidates(s, a, "scavenge-cache")[0]; a.carriedCharge = forecastPatternArrival(s, a, cache, f).minimumCharge;
  selectInitialCachePreparation(f, s, a);
  assert.match(sharingAdmissionRefusal(f, s, a)!, /unfund/);
  const pf = preparationFixture(60, 100, 0, true, false, true, true), ps = pf.settlements[0], reader = ps.sparks[1], pattern = pf.routePatterns!.patterns[0];
  const target = firstGlowRouteCandidates(ps, reader, "scavenge-cache", pattern.targetObjectId)[0]; reader.carriedCharge = forecastPatternArrival(ps, reader, target, pf).minimumCharge;
  selectPatternPreparation(pf, ps, reader, pattern, undefined); assert.match(sharingAdmissionRefusal(pf, ps, reader)!, /unfund/);
  reader.carriedCharge = 3; reader.readiness = 70;
  const goal = pf.patternPreparation!.goals[0]; goal.actions = 63; delete goal.signature;
  assert.match(sharingAdmissionRefusal(pf, ps, reader)!, /no currently verified/);
});

test("budget assessment leaves fair queue ages and valid contact owners unchanged", () => {
  const f = fixture().firstGlowState, s = f.settlements[0], a = s.sparks[0], b = s.sparks[1];
  b.position = { x: 5, y: 5 }; b.carriedCharge = 100; b.status = "interacting"; b.intendedActivity = "seek-charge";
  const c = firstGlowRouteCandidates(s, b, "seek-charge")[0]; b.position = c.target; b.destinationObjectId = c.objectId; b.destinationSlotId = c.slotId;
  s.runtime.reservations.push({ actorId: b.id, objectId: c.objectId, slotId: c.slotId });
  selectPostProbeContinuation(f, s, a, "rest"); a.intendedActivity = "seek-shelter";
  f.recoveryAdmission!.requests = [{ sparkId: a.id, settlementId: s.id, activity: "seek-shelter", sincePulse: f.pulse - 3 }];
  const before = JSON.stringify(f); sharingAdmissionRefusal(f, s, a); assert.equal(JSON.stringify(f), before); validateFirstGlowState(f);
});
