type Cell = { x: number; y: number };

export type FirstGlowAtmosphereState = "quiet" | "active" | "selected" | "gathering" | "depleted" | "blocked-route";
export type FirstGlowAtmosphereEvent = { id: string; tick: number; kind: string; actorId?: string; participants?: string[]; message?: string };
export type FirstGlowAtmosphereSpark = { id: string; position: Cell; status: string; destinationObjectId?: string; remainingRoute?: Cell[] };
export type FirstGlowAtmosphereObject = { id: string; definitionId: string; origin: Cell };
export type FirstGlowAtmosphereBundle = { objects: FirstGlowAtmosphereObject[]; surfaces: { id: string; cells: Cell[]; enabled: boolean }[] };
export type FirstGlowAtmosphereRuntime = { objects: { objectId: string; blocked: boolean }[]; reservations: { actorId: string; objectId: string; slotId: string }[] };
export type FirstGlowAtmosphereEffect = { kind: "node" | "route" | "event"; id: string; cell: Cell; state: FirstGlowAtmosphereState; cells?: Cell[] };
export type FirstGlowAtmospherePlan = { effects: FirstGlowAtmosphereEffect[]; budget: number; activeEvents: string[] };

const MAX_EFFECTS = 48;
const key = (cell: Cell) => `${cell.x},${cell.y}`;

export function planFirstGlowAtmosphere(input: { bundle: FirstGlowAtmosphereBundle; runtime?: FirstGlowAtmosphereRuntime; sparks: FirstGlowAtmosphereSpark[]; events: FirstGlowAtmosphereEvent[]; tick: number; selectedEntityId?: string | null }): FirstGlowAtmospherePlan {
  const runtime = input.runtime ?? { objects: [], reservations: [] };
  const reserved = new Set(runtime.reservations.map(item => item.objectId));
  const destinations = new Set(input.sparks.map(spark => spark.destinationObjectId).filter((id): id is string => Boolean(id)));
  const depleted = new Set(input.events.filter(event => event.tick === input.tick && (event.kind === "draw" || event.kind === "collection") && /drew 0 charge/i.test(event.message ?? "")).map(event => event.actorId).filter((id): id is string => Boolean(id)));
  const effects: FirstGlowAtmosphereEffect[] = [];
  for (const object of input.bundle.objects.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const blocked = runtime.objects.some(item => item.objectId === object.id && item.blocked);
    const occupant = input.sparks.find(spark => spark.destinationObjectId === object.id && spark.status === "interacting");
    const state: FirstGlowAtmosphereState = blocked ? "blocked-route" : input.selectedEntityId === `object:${object.id}` ? "selected" : object.definitionId === "charge-pool" && depleted.size > 0 ? "depleted" : occupant || reserved.has(object.id) || destinations.has(object.id) ? (occupant ? "gathering" : "active") : "quiet";
    effects.push({ kind: "node", id: object.id, cell: object.origin, state });
  }
  const activeRouteCells = new Set(input.sparks.flatMap(spark => spark.remainingRoute ?? []).map(key));
  for (const surface of input.bundle.surfaces.filter(surface => surface.enabled).sort((a, b) => a.id.localeCompare(b.id))) {
    for (const cell of surface.cells) {
      if (effects.length >= MAX_EFFECTS) break;
      effects.push({ kind: "route", id: `${surface.id}:${key(cell)}`, cell, state: activeRouteCells.has(key(cell)) ? "active" : "quiet" });
    }
    if (effects.length >= MAX_EFFECTS) break;
  }
  const sparksById = new Map(input.sparks.map(spark => [spark.id, spark]));
  const activeEvents = input.events.filter(event => event.tick === input.tick).slice(-8).sort((a, b) => a.id.localeCompare(b.id));
  for (const event of activeEvents) {
    if (effects.length >= MAX_EFFECTS) break;
    const actor = event.actorId ? sparksById.get(event.actorId) : undefined;
    if (actor) effects.push({ kind: "event", id: event.id, cell: actor.position, state: event.kind === "share" || event.kind === "meet" ? "gathering" : "active" });
  }
  return { effects: effects.slice(0, MAX_EFFECTS), budget: MAX_EFFECTS, activeEvents: activeEvents.map(event => event.id) };
}
