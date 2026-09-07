import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { advanceWorld, createWorldFromBundle, createWorldV3 } from "./index.js";
import { validateFirstGlowState } from "./structured.js";
import { decodeWorldBundle } from "@mimir/world-data";

const fixture = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8")));
const openingBundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-4da2388c0407db5ff0352b4052908317809d73d2f012dc5a91740d20dfb342a3/world.json", import.meta.url)), "utf8")));
if (openingBundle.schemaVersion !== 3) throw new Error("opening bundle is not schema 3");
test("engine creates an explicit First Glow timeline", () => { assert.equal(fixture.schemaVersion, 3); if (fixture.schemaVersion !== 3) return; const state = createWorldV3(fixture, 7, "glow-test"); assert.equal(state.simulationVersion, "mimir-sim-v3-first-glow"); assert.equal(state.firstGlowState?.themeId, "living-circuit"); assert.equal(state.firstGlowState?.ageId, "first-glow"); assert.equal(state.firstGlowState?.settlements[0].sparks[0].id, "spark-1"); assert.equal(state.firstGlowState?.settlements[0].sparks[0].carriedCharge, 0); validateFirstGlowState(state.firstGlowState); });
test("bundle dispatch selects First Glow explicitly", () => { if (fixture.schemaVersion !== 3) return; const state = createWorldFromBundle(fixture, 9); assert.equal(state.spatialModel, "structured-v2"); assert.equal(state.simulationVersion, "mimir-sim-v3-first-glow"); const unsupported = { ...fixture, simulationVersion: "mimir-sim-v4" }; assert.throws(() => createWorldFromBundle(unsupported), /unsupported world bundle/); });
test("opening infrastructure keeps twelve Sparks supplied without a collective wait lock", () => { const run = () => { let state = createWorldV3(openingBundle, 23, "opening-supply", 12); let productiveDraws = 0; let consecutiveCollectiveWaits = 0; let maxCollectiveWaits = 0; for (let tick = 0; tick < 120; tick += 1) { state = advanceWorld(state).state; productiveDraws += state.firstGlowState.ledger.filter(entry => entry.kind === "draw" && entry.amount > 0).length; const sparks = state.firstGlowState.settlements[0].sparks; consecutiveCollectiveWaits = sparks.every(spark => spark.status === "waiting") ? consecutiveCollectiveWaits + 1 : 0; maxCollectiveWaits = Math.max(maxCollectiveWaits, consecutiveCollectiveWaits); } const settlement = state.firstGlowState.settlements[0]; return { state, productiveDraws, maxCollectiveWaits, totalDeficit: settlement.sparks.reduce((total, spark) => total + spark.chargeDeficit, 0) }; }; const first = run(); assert.deepEqual(first, run()); assert.ok(first.productiveDraws >= 60); assert.equal(first.maxCollectiveWaits, 0); assert.ok(first.totalDeficit < 100); });
