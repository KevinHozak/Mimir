import assert from "node:assert/strict";
import { advanceWorld, createWorld, interpretSocialEvents, runTicks } from "./index.js";

const firstTick = advanceWorld(createWorld(42));
const first = runTicks(createWorld(42), 60);
const second = runTicks(createWorld(42), 60);
const resumed = runTicks(runTicks(createWorld(42), 30).state, 30);

assert.equal(first.state.tick, 60);
assert.deepEqual(first.state, second.state);
assert.deepEqual(first.state, resumed.state);
assert.equal(first.events.length, second.events.length);
assert.equal(first.interpretations.length, second.interpretations.length);
assert.ok(first.state.villagers.every((villager) => villager.hunger >= 0 && villager.hunger <= 100));
assert.ok(firstTick.state.villagers.some((villager) => villager.route.length > 1));
assert.ok(firstTick.state.villagers.every((villager) => villager.route.at(-1)?.x === villager.position.x && villager.route.at(-1)?.y === villager.position.y));
assert.equal(new Set(firstTick.state.villagers.map((villager) => `${villager.position.x},${villager.position.y}`)).size, firstTick.state.villagers.length);
assert.ok(first.state.foodReserve >= 0);
for (let seed = 1; seed <= 10; seed += 1) {
  const result = runTicks(createWorld(seed), 60);
  assert.equal(result.state.tick, 60);
  assert.ok(result.state.foodReserve >= 0);
  assert.equal(new Set(result.state.villagers.map((villager) => `${villager.position.x},${villager.position.y}`)).size, result.state.villagers.length);
  assert.ok(result.interpretations.every((interpretation) => interpretation.source === "rules" && interpretation.evidenceEventIds.length > 0 && interpretation.confidence > 0 && interpretation.confidence <= 1));
}
assert.ok(first.interpretations.length > 0);
assert.ok(first.interpretations.length >= 20);
const rulesInterpretations = interpretSocialEvents(first.state, first.events);
const aiFallbackInterpretations = interpretSocialEvents(first.state, first.events, "ai");
assert.deepEqual(rulesInterpretations.map((interpretation) => interpretation.summary), aiFallbackInterpretations.map((interpretation) => interpretation.summary));
assert.ok(aiFallbackInterpretations.every((interpretation) => interpretation.source === "ai"));
console.log("engine tests passed");
