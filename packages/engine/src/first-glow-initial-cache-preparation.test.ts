import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { advanceWorld, advanceFirstGlowState, createWorldFromBundle, initializeInitialCachePreparation, selectInitialCachePreparation, finishInitialCachePreparation, validateFirstGlowState, firstGlowRouteCandidates, forecastPatternArrival, type WorldState } from "./index.js";
const current = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const small = JSON.parse(readFileSync(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url), "utf8"));
const options = { routePatterns: true, activityCompletion: true, patternGuidedRetry: true, patternPreparation: true, sharingRouteContinuation: true, recoveryAdmission: true, initialCachePreparation: true };
function opening(pulses = 6) { let w = createWorldFromBundle(current, 2, "initial-unit", 1, options); for (let i = 0; i < pulses; i++) w = advanceWorld(w).state; return w; }
function controlled(count = 1) {
  const w = createWorldFromBundle(current, 2, "initial-controlled", count, options), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
  w.pulse = f.pulse = 1; a.knownEvidenceEventIds.push("event-1-spark-1-explore");
  a.carriedCharge = 20; a.readiness = 100; a.position = { x: 28, y: 25 };
  return w;
}

test("first expedition is fresh-only, optional and independent of route-pattern knowledge", () => {
  const old = createWorldFromBundle(current);
  assert.equal(old.firstGlowState.initialCachePreparation, undefined);
  assert.throws(() => initializeInitialCachePreparation(advanceWorld(old).state.firstGlowState), /fresh/);
  const minimal = createWorldFromBundle(small, 2, "minimal", 1, { initialCachePreparation: true });
  assert.equal(minimal.firstGlowState.routePatterns, undefined);
  assert.ok(minimal.firstGlowState.wildCacheChoiceVersion); assert.ok(minimal.firstGlowState.recoveryAdmission);
  assert.throws(() => initializeInitialCachePreparation(minimal.firstGlowState), /fresh/);
  const f = opening().firstGlowState, s = f.settlements[0], a = s.sparks[0];
  assert.equal(selectInitialCachePreparation(f, s, a), "seek-charge");
  assert.equal(f.routePatterns!.patterns.length, 0); assert.equal(f.patternPreparation!.goals.length, 0);
  assert.equal(f.patternGuidedRetry!.attempts.length, 0);
  assert.equal(a.carriedCharge, 7); assert.equal(s.sourceCharge, 40); assert.equal(s.runtime.reservations.length, 0);
  assert.equal(f.initialCachePreparation!.goals[0].explorationEventId, "event-6-spark-1-explore");
});

test("unmodified constructor executes real bounded preparation, funded initial probe and shard creation", () => {
  const events: Array<{id: string; evidenceEventIds?: string[]}> = [];
  let w = opening(0), draws = 0, rests = 0, consumption = 0, sourceProduction = 0, projected: ReturnType<typeof forecastPatternArrival> | undefined;
  for (let i = 0; i < 60; i++) {
    const before = JSON.stringify(w), next = advanceWorld(w); assert.equal(JSON.stringify(w), before); w = next.state; events.push(...next.events);
    const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], goal = f.initialCachePreparation!.goals[0];
    consumption += f.ledger.filter(e => e.kind === "consumption").reduce((n, e) => n + e.amount, 0);
    sourceProduction += f.ledger.filter(e => e.kind === "production").reduce((n, e) => n + e.amount, 0);
    if (goal?.actionEventIds.some(id => id === `event-${f.pulse}-spark-1-draw`)) draws++;
    if (goal?.actionEventIds.some(id => id === `event-${f.pulse}-spark-1-idle`)) rests++;
    if (f.pulse === 25) projected = forecastPatternArrival(s, a, firstGlowRouteCandidates(s, a, "scavenge-cache")[0]);
    if (a.wildCacheChoice?.pulse === f.pulse) { assert.equal(a.wildCacheChoice.alternative, "probe"); assert.equal(a.carriedCharge, projected!.afterProbe.charge); assert.equal(a.readiness, projected!.afterProbe.readiness); }
    assert.equal(f.patternGuidedRetry!.attempts.length, 0);
    assert.ok((goal?.actions ?? 0) <= 64);
    assert.equal(24 + sourceProduction, s.sourceCharge + s.communalCharge + a.carriedCharge + consumption);
  }
  const f = w.firstGlowState, goal = f.initialCachePreparation!.goals[0];
  assert.equal(draws, 4); assert.equal(rests, 2); assert.equal(goal.actions, 6);
  assert.equal(goal.committedPulse, 26); assert.equal(goal.outcome, "probe");
  assert.equal(f.routePatterns!.patterns[0].createdPulse, 54);
  assert.equal(f.patternPreparation!.goals.length, 0);
  assert.ok(events.find(e => e.id === goal.departureEventId)?.evidenceEventIds?.includes(goal.explorationEventId));
});

