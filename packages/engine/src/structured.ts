import { canTraverse, queryCell, validateRuntimeState, validateWorldBundle, type Cell, type DecodedWorldBundle, type FirstGlowActivity, type FirstGlowWorldBundle, type Reservation, type WorldBundle, type WorldRuntimeState } from "@mimir/world-data";
import { createFirstGlowSocialState, recordFirstGlowWitnesses, validateFirstGlowSocialState, type FirstGlowSocialState } from "./first-glow-social.js";
import { appendFirstGlowExplanations, type FirstGlowExplanation } from "./first-glow-explanations.js";
import { createFirstGlowHistory, validateFirstGlowHistory, type FirstGlowHistory } from "./first-glow-history.js";
import { createFirstGlowReflectionCapacityState, validateFirstGlowReflectionCapacity, type FirstGlowReflectionCapacityState } from "./first-glow-reflection-capacity.js";

export const STRUCTURED_SIMULATION_VERSION = "mimir-sim-v2" as const;
export type StructuredStatus = "choosing" | "traveling" | "waiting" | "interacting" | "idle";
export type StructuredActivity = "rest" | "collect" | "share" | "craft" | "meet" | "work" | "gather";
export interface StructuredActor { id: string; name: string; position: Cell; status: StructuredStatus; intendedActivity: StructuredActivity; destinationObjectId?: string; destinationSlotId?: string; remainingRoute: Cell[]; remainingCost: number; plannedNavigationRevision: number; committedCells: Cell[]; food: number; hunger: number; waitReason?: string; }
export interface StructuredSettlement { id: string; name: string; bundle: WorldBundle; runtime: WorldRuntimeState; actors: StructuredActor[]; storeFood: number; }
export interface LedgerEntry { kind: "production" | "collection" | "draw" | "share" | "consumption" | "loss" | "idle" | "adjustment"; actorId?: string; recipientId?: string; amount: number; reason: string; }
export interface StructuredEvent { id: string; tick?: number; kind: "movement" | "arrival" | "collection" | "draw" | "share" | "idle" | "wait" | "explore" | "mark-trace" | "shape-pattern" | "meet" | "wild-cache" | "shelter-loom-choice" | "crossing-voices-choice"; actorId: string; message: string; cells?: Cell[]; participants?: string[]; evidenceEventIds?: string[]; source?: "rules" | "spontaneous"; }
export interface StructuredState { schemaVersion: 2; spatialModel: "structured-v2"; simulationVersion: typeof STRUCTURED_SIMULATION_VERSION; tick: number; settlements: StructuredSettlement[]; ledger: LedgerEntry[]; events: StructuredEvent[]; }
export const FIRST_GLOW_SIMULATION_VERSION = "mimir-sim-v3-first-glow" as const;
export interface FirstGlowSpark { id: string; name: string; spawnedTick?: number; position: Cell; status: StructuredStatus; intendedActivity: FirstGlowActivity; destinationObjectId?: string; destinationSlotId?: string; destinationCell?: Cell; remainingRoute: Cell[]; remainingCost: number; plannedNavigationRevision: number; committedCells: Cell[]; carriedCharge: number; chargeDeficit: number; readiness: number; knownEvidenceEventIds: string[]; waitReason?: string; }
export interface FirstGlowSettlement { id: string; name: string; bundle: FirstGlowWorldBundle; runtime: WorldRuntimeState; sparks: FirstGlowSpark[]; sourceCharge: number; communalCharge: number; }
export interface FirstGlowState { schemaVersion: 3; spatialModel: "structured-v2"; simulationVersion: typeof FIRST_GLOW_SIMULATION_VERSION; themeId: "living-circuit"; ageId: "first-glow"; tick: number; settlements: FirstGlowSettlement[]; ledger: LedgerEntry[]; events: StructuredEvent[]; social: FirstGlowSocialState; explanations: FirstGlowExplanation[]; history?: FirstGlowHistory; reflectionCapacity?: FirstGlowReflectionCapacityState; }

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const validatedWorldBundles = new WeakSet<object>();
const routeCache = new WeakMap<object, Map<string, Cell[] | null>>();
const key = (cell: Cell) => `${cell.x},${cell.y}`;
function neighbors(cell: Cell): Cell[] { return [{ x: cell.x, y: cell.y - 1 }, { x: cell.x - 1, y: cell.y }, { x: cell.x + 1, y: cell.y }, { x: cell.x, y: cell.y + 1 }]; }
function distance(a: Cell, b: Cell) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function route(bundle: DecodedWorldBundle, runtime: WorldRuntimeState, start: Cell, goal: Cell): Cell[] | null {
  const cache = routeCache.get(bundle) ?? new Map<string, Cell[] | null>();
  routeCache.set(bundle, cache);
  const cacheKey = `${runtime.navigationRevision}:${start.x},${start.y}:${goal.x},${goal.y}`;
  if (cache.has(cacheKey)) { const cached = cache.get(cacheKey); return cached ? cached.map(cell => ({ ...cell })) : null; }
  const first = queryCell(bundle, runtime, start); const last = queryCell(bundle, runtime, goal); if (!first.walkable || !last.walkable) return null; const open = [start]; const came = new Map<string, Cell>(); const score = new Map([[key(start), 0]]); const estimate = new Map([[key(start), distance(start, goal)]]);
  while (open.length) { open.sort((a, b) => estimate.get(key(a))! - estimate.get(key(b))! || compare(key(a), key(b))); const current = open.shift()!; if (key(current) === key(goal)) { const result = [current]; while (came.has(key(result[0]))) result.unshift(came.get(key(result[0]))!); cache.set(cacheKey, result.map(cell => ({ ...cell }))); return result; } for (const next of neighbors(current)) { const edge = canTraverse(bundle, runtime, current, next); if (!edge.walkable) continue; const nextKey = key(next); const nextScore = score.get(key(current))! + edge.cost; if (nextScore >= (score.get(nextKey) ?? Infinity)) continue; came.set(nextKey, current); score.set(nextKey, nextScore); estimate.set(nextKey, nextScore + distance(next, goal)); if (!open.some(cell => key(cell) === nextKey)) open.push(next); } } cache.set(cacheKey, null); return null;
}
function slotCell(bundle: WorldBundle, objectId: string, slotId: string): Cell | null { const object = bundle.objects.find(candidate => candidate.id === objectId); if (!object) return null; const definition = bundle.objectDefinitions[object.definitionId]; const slot = definition.slots.find(candidate => candidate.id === slotId); return slot ? { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y } : null; }
function candidates(settlement: StructuredSettlement, actor: StructuredActor): { objectId: string; slotId: string; cell: Cell; route: Cell[]; cost: number }[] {
  const reserved = new Set(settlement.runtime.reservations.filter(reservation => reservation.actorId !== actor.id).map(reservation => `${reservation.objectId}:${reservation.slotId}`)); const results: { objectId: string; slotId: string; cell: Cell; route: Cell[]; cost: number }[] = [];
  for (const object of settlement.bundle.objects.slice().sort((a, b) => compare(a.id, b.id))) { const definition = settlement.bundle.objectDefinitions[object.definitionId]; if (!definition.capabilities.includes(actor.intendedActivity)) continue; for (const slot of definition.slots.slice().sort((a, b) => compare(a.id, b.id))) { if (reserved.has(`${object.id}:${slot.id}`)) continue; const cell = slotCell(settlement.bundle, object.id, slot.id); if (!cell) continue; const path = route(settlement.bundle, settlement.runtime, actor.position, cell); if (!path) continue; let cost = 0; for (let index = 1; index < path.length; index += 1) { const edge = canTraverse(settlement.bundle, settlement.runtime, path[index - 1], path[index]); if (!edge.walkable) { cost = Infinity; break; } cost += edge.cost; } if (Number.isFinite(cost)) results.push({ objectId: object.id, slotId: slot.id, cell, route: path, cost }); } }
  return results.sort((a, b) => a.cost - b.cost || compare(a.objectId, b.objectId) || compare(a.slotId, b.slotId));
}
function reserve(settlement: StructuredSettlement, actor: StructuredActor): { kind: "reserved"; choice: ReturnType<typeof candidates>[number] } | { kind: "no-free-slot" | "no-route" } {
  const choices = candidates(settlement, actor); if (choices.length) { const choice = choices[0]; settlement.runtime.reservations.push({ actorId: actor.id, objectId: choice.objectId, slotId: choice.slotId }); return { kind: "reserved", choice }; }
  const eligible = settlement.bundle.objects.some(object => settlement.bundle.objectDefinitions[object.definitionId].capabilities.includes(actor.intendedActivity)); if (!eligible) return { kind: "no-route" }; const reserved = new Set(settlement.runtime.reservations.map(item => `${item.objectId}:${item.slotId}`)); const hasFree = settlement.bundle.objects.some(object => settlement.bundle.objectDefinitions[object.definitionId].capabilities.includes(actor.intendedActivity) && settlement.bundle.objectDefinitions[object.definitionId].slots.some(slot => !reserved.has(`${object.id}:${slot.id}`))); return hasFree ? { kind: "no-route" } : { kind: "no-free-slot" };
}
function release(settlement: StructuredSettlement, actorId: string) { settlement.runtime.reservations = settlement.runtime.reservations.filter(reservation => reservation.actorId !== actorId); }

