import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceFirstGlowState, advanceFirstGlow, initializeRecoveryAdmission, validateFirstGlowState, admitRecoveryRequests, selectPatternPreparation, cancelObsoleteRecoveryRequests, type FirstGlowState } from "./index.js";
import { preparationFixture } from "./first-glow-pattern-preparation-fixture.js";
import { bundleHash } from "@mimir/world-data";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url), "utf8"));
function fixture(count = 3): FirstGlowState {
  const state = createWorldFromBundle(raw, 2, "admission-unit", count, { recoveryAdmission: true }).firstGlowState;
  state.settlements[0].sourceCharge = 1000;
  return state;
}

test("fresh-only policy rejects unknown versions, malformed queues and retrofit; defaults stay absent", () => {
  assert.equal(createWorldFromBundle(raw).firstGlowState.recoveryAdmission, undefined);
  const s = fixture(); assert.throws(() => initializeRecoveryAdmission(s), /fresh/);
  const old = createWorldFromBundle(raw).firstGlowState; old.pulse = 1;
  assert.throws(() => initializeRecoveryAdmission(old), /fresh/);
  for (const mutation of [
    (c: any) => c.recoveryAdmission.version = "future",
    (c: any) => c.recoveryAdmission.requests = [{ sparkId: "missing", settlementId: c.settlements[0].id, activity: "seek-charge", sincePulse: 0 }],
    (c: any) => c.recoveryAdmission.requests = Array(4).fill({}),
    (c: any) => c.recoveryAdmission.requests = [{ sparkId: "spark-1", settlementId: c.settlements[0].id, activity: "seek-charge", sincePulse: 2 }]
  ]) { const c = structuredClone(s); mutation(c); assert.throws(() => validateFirstGlowState(c), /recovery admission/); }
});

test("atomic admission gives a contact one owner, stable ID ties and no early charge", () => {
  const s = fixture(), before = JSON.stringify(s);
  const next = advanceFirstGlowState(s);
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(next.settlements[0].runtime.reservations.map(r => r.actorId), ["spark-1"]);
  assert.deepEqual(next.recoveryAdmission!.requests.map(r => r.sparkId), ["spark-2", "spark-3"]);
  assert.equal(next.settlements[0].sourceCharge, 1000);
  assert.equal(next.ledger.length, 0);
  const reverse = fixture(); reverse.settlements[0].sparks.reverse();
  assert.deepEqual(advanceFirstGlowState(reverse).settlements[0].runtime.reservations, next.settlements[0].runtime.reservations);
});

test("waiting age beats a returning low-ID consumer under sustained contention", () => {
  let s = fixture(); const draws: string[] = [];
  for (let i = 0; i < 20; i++) {
    s = advanceFirstGlowState(s);
    draws.push(...s.events.filter(e => e.kind === "draw").map(e => e.actorId));
    const contacts = s.settlements[0].runtime.reservations.map(r => `${r.objectId}:${r.slotId}`);
    assert.equal(new Set(contacts).size, contacts.length);
    validateFirstGlowState(s);
  }
  assert.deepEqual(draws.slice(0, 3), ["spark-1", "spark-2", "spark-3"]);
  assert.ok(draws.filter(id => id === "spark-1").length > 1);
  assert.equal(s.settlements[0].sourceCharge, 1000 - 8 * draws.length);
});

test("valid traveler reservations and progress survive access waiting", () => {
  let s = advanceFirstGlowState(fixture());
  const first = s.settlements[0].sparks[0]; assert.equal(first.status, "traveling");
  const reservation = structuredClone(s.settlements[0].runtime.reservations[0]);
  const c = structuredClone(s); admitRecoveryRequests(c);
  assert.deepEqual(c.settlements[0].runtime.reservations, [reservation]);
  assert.equal(c.settlements[0].sparks[0].remainingCost, first.remainingCost);
  s = advanceFirstGlowState(s);
  assert.ok(s.events.some(e => e.actorId === "spark-1" && e.kind === "draw"));
  assert.ok(s.recoveryAdmission!.requests.some(r => r.sparkId === "spark-2"));
});

test("cancelled or changed requests release queue age without creating reservations", () => {
  const s = advanceFirstGlowState(fixture());
  s.settlements[0].sparks[1].intendedActivity = "explore";
  cancelObsoleteRecoveryRequests(s);
  assert.deepEqual(s.recoveryAdmission!.requests.map(r => r.sparkId), ["spark-3"]);
  validateFirstGlowState(s);
  const c = structuredClone(s); c.recoveryAdmission!.requests.push(c.recoveryAdmission!.requests[0]);
  assert.throws(() => validateFirstGlowState(c), /Invalid recovery admission/);
});

