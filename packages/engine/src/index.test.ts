import assert from "node:assert/strict";
import { createWorld, runTicks } from "./index.js";

const first = runTicks(createWorld(42), 60);
const second = runTicks(createWorld(42), 60);

assert.equal(first.state.tick, 60);
assert.deepEqual(first.state, second.state);
assert.equal(first.events.length, second.events.length);
assert.ok(first.state.villagers.every((villager) => villager.hunger >= 0 && villager.hunger <= 100));
assert.ok(first.state.foodReserve >= 0);
console.log("engine tests passed");