export function validateStructuredState(state: StructuredState): void { if (state.schemaVersion !== 2 || state.spatialModel !== "structured-v2" || state.simulationVersion !== STRUCTURED_SIMULATION_VERSION) throw new Error("unsupported structured state version"); for (const settlement of state.settlements) { if (!validatedWorldBundles.has(settlement.bundle)) { validateWorldBundle(settlement.bundle); validatedWorldBundles.add(settlement.bundle); } validateRuntimeState(settlement.bundle, settlement.runtime); const ids = new Set<string>(); for (const actor of settlement.actors) { if (ids.has(actor.id)) throw new Error(`duplicate actor ${actor.id}`); ids.add(actor.id); if (!Number.isInteger(actor.position.x) || !Number.isInteger(actor.position.y)) throw new Error(`invalid actor position ${actor.id}`); } } }

export function validateFirstGlowState(state: FirstGlowState): void { if (state.schemaVersion !== 3 || state.spatialModel !== "structured-v2" || state.simulationVersion !== FIRST_GLOW_SIMULATION_VERSION || state.themeId !== "living-circuit" || state.ageId !== "first-glow") throw new Error("unsupported First Glow state version"); if (!state.social) throw new Error("unsupported First Glow social state version; checkpoint predates social state"); const explanations = state.explanations ?? []; if (!Array.isArray(explanations)) throw new Error("unsupported First Glow explanation state version"); const sparkIds = state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id)); const sparkIdSet = new Set(sparkIds); const explanationIds = new Set<string>(); for (const explanation of explanations) { if (!explanation.id || explanationIds.has(explanation.id) || !Number.isInteger(explanation.tick) || explanation.tick < 0 || !sparkIdSet.has(explanation.actorSparkId) || !explanation.dilemmaId || !explanation.alternativeId || explanation.evidenceEventIds.length === 0) throw new Error(`invalid First Glow explanation ${explanation.id}`); explanationIds.add(explanation.id); } for (const settlement of state.settlements) { if (!validatedWorldBundles.has(settlement.bundle)) { validateWorldBundle(settlement.bundle); validatedWorldBundles.add(settlement.bundle); } validateRuntimeState(settlement.bundle, settlement.runtime, settlement.sparks.map(spark => spark.id)); const ids = new Set<string>(); for (const spark of settlement.sparks) { if (ids.has(spark.id)) throw new Error(`duplicate Spark ${spark.id}`); ids.add(spark.id); if (spark.spawnedTick !== undefined && (!Number.isInteger(spark.spawnedTick) || spark.spawnedTick < 0)) throw new Error(`invalid Spark spawn tick ${spark.id}`); if (!Number.isInteger(spark.position.x) || !Number.isInteger(spark.position.y)) throw new Error(`invalid Spark position ${spark.id}`); if (!Number.isInteger(spark.carriedCharge) || spark.carriedCharge < 0 || !Number.isInteger(spark.chargeDeficit) || spark.chargeDeficit < 0 || !Number.isInteger(spark.readiness) || spark.readiness < 0 || spark.readiness > 100) throw new Error(`invalid First Glow resources for ${spark.id}`); } } validateFirstGlowSocialState(state.social, sparkIds); if (state.reflectionCapacity) validateFirstGlowReflectionCapacity(state.reflectionCapacity, sparkIds); }

