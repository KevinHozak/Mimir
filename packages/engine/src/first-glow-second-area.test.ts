import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, queryCell, type FirstGlowWorldBundle } from "@mimir/world-data";
import { advanceFirstGlow, createFirstGlowState } from "./index.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca/world.json", import.meta.url)), "utf8"))) as FirstGlowWorldBundle;

test("Wild Cache is a reachable second area with an explicit probe tradeoff", () => {
  const settlement = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2).settlements[0];
  const cache = bundle.objects.find(object => object.definitionId === "wild-cache");
  assert.ok(cache);
  const slot = bundle.objectDefinitions["wild-cache"].slots[0];
  const contact = { x: cache.origin.x + slot.offset.x, y: cache.origin.y + slot.offset.y };
  assert.equal(queryCell(bundle, settlement.runtime, contact).walkable, true);
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const spark = state.settlements[0].sparks[0];
  spark.status = "interacting";
  spark.intendedActivity = "scavenge-cache";
  spark.position = contact;
  spark.destinationObjectId = cache.id;
  spark.destinationSlotId = slot.id;
  spark.carriedCharge = 2;
  state.settlements[0].runtime.reservations = [{ actorId: spark.id, objectId: cache.id, slotId: slot.id }];
  const next = advanceFirstGlow(state);
  const event = next.events.find(candidate => candidate.kind === "wild-cache");
  assert.match(event?.message ?? "", /uncertain signal.*less familiar return route/);
  assert.equal(next.ledger.some(entry => entry.reason === "wild-cache-probe" && entry.amount === 1), true);
  assert.equal(next.settlements[0].sparks[0].readiness, 97);
  assert.equal(next.explanations.some(explanation => explanation.dilemmaId === "wild-cache-risk" && explanation.evidenceEventIds.includes(event!.id)), true);
});
