import { shardRouteCandidates } from "./first-glow-geometric-shard.js";
import { initializeRecoveryAdmission } from "./first-glow-recovery-admission.js";
import { initializeWildCacheChoice } from "./first-glow-cache-choice.js";
import { forecastShardArrival, selectCachePreparation, type PreparationBudget, type PatternPreparationGoal } from "./first-glow-pattern-preparation.js";
import { firstGlowActionScore } from "./first-glow-social.js";
import { firstGlowRouteCandidates, initializeActivityCompletion, type FirstGlowState, type FirstGlowSettlement, type FirstGlowSpark } from "./structured.js";

export const CARE_RECOVERY_FALLBACK_VERSION = "care-recovery-fallback-v1" as const;
export const POST_PROBE_CONTINUATION_VERSION = "post-probe-continuation-v1" as const;
export interface PostProbeGoal extends Pick<PatternPreparationGoal, "phase" | "reason" | "actions" | "actionEventIds" | "signature" | "lastRecord"> {
  sparkId: string; settlementId: string; surveyEventId: string; cacheObjectId: string; shardObjectId: string; navigationRevision: number; createdPulse: number;
  careFallbackUsed?: true; careRestEventId?: string;
  priorActionEventIds: string[]; committedPulse?: number; departureEventId?: string;
  outcome?: "completed" | "interrupted" | "invalidated"; completionEventId?: string;
}
export interface PostProbeContinuationState { version: typeof POST_PROBE_CONTINUATION_VERSION; goals: PostProbeGoal[]; }
export interface PostProbeDestination { careFallback?: true; activity: "seek-charge" | "seek-shelter" | "shape-pattern"; objectId: string; slotId: string; navigationRevision: number; }

export function initializePostProbeContinuation(state: FirstGlowState): void {
  if (state.postProbeContinuation || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice || a.postProbeDestination)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Post-probe continuation requires a fresh history");
  if (!state.wildCacheChoiceVersion) initializeWildCacheChoice(state);
  if (!state.activityCompletionVersion) initializeActivityCompletion(state);
  if (!state.recoveryAdmission) initializeRecoveryAdmission(state);
  state.postProbeContinuation = { version: POST_PROBE_CONTINUATION_VERSION, goals: [] };
}

/** Additive fresh policy: post-probe v1 histories are never reinterpreted. */
export function initializeCareRecoveryFallback(state: FirstGlowState): void {
  if (state.careRecoveryFallbackVersion || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Care recovery fallback requires a fresh history");
  if (!state.postProbeContinuation) initializePostProbeContinuation(state);
  state.careRecoveryFallbackVersion = CARE_RECOVERY_FALLBACK_VERSION;
}

export function postProbeMinimumReadiness(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark): number {
  if (state.careRecoveryFallbackVersion && state.postProbeContinuation?.goals.some(g => g.sparkId === spark.id && g.careFallbackUsed)) return 90;
  const target = settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id)).find(a => a.id !== spark.id);
  return target && firstGlowActionScore(state.social, spark.id, target.id, "shelter-or-trace") >= 3 ? 90 : 70;
}

export function deferPostProbe(state: FirstGlowState, spark: FirstGlowSpark, reason: string): void {
  const goal = state.postProbeContinuation?.goals.find(g => g.sparkId === spark.id);
  if (goal && goal.phase !== "committed" && !goal.outcome) { goal.phase = "deferred"; goal.reason = reason; }
  delete spark.postProbeDestination;
}

