import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceWorld, createFixtureWorld, createWorld, findRoute, FIRST_WINTER_SCENARIO, importTiledMap, interpretSocialEvents, isWalkable, parseWorldDefinition, runTicks, setObjectBlocked, worldFingerprint } from "./index.js";

const firstTick = advanceWorld(createWorld(42));
const first = runTicks(createWorld(42), 60);
const second = runTicks(createWorld(42), 60);
const resumed = runTicks(runTicks(createWorld(42), 30).state, 30);
const moving = advanceWorld(createWorld(42)).state;
const restartedDuringTravel = advanceWorld(JSON.parse(JSON.stringify(moving)) as typeof moving).state;
const uninterruptedDuringTravel = advanceWorld(moving).state;

assert.equal(first.state.tick, 60);
assert.deepEqual(createWorld(42).scenario, FIRST_WINTER_SCENARIO);
const shortScenario = { ...FIRST_WINTER_SCENARIO, name: "Short Season", initialFood: 20, seasonTickLimit: 8, harvestInterval: 2, harvestAmount: 12, hungerPressure: 4 };
assert.equal(createWorld(42, "short-season", shortScenario).foodReserve, 20);
assert.equal(advanceWorld(createWorld(42, "short-season", shortScenario)).state.foodReserve, 32);
assert.deepEqual(first.state, second.state);
assert.deepEqual(first.state, resumed.state);
assert.deepEqual(restartedDuringTravel, uninterruptedDuringTravel);
assert.equal(first.events.length, second.events.length);
assert.equal(first.interpretations.length, second.interpretations.length);
assert.ok(first.state.villagers.every((villager) => villager.hunger >= 0 && villager.hunger <= 100));
assert.ok(firstTick.state.villagers.some((villager) => villager.route.length > 1));
assert.ok(firstTick.state.villagers.some((villager) => villager.activity === "travel" && villager.destination));
assert.ok(first.state.villagers.some((villager) => villager.activity !== "travel"));
assert.ok(firstTick.state.villagers.every((villager) => villager.route.at(-1)?.x === villager.position.x && villager.route.at(-1)?.y === villager.position.y));
assert.equal(new Set(firstTick.state.villagers.map((villager) => `${villager.position.x},${villager.position.y}`)).size, firstTick.state.villagers.length);
assert.ok(firstTick.state.worldDefinition);
assert.equal(firstTick.state.worldDefinition?.width, 100);
assert.equal(firstTick.state.worldDefinition?.height, 100);
assert.ok(first.state.foodReserve >= 0);
let collectionState = { ...createWorld(7), foodReserve: 1000, villagers: createWorld(7).villagers.map((villager, index) => index === 0 ? { ...villager, food: 0, hunger: 70 } : villager) };
let collectionObserved = false;
for (let tick = 0; tick < 50; tick += 1) {
  const result = advanceWorld(collectionState);
  const collection = result.events.find((event) => event.kind === "collection" && event.villagerIds.includes("villager-1"));
  if (collection) {
    const mara = result.state.villagers.find((villager) => villager.id === "villager-1")!;
    assert.equal(mara.location, "Granary");
    assert.ok(mara.food > 0);
    collectionObserved = true;
    break;
  }
  collectionState = result.state;
}
assert.ok(collectionObserved);
for (let seed = 1; seed <= 3; seed += 1) {
  let state = createWorld(seed);
  let result = { state, events: [], interpretations: [] } as ReturnType<typeof advanceWorld>;
  for (let tick = 0; tick < 60; tick += 1) {
    result = advanceWorld(state);
    state = result.state;
    assert.equal(new Set(state.villagers.map((villager) => `${villager.position.x},${villager.position.y}`)).size, state.villagers.length);
  }
  assert.equal(result.state.tick, 60);
  assert.ok(result.state.foodReserve >= 0);
  assert.ok(result.state.villagers.every((villager) => result.state.worldDefinition && isWalkable(result.state.worldDefinition, villager.position)));
  assert.ok(result.interpretations.every((interpretation) => interpretation.source === "rules" && interpretation.evidenceEventIds.length > 0 && interpretation.confidence > 0 && interpretation.confidence <= 1));
}
assert.ok(first.interpretations.length > 0);
assert.ok(first.interpretations.length > 0);
const fixture = createFixtureWorld();
assert.deepEqual(parseWorldDefinition(JSON.parse(JSON.stringify(fixture))), fixture);
assert.equal(worldFingerprint(fixture), worldFingerprint(parseWorldDefinition(JSON.parse(JSON.stringify(fixture)))));
assert.notEqual(worldFingerprint(fixture), worldFingerprint({ ...fixture, objects: fixture.objects.map((object) => object.id === "tree-1" ? { ...object, position: { x: 10, y: 2 } } : object) }));
assert.throws(() => parseWorldDefinition({ schemaVersion: 1 }), /missing required fields/);
const imported = importTiledMap({ width: 4, height: 3, tilewidth: 1, tileheight: 1, layers: [
  { type: "tilelayer", data: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1] },
  { type: "objectgroup", objects: [{ id: 4, x: 1, y: 1, class: "tree" }] }
] }, "tiled-fixture-v1", { terrainByGid: { 1: "grass", 2: "water" }, objectByType: { tree: "tree" } });
assert.equal(imported.terrain[0][2], "water");
assert.deepEqual(imported.objects[0], { id: "tiled-4", definitionId: "tree", position: { x: 1, y: 1 } });
const authoredMap = JSON.parse(readFileSync(join(process.cwd(), "..", "..", "assets", "world", "first-winter.tiled.json"), "utf8")) as unknown;
const authoredWorld = importTiledMap(authoredMap, "first-winter-authored-v1", { terrainByGid: { 1: "grass", 2: "water", 3: "road" }, objectByType: { house: "house", tree: "tree", granary: "granary", bridge: "bridge" } });
assert.equal(authoredWorld.objects.length, 4);
assert.equal(authoredWorld.terrain[0][4], "water");
assert.equal(isWalkable(fixture, { x: 6, y: 3 }), false);
assert.equal(isWalkable(fixture, { x: 6, y: 4 }), true);
const route = findRoute(fixture, { x: 1, y: 4 }, { x: 8, y: 7 });
assert.ok(route);
assert.ok(route!.some((cell) => cell.x === 7 && cell.y === 4));
assert.ok(!route!.some((cell) => cell.x === 2 && cell.y === 2));
assert.equal(findRoute(fixture, { x: 1, y: 3 }, { x: 6, y: 3 }), null);
const blockedBridge = setObjectBlocked(fixture, { blockedObjectIds: [] }, "bridge-1", true);
assert.equal(isWalkable(fixture, { x: 6, y: 4 }, blockedBridge), false);
assert.equal(findRoute(fixture, { x: 1, y: 4 }, { x: 8, y: 7 }, blockedBridge), null);
assert.throws(() => setObjectBlocked(fixture, { blockedObjectIds: [] }, "missing", true), /unknown world object/);
const rulesInterpretations = interpretSocialEvents(first.state, first.events);
const aiFallbackInterpretations = interpretSocialEvents(first.state, first.events, "ai");
assert.deepEqual(rulesInterpretations.map((interpretation) => interpretation.summary), aiFallbackInterpretations.map((interpretation) => interpretation.summary));
assert.ok(aiFallbackInterpretations.every((interpretation) => interpretation.source === "ai"));
console.log("engine tests passed");