export function createFirstGlowState(bundle: FirstGlowWorldBundle, settlementId = "first-glow-region", settlementName = "Opening region", sparkCount = 1): FirstGlowState { validateWorldBundle(bundle); const spawns = bundle.spawns.filter(spawn => spawn.settlementId === settlementId); if (!spawns.length) throw new Error(`no First Glow spawn for settlement ${settlementId}`); const sparks = Array.from({ length: sparkCount }, (_, index): FirstGlowSpark => { const spawn = spawns[index % spawns.length]; return { id: `spark-${index + 1}`, name: `Spark ${index + 1}`, spawnedTick: 0, position: { ...spawn.cell }, status: "choosing", intendedActivity: "seek-charge", remainingRoute: [], remainingCost: 0, plannedNavigationRevision: 0, committedCells: [{ ...spawn.cell }], carriedCharge: 0, chargeDeficit: 0, readiness: 100, knownEvidenceEventIds: [] }; }); const state: FirstGlowState = { schemaVersion: 3, spatialModel: "structured-v2", simulationVersion: FIRST_GLOW_SIMULATION_VERSION, themeId: "living-circuit", ageId: "first-glow", tick: 0, settlements: [{ id: settlementId, name: settlementName, bundle, runtime: { navigationRevision: 0, objects: [], reservations: [] }, sparks, sourceCharge: 24, communalCharge: 0 }], ledger: [], events: [], social: createFirstGlowSocialState(sparks.map(spark => spark.id)), explanations: [], history: createFirstGlowHistory(), reflectionCapacity: createFirstGlowReflectionCapacityState(sparks.map(spark => spark.id)) }; validateFirstGlowState(state); return state; }

