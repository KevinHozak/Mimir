import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { advanceWorld, createWorldV3 } from "./index.js";
import { decodeWorldBundle } from "@mimir/world-data";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("history fixture is not schema 3");

test("First Glow records durable movement and decision history", () => {
  let world = createWorldV3(bundle, 31, "history-test", 12);
  for (let tick = 0; tick < 4; tick += 1) world = advanceWorld(world).state;
  const history = world.firstGlowState.history;
  assert.ok(history);
  assert.equal(history.schemaVersion, 1);
  assert.ok(history.decisions.length >= world.firstGlowState.events.length);
  assert.ok(history.decisions.every(record => record.resultingEventId === record.eventId && record.usage.outcome === "rules-only"));
  assert.ok(history.movements.length > 0);
  assert.ok(history.movements.every(record => record.cells.length > 1 && record.movementCost >= 0 && Array.isArray(record.resourceEffects)));
});

test("First Glow history stays deterministic across repeated playback", () => {
  const run = () => {
    let world = createWorldV3(bundle, 37, "history-determinism", 12);
    for (let tick = 0; tick < 4; tick += 1) world = advanceWorld(world).state;
    return world.firstGlowState.history;
  };
  assert.deepEqual(run(), run());
});