test("actual departure rejects changed resources, stale pins and occupied cache contacts without spending an attempt", () => {
  for (const mutation of ["charge", "readiness", "revision", "contact"]) {
    const w = controlled(2), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0], owner = s.sparks[1];
    a.intendedActivity = selectInitialCachePreparation(f, s, a)!; assert.equal(a.intendedActivity, "scavenge-cache");
    if (mutation === "charge") a.carriedCharge = 0;
    if (mutation === "readiness") a.readiness = 74;
    if (mutation === "revision") { s.runtime.navigationRevision++; a.initialPreparedDestination!.navigationRevision++; }
    if (mutation === "contact") {
      const pin = a.initialPreparedDestination!; owner.status = "traveling"; owner.intendedActivity = "scavenge-cache";
      owner.destinationObjectId = pin.objectId; owner.destinationSlotId = pin.slotId; owner.destinationCell = undefined;
      const c = firstGlowRouteCandidates(s, owner, "scavenge-cache")[0]; owner.remainingRoute = c.path.slice(1); owner.remainingCost = 100; owner.plannedNavigationRevision = 0;
      s.runtime.reservations.push({ actorId: owner.id, objectId: pin.objectId, slotId: pin.slotId });
    }
    const next = advanceFirstGlowState(f);
    assert.equal(next.initialCachePreparation!.goals[0].phase, "deferred");
    assert.equal(next.initialCachePreparation!.goals[0].committedPulse, undefined);
    assert.equal(next.settlements[0].sparks[0].wildCacheChoice, undefined);
    assert.equal(next.patternGuidedRetry!.attempts.length, 0);
  }
});

test("arrival resource and shard-contact gates remain authoritative after funded departure", () => {
  for (const cause of ["resource", "shard"]) {
    let w = opening(45), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
    if (cause === "resource") a.carriedCharge = 0;
    else {
      // A valid stationary owner occupies the shard for this controlled arrival.
      const extra = createWorldFromBundle(current, 2, "owner", 2, options).firstGlowState;
      const owner = extra.settlements[0].sparks[1]; owner.position = { x: 22, y: 23 }; owner.status = "interacting"; owner.intendedActivity = "shape-pattern";
      owner.destinationObjectId = "tiled-104"; owner.destinationSlotId = "examine";
      s.sparks.push(owner); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
      s.runtime.reservations.push({ actorId: owner.id, objectId: "tiled-104", slotId: "examine" });
    }
    w = advanceWorld(w).state;
    assert.equal(w.firstGlowState.settlements[0].sparks[0].wildCacheChoice!.alternative, "conserve");
    assert.equal(w.firstGlowState.initialCachePreparation!.goals[0].outcome, "conserve");
    assert.equal(w.firstGlowState.routePatterns!.patterns.length, 0);
  }
});

test("first cache conservation and interruption do not grant another initial attempt or pattern retry", () => {
  for (const interrupted of [false, true]) {
    let w = opening(45); const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
    if (interrupted) { a.remainingRoute = []; a.destinationObjectId = undefined; a.destinationSlotId = undefined; a.status = "choosing"; s.runtime.reservations = []; finishInitialCachePreparation(f); }
    else a.carriedCharge = 0;
    for (let i = 0; i < 30; i++) w = advanceWorld(w).state;
    const goal = w.firstGlowState.initialCachePreparation!.goals[0];
    assert.equal(goal.outcome, interrupted ? "interrupted" : "conserve");
    assert.equal(goal.committedPulse, 26); assert.equal(goal.actions, 6);
    assert.equal(w.firstGlowState.patternGuidedRetry!.attempts.length, 0);
    assert.equal(w.firstGlowState.settlements[0].sparks[0].knownEvidenceEventIds.filter(id => id.endsWith("-initial-cache-departure")).length, 1);
  }
});

