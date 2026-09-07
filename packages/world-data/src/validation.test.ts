import assert from "node:assert/strict";
import test from "node:test";
import { bundleHash } from "./canonical.js";
import { validateRuntimeState, validateWorldBundle } from "./validation.js";
import type { WorldBundle } from "./types.js";

function fixture(): WorldBundle {
  const world = {
    schemaVersion: 2, spatialModel: "structured-v2", simulationVersion: "mimir-sim-v2", id: "test", width: 3, height: 2, cellSizePx: 24,
    terrain: [["grass", "water", "grass"], ["grass", "grass", "grass"]], terrainDefinitions: { grass: { id: "grass", walkable: true, movementCost: 2 }, water: { id: "water", walkable: false } },
    surfaces: [{ id: "bridge", cells: [{ x: 1, y: 0 }], movementCost: 1, enabled: true }], objectDefinitions: { tree: { id: "tree", footprint: [{ x: 0, y: 0 }], slots: [], capabilities: [], capacity: 0, groundContact: { x: 12, y: 24 }, blocksMovement: true } },
    objects: [{ id: "tree-1", definitionId: "tree", origin: { x: 2, y: 0 }, orientation: 0 }], layers: [{ id: "ground", role: "ground", order: 0 }], spawns: [{ id: "spawn-1", cell: { x: 0, y: 0 }, settlementId: "home" }], assets: [], bundle: { bundleId: "test-bundle", contentHash: "", schemaVersion: 2, assetVersion: "test" }
  } as WorldBundle;
  world.bundle.contentHash = bundleHash(world); return world;
}
test("strict v2 validation rejects duplicate IDs and fractional coordinates", () => { const world = fixture(); validateWorldBundle(world); const duplicate = structuredClone(world); duplicate.objects.push({ ...duplicate.objects[0], origin: { x: 1, y: 1 } }); duplicate.bundle.contentHash = bundleHash(duplicate); assert.throws(() => validateWorldBundle(duplicate), /duplicate/); const fractional = structuredClone(world); fractional.objects[0].origin = { x: 1.5, y: 0 }; fractional.bundle.contentHash = bundleHash(fractional); assert.throws(() => validateWorldBundle(fractional), /integer/); });
test("surface precedence allows a bridge over impassable terrain", () => { const world = fixture(); validateWorldBundle(world); assert.equal(world.terrain[0][1], "water"); assert.equal(world.surfaces[0].movementCost, 1); });
test("authored spatial validation rejects overlapping solids and blocked spawns", () => { const world = fixture(); const overlap = structuredClone(world); overlap.objects.push({ id: "tree-2", definitionId: "tree", origin: { x: 2, y: 0 }, orientation: 0 }); overlap.bundle.contentHash = bundleHash(overlap); assert.throws(() => validateWorldBundle(overlap), /solid objects/); const blockedSpawn = structuredClone(world); blockedSpawn.spawns[0].cell = { x: 2, y: 0 }; blockedSpawn.bundle.contentHash = bundleHash(blockedSpawn); assert.throws(() => validateWorldBundle(blockedSpawn), /spawn/); });
test("runtime blockers reject unknown and duplicate object state", () => { const world = fixture(); assert.throws(() => validateRuntimeState(world, { navigationRevision: 0, objects: [{ objectId: "missing", blocked: true }], reservations: [] }), /unknown object/); assert.throws(() => validateRuntimeState(world, { navigationRevision: 0, objects: [{ objectId: "tree-1", blocked: true }, { objectId: "tree-1", blocked: false }], reservations: [] }), /duplicate runtime object/); });