const firstGlowCapability = (activity: FirstGlowActivity) => activity === "seek-charge" || activity === "draw-charge" ? "charge-pool" : activity === "seek-shelter" || activity === "idle" ? "shelter-niche" : activity === "explore" ? "trace" : activity === "shape-pattern" ? "pattern-shard" : activity === "scavenge-cache" ? "wild-cache" : activity === "mark-trace" || activity === "meet" ? "light-mark" : null;
function firstGlowSlotCell(bundle: FirstGlowWorldBundle, objectId: string, slotId: string): Cell | null { const object = bundle.objects.find(candidate => candidate.id === objectId); if (!object) return null; const slot = bundle.objectDefinitions[object.definitionId].slots.find(candidate => candidate.id === slotId); return slot ? { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y } : null; }
function firstGlowExploreCandidate(settlement: FirstGlowSettlement, spark: FirstGlowSpark): { target: Cell; path: Cell[]; cost: number } | null {
  const candidates = settlement.bundle.surfaces.flatMap((surface) => surface.id === "trace-main" ? surface.cells.map((target) => ({ target, path: route(settlement.bundle, settlement.runtime, spark.position, target) })) : []).filter((candidate): candidate is { target: Cell; path: Cell[] } => Boolean(candidate.path));
  return candidates.sort((a, b) => a.path.length - b.path.length || a.target.y - b.target.y || a.target.x - b.target.x).map((candidate) => ({ ...candidate, cost: candidate.path.slice(1).reduce((total, cell, index) => { const edge = canTraverse(settlement.bundle, settlement.runtime, candidate.path[index], cell); return total + (edge.walkable ? edge.cost : 0); }, 0) }))[0] ?? null;
}
function firstGlowCandidates(settlement: FirstGlowSettlement, spark: FirstGlowSpark) { const capability = firstGlowCapability(spark.intendedActivity); if (!capability) return []; const reserved = new Set(settlement.runtime.reservations.filter(item => item.actorId !== spark.id).map(item => `${item.objectId}:${item.slotId}`)); return settlement.bundle.objects.flatMap(object => { const definition = settlement.bundle.objectDefinitions[object.definitionId]; if (!definition.capabilities.includes(capability)) return []; return definition.slots.flatMap(slot => { if (reserved.has(`${object.id}:${slot.id}`)) return []; const target = firstGlowSlotCell(settlement.bundle, object.id, slot.id); if (!target) return []; const path = route(settlement.bundle, settlement.runtime, spark.position, target); if (!path) return []; let cost = 0; for (let index = 1; index < path.length; index += 1) { const edge = canTraverse(settlement.bundle, settlement.runtime, path[index - 1], path[index]); if (!edge.walkable) return []; cost += edge.cost; } return [{ objectId: object.id, slotId: slot.id, target, path, cost }]; }); }).sort((a, b) => a.cost - b.cost || compare(a.objectId, b.objectId) || compare(a.slotId, b.slotId)); }
export function canFirstGlowReach(settlement: FirstGlowSettlement, spark: FirstGlowSpark, activity: FirstGlowActivity): boolean {
  if (activity === "explore") return Boolean(firstGlowExploreCandidate(settlement, spark));
  return firstGlowCandidates(settlement, { ...spark, intendedActivity: activity }).length > 0;
}