test("empty source waits without granting charge; a later refill permits admission", () => {
  let s = fixture(1); s.settlements[0].sourceCharge = 0;
  s = advanceFirstGlowState(s); assert.equal(s.recoveryAdmission!.requests.length, 1);
  assert.equal(s.ledger.length, 0); assert.equal(s.settlements[0].runtime.reservations.length, 0);
  s.settlements[0].sourceCharge = 8;
  for (let i = 0; i < 3; i++) s = advanceFirstGlowState(s);
  assert.equal(s.settlements[0].sparks[0].carriedCharge, 8);
  assert.equal(s.settlements[0].sourceCharge, 0);
});

test("busy future recovery is conditional, immediate access queues and retry stays unspent", () => {
  const s = preparationFixture(0, 60, 10, true), settlement = s.settlements[0], [owner, reader] = settlement.sparks;
  owner.status = "traveling"; owner.destinationCell = { x: 2, y: 1 }; owner.remainingRoute = [{ x: 2, y: 1 }]; owner.remainingCost = 100;
  settlement.runtime.reservations = [{ actorId: owner.id, objectId: "pool-a", slotId: "draw" }, { actorId: owner.id, objectId: "niche-a", slotId: "rest" }];
  assert.equal(selectPatternPreparation(s, settlement, reader, s.routePatterns!.patterns[0], "charge"), "seek-charge");
  reader.intendedActivity = "seek-charge";
  const before = structuredClone(settlement.runtime.reservations);
  const next = advanceFirstGlowState(s);
  assert.deepEqual(next.settlements[0].runtime.reservations, before);
  assert.equal(next.recoveryAdmission!.requests[0].sparkId, reader.id);
  assert.match(next.patternPreparation!.goals[0].reason, /waiting for recovery contact/);
  assert.equal(next.patternGuidedRetry!.attempts.length, 0);
  assert.equal(next.routePatterns!.patterns[0].encounters[0].use, undefined);
  assert.equal(next.patternPreparation!.goals[0].actions, 0);
});

test("generic recovery consumer is not displaced by a pattern reader", () => {
  const s = preparationFixture(0, 60, 10, true), settlement = s.settlements[0], [ordinary, reader] = settlement.sparks;
  ordinary.status = "choosing"; ordinary.intention = undefined; ordinary.intendedActivity = "seek-charge";
  ordinary.position = { x: 0, y: 0 };
  reader.intendedActivity = selectPatternPreparation(s, settlement, reader, s.routePatterns!.patterns[0], "charge");
  const next = advanceFirstGlowState(s);
  assert.equal(next.settlements[0].runtime.reservations[0].actorId, ordinary.id);
  assert.equal(next.recoveryAdmission!.requests[0].sparkId, reader.id);
  assert.equal(next.patternGuidedRetry!.attempts.length, 0);
});

test("admission preserves full arrival budgeting, real recovery actions and one retry limit", () => {
  let s = preparationFixture(0, 60, 10, true); let draw = false, rest = false;
  for (let i = 0; i < 60; i++) {
    s = advanceFirstGlow(s, { sourceCharge: 8 });
    draw ||= s.events.some(e => e.kind === "draw" && e.actorId === "spark-2");
    rest ||= s.events.some(e => e.kind === "idle" && e.actorId === "spark-2");
    if (s.patternGuidedRetry!.attempts[0]?.choice) break;
  }
  assert.ok(draw && rest);
  assert.equal(s.patternGuidedRetry!.attempts.length, 1);
  assert.equal(s.patternGuidedRetry!.attempts[0].choice!.alternative, "probe");
  assert.ok(s.patternPreparation!.goals[0].actions >= 3);
  for (let i = 0; i < 10; i++) s = advanceFirstGlow(s, { sourceCharge: 8 });
  assert.equal(s.patternGuidedRetry!.attempts.length, 1);
});

