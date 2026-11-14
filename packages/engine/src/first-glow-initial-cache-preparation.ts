import type { PreparationBudget } from "./first-glow-pattern-preparation.js";
import { initializeRecoveryAdmission } from "./first-glow-recovery-admission.js";
import { initializeWildCacheChoice } from "./first-glow-cache-choice.js";
import { forecastPatternArrival, selectCachePreparation, type PatternPreparationGoal } from "./first-glow-pattern-preparation.js";
import { firstGlowRouteCandidates, initializeActivityCompletion, type FirstGlowSettlement, type FirstGlowSpark, type FirstGlowState } from "./structured.js";

export const INITIAL_CACHE_PREPARATION_VERSION = "initial-cache-preparation-v1" as const;
export interface InitialCachePreparationGoal extends Pick<PatternPreparationGoal, "phase" | "reason" | "actions" | "actionEventIds" | "signature" | "lastRecord"> {
  sparkId: string; settlementId: string; targetObjectId: string; explorationEventId: string; createdPulse: number; navigationRevision: number;
  committedPulse?: number; departureEventId?: string; outcome?: "probe" | "conserve" | "interrupted"; outcomeEventId?: string;
}
export interface InitialCachePreparationState { version: typeof INITIAL_CACHE_PREPARATION_VERSION; goals: InitialCachePreparationGoal[]; }
export interface InitialPreparedDestination { activity: "seek-charge" | "seek-shelter" | "scavenge-cache"; objectId: string; slotId: string; navigationRevision: number; }

/** Explicit fresh opt-in. No recorded history acquires a goal or a new initial attempt. */
export function initializeInitialCachePreparation(state: FirstGlowState): void {
  if (state.initialCachePreparation || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice || a.initialPreparedDestination)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Initial cache preparation requires a fresh history");
  if (!state.wildCacheChoiceVersion) initializeWildCacheChoice(state);
  if (!state.activityCompletionVersion) initializeActivityCompletion(state);
  if (!state.recoveryAdmission) initializeRecoveryAdmission(state);
  state.initialCachePreparation = { version: INITIAL_CACHE_PREPARATION_VERSION, goals: [] };
}

export function deferInitialCachePreparation(state: FirstGlowState, spark: FirstGlowSpark, reason: string): void {
  const goal = state.initialCachePreparation?.goals.find(g => g.sparkId === spark.id);
  if (goal && goal.phase !== "committed") { goal.phase = "deferred"; goal.reason = reason; delete spark.initialPreparedDestination; }
}

export function selectInitialCachePreparation(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark, immediate?: "charge" | "rest", audit?: (budget: PreparationBudget) => void) {
  if (!state.initialCachePreparation || spark.wildCacheChoice) return undefined;
  let goal = state.initialCachePreparation.goals.find(g => g.sparkId === spark.id);
  if (!goal) {
    const explorationEventId = spark.knownEvidenceEventIds.find(id => id.endsWith("-explore"));
    const target = firstGlowRouteCandidates(settlement, spark, "scavenge-cache")[0];
    if (!explorationEventId || !target) return undefined;
    goal = { sparkId: spark.id, settlementId: settlement.id, targetObjectId: target.objectId, explorationEventId, createdPulse: state.pulse, navigationRevision: settlement.runtime.navigationRevision, phase: "deferred", reason: "initial expedition selected after exploration", actions: 0, actionEventIds: [] };
    state.initialCachePreparation.goals.push(goal);
  }
  delete spark.initialPreparedDestination;
  if (goal.phase === "committed") return "idle" as const; // An interruption cannot authorize another initial expedition.
  if (goal.navigationRevision !== settlement.runtime.navigationRevision) {
    deferInitialCachePreparation(state, spark, "initial expedition navigation revision is stale");
    return "idle" as const;
  }
  const caches = firstGlowRouteCandidates(settlement, spark, "scavenge-cache", goal.targetObjectId);
  // Actual cache contact remains required; shard forecasts use the selected policy. Avoid searching
  // every bounded draw/rest sequence when none can satisfy that independent gate.
  if (!caches.length || caches.every(c => !forecastPatternArrival(settlement, spark, c, state).shardReachable)) {
    deferInitialCachePreparation(state, spark, "initial cache or shard contact currently unavailable or unreachable");
    return "idle" as const;
  }
  const selectedGoal = goal;
  return selectCachePreparation(state, settlement, spark, goal.targetObjectId, goal, immediate, (candidate, phase) => {
    selectedGoal.phase = phase;
    selectedGoal.reason = phase === "ready" ? "initial cache arrival meets probe requirements" : `prepare ${phase} for the first cache expedition`;
    spark.initialPreparedDestination = { activity: phase === "ready" ? "scavenge-cache" : phase === "charge" ? "seek-charge" : "seek-shelter", objectId: candidate.objectId, slotId: candidate.slotId, navigationRevision: settlement.runtime.navigationRevision };
    return spark.initialPreparedDestination.activity;
  }, () => { delete spark.initialPreparedDestination; }, true, undefined, audit);
}

