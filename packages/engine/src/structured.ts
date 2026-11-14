import { initializeFrontier, validateFrontier, contributeFrontier, frontierRestBonus, type FrontierState } from "./first-glow-frontier.js";
import { validateGeometricReturnPublication, type GEOMETRIC_RETURN_PUBLICATION_VERSION } from "./first-glow-geometric-return-publication.js";
import { validateBoundedSharingAdmission, type BOUNDED_SHARING_ADMISSION_VERSION } from "./first-glow-sharing-admission.js";
import { shardRouteCandidates, validateGeometricShardRoutes, type GEOMETRIC_SHARD_ROUTES_VERSION } from "./first-glow-geometric-shard.js";
import { canCommitPostProbe, commitPostProbe, deferPostProbe, finishPostProbeContinuations, validatePostProbeContinuation, type CARE_RECOVERY_FALLBACK_VERSION, type PostProbeContinuationState, type PostProbeDestination } from "./first-glow-post-probe-continuation.js";
import { commitInitialCachePreparation, deferInitialCachePreparation, finishInitialCachePreparation, validateInitialCachePreparation, type InitialCachePreparationState, type InitialPreparedDestination } from "./first-glow-initial-cache-preparation.js";
import { admitRecoveryRequests, validateRecoveryAdmission, type RecoveryAdmissionState } from "./first-glow-recovery-admission.js";
import { SHARING_ROUTE_CONTINUATION_VERSION } from "./first-glow-sharing-continuation.js";
import { forecastPatternArrival, deferPatternPreparation, validatePatternPreparation, type PatternPreparationState, type PreparedDestination } from "./first-glow-pattern-preparation.js";
import { validatePatternGuidedRetry, type PatternGuidedRetryState } from "./first-glow-pattern-retry.js";
import { validateRoutePatterns, recordRoutePatternDecisions, type RoutePatternDecision, type RoutePatternState } from "./first-glow-route-patterns.js";
import { resolveWildCacheChoice, validateWildCacheChoices, WILD_CACHE_CHOICE_VERSION, type WildCacheChoice } from "./first-glow-cache-choice.js";
import { canTraverse, queryCell, validateRuntimeState, validateWorldBundle, type Cell, type DecodedWorldBundle, type FirstGlowActivity, type FirstGlowWorldBundle, type Reservation, type WorldBundle, type WorldRuntimeState } from "@mimir/world-data";
import { createFirstGlowSocialState, recordFirstGlowWitnesses, validateFirstGlowSocialState, type FirstGlowSocialState } from "./first-glow-social.js";
import { appendFirstGlowExplanations, type FirstGlowExplanation } from "./first-glow-explanations.js";
import { appendFirstGlowConversation, createFirstGlowHistory, validateFirstGlowConversations, validateFirstGlowHistory, type FirstGlowHistory } from "./first-glow-history.js";
import { applyFirstGlowConversation, createFirstGlowConversation } from "./first-glow-conversations.js";
import { createFirstGlowReflectionCapacityState, validateFirstGlowReflectionCapacity, type FirstGlowReflectionCapacityState } from "./first-glow-reflection-capacity.js";
import type { FirstGlowIntention } from "./first-glow-intentions.js";
import { validateFirstGlowGoals, waitingForFirstGlowGoalMeeting, type FirstGlowGoals } from "./first-glow-goals.js";

export const STRUCTURED_SIMULATION_VERSION = "mimir-sim-v2" as const;
export type StructuredStatus = "choosing" | "traveling" | "waiting" | "interacting" | "idle";
export type StructuredActivity = "rest" | "collect" | "share" | "craft" | "meet" | "work" | "gather";
export interface StructuredActor { id: string; name: string; position: Cell; status: StructuredStatus; intendedActivity: StructuredActivity; destinationObjectId?: string; destinationSlotId?: string; remainingRoute: Cell[]; remainingCost: number; plannedNavigationRevision: number; committedCells: Cell[]; food: number; hunger: number; waitReason?: string; }
export interface StructuredSettlement { id: string; name: string; bundle: WorldBundle; runtime: WorldRuntimeState; actors: StructuredActor[]; storeFood: number; }
export interface LedgerEntry { kind: "production" | "collection" | "draw" | "share" | "consumption" | "loss" | "idle" | "adjustment"; actorId?: string; recipientId?: string; amount: number; reason: string; }
export interface StructuredEvent { id: string; pulse?: number; kind: "discovery" | "project" | "goal" | "movement" | "arrival" | "collection" | "draw" | "share" | "idle" | "wait" | "explore" | "mark-trace" | "shape-pattern" | "meet" | "wild-cache" | "wild-cache-choice" | "route-pattern" | "post-probe-continuation" | "sharing-admission" | "initial-cache-preparation" | "pattern-preparation" | "sharing-continuation" | "shelter-loom-choice" | "crossing-voices-choice"; actorId: string; message: string; objectId?: string; cells?: Cell[]; participants?: string[]; evidenceEventIds?: string[]; source?: "rules" | "spontaneous"; }
export interface StructuredState { schemaVersion: 2; spatialModel: "structured-v2"; simulationVersion: typeof STRUCTURED_SIMULATION_VERSION; pulse: number; settlements: StructuredSettlement[]; ledger: LedgerEntry[]; events: StructuredEvent[]; }
export const FIRST_GLOW_SIMULATION_VERSION = "mimir-sim-v3-first-glow" as const;
export interface FirstGlowSpark { frontierTargetObjectId?: string; frontierTargetCell?: Cell; frontierTrail?: string[]; postProbeDestination?: PostProbeDestination; initialPreparedDestination?: InitialPreparedDestination; preparedDestination?: PreparedDestination; routePatternTargetObjectId?: string; routePatternUse?: { patternId: string; eventId: string }; wildCacheChoice?: WildCacheChoice; id: string; name: string; spawnedPulse?: number; position: Cell; status: StructuredStatus; intendedActivity: FirstGlowActivity; intention?: FirstGlowIntention; destinationObjectId?: string; destinationSlotId?: string; destinationCell?: Cell; remainingRoute: Cell[]; remainingCost: number; plannedNavigationRevision: number; committedCells: Cell[]; carriedCharge: number; chargeDeficit: number; readiness: number; knownEvidenceEventIds: string[]; waitReason?: string; }
export interface FirstGlowSettlement { id: string; name: string; bundle: FirstGlowWorldBundle; runtime: WorldRuntimeState; sparks: FirstGlowSpark[]; sourceCharge: number; communalCharge: number; }
export const ACTIVITY_COMPLETION_VERSION = "validated-activity-completion-v1" as const;

