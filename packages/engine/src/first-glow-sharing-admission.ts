import { selectInitialCachePreparation } from "./first-glow-initial-cache-preparation.js";
import { selectPatternPreparation, type PreparationBudget } from "./first-glow-pattern-preparation.js";
import { postProbeMinimumReadiness, selectPostProbeContinuation } from "./first-glow-post-probe-continuation.js";
import { firstGlowActionScore } from "./first-glow-social.js";
import type { FirstGlowSettlement, FirstGlowSpark, FirstGlowState } from "./structured.js";

export const BOUNDED_SHARING_ADMISSION_VERSION = "bounded-sharing-admission-v1" as const;
export interface SharingAdmissionDecision { sparkId: string; recipientId: string; reason: string; }

export function initializeBoundedSharingAdmission(state: FirstGlowState): void {
  if (state.boundedSharingAdmissionVersion || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Bounded sharing admission requires a fresh history");
  state.boundedSharingAdmissionVersion = BOUNDED_SHARING_ADMISSION_VERSION;
}

/** No resources, goals, queues or reservations are changed by this assessment. */
export function sharingAdmissionRefusal(state: FirstGlowState, settlement: FirstGlowSettlement, spark: FirstGlowSpark): string | undefined {
  if (!state.boundedSharingAdmissionVersion) return undefined;
  if (spark.chargeDeficit > 0 || spark.carriedCharge < 3) return "retain charge for own need, gift and donor upkeep";
  if (spark.readiness < 70) return "urgent rest precedes discretionary sharing";
  const post = state.postProbeContinuation?.goals.find(g => g.sparkId === spark.id && !g.outcome && g.phase !== "committed");
  const initial = state.initialCachePreparation?.goals.find(g => g.sparkId === spark.id && g.phase !== "committed");
  const pattern = state.patternPreparation?.goals.find(g => g.sparkId === spark.id && g.phase !== "committed");
  const target = settlement.sparks.slice().sort((a, b) => a.id.localeCompare(b.id)).find(a => a.id !== spark.id);
  const minimumReadiness = post ? postProbeMinimumReadiness(state, settlement, spark) : target && firstGlowActionScore(state.social, spark.id, target.id, "shelter-or-trace") >= 3 ? 90 : 70;
  if (!post && !initial && !pattern) return spark.readiness < minimumReadiness ? "care rest precedes discretionary sharing" : undefined;
  // Select the same bounded itinerary on scratch goals, then test that exact
  // witness after gift + donor upkeep. Do not authorize a longer/new draw plan.
  const copy: FirstGlowState = {
    ...state,
    ...(state.postProbeContinuation ? { postProbeContinuation: { ...state.postProbeContinuation, goals: state.postProbeContinuation.goals.map(g => ({ ...g, signature: undefined })) } } : {}),
    ...(state.initialCachePreparation ? { initialCachePreparation: { ...state.initialCachePreparation, goals: state.initialCachePreparation.goals.map(g => ({ ...g, signature: undefined })) } } : {}),
    ...(state.patternPreparation ? { patternPreparation: { ...state.patternPreparation, goals: state.patternPreparation.goals.map(g => ({ ...g, signature: undefined })) } } : {})
  };
  const actor = { ...spark }, site = { ...settlement, sparks: settlement.sparks.map(a => a.id === spark.id ? actor : a) };
  copy.settlements = state.settlements.map(s => s.id === settlement.id ? site : s);
  let budget: PreparationBudget | undefined;
  const audit = (value: PreparationBudget) => { budget = value; };
  const immediate = spark.readiness < minimumReadiness ? "rest" : undefined;
  if (post) selectPostProbeContinuation(copy, site, actor, immediate, audit);
  else if (initial) selectInitialCachePreparation(copy, site, actor, immediate, audit);
  else {
    const artifact = state.routePatterns?.patterns.find(p => p.id === pattern!.patternId);
    if (artifact) selectPatternPreparation(copy, site, actor, artifact, immediate, audit);
  }
  const remaining = 64 - (post ? post.actions + post.priorActionEventIds.length : initial ? initial.actions : pattern!.actions);
  return !budget || budget.recoveryActions > remaining ? "no currently verified bounded recovery budget for sharing" : !budget.canSpendCharge(2) ? "gift and donor upkeep would unfund the selected recovery itinerary" : undefined;
}

export function validateBoundedSharingAdmission(state: FirstGlowState): void {
  if (state.boundedSharingAdmissionVersion !== undefined && state.boundedSharingAdmissionVersion !== BOUNDED_SHARING_ADMISSION_VERSION) throw new Error("Unsupported bounded sharing admission policy");
}
