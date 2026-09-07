import assert from "node:assert/strict";
import { normalizeState } from "./state.js";

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
console.log("legacy spatial snapshot compatibility passed");