test("queued preparation cancels on stale navigation without spending an action or retry", () => {
  let s = preparationFixture(0, 60, 10, true);
  const settlement = s.settlements[0], owner = settlement.sparks[0];
  owner.status = "traveling"; owner.destinationCell = { x: 2, y: 1 }; owner.remainingRoute = [{ x: 2, y: 1 }]; owner.remainingCost = 100;
  settlement.runtime.reservations = [{ actorId: owner.id, objectId: "pool-a", slotId: "draw" }];
  s = advanceFirstGlow(s);
  assert.equal(s.recoveryAdmission!.requests.length, 1);
  s.settlements[0].runtime.navigationRevision++;
  s = advanceFirstGlow(s);
  // Pattern preparation is cancelled; ordinary sustenance can still wait for access.
  assert.ok(s.recoveryAdmission!.requests.every(r => r.activity === "seek-charge"));
  assert.equal(s.patternPreparation!.goals[0].phase, "deferred");
  assert.equal(s.patternPreparation!.goals[0].actions, 0);
  assert.equal(s.patternGuidedRetry!.attempts.length, 0);
  assert.equal(s.settlements[0].sparks[1].preparedDestination, undefined);
});

test("a deferred stale pattern does not deny ordinary recovery admission", () => {
  let s = preparationFixture(0, 60, 10, true);
  s = advanceFirstGlow(s, { sourceCharge: 8 });
  const reader = s.settlements[0].sparks[1];
  s.settlements[0].sparks[0].carriedCharge = 20;
  s.settlements[0].sparks[0].chargeDeficit = 0;
  s.settlements[0].runtime.navigationRevision++;
  reader.carriedCharge = 0; reader.chargeDeficit = 10;
  s = advanceFirstGlow(s);
  assert.equal(s.patternPreparation!.goals[0].phase, "deferred");
  assert.ok(s.events.some(e => e.kind === "draw" && e.actorId === reader.id));
  assert.equal(s.patternGuidedRetry!.attempts.length, 0);
});

test("queueing retains the preparation bound and current phase preference", () => {
  let s = preparationFixture(0, 60, 10, true);
  s = advanceFirstGlow(s, { sourceCharge: 8 });
  const goal = s.patternPreparation!.goals[0];
  goal.actions = 64; goal.actionEventIds = Array.from({ length: 64 }, (_, i) => `bound-${i}`);
  s.settlements[0].sparks[1].knownEvidenceEventIds.push(...goal.actionEventIds);
  s = advanceFirstGlow(s);
  assert.equal(s.patternPreparation!.goals[0].phase, "deferred");
  assert.equal(s.recoveryAdmission!.requests.length, 0);
  assert.equal(s.patternGuidedRetry!.attempts.length, 0);
  assert.equal(s.patternPreparation!.goals[0].actions, 64);
});

test("admission recomputes a preparation pin when another free contact remains", () => {
  const s = preparationFixture(0, 60, 10, true), settlement = s.settlements[0], [ordinary, reader] = settlement.sparks;
  const bundle = structuredClone(settlement.bundle);
  bundle.objectDefinitions["charge-pool"].slots.push({ id: "draw-two", offset: { x: 1, y: 1 }, capacity: 1 });
  bundle.bundle.contentHash = bundleHash(bundle); settlement.bundle = bundle;
  ordinary.status = "choosing"; ordinary.intention = undefined; ordinary.intendedActivity = "seek-charge"; ordinary.position = { x: 0, y: 0 };
  reader.intendedActivity = selectPatternPreparation(s, settlement, reader, s.routePatterns!.patterns[0], "charge");
  const originalSlot = reader.preparedDestination!.slotId;
  ordinary.position = originalSlot === "draw" ? { x: 1, y: 1 } : { x: 2, y: 1 };
  admitRecoveryRequests(s);
  assert.equal(s.recoveryAdmission!.requests.length, 0);
  assert.equal(ordinary.destinationSlotId, originalSlot);
  assert.notEqual(reader.destinationSlotId, originalSlot);
  assert.equal(settlement.runtime.reservations.length, 2);
  assert.equal(s.patternGuidedRetry!.attempts.length, 0);
});

test("full transitions conserve total charge according to explicit production, consumption and loss", () => {
  let s = fixture();
  const total = (state: FirstGlowState) => state.settlements.reduce((n, settlement) => n + settlement.sourceCharge + settlement.communalCharge + settlement.sparks.reduce((a, spark) => a + spark.carriedCharge, 0), 0);
  let draws = 0, waits = 0;
  for (let i = 0; i < 30; i++) {
    const before = total(s); s = advanceFirstGlow(s, { sourceCharge: 3, loss: 1 });
    const delta = s.ledger.reduce((n, entry) => n + (entry.kind === "production" ? entry.amount : entry.kind === "consumption" || entry.kind === "loss" ? -entry.amount : 0), 0);
    assert.equal(total(s), before + delta);
    draws += s.events.filter(e => e.kind === "draw").length;
    waits += s.recoveryAdmission!.requests.length;
  }
  assert.ok(draws > 0 && waits > 0);
});
