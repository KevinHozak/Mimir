import { readFileSync } from "node:fs";
import { canTraverse, decodeWorldBundle, type FirstGlowWorldBundle, type Cell } from "@mimir/world-data";
import { createFirstGlowState, validateFirstGlowState, type FirstGlowState } from "./structured.js";
import { initializeWildCacheChoice } from "./first-glow-cache-choice.js";
import { initializeRoutePatterns } from "./first-glow-route-patterns.js";

export const routePatternFixtureBundle = decodeWorldBundle(JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca/world.json", import.meta.url), "utf8"))) as FirstGlowWorldBundle;

// A declared initial transit plan, not a teleport or injected encounter/use outcome.
function startTwentyUnitsFrom(state: FirstGlowState, goal: Cell): Cell {
  const settlement = state.settlements[0], queue = [{ cell: goal, cost: 0 }], seen = new Set<string>();
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost || a.cell.y - b.cell.y || a.cell.x - b.cell.x);
    const item = queue.shift()!, key = `${item.cell.x},${item.cell.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (item.cost === 20) return item.cell;
    for (const cell of [{ x: item.cell.x - 1, y: item.cell.y }, { x: item.cell.x + 1, y: item.cell.y }, { x: item.cell.x, y: item.cell.y - 1 }, { x: item.cell.x, y: item.cell.y + 1 }]) {
      const edge = canTraverse(routePatternFixtureBundle, settlement.runtime, cell, item.cell);
      if (edge.walkable && item.cost + edge.cost <= 20) queue.push({ cell, cost: item.cost + edge.cost });
    }
  }
  throw new Error("No controlled transit start");
}

export function routePatternFixture(charge = 32, enabled = true, encounter = true): FirstGlowState {
  const state = createFirstGlowState(routePatternFixtureBundle, "first-glow-region", "Controlled route-pattern history", 2);
  initializeWildCacheChoice(state);
  if (enabled) initializeRoutePatterns(state);
  const settlement = state.settlements[0], [creator, reader] = settlement.sparks;
  const cache = routePatternFixtureBundle.objects.find(object => object.definitionId === "wild-cache")!, cacheSlot = routePatternFixtureBundle.objectDefinitions[cache.definitionId].slots[0];
  Object.assign(creator, { position: { x: cache.origin.x + cacheSlot.offset.x, y: cache.origin.y + cacheSlot.offset.y }, carriedCharge: 5, readiness: 90, status: "interacting", intendedActivity: "scavenge-cache", destinationObjectId: cache.id, destinationSlotId: cacheSlot.id });
  settlement.runtime.reservations = [{ actorId: creator.id, objectId: cache.id, slotId: cacheSlot.id }];
  const shard = routePatternFixtureBundle.objects.find(object => object.definitionId === "pattern-shard")!, slot = routePatternFixtureBundle.objectDefinitions[shard.definitionId].slots[0];
  const contact = { x: shard.origin.x + slot.offset.x, y: shard.origin.y + slot.offset.y };
  const destination = encounter ? contact : { x: contact.x + 1, y: contact.y };
  Object.assign(reader, { position: startTwentyUnitsFrom(state, destination), carriedCharge: charge, readiness: 100, intendedActivity: encounter ? "shape-pattern" : "explore", status: "traveling", destinationCell: destination, remainingRoute: [], plannedNavigationRevision: 1 });
  validateFirstGlowState(state);
  return state;
}
