import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { advanceFirstGlowState, createFirstGlowState } from "./structured.js";
import { bundleHash, decodeWorldBundle, validateWorldBundle } from "@mimir/world-data";
import { advanceFirstGlow } from "./first-glow-actions.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("T3 fixture is not schema 3");

test("draw, idle, and mark actions are arrival-gated", () => {
  let state = createFirstGlowState(bundle); const initial = state.settlements[0].sourceCharge; let draw;
  for (let tick = 0; tick < 12; tick += 1) { state = advanceFirstGlowState(state); draw = state.ledger.find(entry => entry.kind === "draw"); if (draw) break; assert.equal(state.settlements[0].sparks[0].carriedCharge, 0); }
  assert.equal(draw?.amount, 8); assert.equal(state.settlements[0].sourceCharge, initial - 8);
  state = createFirstGlowState(bundle); const spark = state.settlements[0].sparks[0]; spark.intendedActivity = "idle"; spark.readiness = 70;
  for (let tick = 0; tick < 40 && !state.ledger.some(entry => entry.kind === "idle"); tick += 1) state = advanceFirstGlowState(state);
  assert.equal(state.ledger.some(entry => entry.kind === "idle"), true); assert.equal(state.ledger.some(entry => entry.kind === "draw"), false);
});

test("invalid arrivals validate capability, reservation, contact, region, and destination before effects", () => {
  const state = createFirstGlowState(bundle); const settlement = state.settlements[0]; const spark = settlement.sparks[0]; const object = bundle.objects.find(item => item.definitionId === "charge-pool")!; const slot = bundle.objectDefinitions[object.definitionId].slots[0]; const contact = { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y };
  spark.status = "interacting"; spark.intendedActivity = "idle"; spark.position = contact; spark.destinationObjectId = object.id; spark.destinationSlotId = slot.id; settlement.runtime.reservations = [{ actorId: spark.id, objectId: object.id, slotId: slot.id }];
  const next = advanceFirstGlowState(state); assert.equal(next.ledger.length, 0); assert.equal(next.settlements[0].sparks[0].waitReason, "invalid-destination");
});

test("empty sources and unavailable slots wait deterministically", () => {
  let state = createFirstGlowState(bundle); state.settlements[0].sourceCharge = 0; state.settlements[0].sparks[0].intendedActivity = "seek-charge";
  for (let tick = 0; tick < 20 && !state.ledger.some(entry => entry.kind === "draw"); tick += 1) state = advanceFirstGlowState(state);
  assert.equal(state.ledger.find(entry => entry.kind === "draw")?.amount, 0); assert.equal(state.settlements[0].sparks[0].waitReason, "empty-source"); assert.deepEqual(advanceFirstGlowState(state), advanceFirstGlowState(state));
  const full = createFirstGlowState(bundle, "first-glow-region", "Opening region", 5); const pool = bundle.objects.find(item => item.definitionId === "charge-pool")!; const slots = bundle.objectDefinitions[pool.definitionId].slots; full.settlements[0].runtime.reservations = slots.map((slot, index) => ({ actorId: `spark-${index + 1}`, objectId: pool.id, slotId: slot.id })); slots.forEach((slot, index) => { const item = full.settlements[0].sparks[index]; item.status = "waiting"; item.destinationObjectId = pool.id; item.destinationSlotId = slot.id; item.position = { x: pool.origin.x + slot.offset.x, y: pool.origin.y + slot.offset.y }; }); full.settlements[0].sparks[4].intendedActivity = "seek-charge";
  assert.equal(advanceFirstGlowState(full).settlements[0].sparks[4].waitReason, "no-free-slot");
});

test("multiple Sparks share with one deterministic recipient and conserve charge", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 3); state.tick = 1; const [giver, recipient, other] = state.settlements[0].sparks; recipient.position = { ...giver.position }; other.position = { ...giver.position }; giver.carriedCharge = 2; other.intendedActivity = "idle";
  const next = advanceFirstGlow(state); const share = next.ledger.find(entry => entry.kind === "share"); assert.equal(share?.recipientId, recipient.id); assert.equal(share?.amount, 1); assert.deepEqual(next.events.find(event => event.kind === "share")?.participants, [giver.id, recipient.id]);
});

test("failed routes release plans and reopen deterministically", () => {
  const state = createFirstGlowState(bundle); const spark = state.settlements[0].sparks[0]; spark.status = "traveling"; spark.destinationObjectId = "missing-object"; spark.destinationSlotId = "missing-slot"; spark.plannedNavigationRevision = 1;
  const next = advanceFirstGlowState(state); assert.equal(next.settlements[0].sparks[0].waitReason, "no-route"); assert.equal(next.settlements[0].runtime.reservations.length, 0);
});

test("autonomous First Glow activity loop remains deterministic across multiple Sparks", () => {
  const multi = structuredClone(bundle); multi.objects.push({ id: "tiled-201", definitionId: "charge-pool", origin: { x: 2, y: 1 }, orientation: 0 }, { id: "tiled-202", definitionId: "shelter-niche", origin: { x: 5, y: 1 }, orientation: 0 }, { id: "tiled-203", definitionId: "pattern-shard", origin: { x: 8, y: 1 }, orientation: 0 }, { id: "tiled-204", definitionId: "light-mark", origin: { x: 10, y: 2 }, orientation: 0 }); multi.bundle.contentHash = bundleHash(multi); validateWorldBundle(multi);
  const run = () => { let state = createFirstGlowState(multi, "first-glow-region", "Opening region", 2); for (let tick = 0; tick < 24; tick += 1) state = advanceFirstGlow(state); return state; }; assert.deepEqual(run(), run());
});