function releaseFirstGlow(settlement: FirstGlowSettlement, sparkId: string) { settlement.runtime.reservations = settlement.runtime.reservations.filter(item => item.actorId !== sparkId); }

function clearFirstGlowPlan(settlement: FirstGlowSettlement, spark: FirstGlowSpark, waitReason: string): void {
  releaseFirstGlow(settlement, spark.id);
  spark.destinationObjectId = undefined;
  spark.destinationSlotId = undefined;
  spark.destinationCell = undefined;
  spark.remainingRoute = [];
  spark.remainingCost = 0;
  spark.status = "waiting";
  spark.waitReason = waitReason;
}

function firstGlowReservationReason(settlement: FirstGlowSettlement, spark: FirstGlowSpark): "no-route" | "no-free-slot" {
  const capability = firstGlowCapability(spark.intendedActivity);
  if (!capability) return "no-route";
  const eligible = settlement.bundle.objects.filter(object => settlement.bundle.objectDefinitions[object.definitionId].capabilities.includes(capability));
  if (!eligible.length) return "no-route";
  const reserved = new Set(settlement.runtime.reservations.map(item => `${item.objectId}:${item.slotId}`));
  const free = eligible.some(object => settlement.bundle.objectDefinitions[object.definitionId].slots.some(slot => !reserved.has(`${object.id}:${slot.id}`)));
  return free ? "no-route" : "no-free-slot";
}

function validateFirstGlowArrival(settlement: FirstGlowSettlement, spark: FirstGlowSpark): { objectId?: string; slotId?: string; target: Cell } | null {
  if (spark.destinationCell) {
    const target = spark.destinationCell;
    const cell = queryCell(settlement.bundle, settlement.runtime, target);
    return cell.walkable && target.x >= 0 && target.y >= 0 && target.x < settlement.bundle.width && target.y < settlement.bundle.height && key(target) === key(spark.position) ? { target } : null;
  }
  if (!spark.destinationObjectId || !spark.destinationSlotId) return null;
  const reservation = settlement.runtime.reservations.find(item => item.actorId === spark.id);
  if (!reservation || reservation.objectId !== spark.destinationObjectId || reservation.slotId !== spark.destinationSlotId) return null;
  const object = settlement.bundle.objects.find(item => item.id === reservation.objectId);
  const definition = object && settlement.bundle.objectDefinitions[object.definitionId];
  const capability = firstGlowCapability(spark.intendedActivity);
  const slot = definition?.slots.find(item => item.id === reservation.slotId);
  const target = object && slot ? { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y } : null;
  if (!object || !definition || !capability || !definition.capabilities.includes(capability) || !target) return null;
  const contact = queryCell(settlement.bundle, settlement.runtime, target);
  const slotId = reservation.slotId;
  return contact.walkable && target.x >= 0 && target.y >= 0 && target.x < settlement.bundle.width && target.y < settlement.bundle.height && key(target) === key(spark.position) ? { objectId: object.id, slotId, target } : null;
}