export function selectPostProbeContinuation(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark, immediate?: "charge" | "rest", audit?: (budget: PreparationBudget) => void) {
  const goal = state.postProbeContinuation?.goals.find(g => g.sparkId === spark.id);
  if (!goal || goal.outcome) return undefined;
  delete spark.postProbeDestination;
  if (goal.phase === "committed") return "idle" as const;
  if (goal.navigationRevision !== settlement.runtime.navigationRevision) {
    goal.outcome = "invalidated"; goal.phase = "deferred"; goal.reason = "survey navigation revision is stale";
    return "idle" as const;
  }
  if (!shardRouteCandidates(state, settlement, spark, goal.shardObjectId).length) {
    deferPostProbe(state, spark, "surveyed shard contact unavailable or unreachable"); return "idle" as const;
  }
  const minimumReadiness = postProbeMinimumReadiness(state, settlement, spark);
  if (goal.careFallbackUsed && spark.carriedCharge > 0 && spark.chargeDeficit === 0 && (spark.readiness < 90 || !goal.careRestEventId)) immediate = "rest";
  const planning = { ...goal, actions: goal.actions + goal.priorActionEventIds.length };
  let fallback = false;
  const pin = (candidate: ReturnType<typeof firstGlowRouteCandidates>[number], phase: "charge" | "rest" | "ready") => {
    planning.phase = phase; planning.reason = fallback ? "bounded charge then rest to satisfy care before the shard" : phase === "ready" ? "surveyed shard journey is fully funded" : `prepare ${phase} for the surveyed shard`;
    spark.postProbeDestination = { activity: phase === "ready" ? "shape-pattern" : phase === "charge" ? "seek-charge" : "seek-shelter", objectId: candidate.objectId, slotId: candidate.slotId, navigationRevision: settlement.runtime.navigationRevision, ...(fallback ? { careFallback: true as const } : {}) };
    return spark.postProbeDestination.activity;
  };
  let result = selectCachePreparation(state, settlement, spark, goal.shardObjectId, planning, immediate, pin,
    () => { delete spark.postProbeDestination; }, true, { activity: "shape-pattern", minimumReadiness, ...(goal.careFallbackUsed && !goal.careRestEventId ? { requireRest: true } : {}) }, audit);
  // A feasible rest-first plan keeps its queue position even when the contact is busy.
  // Only a resource-infeasible, nonurgent care decision may try charge -> rest.
  if (state.careRecoveryFallbackVersion && result === "idle" && planning.phase === "deferred" && immediate === "rest" && minimumReadiness === 90 && spark.readiness >= 70 && spark.readiness < 90 && spark.carriedCharge > 0 && spark.chargeDeficit === 0) {
    fallback = true; delete planning.signature;
    result = selectCachePreparation(state, settlement, spark, goal.shardObjectId, planning, "charge", pin,
      () => { delete spark.postProbeDestination; }, true, { activity: "shape-pattern", minimumReadiness: 90, chargeThenRest: true }, audit);
    if (result === "seek-charge") { goal.careFallbackUsed = true; delete goal.careRestEventId; }
  }
  goal.phase = planning.phase; goal.reason = planning.reason; goal.signature = planning.signature;
  return result;
}

export function canCommitPostProbe(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark, candidate: ReturnType<typeof firstGlowRouteCandidates>[number]): boolean {
  const goal = state.postProbeContinuation?.goals.find(g => g.sparkId === spark.id);
  return Boolean(goal && !goal.outcome && goal.phase === "ready" && (!goal.careFallbackUsed || Boolean(goal.careRestEventId)) && goal.navigationRevision === settlement.runtime.navigationRevision && candidate.objectId === goal.shardObjectId && forecastShardArrival(settlement, spark, candidate, postProbeMinimumReadiness(state, settlement, spark)).eligible);
}

export function commitPostProbe(state: FirstGlowState, spark: FirstGlowSpark): void {
  const goal = state.postProbeContinuation!.goals.find(g => g.sparkId === spark.id)!;
  goal.phase = "committed"; goal.committedPulse = state.pulse; goal.reason = "funded surveyed-shard departure committed";
  goal.departureEventId = `event-${state.pulse}-${spark.id}-post-probe-departure`;
  state.events.push({ id: goal.departureEventId, pulse: state.pulse, kind: "post-probe-continuation", actorId: spark.id, source: "rules", evidenceEventIds: [goal.surveyEventId, ...goal.priorActionEventIds, ...goal.actionEventIds, ...(goal.careRestEventId && !goal.actionEventIds.includes(goal.careRestEventId) ? [goal.careRestEventId] : [])], message: `${spark.name} committed a funded journey to surveyed shard ${goal.shardObjectId}; completion and public pattern creation remain pending.` });
  spark.knownEvidenceEventIds.push(goal.departureEventId);
}

/** Capture only a real survey in this pulse; never infer a survey for an old checkpoint. */
export function finishPostProbeContinuations(state: FirstGlowState): void {
  if (!state.postProbeContinuation) return;
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const choice = spark.wildCacheChoice;
    let goal = state.postProbeContinuation.goals.find(g => g.sparkId === spark.id);
    if (!goal && choice?.alternative === "probe" && choice.pulse === state.pulse && choice.cacheObjectId && choice.routeFact?.originObjectId === choice.cacheObjectId) {
      const initial = state.initialCachePreparation?.goals.find(g => g.sparkId === spark.id && g.outcome !== "conserve" && g.outcome !== "interrupted");
      const pattern = state.patternPreparation?.goals.find(g => g.sparkId === spark.id && g.useEventId === spark.routePatternUse?.eventId);
      const priorActionEventIds = [...(initial?.actionEventIds ?? pattern?.actionEventIds ?? [])];
      goal = { sparkId: spark.id, settlementId: settlement.id, surveyEventId: choice.outcomeEventId, cacheObjectId: choice.cacheObjectId, shardObjectId: choice.routeFact.objectId, navigationRevision: choice.routeFact.navigationRevision, createdPulse: state.pulse, phase: "deferred", reason: "retain surveyed shard objective through recovery", actions: 0, actionEventIds: [], priorActionEventIds };
      state.postProbeContinuation.goals.push(goal);
    }
    if (!goal || goal.phase !== "committed" || goal.outcome) continue;
    const completion = state.events.find(e => e.actorId === spark.id && e.kind === "shape-pattern");
    if (completion && goal.navigationRevision === settlement.runtime.navigationRevision && settlement.bundle.objects.filter(o => o.id === goal.shardObjectId).some(o => settlement.bundle.objectDefinitions[o.definitionId].slots.some(slot => spark.position.x === o.origin.x + slot.offset.x && spark.position.y === o.origin.y + slot.offset.y))) {
      goal.outcome = "completed"; goal.completionEventId = completion.id; goal.reason = "validated surveyed-shard activity completed; artifact creation retains its own gates";
    } else if (spark.destinationObjectId !== goal.shardObjectId || !["shape-pattern", "share-charge"].includes(spark.intendedActivity)) {
      goal.outcome = "interrupted"; goal.reason = "surveyed-shard journey interrupted; commitment remains spent";
    }
  }
}