/** Explicit opt-in only; never upgrade a recorded history. */
export function initializeActivityCompletion(state: FirstGlowState): void {
  if (state.activityCompletionVersion || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(spark => spark.knownEvidenceEventIds.length)) || Object.values(state.history ?? {}).some(value => Array.isArray(value) && value.length)) throw new Error("Activity completion requires a fresh history");
  state.activityCompletionVersion = ACTIVITY_COMPLETION_VERSION;
}

export interface FirstGlowState { frontier?: FrontierState; goalLoops?: FirstGlowGoals; geometricReturnPublicationVersion?: typeof GEOMETRIC_RETURN_PUBLICATION_VERSION; boundedSharingAdmissionVersion?: typeof BOUNDED_SHARING_ADMISSION_VERSION; geometricShardRoutesVersion?: typeof GEOMETRIC_SHARD_ROUTES_VERSION; careRecoveryFallbackVersion?: typeof CARE_RECOVERY_FALLBACK_VERSION; postProbeContinuation?: PostProbeContinuationState; initialCachePreparation?: InitialCachePreparationState; recoveryAdmission?: RecoveryAdmissionState; sharingRouteContinuationVersion?: typeof SHARING_ROUTE_CONTINUATION_VERSION; patternPreparation?: PatternPreparationState; patternGuidedRetry?: PatternGuidedRetryState; activityCompletionVersion?: typeof ACTIVITY_COMPLETION_VERSION; routePatterns?: RoutePatternState; wildCacheChoiceVersion?: typeof WILD_CACHE_CHOICE_VERSION; schemaVersion: 3; spatialModel: "structured-v2"; simulationVersion: typeof FIRST_GLOW_SIMULATION_VERSION; themeId: "living-circuit"; ageId: "first-glow"; pulse: number; settlements: FirstGlowSettlement[]; ledger: LedgerEntry[]; events: StructuredEvent[]; social: FirstGlowSocialState; explanations: FirstGlowExplanation[]; history?: FirstGlowHistory; reflectionCapacity?: FirstGlowReflectionCapacityState; }

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

export function validateFirstGlowState(state: FirstGlowState): void { validateFrontier(state); validateFirstGlowGoals(state); if (state.sharingRouteContinuationVersion !== undefined && state.sharingRouteContinuationVersion !== SHARING_ROUTE_CONTINUATION_VERSION) throw new Error("Unsupported sharing route continuation policy"); if (state.activityCompletionVersion !== undefined && state.activityCompletionVersion !== ACTIVITY_COMPLETION_VERSION) throw new Error("Unsupported activity completion version"); validateGeometricReturnPublication(state); validateBoundedSharingAdmission(state); validateGeometricShardRoutes(state); validateRoutePatterns(state); validateWildCacheChoices(state); validatePatternGuidedRetry(state); validatePatternPreparation(state); validateRecoveryAdmission(state); validateInitialCachePreparation(state); validatePostProbeContinuation(state); if (state.schemaVersion !== 3 || state.spatialModel !== "structured-v2" || state.simulationVersion !== FIRST_GLOW_SIMULATION_VERSION || state.themeId !== "living-circuit" || state.ageId !== "first-glow") throw new Error("unsupported First Glow state version"); if (!state.social) throw new Error("unsupported First Glow social state version; checkpoint predates social state"); const explanations = state.explanations ?? []; if (!Array.isArray(explanations)) throw new Error("unsupported First Glow explanation state version"); const sparkIds = state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id)); const sparkIdSet = new Set(sparkIds); const explanationIds = new Set<string>(); for (const explanation of explanations) { if (!explanation.id || explanationIds.has(explanation.id) || !Number.isInteger(explanation.pulse) || explanation.pulse < 0 || !sparkIdSet.has(explanation.actorSparkId) || !explanation.dilemmaId || !explanation.alternativeId || explanation.evidenceEventIds.length === 0) throw new Error(`invalid First Glow explanation ${explanation.id}`); explanationIds.add(explanation.id); } for (const settlement of state.settlements) { if (!validatedWorldBundles.has(settlement.bundle)) { validateWorldBundle(settlement.bundle); validatedWorldBundles.add(settlement.bundle); } validateRuntimeState(settlement.bundle, settlement.runtime, settlement.sparks.map(spark => spark.id)); const ids = new Set<string>(); for (const spark of settlement.sparks) { if (ids.has(spark.id)) throw new Error(`duplicate Spark ${spark.id}`); ids.add(spark.id); if (spark.spawnedPulse !== undefined && (!Number.isInteger(spark.spawnedPulse) || spark.spawnedPulse < 0)) throw new Error(`invalid Spark spawn pulse ${spark.id}`); if (!Number.isInteger(spark.position.x) || !Number.isInteger(spark.position.y)) throw new Error(`invalid Spark position ${spark.id}`); if (!Number.isInteger(spark.carriedCharge) || spark.carriedCharge < 0 || !Number.isInteger(spark.chargeDeficit) || spark.chargeDeficit < 0 || !Number.isInteger(spark.readiness) || spark.readiness < 0 || spark.readiness > 100) throw new Error(`invalid First Glow resources for ${spark.id}`); } } validateFirstGlowSocialState(state.social, sparkIds); if (state.history) { validateFirstGlowHistory(state.history, sparkIds); validateFirstGlowConversations(state.history, sparkIds); } if (state.reflectionCapacity) validateFirstGlowReflectionCapacity(state.reflectionCapacity, sparkIds); }

