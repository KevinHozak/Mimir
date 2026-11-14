import assert from "node:assert/strict";
import test from "node:test";
import { advanceFirstGlow, initializePatternGuidedRetry, patternRetryRefusal, validateFirstGlowState, resolveWildCacheChoice, type FirstGlowState } from "./index.js";
import { routePatternFixture } from "./first-glow-route-patterns-fixture.js";

function tick(state: FirstGlowState, n = 1) { for (let i = 0; i < n; i++) state = advanceFirstGlow(state); return state; }
// Declared prior-choice unit fixture; creation/encounter and subsequent travel use real transitions.
function conserved(enabled = true) {
  let state = routePatternFixture();
  if (enabled) initializePatternGuidedRetry(state);
  state = tick(state, 10);
  const reader = state.settlements[0].sparks[1], cacheObjectId = state.routePatterns!.patterns[0].targetObjectId;
  reader.wildCacheChoice = {pulse: 1, alternative: "conserve", cacheObjectId, decisionEventId: "prior-conserve-choice", outcomeEventId: "prior-conserve-outcome", nextActivity: "seek-charge"};
  reader.knownEvidenceEventIds.push("prior-conserve-choice", "prior-conserve-outcome");
  validateFirstGlowState(state);
  return state;
}

test("both guards allow one later-encounter retry, actual arrival probes and retains original conservation", () => {
  const initial = conserved(), original = JSON.stringify(initial), prior = structuredClone(initial.settlements[0].sparks[1].wildCacheChoice);
  const committed = tick(initial);
  assert.equal(JSON.stringify(initial), original);
  assert.equal(committed.patternGuidedRetry!.attempts.length, 1);
  assert.ok(committed.settlements[0].sparks[1].routePatternUse);
  assert.equal(committed.patternGuidedRetry!.attempts[0].committedPulse, 11);
  const arrived = tick(committed, 7), attempt = arrived.patternGuidedRetry!.attempts[0];
  assert.equal(attempt.choice?.alternative, "probe"); assert.equal(attempt.choice?.pulse, 18);
  assert.deepEqual(attempt.priorChoice, prior); assert.ok(attempt.outcomeEventId);
  assert.ok(arrived.settlements[0].sparks[1].knownEvidenceEventIds.includes(prior!.outcomeEventId));
  assert.equal(arrived.events.find(e => e.id === attempt.outcomeEventId)?.message.includes("reached Wild Cache"), true);
  validateFirstGlowState(arrived);
});

test("without opt-in prior choice blocks selection and arrival probing exactly as before", () => {
  const initial = conserved(false), declined = tick(initial);
  assert.match(declined.routePatterns!.patterns[0].encounters[0].decline!.reason, /already considered/);
  assert.equal(declined.settlements[0].sparks[1].routePatternUse, undefined);
  const reader = initial.settlements[0].sparks[1];
  resolveWildCacheChoice(initial, reader, {objectId: "tiled-104", cost: 16, navigationRevision: 0}, "seek-charge");
  assert.equal(reader.wildCacheChoice!.alternative, "conserve");
});

test("arrival guard rejects healthy repeated probing without committed authorization", () => {
  const state = conserved(), reader = state.settlements[0].sparks[1], before = JSON.stringify(state);
  assert.throws(() => resolveWildCacheChoice(state, reader, {objectId: "tiled-104", originObjectId: reader.wildCacheChoice!.cacheObjectId, cost: 16, navigationRevision: 0}, "seek-charge"), /committed/);
  assert.equal(JSON.stringify(state), before);
});

test("charge and shelter deferral retain knowledge and retry allowance; reconsideration can occur later", () => {
  for (const need of ["charge", "shelter"]) {
    const state = conserved(), reader = state.settlements[0].sparks[1];
    if (need === "charge") reader.carriedCharge = 0; else reader.readiness = 60;
    const next = tick(state);
    assert.equal(next.patternGuidedRetry!.attempts.length, 0);
    assert.ok(next.routePatterns!.patterns[0].encounters[0].decline);
    assert.equal(next.settlements[0].sparks[1].intendedActivity, need === "charge" ? "seek-charge" : "seek-shelter");
    assert.equal(patternRetryRefusal(next, next.settlements[0].sparks[1], next.routePatterns!.patterns[0]), undefined);
  }
});

test("arrival resources are rechecked; a committed retry can conserve without losing the first attempt", () => {
  let state = tick(conserved()); const prior = structuredClone(state.patternGuidedRetry!.attempts[0].priorChoice);
  state.settlements[0].sparks[1].carriedCharge = 0;
  state = tick(state, 7);
  assert.equal(state.patternGuidedRetry!.attempts[0].choice!.alternative, "conserve");
  assert.deepEqual(state.patternGuidedRetry!.attempts[0].priorChoice, prior);
  assert.match(patternRetryRefusal(state, state.settlements[0].sparks[1], {...state.routePatterns!.patterns[0], id: "another-pattern-same-cache"})!, /already committed/);
});

