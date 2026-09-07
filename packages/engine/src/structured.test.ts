import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceStructuredState, createStructuredState } from "./structured.js";
import type { WorldBundle } from "@mimir/world-data";

const bundle = JSON.parse(readFileSync(join(process.cwd(), "..", "..", "assets", "world", "generated", "sha256-1f24c63c9168eb2e8d6a76be1b1d42c12b601ef9f3955a34a9cf25d4d2854564", "world.json"), "utf8")) as WorldBundle;
let state = createStructuredState(bundle, "first-village", "Hearthmere", 1);
const actor = () => state.settlements[0].actors[0];
let collectedBeforeArrival = false;
let totalProduction = 0;
let totalConsumption = 0;
for (let index = 0; index < 80; index += 1) { state = advanceStructuredState(state); totalProduction += state.ledger.filter(entry => entry.kind === "production").reduce((sum, entry) => sum + entry.amount, 0); totalConsumption += state.ledger.filter(entry => entry.kind === "consumption").reduce((sum, entry) => sum + entry.amount, 0); if (state.ledger.some(entry => entry.kind === "collection")) { collectedBeforeArrival = actor().position.x === 0 && actor().position.y === 0; break; } }
assert.equal(collectedBeforeArrival, false);
assert.ok(state.ledger.some(entry => entry.kind === "collection"));
assert.equal(state.settlements[0].storeFood + actor().food + totalConsumption, 24 + totalProduction);

const reservations = createStructuredState(bundle, "first-village", "Hearthmere", 4);
for (const villager of reservations.settlements[0].actors) villager.intendedActivity = "collect";
const reservedTick = advanceStructuredState(reservations);
assert.deepEqual(reservedTick.settlements[0].runtime.reservations.map(item => item.actorId), ["villager-1", "villager-2"]);
assert.equal(reservedTick.settlements[0].actors.filter(villager => villager.status === "waiting" && villager.waitReason === "no-free-slot").length, 2);
assert.equal(new Set(reservedTick.settlements[0].runtime.reservations.map(item => `${item.objectId}:${item.slotId}`)).size, 2);

const closed = createStructuredState(bundle, "first-village", "Hearthmere", 1);
closed.settlements[0].runtime.objects = [{ objectId: "tiled-4", blocked: true }];
const waiting = advanceStructuredState(closed);
assert.equal(waiting.settlements[0].actors[0].status, "waiting");
assert.equal(waiting.settlements[0].actors[0].waitReason, "no-route");
const reopened = structuredClone(waiting);
reopened.settlements[0].runtime.objects = [];
reopened.settlements[0].runtime.navigationRevision += 1;
const resumed = advanceStructuredState(reopened);
assert.equal(resumed.settlements[0].actors[0].status, "traveling");
