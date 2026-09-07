import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorldFromBundle, createWorldV3 } from "./index.js";
import { validateFirstGlowState } from "./structured.js";
import { decodeWorldBundle } from "@mimir/world-data";

const fixture = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8")));
test("engine creates an explicit First Glow timeline without village field migration", () => { assert.equal(fixture.schemaVersion, 3); if (fixture.schemaVersion !== 3) return; const state = createWorldV3(fixture, 7, "glow-test"); assert.equal(state.simulationVersion, "mimir-sim-v3-first-glow"); assert.equal(state.firstGlowState?.themeId, "living-circuit"); assert.equal(state.firstGlowState?.ageId, "first-glow"); assert.equal(state.firstGlowState?.settlements[0].sparks[0].id, "spark-1"); assert.equal(state.firstGlowState?.settlements[0].sparks[0].carriedCharge, 0); assert.equal(state.villagers.length, 0); validateFirstGlowState(state.firstGlowState!); });
test("bundle dispatch keeps v2 and selects v3 explicitly", () => { if (fixture.schemaVersion !== 3) return; const state = createWorldFromBundle(fixture, 9); assert.equal(state.spatialModel, "structured-v2"); assert.equal(state.simulationVersion, "mimir-sim-v3-first-glow"); const unsupported = { ...fixture, simulationVersion: "mimir-sim-v4" }; assert.throws(() => createWorldFromBundle(unsupported), /unsupported world bundle/); });