test("interruption consumes the cache retry across artifacts and malformed duplicate attempts reject", () => {
  const state = tick(conserved()), reader = state.settlements[0].sparks[1];
  reader.intendedActivity = "seek-charge"; reader.carriedCharge = 0; reader.status = "choosing";
  reader.destinationObjectId = undefined; reader.destinationSlotId = undefined; reader.destinationCell = undefined; reader.remainingRoute = [];
  state.settlements[0].runtime.reservations = state.settlements[0].runtime.reservations.filter(r => r.actorId !== reader.id);
  const next = tick(state), attempt = next.patternGuidedRetry!.attempts[0];
  assert.ok(attempt.outcomeEventId); assert.equal(attempt.choice, undefined);
  assert.match(next.events.find(e => e.id === attempt.outcomeEventId)!.message, /interrupted/);
  assert.match(patternRetryRefusal(next, next.settlements[0].sparks[1], {...next.routePatterns!.patterns[0], id: "another-artifact"})!, /already committed/);
  next.patternGuidedRetry!.attempts.push(structuredClone(attempt));
  assert.throws(() => validateFirstGlowState(next), /retry provenance or limit/);
});

test("old encounters, unknown cache identity, prior survey, stale and unavailable destinations do not grant a retry", () => {
  for (const reason of ["old", "identity", "survey", "stale", "blocked"]) {
    const state = conserved(), reader = state.settlements[0].sparks[1], pattern = state.routePatterns!.patterns[0];
    if (reason === "old") reader.wildCacheChoice!.pulse = 10;
    if (reason === "identity") delete reader.wildCacheChoice!.cacheObjectId;
    if (reason === "survey") { reader.wildCacheChoice!.alternative = "probe"; reader.wildCacheChoice!.nextActivity = "shape-pattern"; reader.wildCacheChoice!.routeFact = {objectId: "tiled-104", originObjectId: pattern.targetObjectId, cost: 16, navigationRevision: 0}; }
    if (reason === "stale") state.settlements[0].runtime.navigationRevision++;
    if (reason === "blocked") state.settlements[0].runtime.objects.push({objectId: pattern.targetObjectId, blocked: true});
    const next = tick(state); assert.equal(next.patternGuidedRetry!.attempts.length, 0);
    assert.equal(next.routePatterns!.patterns[0].encounters[0].use, undefined);
  }
});

test("unknown versions and retrofit reject; recorded retry survives serialized continuation", () => {
  const initial = conserved(); assert.throws(() => initializePatternGuidedRetry(initial), /fresh/);
  const invalid = structuredClone(initial); invalid.patternGuidedRetry!.version = "unknown" as never;
  assert.throws(() => validateFirstGlowState(invalid), /Unsupported pattern-guided retry/);
  const state = tick(initial), copy = JSON.parse(JSON.stringify(state));
  assert.equal(JSON.stringify(tick(state, 12)), JSON.stringify(tick(copy, 12)));
});


test("a route becoming stale during travel cannot authorize an arrival probe", () => {
  let state = tick(conserved());
  state.settlements[0].runtime.navigationRevision++;
  state = tick(state, 7);
  assert.equal(state.patternGuidedRetry!.attempts[0].choice!.alternative, "conserve");
});


test("committed use cannot lose its retry record or policy during checkpoint normalization", () => {
  const state = tick(conserved());
  const inactive = structuredClone(state); delete inactive.settlements[0].sparks[1].routePatternUse;
  assert.throws(() => validateFirstGlowState(inactive), /missing its active use/);
  const missing = structuredClone(state); missing.patternGuidedRetry!.attempts = [];
  assert.throws(() => validateFirstGlowState(missing), /missing its committed attempt/);
  const untagged = structuredClone(state); delete untagged.patternGuidedRetry;
  assert.throws(() => validateFirstGlowState(untagged), /requires pattern-guided retry/);
});

test("retry authorization precedes a same-pulse arrival and is consumed exactly once", () => {
  const state = conserved(), reader = state.settlements[0].sparks[1];
  reader.position = {x: 28, y: 25};
  const next = tick(state), attempt = next.patternGuidedRetry!.attempts[0];
  assert.equal(attempt.committedPulse, 11); assert.equal(attempt.choice!.pulse, 11);
  assert.equal(attempt.choice!.alternative, "probe"); assert.ok(attempt.outcomeEventId);
  assert.equal(next.events.filter(e => e.id === attempt.useEventId).length, 1);
});


test("unreachable alternatives wait instead of reusing an unapproved cache activity", () => {
  let state = tick(conserved()); state.settlements[0].sparks[1].carriedCharge = 0;
  state = tick(state, 7);
  const settlement = state.settlements[0], reader = settlement.sparks[1], prior = structuredClone(reader.wildCacheChoice);
  reader.knownEvidenceEventIds.push("test-explore", "test-mark-trace", "test-shape-pattern");
  settlement.sparks[0].remainingCost = 100;
  settlement.runtime.reservations = settlement.bundle.objects.filter(o => settlement.bundle.objectDefinitions[o.definitionId].capabilities.some(c => c === "charge-pool" || c === "shelter-niche")).flatMap(o => settlement.bundle.objectDefinitions[o.definitionId].slots.map(slot => ({actorId: settlement.sparks[0].id, objectId: o.id, slotId: slot.id})));
  const next = tick(state);
  assert.deepEqual(next.settlements[0].sparks[1].wildCacheChoice, prior);
  assert.equal(next.settlements[0].sparks[1].intendedActivity, "idle");
  assert.equal(next.settlements[0].sparks[1].status, "waiting");
  assert.equal(next.events.some(e => e.actorId === reader.id && e.id.endsWith("-cache-choice")), false);
  assert.equal(next.patternGuidedRetry!.attempts.length, 1);
});
