import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorldFromBundle, advanceWorld, advanceFirstGlow, advanceFirstGlowState, initializeActivityCompletion, validateFirstGlowState } from "./index.js";
const raw = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
const fresh = (enabled = true) => createWorldFromBundle(raw, 2, "completion-test", 1, enabled ? { activityCompletion: true } : {});

test("fresh policy completes current-cell exploration once, accounts costs and advances choice", () => {
  let world = fresh();
  for (let i = 0; i < 5; i++) world = advanceWorld(world).state;
  const before = JSON.stringify(world), next = advanceWorld(world);
  assert.equal(JSON.stringify(world), before);
  const spark = next.state.firstGlowState.settlements[0].sparks[0];
  assert.equal(next.events.filter(e => e.structuredKind === "explore").length, 1);
  assert.ok(spark.knownEvidenceEventIds.includes("event-6-spark-1-explore"));
  assert.equal(spark.carriedCharge, 7); assert.equal(spark.readiness, 94);
  assert.equal(next.state.firstGlowState.ledger.filter(e => e.reason === "activity-sustenance").length, 1);
  assert.equal(next.state.firstGlowState.ledger.filter(e => e.reason === "activity-strain").length, 1);
  assert.equal(advanceWorld(next.state).state.firstGlowState.settlements[0].sparks[0].intendedActivity, "scavenge-cache");
});

test("unversioned checkpoints preserve the same-cell legacy behavior; no retrofit or unknown policy", () => {
  let world = fresh(false); for (let i = 0; i < 6; i++) world = advanceWorld(world).state;
  assert.equal(world.firstGlowState.activityCompletionVersion, undefined);
  assert.equal(world.firstGlowState.settlements[0].sparks[0].knownEvidenceEventIds.length, 0);
  assert.throws(() => initializeActivityCompletion(world.firstGlowState), /fresh history/);
  const invalid = fresh(); invalid.firstGlowState.activityCompletionVersion = "future" as never;
  assert.throws(() => advanceWorld(invalid), /Unsupported activity completion/);
});

for (const activity of ["mark-trace", "shape-pattern"] as const) test(`${activity}: same-cell validated arrival emits once and incurs one activity debit`, () => {
  const state = fresh().firstGlowState, settlement = state.settlements[0], spark = settlement.sparks[0];
  const capability = activity === "mark-trace" ? "light-mark" : "pattern-shard";
  const object = settlement.bundle.objects.find(o => settlement.bundle.objectDefinitions[o.definitionId].capabilities.includes(capability))!;
  const slot = settlement.bundle.objectDefinitions[object.definitionId].slots[0];
  Object.assign(spark, {position: {x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y}, status: "interacting", intendedActivity: activity, carriedCharge: 8, destinationObjectId: object.id, destinationSlotId: slot.id});
  settlement.runtime.reservations = [{actorId: spark.id, objectId: object.id, slotId: slot.id}];
  const choosing = structuredClone(state);
  choosing.settlements[0].sparks[0].status = "choosing";
  delete choosing.settlements[0].sparks[0].destinationObjectId;
  delete choosing.settlements[0].sparks[0].destinationSlotId;
  choosing.settlements[0].runtime.reservations = [];
  assert.equal(advanceFirstGlowState(choosing).events.filter(e => e.kind === activity).length, 1);
  const next = advanceFirstGlow(state);
  assert.equal(next.events.filter(e => e.kind === activity).length, 1);
  assert.equal(next.settlements[0].sparks[0].knownEvidenceEventIds.filter(id => id === `event-1-spark-1-${activity}`).length, 1);
  assert.equal(next.ledger.filter(e => e.reason === "activity-sustenance").length, 1);
  assert.equal(next.settlements[0].sparks[0].carriedCharge, 7);
});

test("invalid or canceled arrival grants no completion, knowledge or activity debit", () => {
  const state = fresh().firstGlowState, settlement = state.settlements[0], spark = settlement.sparks[0];
  const pool = settlement.bundle.objects.find(o => o.definitionId === "charge-pool")!, slot = settlement.bundle.objectDefinitions[pool.definitionId].slots[0];
  Object.assign(spark, {position: {x: pool.origin.x + slot.offset.x, y: pool.origin.y + slot.offset.y}, status: "interacting", intendedActivity: "shape-pattern", destinationObjectId: pool.id, destinationSlotId: slot.id});
  settlement.runtime.reservations = [{actorId: spark.id, objectId: pool.id, slotId: slot.id}];
  const next = advanceFirstGlow(state);
  assert.equal(next.events.some(e => e.kind === "shape-pattern"), false);
  assert.equal(next.settlements[0].sparks[0].knownEvidenceEventIds.length, 0);
  assert.equal(next.ledger.some(e => e.reason === "activity-sustenance"), false);
});

test("traveled exploration records once on arrival, movement accounting includes final resource effects", () => {
  const state = fresh().firstGlowState, spark = state.settlements[0].sparks[0];
  Object.assign(spark, {status: "traveling", intendedActivity: "explore", destinationCell: {x: 3, y: 5}, position: {x: 3, y: 4}, remainingRoute: [{x: 3, y: 5}], carriedCharge: 8});
  const next = advanceFirstGlow(state);
  assert.equal(next.events.filter(e => e.kind === "explore").length, 1);
  assert.equal(next.settlements[0].sparks[0].carriedCharge, 7);
  assert.equal(next.ledger.filter(e => /strain/.test(e.reason)).length, 1);
  assert.ok(next.history!.movements[0].resourceEffects.some(e => e.reason === "activity-sustenance"));
  validateFirstGlowState(next);
});

test("versioned checkpoint JSON restart preserves deterministic continuation", () => {
  let world = fresh(); for (let i = 0; i < 6; i++) world = advanceWorld(world).state;
  let restarted = JSON.parse(JSON.stringify(world));
  for (let i = 0; i < 30; i++) { world = advanceWorld(world).state; restarted = advanceWorld(restarted).state; }
  assert.equal(JSON.stringify(restarted), JSON.stringify(world));
});
