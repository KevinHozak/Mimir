import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceStructuredState, createStructuredState } from "./structured.js";
import type { WorldBundle } from "@mimir/world-data";

const bundle = JSON.parse(readFileSync(join(process.cwd(), "..", "..", "assets", "world", "generated", "sha256-6a2e1ffe6a311d4cbb08a616bec272cc82e47809dea635b4b3f121aa8e991987", "world.json"), "utf8")) as WorldBundle;
let state = createStructuredState(bundle, "first-village", "Hearthmere", 1);
const actor = () => state.settlements[0].actors[0];
let collectedBeforeArrival = false;
for (let index = 0; index < 20; index += 1) { state = advanceStructuredState(state); if (state.ledger.some(entry => entry.kind === "collection")) { collectedBeforeArrival = actor().position.x === 0 && actor().position.y === 0; break; } }
assert.equal(collectedBeforeArrival, false);
assert.ok(state.ledger.some(entry => entry.kind === "collection"));
assert.equal(state.settlements[0].storeFood + actor().food + state.ledger.filter(entry => entry.kind === "consumption").reduce((sum, entry) => sum + entry.amount, 0), 24);
