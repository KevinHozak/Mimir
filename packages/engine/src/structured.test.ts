import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceStructuredState, createStructuredState } from "./structured.js";
import type { WorldBundle } from "@mimir/world-data";

const bundle = JSON.parse(readFileSync(join(process.cwd(), "..", "..", "assets", "world", "generated", "sha256-b8e2c3b01dfbf1f1710a28a4f8877640acbe56b42fd103612ae5d6ae54e9adae", "world.json"), "utf8")) as WorldBundle;
let state = createStructuredState(bundle, "first-village", "Hearthmere", 1);
const actor = () => state.settlements[0].actors[0];
let collectedBeforeArrival = false;
for (let index = 0; index < 80; index += 1) { state = advanceStructuredState(state); if (state.ledger.some(entry => entry.kind === "collection")) { collectedBeforeArrival = actor().position.x === 0 && actor().position.y === 0; break; } }
assert.equal(collectedBeforeArrival, false);
assert.ok(state.ledger.some(entry => entry.kind === "collection"));
assert.equal(state.settlements[0].storeFood + actor().food + state.ledger.filter(entry => entry.kind === "consumption").reduce((sum, entry) => sum + entry.amount, 0), 24);

const reservations = createStructuredState(bundle, "first-village", "Hearthmere", 4);
for (const villager of reservations.settlements[0].actors) villager.intendedActivity = "collect";
const reservedTick = advanceStructuredState(reservations);
assert.deepEqual(reservedTick.settlements[0].runtime.reservations.map(item => item.actorId), ["villager-1", "villager-2"]);
assert.equal(reservedTick.settlements[0].actors.filter(villager => villager.status === "waiting" && villager.waitReason === "no-free-slot").length, 2);
assert.equal(new Set(reservedTick.settlements[0].runtime.reservations.map(item => `${item.objectId}:${item.slotId}`)).size, 2);
