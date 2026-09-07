import { canTraverse, findRoute, type Cell, type WorldDefinition, type WorldRuntimeState } from "./world.js";

export type SpatialActivity = "rest" | "collect" | "share" | "craft" | "meet" | "work" | "gather";
export type NavigationOutcome =
  | { kind: "reserved"; objectId: string; slotId: string; cell: Cell; route: Cell[]; cost: number }
  | { kind: "invalid-destination"; activity: string }
  | { kind: "no-free-slot"; activity: string }
  | { kind: "no-route"; activity: string };
export interface NavigationReservation { actorId: string; objectId: string; slotId: string; }

const capabilityFor = (activity: SpatialActivity) => activity;
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
function slotCell(world: WorldDefinition, objectId: string, slotId: string): Cell | undefined {
  const object = world.objects.find(candidate => candidate.id === objectId); if (!object) return undefined;
  const definition = world.definitions[object.definitionId]; const slotIndex = Number(slotId.split("-").at(-1)) - 1; const slot = definition.interactionSlots[slotIndex];
  return slot ? { x: object.position.x + slot.x, y: object.position.y + slot.y } : undefined;
}
function routeCost(world: WorldDefinition, runtime: WorldRuntimeState, route: Cell[]): number { let total = 0; for (let index = 1; index < route.length; index += 1) { const edge = canTraverse(world, route[index - 1], route[index], runtime); if (!edge.walkable) return Infinity; total += edge.cost; } return total; }

export function resolveDestination(world: WorldDefinition, runtime: WorldRuntimeState, actorId: string, start: Cell, activity: SpatialActivity, existing?: NavigationReservation): NavigationOutcome {
  const candidates = world.objects.filter(object => world.definitions[object.definitionId].activities?.includes(capabilityFor(activity)) ?? false).sort((a, b) => compare(a.id, b.id));
  if (candidates.length === 0) return { kind: "invalid-destination", activity };
  const reserved = new Set(runtime.reservations?.filter(reservation => reservation.actorId !== actorId).map(reservation => `${reservation.objectId}:${reservation.slotId}`) ?? []);
  const choices: { objectId: string; slotId: string; cell: Cell; route: Cell[]; cost: number }[] = [];
  for (const object of candidates) {
    const definition = world.definitions[object.definitionId];
    for (let index = 0; index < definition.interactionSlots.length; index += 1) {
      const slotId = `slot-${index + 1}`; const key = `${object.id}:${slotId}`;
      if (existing && existing.objectId === object.id && existing.slotId === slotId) reserved.delete(key);
      if (reserved.has(key)) continue;
      const cell = slotCell(world, object.id, slotId); if (!cell) continue; const route = findRoute(world, start, cell, runtime); if (!route) continue; choices.push({ objectId: object.id, slotId, cell, route, cost: routeCost(world, runtime, route) });
    }
  }
  if (choices.length === 0) { const hasFree = candidates.some(object => world.definitions[object.definitionId].interactionSlots.some((_, index) => !reserved.has(`${object.id}:slot-${index + 1}`))); return hasFree ? { kind: "no-route", activity } : { kind: "no-free-slot", activity }; }
  choices.sort((a, b) => a.cost - b.cost || compare(a.objectId, b.objectId) || compare(a.slotId, b.slotId)); const choice = choices[0]; return { kind: "reserved", ...choice };
}
