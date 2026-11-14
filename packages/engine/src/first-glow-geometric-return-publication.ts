import { initializeRoutePatterns } from "./first-glow-route-patterns.js";
import { firstGlowRouteCandidates, type FirstGlowSettlement, type FirstGlowSpark, type FirstGlowState } from "./structured.js";

export const GEOMETRIC_RETURN_PUBLICATION_VERSION = "geometric-return-publication-v1" as const;

export function initializeGeometricReturnPublication(state: FirstGlowState): void {
  if (state.geometricReturnPublicationVersion || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Geometric return publication requires a fresh history");
  if (!state.routePatterns) initializeRoutePatterns(state);
  state.geometricReturnPublicationVersion = GEOMETRIC_RETURN_PUBLICATION_VERSION;
}

/** Publication evidence only. This view never admits a trip or claims a contact. */
export function canPublishGeometricReturnRoute(settlement: FirstGlowSettlement, spark: FirstGlowSpark, objectId: string): boolean {
  const view = { ...settlement, runtime: { ...settlement.runtime, reservations: settlement.runtime.reservations.filter(r => r.objectId !== objectId) } };
  return firstGlowRouteCandidates(view, spark, "scavenge-cache", objectId).length > 0;
}

export function validateGeometricReturnPublication(state: FirstGlowState): void {
  if (state.geometricReturnPublicationVersion !== undefined && (state.geometricReturnPublicationVersion !== GEOMETRIC_RETURN_PUBLICATION_VERSION || !state.routePatterns)) throw new Error("Unsupported geometric return publication policy");
}
