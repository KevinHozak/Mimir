import assert from "node:assert/strict";
import { normalizeState } from "./state.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorldFromBundle } from "@mimir/engine";
import { decodeWorldBundle } from "@mimir/world-data";

const legacy = {
  worldId: "legacy-world",
  seed: 7,
  tick: 4,
  season: 1,
  foodReserve: 12,
  scenario: { name: "Legacy", initialFood: 12, seasonTickLimit: 60, harvestInterval: 3, harvestAmount: 8, hungerPressure: 9 },
  villagers: [{ id: "villager-1", name: "Mara", tradition: "Hearthkeepers", hunger: 10, rest: 80, trust: 50, food: 2, activity: "rest", location: "Homes", beliefs: { cooperation: 50, selfReliance: 50, reflection: 50 }, position: { x: 2, y: 2 }, route: [], settlementId: "first-village" }]
} as never;

const normalized = normalizeState(legacy);
assert.equal(normalized.spatialModel, "legacy-backdrop-v0");
assert.equal(normalized.simulationVersion, "legacy-unknown");
assert.equal(normalized.worldDefinition, undefined);
assert.deepEqual(normalized.villagers[0].position, { x: 2, y: 2 });
assert.equal(normalized.villagers[0].location, "Homes");
assert.throws(() => normalizeState({ ...(legacy as unknown as Record<string, unknown>), spatialModel: "structured-v2", simulationVersion: "future-sim", structuredState: undefined } as never), /structured-v2 checkpoint/);
const firstGlow = createWorldFromBundle(decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8"))), 11, "server-glow");
const normalizedFirstGlow = normalizeState(firstGlow);
assert.equal(normalizedFirstGlow.simulationVersion, "mimir-sim-v3-first-glow");
assert.equal(normalizedFirstGlow.firstGlowState?.settlements[0].sparks[0].name, "Spark 1");
assert.throws(() => normalizeState({ ...firstGlow, simulationVersion: "mimir-sim-v3-first-glow", firstGlowState: undefined } as never), /First Glow checkpoint/);
console.log("legacy spatial snapshot compatibility passed");
