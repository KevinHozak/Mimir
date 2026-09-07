import assert from "node:assert/strict";
import { createFixtureWorld } from "./world.js";
import { advanceMovement } from "./movement.js";
const world = createFixtureWorld(); const runtime = { blockedObjectIds: [] };
const start = { position: { x: 0, y: 0 }, remainingRoute: [{ x: 1, y: 0 }, { x: 2, y: 0 }], remainingCost: 0, status: "traveling" as const, plannedNavigationRevision: 0 };
const grass = advanceMovement(world, runtime, start, 2); assert.equal(grass.state.position.x, 1); assert.equal(grass.state.remainingRoute.length, 1); assert.equal(grass.state.remainingCost, 0); assert.deepEqual(grass.committedCells.map(cell => cell.x), [0, 1]);
const road = advanceMovement(world, runtime, { ...start, position: { x: 0, y: 4 }, remainingRoute: [{ x: 1, y: 4 }, { x: 2, y: 4 }] }, 2); assert.equal(road.state.position.x, 2); assert.deepEqual(road.committedCells.map(cell => cell.x), [0, 1, 2]);