export function createFirstGlowState(bundle: FirstGlowWorldBundle, settlementId = "first-glow-region", settlementName = "Opening region", sparkCount = 1): FirstGlowState { validateWorldBundle(bundle); const spawns = bundle.spawns.filter(spawn => spawn.settlementId === settlementId); if (!spawns.length) throw new Error(`no First Glow spawn for settlement ${settlementId}`); const sparks = Array.from({ length: sparkCount }, (_, index): FirstGlowSpark => { const spawn = spawns[index % spawns.length]; return { id: `spark-${index + 1}`, name: `Spark ${index + 1}`, spawnedPulse: 0, position: { ...spawn.cell }, status: "choosing", intendedActivity: "seek-charge", remainingRoute: [], remainingCost: 0, plannedNavigationRevision: 0, committedCells: [{ ...spawn.cell }], carriedCharge: 0, chargeDeficit: 0, readiness: 100, knownEvidenceEventIds: [] }; }); const state: FirstGlowState = { schemaVersion: 3, spatialModel: "structured-v2", simulationVersion: FIRST_GLOW_SIMULATION_VERSION, themeId: "living-circuit", ageId: "first-glow", pulse: 0, settlements: [{ id: settlementId, name: settlementName, bundle, runtime: { navigationRevision: 0, objects: [], reservations: [] }, sparks, sourceCharge: 24, communalCharge: 0 }], ledger: [], events: [], social: createFirstGlowSocialState(sparks.map(spark => spark.id)), explanations: [], history: createFirstGlowHistory(), reflectionCapacity: createFirstGlowReflectionCapacityState(sparks.map(spark => spark.id)) }; initializeFrontier(state); validateFirstGlowState(state); return state; }

const firstGlowCapability = (activity: FirstGlowActivity) => activity === "seek-charge" || activity === "draw-charge" ? "charge-pool" : activity === "seek-shelter" || activity === "idle" ? "shelter-niche" : activity === "explore" ? "trace" : activity === "shape-pattern" ? "pattern-shard" : activity === "scavenge-cache" ? "wild-cache" : activity === "mark-trace" || activity === "meet" ? "light-mark" : null;
function firstGlowSlotCell(bundle: FirstGlowWorldBundle, objectId: string, slotId: string): Cell | null { const object = bundle.objects.find(candidate => candidate.id === objectId); if (!object) return null; const slot = bundle.objectDefinitions[object.definitionId].slots.find(candidate => candidate.id === slotId); return slot ? { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y } : null; }
export function firstGlowExploreCandidate(settlement: FirstGlowSettlement, spark: FirstGlowSpark): { target: Cell; path: Cell[]; cost: number } | null {
  if (spark.frontierTargetCell) {
    const target=spark.frontierTargetCell,path=route(settlement.bundle,settlement.runtime,spark.position,target);
    return path ? { target, path, cost:path.slice(1).reduce((n,c,i)=>{const e=canTraverse(settlement.bundle,settlement.runtime,path[i],c);return n+(e.walkable?e.cost:0);},0) } : null;
  }
  if (spark.frontierTargetObjectId) {
    const object = settlement.bundle.objects.find(o=>o.id===spark.frontierTargetObjectId);
    if (!object) return null;
    const activity = settlement.bundle.objectDefinitions[object.definitionId].capabilities.includes("light-mark") ? "mark-trace" : "shape-pattern";
    return firstGlowCandidates(settlement, { ...spark, intendedActivity: activity })[0] ?? null;
  }
  if (settlement.bundle.frontier) {
    const cells=settlement.bundle.surfaces.find(s=>s.id==="trace-main")!.cells.filter(c=>Math.abs(c.x-spark.position.x)+Math.abs(c.y-spark.position.y)<=5&&!spark.frontierTrail?.includes(`${c.x},${c.y}`));
    cells.sort((a,b)=>Math.abs(a.x-spark.position.x)+Math.abs(a.y-spark.position.y)-Math.abs(b.x-spark.position.x)-Math.abs(b.y-spark.position.y)||a.y-b.y||a.x-b.x);
    for(const target of cells){ const path=route(settlement.bundle,settlement.runtime,spark.position,target); if(path)return{target,path,cost:path.slice(1).reduce((n,c,i)=>{const edge=canTraverse(settlement.bundle,settlement.runtime,path[i],c);return n+(edge.walkable?edge.cost:0);},0)}; }
    return null;
  }
  const candidates = settlement.bundle.surfaces.flatMap((surface) => surface.id === "trace-main" ? surface.cells.map((target) => ({ target, path: route(settlement.bundle, settlement.runtime, spark.position, target) })) : []).filter((candidate): candidate is { target: Cell; path: Cell[] } => Boolean(candidate.path));
  return candidates.sort((a, b) => a.path.length - b.path.length || a.target.y - b.target.y || a.target.x - b.target.x).map((candidate) => ({ ...candidate, cost: candidate.path.slice(1).reduce((total, cell, index) => { const edge = canTraverse(settlement.bundle, settlement.runtime, candidate.path[index], cell); return total + (edge.walkable ? edge.cost : 0); }, 0) }))[0] ?? null;
}
function firstGlowCandidates(settlement: FirstGlowSettlement, spark: FirstGlowSpark, targetObjectId?: string) { const capability = firstGlowCapability(spark.intendedActivity); if (!capability) return []; const reserved = new Set(settlement.runtime.reservations.filter(item => item.actorId !== spark.id).map(item => `${item.objectId}:${item.slotId}`)); return settlement.bundle.objects.flatMap(object => { if (spark.frontierTargetObjectId && !["seek-charge","draw-charge","seek-shelter","idle"].includes(spark.intendedActivity) && object.id !== spark.frontierTargetObjectId) return []; if (targetObjectId && object.id !== targetObjectId) return []; if (spark.intendedActivity === "scavenge-cache" && spark.routePatternTargetObjectId && object.id !== spark.routePatternTargetObjectId) return []; const definition = settlement.bundle.objectDefinitions[object.definitionId]; if (!definition.capabilities.includes(capability)) return []; return definition.slots.flatMap(slot => { if (reserved.has(`${object.id}:${slot.id}`)) return []; const target = firstGlowSlotCell(settlement.bundle, object.id, slot.id); if (!target) return []; const path = route(settlement.bundle, settlement.runtime, spark.position, target); if (!path) return []; let cost = 0; for (let index = 1; index < path.length; index += 1) { const edge = canTraverse(settlement.bundle, settlement.runtime, path[index - 1], path[index]); if (!edge.walkable) return []; cost += edge.cost; } return [{ objectId: object.id, slotId: slot.id, target, path, cost }]; }); }).sort((a, b) => a.cost - b.cost || compare(a.objectId, b.objectId) || compare(a.slotId, b.slotId)); }
export type FirstGlowRouteCandidate = ReturnType<typeof firstGlowCandidates>[number];
export function firstGlowRouteCandidates(settlement: FirstGlowSettlement, spark: FirstGlowSpark, activity: FirstGlowActivity, targetObjectId?: string): FirstGlowRouteCandidate[] { return firstGlowCandidates(settlement, { ...spark, intendedActivity: activity, routePatternTargetObjectId: targetObjectId }, targetObjectId); }
export function canFirstGlowReach(settlement: FirstGlowSettlement, spark: FirstGlowSpark, activity: FirstGlowActivity): boolean {
  if (activity === "explore") return Boolean(firstGlowExploreCandidate(settlement, spark));
  return firstGlowCandidates(settlement, { ...spark, intendedActivity: activity }).length > 0;
}