export function advanceFirstGlowState(input: FirstGlowState, validate = true): FirstGlowState {
  if (validate) validateFirstGlowState(input);
  // The decoded bundle is immutable authored data. Copying it for every tick is both
  // unnecessary and prohibitive for long deterministic replay runs.
  const state: FirstGlowState = {
    ...input,
    settlements: input.settlements.map(({ bundle, ...settlement }) => ({ ...structuredClone(settlement), bundle })),
    ledger: structuredClone(input.ledger),
    events: structuredClone(input.events),
    social: structuredClone(input.social),
    explanations: structuredClone(input.explanations),
    history: structuredClone(input.history ?? createFirstGlowHistory())
  };
  if (state.history) validateFirstGlowHistory(state.history, state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id)));
  state.tick += 1;
  state.ledger = [];
  state.events = [];
  for (const settlement of state.settlements) {
    const completedArrival = new Set<string>();
    for (const spark of settlement.sparks.slice().sort((a, b) => compare(a.id, b.id))) {
      spark.committedCells = [{ ...spark.position }];
      if ((spark.status === "choosing" || spark.status === "waiting" || spark.status === "idle") && !spark.destinationObjectId && !spark.destinationCell) {
        const explore = spark.intendedActivity === "explore" ? firstGlowExploreCandidate(settlement, spark) : null;
        const choices = explore ? [] : firstGlowCandidates(settlement, spark);
        if (explore) {
          spark.destinationCell = explore.target;
          spark.remainingRoute = explore.path.slice(1);
          spark.remainingCost = 0;
          spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
          spark.status = spark.remainingRoute.length ? "traveling" : "interacting";
        } else if (!choices.length) {
          clearFirstGlowPlan(settlement, spark, firstGlowReservationReason(settlement, spark));
          state.events.push({ id: `event-${state.tick}-${spark.id}-wait`, kind: "wait", actorId: spark.id, message: `${spark.name} is waiting: no reachable ${spark.intendedActivity} site.` });
          continue;
        } else {
          const choice = choices[0];
          settlement.runtime.reservations.push({ actorId: spark.id, objectId: choice.objectId, slotId: choice.slotId });
          spark.destinationObjectId = choice.objectId;
          spark.destinationSlotId = choice.slotId;
          spark.remainingRoute = choice.path.slice(1);
          spark.remainingCost = 0;
          spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
          spark.status = spark.remainingRoute.length ? "traveling" : "interacting";
        }
      }
      if (spark.status === "traveling") {
        if (spark.plannedNavigationRevision !== settlement.runtime.navigationRevision) {
          const target = spark.destinationCell ?? (spark.destinationObjectId && spark.destinationSlotId ? firstGlowSlotCell(settlement.bundle, spark.destinationObjectId, spark.destinationSlotId) : null);
          const replanned = target ? route(settlement.bundle, settlement.runtime, spark.position, target) : null;
          if (!replanned) { clearFirstGlowPlan(settlement, spark, "no-route"); continue; }
          spark.remainingRoute = replanned.slice(1);
          spark.remainingCost = 0;
          spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
        }
        let budget = 2;
        while (budget > 0 && spark.remainingRoute.length) {
          const next = spark.remainingRoute[0];
          const edge = canTraverse(settlement.bundle, settlement.runtime, spark.position, next);
          if (!edge.walkable) { clearFirstGlowPlan(settlement, spark, edge.reason); break; }
          if (spark.remainingCost <= 0) spark.remainingCost = edge.cost;
          const debit = Math.min(budget, spark.remainingCost);
          spark.remainingCost -= debit;
          budget -= debit;
          if (spark.remainingCost === 0) { spark.position = { ...next }; spark.remainingRoute.shift(); spark.committedCells.push({ ...spark.position }); }
        }
        if (spark.status === "traveling" && spark.remainingRoute.length === 0) spark.status = "interacting";
        if (spark.committedCells.length > 1) state.events.push({ id: `event-${state.tick}-${spark.id}-movement`, kind: "movement", actorId: spark.id, cells: spark.committedCells, message: `${spark.name} moved ${spark.committedCells.length - 1} cell(s).` });
      }
      if (spark.status !== "interacting" || completedArrival.has(spark.id)) continue;
      const arrival = validateFirstGlowArrival(settlement, spark);
      if (!arrival) { clearFirstGlowPlan(settlement, spark, "invalid-destination"); continue; }
      completedArrival.add(spark.id);
      const reservation = settlement.runtime.reservations.find(item => item.actorId === spark.id);
      if (spark.intendedActivity === "seek-charge" || spark.intendedActivity === "draw-charge") {
        const amount = Math.min(8, settlement.sourceCharge);
        settlement.sourceCharge -= amount;
        spark.carriedCharge += amount;
        state.ledger.push({ kind: "draw", actorId: spark.id, amount, reason: amount ? "arrived-at-charge-pool" : "empty-charge-pool" });
        state.events.push({ id: `event-${state.tick}-${spark.id}-draw`, kind: "draw", actorId: spark.id, message: `${spark.name} drew ${amount} charge.` });
        if (amount === 0) { clearFirstGlowPlan(settlement, spark, "empty-source"); continue; }
      } else if (spark.intendedActivity === "idle" || spark.intendedActivity === "seek-shelter") {
        const recovered = Math.min(10, 100 - spark.readiness);
        spark.readiness += recovered;
        state.ledger.push({ kind: "idle", actorId: spark.id, amount: recovered, reason: "arrived-at-shelter-niche" });
        state.events.push({ id: `event-${state.tick}-${spark.id}-idle`, kind: "idle", actorId: spark.id, message: `${spark.name} idled and recovered ${recovered} readiness.` });
      } else if (spark.intendedActivity === "scavenge-cache") {
        const chargeCost = Math.min(1, spark.carriedCharge);
        spark.carriedCharge -= chargeCost;
        if (chargeCost === 0) spark.chargeDeficit += 1;
        spark.readiness = Math.max(0, spark.readiness - 2);
        state.ledger.push({ kind: chargeCost ? "consumption" : "adjustment", actorId: spark.id, amount: chargeCost || 1, reason: chargeCost ? "wild-cache-probe" : "wild-cache-charge-deficit" });
        state.events.push({ id: `event-${state.tick}-${spark.id}-wild-cache`, kind: "wild-cache", actorId: spark.id, message: `${spark.name} probed the Wild Cache: an uncertain signal, with a less familiar return route.` });
      } else if (spark.intendedActivity === "meet") {
        const companion = settlement.sparks.find(candidate => candidate.id > spark.id && candidate.status === "interacting" && candidate.destinationObjectId === reservation?.objectId && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y && validateFirstGlowArrival(settlement, candidate)?.objectId === arrival.objectId);
        if (!companion) { clearFirstGlowPlan(settlement, spark, "no-co-present-spark"); continue; }
        const eventId = `event-${state.tick}-${spark.id}-meet-${companion.id}`;
        const event = { id: eventId, kind: "meet" as const, actorId: spark.id, participants: [spark.id, companion.id], evidenceEventIds: [], source: "rules" as const, message: `${spark.name} met ${companion.name} at a shared contact site.` };
        state.events.push(event);
        spark.knownEvidenceEventIds.push(eventId);
        companion.knownEvidenceEventIds.push(eventId);
        clearFirstGlowPlan(settlement, companion, "met");
      }
      releaseFirstGlow(settlement, spark.id);
      spark.status = "choosing";
      spark.destinationObjectId = undefined;
      spark.destinationSlotId = undefined;
      spark.destinationCell = undefined;
      spark.remainingRoute = [];
      spark.remainingCost = 0;
    }
  }
  for (const event of state.events) recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants ?? [], state.tick);
  appendFirstGlowExplanations(state, state.events);
  validateFirstGlowState(state);
  return state;
}