export function commitInitialCachePreparation(state: FirstGlowState, spark: FirstGlowSpark): void {
  const goal = state.initialCachePreparation!.goals.find(g => g.sparkId === spark.id)!;
  goal.phase = "committed"; goal.reason = "funded first cache departure committed"; goal.committedPulse = state.pulse;
  goal.departureEventId = `event-${state.pulse}-${spark.id}-initial-cache-departure`;
  state.events.push({ id: goal.departureEventId, pulse: state.pulse, kind: "initial-cache-preparation", actorId: spark.id, source: "rules", evidenceEventIds: [goal.explorationEventId, ...goal.actionEventIds], message: `${spark.name} committed a funded first cache expedition to ${goal.targetObjectId}; arrival and discovery remain pending.` });
  spark.knownEvidenceEventIds.push(goal.departureEventId);
}

export function recordInitialCachePreparation(state: FirstGlowState): void {
  finishInitialCachePreparation(state);
  for (const goal of state.initialCachePreparation?.goals ?? []) {
    const spark = state.settlements.find(s => s.id === goal.settlementId)!.sparks.find(a => a.id === goal.sparkId)!;
    const actual = state.events.filter(e => e.actorId === spark.id && (goal.phase === "charge" && e.kind === "draw" || goal.phase === "rest" && e.kind === "idle"));
    for (const event of actual) if (!goal.actionEventIds.includes(event.id)) { goal.actions++; goal.actionEventIds.push(event.id); if (!spark.knownEvidenceEventIds.includes(event.id)) spark.knownEvidenceEventIds.push(event.id); }
    const record = `${goal.phase}:${goal.reason}:${goal.actions}`;
    if (record === goal.lastRecord) continue;
    const id = `event-${state.pulse}-${spark.id}-initial-cache-preparation`;
    state.events.push({ id, pulse: state.pulse, kind: "initial-cache-preparation", actorId: spark.id, source: "rules", evidenceEventIds: [goal.explorationEventId, ...actual.map(e => e.id), ...(goal.departureEventId ? [goal.departureEventId] : []), ...(goal.outcomeEventId ? [goal.outcomeEventId] : [])], message: `${spark.name}: ${goal.reason}; preparation ${goal.phase}, ${goal.actions} recorded recovery action(s).` });
    spark.knownEvidenceEventIds.push(id); goal.lastRecord = record;
  }
}

export function finishInitialCachePreparation(state: FirstGlowState): void {
  for (const goal of state.initialCachePreparation?.goals ?? []) {
    if (goal.phase !== "committed" || goal.outcome) continue;
    const spark = state.settlements.find(s => s.id === goal.settlementId)!.sparks.find(a => a.id === goal.sparkId)!;
    if (spark.wildCacheChoice?.cacheObjectId === goal.targetObjectId) { goal.outcome = spark.wildCacheChoice.alternative; goal.outcomeEventId = spark.wildCacheChoice.outcomeEventId; }
    // The structured phase temporarily pauses sharing recipients before the wrapper restores travel.
    else if (spark.destinationObjectId !== goal.targetObjectId || !["scavenge-cache", "share-charge"].includes(spark.intendedActivity)) goal.outcome = "interrupted";
    if (goal.outcome) goal.reason = `first cache expedition ${goal.outcome}; no further initial attempt authorized`;
  }
}