export function canReachRoutePatternTarget(settlement: FirstGlowSettlement, spark: FirstGlowSpark, objectId: string): boolean {
  return firstGlowCandidates(settlement, { ...spark, intendedActivity: "scavenge-cache", routePatternTargetObjectId: objectId }).length > 0;
}

function releaseFirstGlow(settlement: FirstGlowSettlement, sparkId: string) { settlement.runtime.reservations = settlement.runtime.reservations.filter(item => item.actorId !== sparkId); }

export function clearFirstGlowPlan(settlement: FirstGlowSettlement, spark: FirstGlowSpark, waitReason: string): void {
  releaseFirstGlow(settlement, spark.id);
  spark.destinationObjectId = undefined;
  spark.destinationSlotId = undefined;
  spark.destinationCell = undefined;
  spark.remainingRoute = [];
  spark.remainingCost = 0;
  spark.status = "waiting";
  spark.waitReason = waitReason;
}

/** A sharing pause is not a route cancellation or an arrival. */
export function restoreFirstGlowSharingPlan(settlement: FirstGlowSettlement, spark: FirstGlowSpark, activity: FirstGlowActivity): "traveling" | "interacting" | "invalid" | "none" {
  spark.intendedActivity = activity;
  const invalidate = () => { clearFirstGlowPlan(settlement, spark, "invalid-destination"); delete spark.preparedDestination; return "invalid" as const; };
  const owned = settlement.runtime.reservations.filter(r => r.actorId === spark.id);
  if (!spark.destinationObjectId && !spark.destinationCell) {
    if (owned.length || spark.destinationSlotId || spark.remainingRoute.length || spark.remainingCost) return invalidate();
    spark.status = "choosing"; return "none";
  }
  let target: Cell | null = null;
  if (spark.destinationCell) {
    if (spark.destinationObjectId || owned.length || activity !== "explore") return invalidate();
    target = spark.destinationCell;
  } else {
    const object = settlement.bundle.objects.find(o => o.id === spark.destinationObjectId), definition = object && settlement.bundle.objectDefinitions[object.definitionId];
    const reservation = owned.find(r => r.objectId === spark.destinationObjectId && r.slotId === spark.destinationSlotId);
    const capability = firstGlowCapability(activity);
    if (owned.length !== 1 || !object || !definition || !reservation || !capability || !definition.capabilities.includes(capability)) return invalidate();
    target = firstGlowSlotCell(settlement.bundle, object.id, reservation.slotId);
  }
  if (!target || !queryCell(settlement.bundle, settlement.runtime, target).walkable || !queryCell(settlement.bundle, settlement.runtime, spark.position).walkable) return invalidate();
  if (spark.plannedNavigationRevision !== settlement.runtime.navigationRevision) {
    const replanned = route(settlement.bundle, settlement.runtime, spark.position, target);
    if (!replanned) return invalidate();
    spark.remainingRoute = replanned.slice(1); spark.remainingCost = 0; spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
  } else {
    const cells = [spark.position, ...spark.remainingRoute];
    if (key(cells.at(-1)!) !== key(target)) return invalidate();
    for (let i = 1; i < cells.length; i++) if (!canTraverse(settlement.bundle, settlement.runtime, cells[i-1], cells[i]).walkable) return invalidate();
    if (spark.remainingCost < 0 || !Number.isInteger(spark.remainingCost) || !spark.remainingRoute.length && spark.remainingCost !== 0) return invalidate();
    if (spark.remainingRoute.length) { const edge = canTraverse(settlement.bundle, settlement.runtime, spark.position, spark.remainingRoute[0]); if (!edge.walkable || spark.remainingCost > edge.cost) return invalidate(); }
  }
  spark.status = spark.remainingRoute.length ? "traveling" : "interacting";
  spark.waitReason = undefined;
  return spark.status;
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

export function advanceFirstGlowState(input: FirstGlowState, validate = true, routeDecisions: RoutePatternDecision[] = []): FirstGlowState {
  if (validate) validateFirstGlowState(input);
  // The decoded bundle is immutable authored data. Copying it for every pulse is both
  // unnecessary and prohibitive for long deterministic replay runs.
  const state: FirstGlowState = {
    ...input,
    ...(input.frontier ? { frontier: structuredClone(input.frontier) } : {}),
    ...(input.goalLoops ? { goalLoops: structuredClone(input.goalLoops) } : {}),
    ...(input.postProbeContinuation ? { postProbeContinuation: structuredClone(input.postProbeContinuation) } : {}),
    ...(input.initialCachePreparation ? { initialCachePreparation: structuredClone(input.initialCachePreparation) } : {}),
    ...(input.recoveryAdmission ? { recoveryAdmission: structuredClone(input.recoveryAdmission) } : {}),
    ...(input.patternPreparation ? { patternPreparation: structuredClone(input.patternPreparation) } : {}),
    ...(input.patternGuidedRetry ? { patternGuidedRetry: structuredClone(input.patternGuidedRetry) } : {}),
    ...(input.routePatterns ? { routePatterns: structuredClone(input.routePatterns) } : {}),
    settlements: input.settlements.map(({ bundle, ...settlement }) => ({ ...structuredClone(settlement), bundle })),
    ledger: structuredClone(input.ledger),
    events: structuredClone(input.events),
    social: structuredClone(input.social),
    explanations: structuredClone(input.explanations),
    history: structuredClone(input.history ?? createFirstGlowHistory()),
    reflectionCapacity: structuredClone(input.reflectionCapacity)
  };
  if (state.history) { const sparkIds = state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id)); validateFirstGlowHistory(state.history, sparkIds); validateFirstGlowConversations(state.history, sparkIds); }
  state.pulse += 1;
  state.ledger = [];
  state.events = [];
  if (state.patternGuidedRetry) recordRoutePatternDecisions(state, state.patternPreparation ? routeDecisions.filter(d => !d.use) : routeDecisions);
  const recoveryBlocked = admitRecoveryRequests(state);
  for (const settlement of state.settlements) {
    const completedArrival = new Set<string>();
    for (const spark of settlement.sparks.slice().sort((a, b) => compare(a.id, b.id))) {
      spark.committedCells = [{ ...spark.position }];
      if (state.goalLoops && completedArrival.has(spark.id)) continue;
      if (recoveryBlocked.has(spark.id)) { state.events.push({ id: `event-${state.pulse}-${spark.id}-wait`, kind: "wait", actorId: spark.id, message: `${spark.name} is waiting for recovery contact admission.` }); continue; }
      const continuation = state.postProbeContinuation?.goals.find(g => g.sparkId === spark.id);
      if (continuation?.phase === "committed" && !continuation.outcome && continuation.navigationRevision !== settlement.runtime.navigationRevision) {
        continuation.outcome = "invalidated"; continuation.reason = "survey navigation changed during travel";
        clearFirstGlowPlan(settlement, spark, "post-probe-invalidated"); continue;
      }
      if (continuation?.phase === "deferred" && !continuation.outcome && spark.intendedActivity === "idle" && !spark.destinationObjectId && !spark.destinationCell) {
        spark.status = "waiting"; spark.waitReason = "post-probe-deferred"; delete spark.postProbeDestination; continue;
      }
      const initialPreparation = state.initialCachePreparation?.goals.find(g => g.sparkId === spark.id);
      if (initialPreparation && ["deferred", "committed"].includes(initialPreparation.phase) && spark.intendedActivity === "idle" && !spark.destinationObjectId && !spark.destinationCell) {
        spark.status = "waiting"; spark.waitReason = "initial-cache-preparation-deferred"; delete spark.initialPreparedDestination; continue;
      }
      const preparation = state.patternPreparation?.goals.find(g => g.sparkId === spark.id);
      if (preparation?.phase === "deferred" && spark.intendedActivity === "idle" && !spark.destinationObjectId && !spark.destinationCell) {
        spark.status = "waiting"; spark.waitReason = "pattern-preparation-deferred";
        delete spark.preparedDestination;
        continue;
      }
      if ((spark.status === "choosing" || spark.status === "waiting" || spark.status === "idle") && !spark.destinationObjectId && !spark.destinationCell) {
        const explore = spark.intendedActivity === "explore" ? firstGlowExploreCandidate(settlement, spark) : null;
        let choices = explore ? [] : firstGlowCandidates(settlement, spark);
        const prepared = spark.preparedDestination;
        if (state.patternPreparation && prepared) choices = prepared.navigationRevision === settlement.runtime.navigationRevision && prepared.activity === spark.intendedActivity ? choices.filter(c => c.objectId === prepared.objectId && c.slotId === prepared.slotId) : [];
        const initialPin = spark.initialPreparedDestination;
        if (initialPin) choices = initialPin.navigationRevision === settlement.runtime.navigationRevision && initialPin.activity === spark.intendedActivity ? choices.filter(c => c.objectId === initialPin.objectId && c.slotId === initialPin.slotId) : [];
        const postPin = spark.postProbeDestination;
        if (postPin) choices = postPin.navigationRevision === settlement.runtime.navigationRevision && postPin.activity === spark.intendedActivity ? choices.filter(c => c.objectId === postPin.objectId && c.slotId === postPin.slotId) : [];
        delete spark.postProbeDestination;
        delete spark.initialPreparedDestination;
        delete spark.preparedDestination;
        if (explore) {
          spark.destinationCell = explore.target;
          spark.remainingRoute = explore.path.slice(1);
          spark.remainingCost = 0;
          spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
          spark.status = spark.remainingRoute.length ? "traveling" : "interacting";
        } else if (!choices.length) {
          if (state.geometricShardRoutesVersion && continuation && !continuation.outcome && continuation.phase === "ready" && spark.intendedActivity === "shape-pattern" && postPin && shardRouteCandidates(state, settlement, spark, continuation.shardObjectId).length) {
            continuation.reason = "funded surveyed shard is busy; waiting for actual contact admission";
            spark.status = "waiting"; spark.waitReason = "shard-contact-wait";
            state.events.push({ id: `event-${state.pulse}-${spark.id}-wait`, kind: "wait", actorId: spark.id, message: `${spark.name} is waiting for surveyed shard contact admission; the funded objective remains pending.` });
            continue;
          }
          if (continuation) deferPostProbe(state, spark, "selected continuation contact is no longer available");
          if (initialPreparation) deferInitialCachePreparation(state, spark, "selected preparation or cache contact is no longer available");
          if (preparation) deferPatternPreparation(state, spark, "selected preparation or cache contact is no longer available");
          clearFirstGlowPlan(settlement, spark, firstGlowReservationReason(settlement, spark));
          state.events.push({ id: `event-${state.pulse}-${spark.id}-wait`, kind: "wait", actorId: spark.id, message: `${spark.name} is waiting: no reachable ${spark.intendedActivity} site.` });
          continue;
        } else {
          const choice = choices[0];
          const use = state.patternPreparation && routeDecisions.find(d => d.sparkId === spark.id && d.use);
          if (use && (!prepared || !forecastPatternArrival(settlement, spark, choice, state).eligible)) {
            deferPatternPreparation(state, spark, "arrival budget changed before commitment");
            clearFirstGlowPlan(settlement, spark, "pattern-preparation-deferred");
            continue;
          }
          const initialDeparture = state.initialCachePreparation && !spark.wildCacheChoice && spark.intendedActivity === "scavenge-cache" && !use;
          if (initialDeparture && (!initialPreparation || initialPreparation.phase !== "ready" || initialPreparation.navigationRevision !== settlement.runtime.navigationRevision || !initialPin || !forecastPatternArrival(settlement, spark, choice, state).eligible)) {
            deferInitialCachePreparation(state, spark, "initial arrival budget or contact changed before commitment");
            clearFirstGlowPlan(settlement, spark, "initial-cache-preparation-deferred"); continue;
          }
          const postDeparture = state.postProbeContinuation && spark.wildCacheChoice?.alternative === "probe" && spark.intendedActivity === "shape-pattern";
          if (postDeparture && (!postPin || !canCommitPostProbe(state, settlement, spark, choice))) {
            deferPostProbe(state, spark, "shard budget, care preference or contact changed before commitment");
            clearFirstGlowPlan(settlement, spark, "post-probe-deferred"); continue;
          }
          settlement.runtime.reservations.push({ actorId: spark.id, objectId: choice.objectId, slotId: choice.slotId });
          spark.destinationObjectId = choice.objectId;
          spark.destinationSlotId = choice.slotId;
          spark.remainingRoute = choice.path.slice(1);
          spark.remainingCost = 0;
          spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
          spark.status = spark.remainingRoute.length ? "traveling" : "interacting";
          if (initialDeparture) commitInitialCachePreparation(state, spark);
          if (postDeparture) commitPostProbe(state, spark);
          if (use) {
            recordRoutePatternDecisions(state, [use]);
            preparation!.phase = "committed"; preparation!.reason = "funded pattern-guided departure committed";
            preparation!.useEventId = spark.routePatternUse!.eventId;
          }
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
        if (spark.committedCells.length > 1) state.events.push({ id: `event-${state.pulse}-${spark.id}-movement`, kind: "movement", actorId: spark.id, cells: spark.committedCells, message: `${spark.name} moved ${spark.committedCells.length - 1} cell(s).` });
      }
      if (spark.status !== "interacting" || completedArrival.has(spark.id)) continue;
      const arrival = validateFirstGlowArrival(settlement, spark);
      if (!arrival) { clearFirstGlowPlan(settlement, spark, "invalid-destination"); continue; }
      if (state.postProbeContinuation && spark.intendedActivity === "shape-pattern" && spark.wildCacheChoice?.alternative === "probe") {
        const goal = state.postProbeContinuation.goals.find(g => g.sparkId === spark.id);
        if (!goal || goal.outcome || goal.phase !== "committed" || goal.shardObjectId !== arrival.objectId || spark.carriedCharge < 1 || spark.chargeDeficit > 0 || spark.readiness < 2) {
          if (goal && !goal.outcome) { goal.outcome = "interrupted"; goal.reason = "actual shard arrival no longer funds completion"; }
          clearFirstGlowPlan(settlement, spark, "post-probe-interrupted"); continue;
        }
      }
      completedArrival.add(spark.id);
      const reservation = settlement.runtime.reservations.find(item => item.actorId === spark.id);
      if (spark.intendedActivity === "seek-charge" || spark.intendedActivity === "draw-charge") {
        const amount = Math.min(8, settlement.sourceCharge);
        settlement.sourceCharge -= amount;
        spark.carriedCharge += amount;
        state.ledger.push({ kind: "draw", actorId: spark.id, amount, reason: amount ? "arrived-at-charge-pool" : "empty-charge-pool" });
        state.events.push({ id: `event-${state.pulse}-${spark.id}-draw`, kind: "draw", actorId: spark.id, message: `${spark.name} drew ${amount} charge.` });
        if (amount === 0) { clearFirstGlowPlan(settlement, spark, "empty-source"); continue; }
      } else if (spark.intendedActivity === "idle" || spark.intendedActivity === "seek-shelter") {
        const recovered = Math.min(10 + frontierRestBonus(state, settlement, arrival.objectId ?? ""), 100 - spark.readiness);
        spark.readiness += recovered;
        state.ledger.push({ kind: "idle", actorId: spark.id, amount: recovered, reason: "arrived-at-shelter-niche" });
        state.events.push({ id: `event-${state.pulse}-${spark.id}-idle`, kind: "idle", actorId: spark.id, message: `${spark.name} idled and recovered ${recovered} readiness.` });
      } else if (spark.intendedActivity === "scavenge-cache" && state.wildCacheChoiceVersion) {
        const target = shardRouteCandidates(state, settlement, spark)[0];
        const recovery = spark.carriedCharge === 0 || spark.chargeDeficit > 0 ? "seek-charge" : "seek-shelter";
        const next = (recovery !== "seek-charge" || settlement.sourceCharge > 0) && canFirstGlowReach(settlement, spark, recovery) ? recovery : canFirstGlowReach(settlement, spark, "seek-shelter") ? "seek-shelter" : "idle";
        resolveWildCacheChoice(state, spark, target ? { objectId: target.objectId, cost: target.cost, navigationRevision: settlement.runtime.navigationRevision, ...(state.routePatterns || state.initialCachePreparation || state.postProbeContinuation ? { originObjectId: arrival.objectId } : {}) } : undefined, next);
        if (state.routePatterns || state.initialCachePreparation || state.postProbeContinuation) spark.wildCacheChoice!.cacheObjectId = arrival.objectId;
      } else if (spark.intendedActivity === "scavenge-cache") {
        const chargeCost = Math.min(1, spark.carriedCharge);
        spark.carriedCharge -= chargeCost;
        if (chargeCost === 0) spark.chargeDeficit += 1;
        spark.readiness = Math.max(0, spark.readiness - 2);
        state.ledger.push({ kind: chargeCost ? "consumption" : "adjustment", actorId: spark.id, amount: chargeCost || 1, reason: chargeCost ? "wild-cache-probe" : "wild-cache-charge-deficit" });
        state.events.push({ id: `event-${state.pulse}-${spark.id}-wild-cache`, kind: "wild-cache", actorId: spark.id, message: `${spark.name} probed the Wild Cache: an uncertain signal, with a less familiar return route.` });
      } else if (spark.intendedActivity === "meet") {
        const goalMeeting = state.goalLoops?.goals.some(g => g.sparkId === spark.id && g.status === "active");
        if (goalMeeting && !waitingForFirstGlowGoalMeeting(state, spark)) { clearFirstGlowPlan(settlement, spark, "goal-meeting-needs-recovery"); continue; }
        const companion = settlement.sparks.find(candidate => candidate.id > spark.id && candidate.status === "interacting" && candidate.destinationObjectId === reservation?.objectId && candidate.position.x === spark.position.x && candidate.position.y === spark.position.y && validateFirstGlowArrival(settlement, candidate)?.objectId === arrival.objectId && (!goalMeeting || candidate.intendedActivity === "meet" && waitingForFirstGlowGoalMeeting(state, candidate)));
        if (!companion) {
          if (waitingForFirstGlowGoalMeeting(state, spark)) {
            state.events.push({ id: `event-${state.pulse}-${spark.id}-wait`, kind: "wait", actorId: spark.id, message: `${spark.name} waited at a real contact for a companion; no meeting occurred.` });
            continue;
          }
          clearFirstGlowPlan(settlement, spark, "no-co-present-spark"); continue;
        }
        const eventId = `event-${state.pulse}-${spark.id}-meet-${companion.id}`;
        const event = { id: eventId, kind: "meet" as const, ...(state.frontier ? { objectId: arrival.objectId } : {}), actorId: spark.id, participants: [spark.id, companion.id], evidenceEventIds: [eventId], source: "rules" as const, message: `${spark.name} met ${companion.name} at a shared contact site.` };
        state.events.push(event);
        spark.knownEvidenceEventIds.push(eventId);
        companion.knownEvidenceEventIds.push(eventId);
        clearFirstGlowPlan(settlement, companion, "met");
        if (state.goalLoops) completedArrival.add(companion.id);
      }
      if (state.activityCompletionVersion && (spark.intendedActivity === "explore" || spark.intendedActivity === "mark-trace" || spark.intendedActivity === "shape-pattern")) {
        const activity = spark.intendedActivity;
        const id = `event-${state.pulse}-${spark.id}-${activity}`;
        state.events.push({ id, kind: activity, actorId: spark.id, ...(state.frontier ? { objectId: arrival.objectId ?? spark.frontierTargetObjectId, ...(activity === "explore" ? { cells: [{ ...spark.position }] } : {}) } : {}), message: `${spark.name} completed ${activity.replaceAll("-", " ")}.` });
        spark.knownEvidenceEventIds.push(id);
        if (state.frontier && activity === "shape-pattern" && arrival.objectId) contributeFrontier(state, settlement, spark, arrival.objectId, id);
        state.ledger.push({ kind: "adjustment", actorId: spark.id, amount: 0, reason: `${activity}-arrived` });
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
  if (state.patternPreparation) for (const decision of routeDecisions.filter(d => d.use)) {
    const pattern = state.routePatterns!.patterns.find(p => p.id === decision.patternId)!;
    if (!pattern.encounters.find(e => e.sparkId === decision.sparkId)?.use) {
      const spark = state.settlements.flatMap(s => s.sparks).find(s => s.id === decision.sparkId)!;
      deferPatternPreparation(state, spark, "planned departure was not committed");
      recordRoutePatternDecisions(state, [{ ...decision, use: false, reason: "preparation or contact changed before commitment" }]);
    }
  }
  finishInitialCachePreparation(state);
  finishPostProbeContinuations(state);
  for (const event of state.events) recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants ?? [], state.pulse);
  const sparkIds = state.settlements.flatMap(settlement => settlement.sparks.map(spark => spark.id));
  for (const event of state.events) {
    const conversation = createFirstGlowConversation(state, { ...event, pulse: state.pulse });
    if (!conversation || state.history?.conversations?.some(item => item.id === conversation.id)) continue;
    state.social = applyFirstGlowConversation(state.social, conversation);
    appendFirstGlowConversation(state.history!, conversation, sparkIds);
  }
  appendFirstGlowExplanations(state, state.events);
  validateFirstGlowState(state);
  return state;
}

export function createStructuredState(bundle: WorldBundle, settlementId = "first-village", settlementName = "Hearthmere", actorCount = 12): StructuredState {
  validateWorldBundle(bundle); const spawns = bundle.spawns.filter(spawn => spawn.settlementId === settlementId); if (!spawns.length) throw new Error(`no spawn for settlement ${settlementId}`); const actors = Array.from({ length: actorCount }, (_, index) => { const spawn = spawns[index % spawns.length]; return { id: `villager-${index + 1}`, name: `Villager ${index + 1}`, position: { ...spawn.cell }, status: "choosing" as const, intendedActivity: index % 3 === 0 ? "collect" as const : "rest" as const, remainingRoute: [], remainingCost: 0, plannedNavigationRevision: 0, committedCells: [{ ...spawn.cell }], food: 0, hunger: 0 }; }); const state: StructuredState = { schemaVersion: 2, spatialModel: "structured-v2", simulationVersion: STRUCTURED_SIMULATION_VERSION, pulse: 0, settlements: [{ id: settlementId, name: settlementName, bundle, runtime: { navigationRevision: 0, objects: [], reservations: [] }, actors, storeFood: 24 }], ledger: [], events: [] }; validateStructuredState(state); return state;
}

export function advanceStructuredState(input: StructuredState): StructuredState {
  validateStructuredState(input); const state: StructuredState = structuredClone(input); state.pulse += 1; state.ledger = []; state.events = []; for (const settlement of state.settlements) { const actors = settlement.actors.slice().sort((a, b) => compare(a.id, b.id)); for (const actor of actors) { actor.committedCells = [{ ...actor.position }]; if (actor.status === "choosing" || actor.status === "idle" || actor.status === "waiting") { if (actor.status === "waiting") actor.waitReason = undefined; if (!actor.destinationObjectId) { const decision = reserve(settlement, actor); if (decision.kind !== "reserved") { actor.status = "waiting"; actor.waitReason = decision.kind; state.events.push({ id: `event-${state.pulse}-${actor.id}-wait`, kind: "wait", actorId: actor.id, message: `${actor.id} is waiting: ${decision.kind}.` }); continue; } const { choice } = decision; actor.destinationObjectId = choice.objectId; actor.destinationSlotId = choice.slotId; actor.remainingRoute = choice.route.slice(1); actor.remainingCost = 0; actor.plannedNavigationRevision = settlement.runtime.navigationRevision; actor.status = actor.remainingRoute.length ? "traveling" : "interacting"; } }
      if (actor.status === "traveling") { if (actor.plannedNavigationRevision !== settlement.runtime.navigationRevision) { const target = actor.destinationObjectId && actor.destinationSlotId ? slotCell(settlement.bundle, actor.destinationObjectId, actor.destinationSlotId) : null; const replanned = target ? route(settlement.bundle, settlement.runtime, actor.position, target) : null; if (!replanned) { actor.status = "waiting"; actor.waitReason = "no-route"; continue; } actor.remainingRoute = replanned.slice(1); actor.remainingCost = 0; actor.plannedNavigationRevision = settlement.runtime.navigationRevision; } let budget = 2; while (budget > 0 && actor.remainingRoute.length) { const next = actor.remainingRoute[0]; const edge = canTraverse(settlement.bundle, settlement.runtime, actor.position, next); if (!edge.walkable) { actor.status = "waiting"; actor.waitReason = edge.reason; break; } if (actor.remainingCost <= 0) actor.remainingCost = edge.cost; const debit = Math.min(budget, actor.remainingCost); actor.remainingCost -= debit; budget -= debit; if (actor.remainingCost === 0) { actor.position = { ...next }; actor.remainingRoute.shift(); actor.committedCells.push({ ...actor.position }); } } if (actor.status === "traveling" && actor.remainingRoute.length === 0) actor.status = "interacting"; if (actor.committedCells.length > 1) state.events.push({ id: `event-${state.pulse}-${actor.id}-movement`, kind: "movement", actorId: actor.id, cells: actor.committedCells, message: `${actor.id} moved ${actor.committedCells.length - 1} cell(s).` }); }
      if (actor.status === "interacting") { const reservation = settlement.runtime.reservations.find(item => item.actorId === actor.id); const target = reservation?.objectId && reservation.slotId ? slotCell(settlement.bundle, reservation.objectId, reservation.slotId) : null; if (!reservation || !target || key(target) !== key(actor.position)) { release(settlement, actor.id); actor.status = "waiting"; actor.waitReason = "invalid-destination"; continue; } if (actor.intendedActivity === "collect") { const amount = Math.min(2, settlement.storeFood); settlement.storeFood -= amount; actor.food += amount; state.ledger.push({ kind: "collection", actorId: actor.id, amount, reason: "arrived-at-granary" }); state.events.push({ id: `event-${state.pulse}-${actor.id}-collection`, kind: "collection", actorId: actor.id, message: `${actor.id} collected ${amount} food.` }); } else if (actor.intendedActivity === "share") { const amount = Math.min(1, actor.food); actor.food -= amount; settlement.storeFood += amount; state.ledger.push({ kind: "share", actorId: actor.id, amount, reason: "arrived-at-granary" }); if (amount) state.events.push({ id: `event-${state.pulse}-${actor.id}-share`, kind: "share", actorId: actor.id, message: `${actor.id} shared ${amount} food.` }); } actor.status = "choosing"; release(settlement, actor.id); actor.destinationObjectId = undefined; actor.destinationSlotId = undefined; actor.remainingRoute = []; actor.remainingCost = 0; }
      if (actor.food > 0) { actor.food -= 1; state.ledger.push({ kind: "consumption", actorId: actor.id, amount: 1, reason: "daily-consumption" }); }
    } }
  for (const settlement of state.settlements) { const production = 1; settlement.storeFood += production; state.ledger.push({ kind: "production", amount: production, reason: "global-production" }); }
  validateStructuredState(state); return state;
}