test("empty stock, stale navigation and the remaining action bound defer preparation without inventing effects", () => {
  for (const cause of ["empty", "stale", "bound"]) {
    const w = opening(), f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0];
    selectInitialCachePreparation(f, s, a); const goal = f.initialCachePreparation!.goals[0];
    if (cause === "empty") s.sourceCharge = 0;
    if (cause === "stale") s.runtime.navigationRevision++;
    if (cause === "bound") { goal.actions = 63; goal.actionEventIds = Array.from({ length: 63 }, (_, i) => `controlled-recovery-${i}`); a.knownEvidenceEventIds.push(...goal.actionEventIds); }
    const before = [a.carriedCharge, a.chargeDeficit, a.readiness, s.sourceCharge];
    assert.equal(selectInitialCachePreparation(f, s, a), "idle");
    assert.equal(goal.phase, "deferred"); assert.equal(a.initialPreparedDestination, undefined);
    assert.deepEqual([a.carriedCharge, a.chargeDeficit, a.readiness, s.sourceCharge], before);
    assert.equal(goal.committedPulse, undefined);
    if (cause === "empty") { s.sourceCharge = 40; assert.equal(selectInitialCachePreparation(f, s, a), "seek-charge"); }
  }
});

test("malformed policy, goal provenance, orphan pins and excessive actions reject", () => {
  const w = opening(); selectInitialCachePreparation(w.firstGlowState, w.firstGlowState.settlements[0], w.firstGlowState.settlements[0].sparks[0]);
  for (const mutate of [
    (f: any) => f.initialCachePreparation.version = "future",
    (f: any) => f.initialCachePreparation.goals[0].targetObjectId = "missing",
    (f: any) => f.initialCachePreparation.goals[0].explorationEventId = "invented-explore",
    (f: any) => f.initialCachePreparation.goals[0].actions = 65,
    (f: any) => f.initialCachePreparation.goals.push(f.initialCachePreparation.goals[0]),
    (f: any) => delete f.initialCachePreparation,
    (f: any) => f.settlements[0].sparks[0].initialPreparedDestination.slotId = "missing"
  ]) { const f = structuredClone(w.firstGlowState); mutate(f); assert.throws(() => validateFirstGlowState(f), /initial|Initial/); }
});

test("JSON checkpoint preserves preparation actions, pending departure and deterministic continuation", () => {
  for (const pulse of [8, 24, 30, 46]) {
    let a = opening(pulse), b: WorldState = JSON.parse(JSON.stringify(a));
    for (let i = 0; i < 10; i++) { a = advanceWorld(a).state; b = advanceWorld(b).state; assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))); }
  }
});