export function recordPostProbeContinuations(state: FirstGlowState): void {
  finishPostProbeContinuations(state);
  for (const goal of state.postProbeContinuation?.goals ?? []) {
    const spark = state.settlements.find(s => s.id === goal.settlementId)!.sparks.find(a => a.id === goal.sparkId)!;
    const actual = state.events.filter(e => e.actorId === spark.id && (goal.phase === "charge" && e.kind === "draw" || goal.phase === "rest" && e.kind === "idle"));
    for (const event of actual) if (!goal.actionEventIds.includes(event.id)) { goal.actions++; goal.actionEventIds.push(event.id); if (!spark.knownEvidenceEventIds.includes(event.id)) spark.knownEvidenceEventIds.push(event.id); }
    if (goal.careFallbackUsed && !goal.outcome && goal.phase !== "committed") {
      const rest = state.events.find(e => e.actorId === spark.id && e.kind === "idle");
      if (rest) { goal.careRestEventId = rest.id; if (!spark.knownEvidenceEventIds.includes(rest.id)) spark.knownEvidenceEventIds.push(rest.id); }
    }
    const record = `${goal.phase}:${goal.reason}:${goal.actions}:${goal.outcome ?? "pending"}${goal.careFallbackUsed ? `:care:${goal.careRestEventId ?? "rest-pending"}` : ""}`;
    if (goal.lastRecord === record) continue;
    const id = `event-${state.pulse}-${spark.id}-post-probe-continuation`;
    state.events.push({ id, pulse: state.pulse, kind: "post-probe-continuation", actorId: spark.id, source: "rules", evidenceEventIds: [goal.surveyEventId, ...actual.map(e => e.id), ...(goal.departureEventId ? [goal.departureEventId] : []), ...(goal.completionEventId ? [goal.completionEventId] : []), ...(goal.careRestEventId && !actual.some(e => e.id === goal.careRestEventId) ? [goal.careRestEventId] : [])], message: `${spark.name}: ${goal.reason}; preparation ${goal.phase}, ${goal.actions} additional recovery action(s), ${goal.priorActionEventIds.length} preceding action(s).` });
    spark.knownEvidenceEventIds.push(id); goal.lastRecord = record;
  }
}

