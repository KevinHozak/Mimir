import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { createFirstGlowState } from "./structured.js";
import { advanceFirstGlow } from "./first-glow-actions.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("T3 fixture is not schema 3");
test("share-charge transfers only between co-present Sparks and records consumption/need", () => { const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2); const first = state.settlements[0].sparks[0]; const second = state.settlements[0].sparks[1]; second.position = { ...first.position }; first.intendedActivity = "share-charge"; first.carriedCharge = 3; const next = advanceFirstGlow(state); assert.equal(next.settlements[0].sparks[0].carriedCharge, 1); assert.equal(next.settlements[0].sparks[1].carriedCharge, 0); assert.equal(next.ledger.find(entry => entry.kind === "share")?.amount, 1); assert.equal(next.ledger.some(entry => entry.kind === "consumption" || entry.reason === "charge-deficit"), true); });
