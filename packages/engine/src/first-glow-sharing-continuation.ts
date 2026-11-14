import { restoreFirstGlowSharingPlan, type FirstGlowState, type FirstGlowSpark } from "./structured.js";
export const SHARING_ROUTE_CONTINUATION_VERSION = "sharing-route-continuation-v1" as const;
export function initializeSharingRouteContinuation(state: FirstGlowState): void {
  if (state.sharingRouteContinuationVersion || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(spark => spark.knownEvidenceEventIds.length || spark.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Sharing route continuation requires a fresh history");
  state.sharingRouteContinuationVersion = SHARING_ROUTE_CONTINUATION_VERSION;
}
export interface SharingPause { sparkId: string; activity: FirstGlowSpark["intendedActivity"]; hadPlan: boolean; }
/** Resume only the participants of this pulse's pause, including an aborted transfer. */
export function restoreSharingParticipants(state: FirstGlowState, pauses: SharingPause[]): void {
  if (state.sharingRouteContinuationVersion !== SHARING_ROUTE_CONTINUATION_VERSION) throw new Error("Sharing route continuation policy is not enabled");
  for (const pause of pauses.slice().sort((a,b) => a.sparkId < b.sparkId ? -1 : a.sparkId > b.sparkId ? 1 : 0)) {
    const settlement = state.settlements.find(s => s.sparks.some(spark => spark.id === pause.sparkId));
    const spark = settlement?.sparks.find(spark => spark.id === pause.sparkId);
    if (!settlement || !spark) continue;
    const result = restoreFirstGlowSharingPlan(settlement, spark, pause.activity);
    if (!pause.hadPlan && result === "none") continue;
    const id = `event-${state.pulse}-${spark.id}-sharing-continuation`;
    const evidenceEventIds = state.events.filter(e => e.kind === "share" && e.participants?.includes(spark.id)).map(e => e.id);
    state.events.push({ id, pulse: state.pulse, kind: "sharing-continuation", actorId: spark.id, message: result === "invalid" ? `${spark.name} cleared an invalid paused plan after a sharing pause.` : result === "none" ? `${spark.name} has no retained route after a sharing pause and can choose again.` : `${spark.name} restored its recorded ${result === "traveling" ? "travel" : "contact"} plan after a sharing pause; arrival effects remain pending.`, evidenceEventIds, source: "rules" });
    spark.knownEvidenceEventIds.push(id);
  }
}