export function createStructuredState(bundle: WorldBundle, settlementId = "first-village", settlementName = "Hearthmere", actorCount = 12): StructuredState {
  validateWorldBundle(bundle); const spawns = bundle.spawns.filter(spawn => spawn.settlementId === settlementId); if (!spawns.length) throw new Error(`no spawn for settlement ${settlementId}`); const actors = Array.from({ length: actorCount }, (_, index) => { const spawn = spawns[index % spawns.length]; return { id: `villager-${index + 1}`, name: `Villager ${index + 1}`, position: { ...spawn.cell }, status: "choosing" as const, intendedActivity: index % 3 === 0 ? "collect" as const : "rest" as const, remainingRoute: [], remainingCost: 0, plannedNavigationRevision: 0, committedCells: [{ ...spawn.cell }], food: 0, hunger: 0 }; }); const state: StructuredState = { schemaVersion: 2, spatialModel: "structured-v2", simulationVersion: STRUCTURED_SIMULATION_VERSION, tick: 0, settlements: [{ id: settlementId, name: settlementName, bundle, runtime: { navigationRevision: 0, objects: [], reservations: [] }, actors, storeFood: 24 }], ledger: [], events: [] }; validateStructuredState(state); return state;
}

export function advanceStructuredState(input: StructuredState): StructuredState {
  validateStructuredState(input); const state: StructuredState = structuredClone(input); state.tick += 1; state.ledger = []; state.events = []; for (const settlement of state.settlements) { const actors = settlement.actors.slice().sort((a, b) => compare(a.id, b.id)); for (const actor of actors) { actor.committedCells = [{ ...actor.position }]; if (actor.status === "choosing" || actor.status === "idle" || actor.status === "waiting") { if (actor.status === "waiting") actor.waitReason = undefined; if (!actor.destinationObjectId) { const decision = reserve(settlement, actor); if (decision.kind !== "reserved") { actor.status = "waiting"; actor.waitReason = decision.kind; state.events.push({ id: `event-${state.tick}-${actor.id}-wait`, kind: "wait", actorId: actor.id, message: `${actor.id} is waiting: ${decision.kind}.` }); continue; } const { choice } = decision; actor.destinationObjectId = choice.objectId; actor.destinationSlotId = choice.slotId; actor.remainingRoute = choice.route.slice(1); actor.remainingCost = 0; actor.plannedNavigationRevision = settlement.runtime.navigationRevision; actor.status = actor.remainingRoute.length ? "traveling" : "interacting"; } }
      if (actor.status === "traveling") { if (actor.plannedNavigationRevision !== settlement.runtime.navigationRevision) { const target = actor.destinationObjectId && actor.destinationSlotId ? slotCell(settlement.bundle, actor.destinationObjectId, actor.destinationSlotId) : null; const replanned = target ? route(settlement.bundle, settlement.runtime, actor.position, target) : null; if (!replanned) { actor.status = "waiting"; actor.waitReason = "no-route"; continue; } actor.remainingRoute = replanned.slice(1); actor.remainingCost = 0; actor.plannedNavigationRevision = settlement.runtime.navigationRevision; } let budget = 2; while (budget > 0 && actor.remainingRoute.length) { const next = actor.remainingRoute[0]; const edge = canTraverse(settlement.bundle, settlement.runtime, actor.position, next); if (!edge.walkable) { actor.status = "waiting"; actor.waitReason = edge.reason; break; } if (actor.remainingCost <= 0) actor.remainingCost = edge.cost; const debit = Math.min(budget, actor.remainingCost); actor.remainingCost -= debit; budget -= debit; if (actor.remainingCost === 0) { actor.position = { ...next }; actor.remainingRoute.shift(); actor.committedCells.push({ ...actor.position }); } } if (actor.status === "traveling" && actor.remainingRoute.length === 0) actor.status = "interacting"; if (actor.committedCells.length > 1) state.events.push({ id: `event-${state.tick}-${actor.id}-movement`, kind: "movement", actorId: actor.id, cells: actor.committedCells, message: `${actor.id} moved ${actor.committedCells.length - 1} cell(s).` }); }
      if (actor.status === "interacting") { const reservation = settlement.runtime.reservations.find(item => item.actorId === actor.id); const target = reservation?.objectId && reservation.slotId ? slotCell(settlement.bundle, reservation.objectId, reservation.slotId) : null; if (!reservation || !target || key(target) !== key(actor.position)) { release(settlement, actor.id); actor.status = "waiting"; actor.waitReason = "invalid-destination"; continue; } if (actor.intendedActivity === "collect") { const amount = Math.min(2, settlement.storeFood); settlement.storeFood -= amount; actor.food += amount; state.ledger.push({ kind: "collection", actorId: actor.id, amount, reason: "arrived-at-granary" }); state.events.push({ id: `event-${state.tick}-${actor.id}-collection`, kind: "collection", actorId: actor.id, message: `${actor.id} collected ${amount} food.` }); } else if (actor.intendedActivity === "share") { const amount = Math.min(1, actor.food); actor.food -= amount; settlement.storeFood += amount; state.ledger.push({ kind: "share", actorId: actor.id, amount, reason: "arrived-at-granary" }); if (amount) state.events.push({ id: `event-${state.tick}-${actor.id}-share`, kind: "share", actorId: actor.id, message: `${actor.id} shared ${amount} food.` }); } actor.status = "choosing"; release(settlement, actor.id); actor.destinationObjectId = undefined; actor.destinationSlotId = undefined; actor.remainingRoute = []; actor.remainingCost = 0; }
      if (actor.food > 0) { actor.food -= 1; state.ledger.push({ kind: "consumption", actorId: actor.id, amount: 1, reason: "daily-consumption" }); }
    } }
  for (const settlement of state.settlements) { const production = 1; settlement.storeFood += production; state.ledger.push({ kind: "production", amount: production, reason: "global-production" }); }
  validateStructuredState(state); return state;
}