export function validateInitialCachePreparation(state: FirstGlowState): void {
  const data = state.initialCachePreparation;
  if (data === undefined) { if (state.settlements.some(s => s.sparks.some(a => a.initialPreparedDestination))) throw new Error("Initial prepared destination requires initial cache preparation policy"); return; }
  const count = state.settlements.reduce((n, s) => n + s.sparks.length, 0);
  if (!data || data.version !== INITIAL_CACHE_PREPARATION_VERSION || !state.wildCacheChoiceVersion || !state.activityCompletionVersion || !state.recoveryAdmission || !Array.isArray(data.goals) || data.goals.length > count) throw new Error("Unsupported initial cache preparation policy");
  const seen = new Set<string>();
  for (const goal of data.goals) {
    const settlement = state.settlements.find(s => s.id === goal.settlementId), spark = settlement?.sparks.find(a => a.id === goal.sparkId);
    const target = settlement?.bundle.objects.find(o => o.id === goal.targetObjectId);
    if (!spark || seen.has(goal.sparkId) || !target || !settlement!.bundle.objectDefinitions[target.definitionId].capabilities.includes("wild-cache") || !Number.isInteger(goal.createdPulse) || goal.createdPulse < 1 || goal.createdPulse > state.pulse || !Number.isInteger(goal.navigationRevision) || goal.navigationRevision < 0 || goal.navigationRevision > settlement!.runtime.navigationRevision || typeof goal.explorationEventId !== "string" || !goal.explorationEventId.endsWith("-explore") || !spark.knownEvidenceEventIds.includes(goal.explorationEventId) || !["charge", "rest", "ready", "deferred", "committed"].includes(goal.phase) || typeof goal.reason !== "string" || !Number.isInteger(goal.actions) || goal.actions < 0 || goal.actions > 64 || !Array.isArray(goal.actionEventIds) || goal.actions !== goal.actionEventIds.length || new Set(goal.actionEventIds).size !== goal.actions || goal.actionEventIds.some(id => !spark.knownEvidenceEventIds.includes(id))) throw new Error("Invalid initial cache preparation goal");
    if (goal.phase === "committed") {
      if (!Number.isInteger(goal.committedPulse) || goal.committedPulse! <= goal.createdPulse || goal.committedPulse! > state.pulse || goal.departureEventId !== `event-${goal.committedPulse}-${spark.id}-initial-cache-departure` || !spark.knownEvidenceEventIds.includes(goal.departureEventId)) throw new Error("Invalid initial cache departure");
      if (goal.outcome !== undefined && !["probe", "conserve", "interrupted"].includes(goal.outcome)) throw new Error("Invalid initial cache outcome");
      if (goal.outcome === "probe" || goal.outcome === "conserve") {
        // Later pattern retries may replace the current choice; retain the first outcome as known evidence.
        if (!goal.outcomeEventId || !spark.knownEvidenceEventIds.includes(goal.outcomeEventId)) throw new Error("Invalid initial cache outcome evidence");
      } else if (goal.outcomeEventId) throw new Error("Invalid initial cache outcome evidence");
      if (!goal.outcome && (spark.wildCacheChoice || !["scavenge-cache", "share-charge"].includes(spark.intendedActivity) || spark.destinationObjectId !== goal.targetObjectId)) throw new Error("Invalid pending initial cache departure");
    } else if (goal.committedPulse !== undefined || goal.departureEventId !== undefined || goal.outcome !== undefined || goal.outcomeEventId !== undefined || spark.wildCacheChoice) throw new Error("Invalid uncommitted initial cache goal");
    const pin = spark.initialPreparedDestination;
    if (pin) {
      const expected = goal.phase === "ready" ? "scavenge-cache" : goal.phase === "charge" ? "seek-charge" : goal.phase === "rest" ? "seek-shelter" : undefined;
      const object = settlement!.bundle.objects.find(o => o.id === pin.objectId), definition = object && settlement!.bundle.objectDefinitions[object.definitionId];
      const capability = expected === "scavenge-cache" ? "wild-cache" : expected === "seek-charge" ? "charge-pool" : "shelter-niche";
      if (!expected || pin.activity !== expected || pin.navigationRevision !== settlement!.runtime.navigationRevision || !definition?.capabilities.includes(capability) || !definition.slots.some(s => s.id === pin.slotId) || expected === "scavenge-cache" && pin.objectId !== goal.targetObjectId || spark.preparedDestination) throw new Error("Invalid initial prepared destination");
    }
    seen.add(goal.sparkId);
  }
  if (state.settlements.some(s => s.sparks.some(a => a.initialPreparedDestination && !seen.has(a.id)))) throw new Error("Initial prepared destination is missing its goal");
}
