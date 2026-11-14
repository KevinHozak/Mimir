import { postProbeMinimumReadiness, selectPostProbeContinuation } from "./first-glow-post-probe-continuation.js";
import { firstGlowRouteCandidates, type FirstGlowSettlement, type FirstGlowSpark, type FirstGlowState } from "./structured.js";
import { selectPatternPreparation } from "./first-glow-pattern-preparation.js";
import { selectInitialCachePreparation } from "./first-glow-initial-cache-preparation.js";

export const RECOVERY_ADMISSION_VERSION = "recovery-admission-v1" as const;
type RecoveryActivity = "seek-charge" | "draw-charge" | "seek-shelter" | "idle";
export interface RecoveryRequest { sparkId: string; settlementId: string; activity: RecoveryActivity; sincePulse: number; }
export interface RecoveryAdmissionState { version: typeof RECOVERY_ADMISSION_VERSION; requests: RecoveryRequest[]; }
export function initializeRecoveryAdmission(state: FirstGlowState): void {
  if (state.recoveryAdmission || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Recovery admission requires a fresh history");
  state.recoveryAdmission = { version: RECOVERY_ADMISSION_VERSION, requests: [] };
}
const recovery = (activity: string): activity is RecoveryActivity => ["seek-charge", "draw-charge", "seek-shelter", "idle"].includes(activity);
function eligible(state: FirstGlowState, spark: FirstGlowSpark): boolean {
  return ["choosing", "waiting", "idle"].includes(spark.status) && !spark.destinationObjectId && !spark.destinationCell && recovery(spark.intendedActivity) && !(spark.intendedActivity === "idle" && (state.postProbeContinuation?.goals.some(g => g.sparkId === spark.id && g.phase === "deferred" && !g.outcome) || state.patternPreparation?.goals.some(g => g.sparkId === spark.id && g.phase === "deferred") || state.initialCachePreparation?.goals.some(g => g.sparkId === spark.id && ["deferred", "committed"].includes(g.phase))));
}
export function cancelObsoleteRecoveryRequests(state: FirstGlowState): void {
  if (state.recoveryAdmission) state.recoveryAdmission.requests = state.recoveryAdmission.requests.filter(r => {
    const spark = state.settlements.find(s => s.id === r.settlementId)?.sparks.find(s => s.id === r.sparkId);
    return spark && eligible(state, spark) && spark.intendedActivity === r.activity;
  });
}
/** Conditional forecast only: no runtime reservations are changed or promised. */
export function recoveryForecastSettlement(settlement: FirstGlowSettlement): FirstGlowSettlement {
  const recoveryObjects = new Set(settlement.bundle.objects.filter(o => settlement.bundle.objectDefinitions[o.definitionId].capabilities.some(c => c === "charge-pool" || c === "shelter-niche")).map(o => o.id));
  return { ...settlement, runtime: { ...settlement.runtime, reservations: settlement.runtime.reservations.filter(r => !recoveryObjects.has(r.objectId)) } };
}
/** Admit before movement. Contacts released later this pulse become available next pulse. */
export function admitRecoveryRequests(state: FirstGlowState): Set<string> {
  const blocked = new Set<string>(), data = state.recoveryAdmission;
  if (!data) return blocked;
  const pending: RecoveryRequest[] = [];
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    if (!eligible(state, spark)) continue;
    const prior = data.requests.find(r => r.sparkId === spark.id && r.settlementId === settlement.id && r.activity === spark.intendedActivity);
    pending.push(prior ?? { sparkId: spark.id, settlementId: settlement.id, activity: spark.intendedActivity as RecoveryActivity, sincePulse: state.pulse });
  }
  data.requests = [];
  for (const request of pending.sort((a, b) => a.sincePulse - b.sincePulse || (a.sparkId < b.sparkId ? -1 : a.sparkId > b.sparkId ? 1 : 0))) {
    const settlement = state.settlements.find(s => s.id === request.settlementId)!;
    const spark = settlement.sparks.find(s => s.id === request.sparkId)!;
    // Recompute the bounded itinerary against admissions already made this pulse.
    const patternGoal = state.patternPreparation?.goals.find(g => g.sparkId === spark.id);
    const initialGoal = state.initialCachePreparation?.goals.find(g => g.sparkId === spark.id);
    const initialPreparing = Boolean(spark.initialPreparedDestination && initialGoal);
    const postGoal = state.postProbeContinuation?.goals.find(g => g.sparkId === spark.id);
    const postPreparing = Boolean(spark.postProbeDestination && postGoal);
    const goal = postPreparing ? postGoal : initialPreparing ? initialGoal : patternGoal;
    const preparing = postPreparing || initialPreparing || Boolean(spark.preparedDestination && patternGoal);
    if (postPreparing) {
      delete postGoal!.signature;
      const immediate = spark.postProbeDestination?.careFallback
        ? spark.carriedCharge === 0 || spark.chargeDeficit > 0 ? "charge" : spark.readiness < postProbeMinimumReadiness(state, settlement, spark) ? "rest" : undefined
        : request.activity === "seek-charge" || request.activity === "draw-charge" ? "charge" : "rest";
      selectPostProbeContinuation(state, settlement, spark, immediate);
    } else if (initialPreparing) {
      delete initialGoal!.signature;
      selectInitialCachePreparation(state, settlement, spark, request.activity === "seek-charge" || request.activity === "draw-charge" ? "charge" : "rest");
    } else if (preparing) {
      const pattern = state.routePatterns!.patterns.find(p => p.id === patternGoal!.patternId)!;
      delete patternGoal!.signature;
      selectPatternPreparation(state, settlement, spark, pattern, request.activity === "seek-charge" || request.activity === "draw-charge" ? "charge" : "rest");
    }
    const pin = spark.postProbeDestination ?? spark.initialPreparedDestination ?? spark.preparedDestination;
    const choices = firstGlowRouteCandidates(settlement, spark, request.activity).filter(c => !pin || c.objectId === pin.objectId && c.slotId === pin.slotId && pin.navigationRevision === settlement.runtime.navigationRevision);
    const choice = preparing && (goal?.phase === "deferred" || pin && pin.activity !== request.activity) ? undefined : choices[0];
    if (!choice || (request.activity === "seek-charge" || request.activity === "draw-charge") && settlement.sourceCharge <= 0) {
      spark.status = "waiting";
      spark.waitReason = "recovery-access-wait";
      if (preparing && goal && goal.phase !== "deferred") goal.reason = "waiting for recovery contact access; future recovery access is conditional";
      blocked.add(spark.id);
      // An intrinsically infeasible preparation is no longer an access request.
      if (!preparing || goal?.phase !== "deferred") data.requests.push(request);
      continue;
    }
    settlement.runtime.reservations.push({ actorId: spark.id, objectId: choice.objectId, slotId: choice.slotId });
    spark.destinationObjectId = choice.objectId; spark.destinationSlotId = choice.slotId;
    spark.remainingRoute = choice.path.slice(1); spark.remainingCost = 0;
    spark.plannedNavigationRevision = settlement.runtime.navigationRevision;
    spark.status = spark.remainingRoute.length ? "traveling" : "interacting";
    spark.waitReason = undefined;
    delete spark.preparedDestination;
    delete spark.initialPreparedDestination;
    delete spark.postProbeDestination;
  }
  return blocked;
}
export function validateRecoveryAdmission(state: FirstGlowState): void {
  const data = state.recoveryAdmission;
  if (data === undefined) return;
  if (!data || data.version !== RECOVERY_ADMISSION_VERSION || !Array.isArray(data.requests) || data.requests.length > state.settlements.reduce((n, s) => n + s.sparks.length, 0)) throw new Error("Unsupported recovery admission policy");
  const seen = new Set<string>();
  for (const request of data.requests) {
    const settlement = state.settlements.find(s => s.id === request.settlementId), spark = settlement?.sparks.find(s => s.id === request.sparkId);
    if (!spark || seen.has(request.sparkId) || !recovery(request.activity) || request.activity !== spark.intendedActivity || !eligible(state, spark) || !Number.isInteger(request.sincePulse) || request.sincePulse < 0 || request.sincePulse > state.pulse || settlement!.runtime.reservations.some(r => r.actorId === spark.id)) throw new Error("Invalid recovery admission request");
    seen.add(request.sparkId);
  }
}
