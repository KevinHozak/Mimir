import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { advanceFirstGlowState, createFirstGlowState, type FirstGlowState } from "./structured.js";
import { decodeWorldBundle } from "@mimir/world-data";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("T3 fixture is not schema 3");

test("draw-charge is deterministic and occurs only on arrival at a charge pool", () => { let state = createFirstGlowState(bundle); const initial = state.settlements[0].sourceCharge; let drew = false; for (let tick = 0; tick < 12; tick += 1) { state = advanceFirstGlowState(state); const spark = state.settlements[0].sparks[0]; const draw = state.ledger.find(entry => entry.kind === "draw"); if (!draw) { assert.equal(spark.carriedCharge, 0); assert.notEqual(spark.status, "choosing"); } else { drew = true; assert.equal(draw.amount, 2); assert.equal(spark.carriedCharge, 2); assert.equal(state.settlements[0].sourceCharge, initial - 2); break; } } assert.equal(drew, true); });
test("First Glow movement and draw replay identically", () => { const run = () => { let state = createFirstGlowState(bundle); const snapshots: unknown[] = []; for (let tick = 0; tick < 8; tick += 1) { state = advanceFirstGlowState(state); snapshots.push({ tick: state.tick, spark: state.settlements[0].sparks[0], ledger: state.ledger }); } return snapshots; }; assert.deepEqual(run(), run()); });
test("idle recovery is arrival-gated and does not draw charge", () => { let state: FirstGlowState = createFirstGlowState(bundle); const spark = state.settlements[0].sparks[0]; spark.intendedActivity = "idle"; spark.readiness = 70; let recovered = false; for (let tick = 0; tick < 12; tick += 1) { state = advanceFirstGlowState(state); const current = state.settlements[0].sparks[0]; if (state.ledger.some(entry => entry.kind === "idle")) { recovered = true; assert.equal(current.readiness, 80); assert.equal(state.ledger.some(entry => entry.kind === "draw"), false); break; } assert.equal(current.readiness, 70); } assert.equal(recovered, true); });