test("initial recovery joins the shared queue and preserves valid owners without early actions", () => {
  let w = createWorldFromBundle(current, 2, "initial-queue", 5, options);
  const f = w.firstGlowState, s = f.settlements[0], a = s.sparks[0]; w.pulse = f.pulse = 1;
  a.position = { x: 3, y: 5 }; a.carriedCharge = 7; a.readiness = 94; a.knownEvidenceEventIds = ["event-1-spark-1-explore"]; s.sourceCharge = 40;
  const contacts = firstGlowRouteCandidates(s, a, "seek-charge"); assert.equal(contacts.length, 4);
  for (const [i, c] of contacts.entries()) {
    const owner = s.sparks[i + 1]; owner.status = "traveling"; owner.intendedActivity = "seek-charge";
    owner.destinationObjectId = c.objectId; owner.destinationSlotId = c.slotId;
    owner.remainingRoute = firstGlowRouteCandidates(s, owner, "seek-charge").find(x => x.slotId === c.slotId)!.path.slice(1);
    owner.remainingCost = 100; s.runtime.reservations.push({ actorId: owner.id, objectId: c.objectId, slotId: c.slotId });
  }
  const originalOwners = structuredClone(s.runtime.reservations);
  w = advanceWorld(w).state;
  const g = w.firstGlowState.initialCachePreparation!.goals[0];
  assert.equal(g.phase, "charge"); assert.equal(g.actions, 0); assert.equal(g.committedPulse, undefined);
  assert.deepEqual(w.firstGlowState.settlements[0].runtime.reservations, originalOwners);
  const request = w.firstGlowState.recoveryAdmission!.requests.find(r => r.sparkId === a.id)!;
  assert.ok(request); w = advanceWorld(w).state;
  assert.equal(w.firstGlowState.recoveryAdmission!.requests.find(r => r.sparkId === a.id)!.sincePulse, request.sincePulse);
  assert.equal(w.firstGlowState.initialCachePreparation!.goals[0].actions, 0);
});

test("sharing pause retains a committed initial route and never authorizes another departure", () => {
  let w = opening(30); const f = w.firstGlowState, s = f.settlements[0], traveler = s.sparks[0];
  const extra = createWorldFromBundle(current, 2, "initial-donor", 2, options).firstGlowState, donor = extra.settlements[0].sparks[1];
  donor.position = { ...traveler.position }; donor.carriedCharge = 5; traveler.carriedCharge = 0;
  s.sparks.push(donor); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  const cost = traveler.remainingCost, destination = traveler.destinationObjectId, route = structuredClone(traveler.remainingRoute);
  w = advanceWorld(w).state;
  const after = w.firstGlowState.settlements[0].sparks[0], goal = w.firstGlowState.initialCachePreparation!.goals[0];
  assert.equal(after.status, "traveling"); assert.equal(after.destinationObjectId, destination);
  assert.equal(after.remainingCost, cost); assert.deepEqual(after.remainingRoute, route);
  assert.equal(goal.outcome, undefined); assert.equal(goal.committedPulse, 26);
  assert.equal(w.firstGlowState.ledger.filter(e => e.kind === "share").reduce((n, e) => n + e.amount, 0), 1);
});

test("an interrupted initial expedition does not suppress a separately learned public pattern", () => {
  let w = opening(54); const f = w.firstGlowState, s = f.settlements[0];
  s.sparks[0].carriedCharge = 100; // Keep the controlled reader from choosing emergency sharing first.
  const extra = createWorldFromBundle(current, 2, "interrupted-reader", 2, options).firstGlowState, reader = extra.settlements[0].sparks[1];
  reader.position = { x: 22, y: 23 }; reader.carriedCharge = 100; reader.readiness = 100;
  reader.knownEvidenceEventIds = ["event-1-spark-2-explore", "event-2-spark-2-initial-cache-departure"];
  s.sparks.push(reader); f.social = extra.social; f.reflectionCapacity = extra.reflectionCapacity;
  f.initialCachePreparation!.goals.push({ sparkId: reader.id, settlementId: s.id, targetObjectId: "tiled-106", explorationEventId: "event-1-spark-2-explore", createdPulse: 1, navigationRevision: 0, phase: "committed", reason: "controlled interrupted expedition", actions: 0, actionEventIds: [], committedPulse: 2, departureEventId: "event-2-spark-2-initial-cache-departure", outcome: "interrupted" });
  w = advanceWorld(w).state; // Real, later, co-located encounter with Spark 1's actual pattern.
  assert.equal(w.firstGlowState.routePatterns!.patterns[0].encounters[0].sparkId, reader.id);
  w = advanceWorld(w).state;
  assert.ok(w.firstGlowState.routePatterns!.patterns[0].encounters[0].use);
  assert.equal(w.firstGlowState.patternGuidedRetry!.attempts.length, 0); // No conservation existed to retry.
  assert.equal(w.firstGlowState.initialCachePreparation!.goals[1].committedPulse, 2);
  assert.equal(w.firstGlowState.initialCachePreparation!.goals[1].outcome, "interrupted");
});