export function validatePostProbeContinuation(state: FirstGlowState): void {
  const data = state.postProbeContinuation;
  if (state.careRecoveryFallbackVersion !== undefined && (state.careRecoveryFallbackVersion !== CARE_RECOVERY_FALLBACK_VERSION || !data)) throw new Error("Unsupported care recovery fallback policy");
  if (data === undefined) { if (state.settlements.some(s => s.sparks.some(a => a.postProbeDestination))) throw new Error("Post-probe destination requires continuation policy"); return; }
  if (!data || data.version !== POST_PROBE_CONTINUATION_VERSION || !state.wildCacheChoiceVersion || !state.activityCompletionVersion || !state.recoveryAdmission || !Array.isArray(data.goals) || data.goals.length > state.settlements.reduce((n, s) => n + s.sparks.length, 0)) throw new Error("Unsupported post-probe continuation policy");
  const seen = new Set<string>();
  for (const goal of data.goals) {
    const settlement = state.settlements.find(s => s.id === goal.settlementId), spark = settlement?.sparks.find(a => a.id === goal.sparkId), choice = spark?.wildCacheChoice;
    if (!spark || seen.has(goal.sparkId) || choice?.alternative !== "probe" || choice.outcomeEventId !== goal.surveyEventId || choice.pulse !== goal.createdPulse || choice.cacheObjectId !== goal.cacheObjectId || choice.routeFact?.objectId !== goal.shardObjectId || choice.routeFact.originObjectId !== goal.cacheObjectId || choice.routeFact.navigationRevision !== goal.navigationRevision || !Number.isInteger(goal.createdPulse) || goal.createdPulse < 1 || goal.createdPulse > state.pulse || !spark.knownEvidenceEventIds.includes(goal.surveyEventId) || !["charge", "rest", "ready", "deferred", "committed"].includes(goal.phase) || typeof goal.reason !== "string" || !Array.isArray(goal.priorActionEventIds) || !Array.isArray(goal.actionEventIds) || !Number.isInteger(goal.actions) || goal.actions < 0 || goal.actions !== goal.actionEventIds.length || goal.actions + goal.priorActionEventIds.length > 64 || new Set([...goal.priorActionEventIds, ...goal.actionEventIds]).size !== goal.actions + goal.priorActionEventIds.length || [...goal.priorActionEventIds, ...goal.actionEventIds].some(id => !spark.knownEvidenceEventIds.includes(id))) throw new Error("Invalid post-probe continuation goal");
    if (goal.careFallbackUsed !== undefined && (goal.careFallbackUsed !== true || !state.careRecoveryFallbackVersion) || goal.careRestEventId !== undefined && (!goal.careFallbackUsed || typeof goal.careRestEventId !== "string" || !goal.careRestEventId.endsWith("-idle") || !spark.knownEvidenceEventIds.includes(goal.careRestEventId))) throw new Error("Invalid care recovery fallback evidence");
    if (goal.phase === "committed" && goal.careFallbackUsed && !goal.careRestEventId) throw new Error("Care fallback departure requires actual rest evidence");
    if (goal.outcome !== undefined && !["completed", "interrupted", "invalidated"].includes(goal.outcome)) throw new Error("Invalid post-probe outcome");
    const initial = state.initialCachePreparation?.goals.find(g => g.sparkId === goal.sparkId && g.outcomeEventId === goal.surveyEventId);
    const pattern = state.patternPreparation?.goals.find(g => g.sparkId === goal.sparkId && g.phase === "committed" && g.useEventId && state.routePatterns?.patterns.some(p => p.targetObjectId === goal.cacheObjectId && p.encounters.some(e => e.sparkId === goal.sparkId && e.use !== undefined && e.use.eventId === g.useEventId && e.use.pulse <= goal.createdPulse)));
    if (JSON.stringify(goal.priorActionEventIds) !== JSON.stringify(initial?.actionEventIds ?? pattern?.actionEventIds ?? [])) throw new Error("Invalid post-probe preceding action budget");
    if (goal.phase === "committed") {
      if (!Number.isInteger(goal.committedPulse) || goal.committedPulse! <= goal.createdPulse || goal.committedPulse! > state.pulse || goal.departureEventId !== `event-${goal.committedPulse}-${spark.id}-post-probe-departure` || !spark.knownEvidenceEventIds.includes(goal.departureEventId)) throw new Error("Invalid post-probe departure");
      if (goal.outcome === "completed" ? !goal.completionEventId || !spark.knownEvidenceEventIds.includes(goal.completionEventId) : Boolean(goal.completionEventId)) throw new Error("Invalid post-probe completion evidence");
      if (!goal.outcome && (spark.destinationObjectId !== goal.shardObjectId || !["shape-pattern", "share-charge"].includes(spark.intendedActivity))) throw new Error("Invalid pending post-probe departure");
    } else if (goal.committedPulse !== undefined || goal.departureEventId !== undefined || goal.completionEventId !== undefined || goal.outcome && goal.outcome !== "invalidated") throw new Error("Invalid uncommitted post-probe goal");
    const pin = spark.postProbeDestination;
    if (pin) {
      const activity = goal.phase === "ready" ? "shape-pattern" : goal.phase === "charge" ? "seek-charge" : goal.phase === "rest" ? "seek-shelter" : undefined;
      const object = settlement!.bundle.objects.find(o => o.id === pin.objectId), definition = object && settlement!.bundle.objectDefinitions[object.definitionId];
      const capability = activity === "shape-pattern" ? "pattern-shard" : activity === "seek-charge" ? "charge-pool" : "shelter-niche";
      if (pin.careFallback !== undefined && (pin.careFallback !== true || !state.careRecoveryFallbackVersion || !goal.careFallbackUsed || activity !== "seek-charge")) throw new Error("Invalid care recovery fallback destination");
      if (goal.outcome || !activity || pin.activity !== activity || pin.navigationRevision !== settlement!.runtime.navigationRevision || !definition?.capabilities.includes(capability) || !definition.slots.some(s => s.id === pin.slotId) || activity === "shape-pattern" && pin.objectId !== goal.shardObjectId || spark.initialPreparedDestination || spark.preparedDestination) throw new Error("Invalid post-probe destination");
    }
    seen.add(goal.sparkId);
  }
  if (state.settlements.some(s => s.sparks.some(a => a.postProbeDestination && !seen.has(a.id)))) throw new Error("Post-probe destination missing its goal");
}
