import assert from "node:assert/strict";
import { advanceWorld, createWorld, runTicks } from "./index.js";

const firstTick = advanceWorld(createWorld(42));
const first = runTicks(createWorld(42), 60);
const second = runTicks(createWorld(42), 60);

assert.equal(first.state.tick, 60);
assert.deepEqual(first.state, second.state);
assert.equal(first.events.length, second.events.length);
assert.ok(first.state.villagers.every((villager) => villager.hunger >= 0 && villager.hunger <= 100));
assert.ok(firstTick.state.villagers.some((villager) => villager.route.length > 1));
assert.ok(firstTick.state.villagers.every((villager) => villager.route.at(-1)?.x === villager.position.x && villager.route.at(-1)?.y === villager.position.y));
assert.equal(new Set(firstTick.state.villagers.map((villager) => `${villager.position.x},${villager.position.y}`)).size, firstTick.state.villagers.length);
assert.ok(first.state.foodReserve >= 0);
console.log("engine tests passed");
