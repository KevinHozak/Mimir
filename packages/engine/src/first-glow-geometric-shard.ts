import { initializeWildCacheChoice } from "./first-glow-cache-choice.js";
import { firstGlowRouteCandidates, type FirstGlowSettlement, type FirstGlowSpark, type FirstGlowState } from "./structured.js";

export const GEOMETRIC_SHARD_ROUTES_VERSION = "geometric-shard-routes-v1" as const;

/** Explicit fresh-history policy; route evidence is distinct from contact ownership. */
export function initializeGeometricShardRoutes(state: FirstGlowState): void {
  if (state.geometricShardRoutesVersion || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(a => a.knownEvidenceEventIds.length || a.wildCacheChoice)) || Object.values(state.history ?? {}).some(v => Array.isArray(v) && v.length)) throw new Error("Geometric shard routes require a fresh history");
  if (!state.wildCacheChoiceVersion) initializeWildCacheChoice(state);
  state.geometricShardRoutesVersion = GEOMETRIC_SHARD_ROUTES_VERSION;
}

/** Conditional topology only. Never use this view to admit an interaction. */
export function geometricShardSettlement(state: FirstGlowState | undefined, settlement: FirstGlowSettlement): FirstGlowSettlement {
  if (!state?.geometricShardRoutesVersion) return settlement;
  const shards = new Set(settlement.bundle.objects.filter(o => settlement.bundle.objectDefinitions[o.definitionId].capabilities.includes("pattern-shard")).map(o => o.id));
  return { ...settlement, runtime: { ...settlement.runtime, reservations: settlement.runtime.reservations.filter(r => !shards.has(r.objectId)) } };
}

export function shardRouteCandidates(state: FirstGlowState | undefined, settlement: FirstGlowSettlement, spark: FirstGlowSpark, targetObjectId?: string) {
  return firstGlowRouteCandidates(geometricShardSettlement(state, settlement), spark, "shape-pattern", targetObjectId);
}

export function validateGeometricShardRoutes(state: FirstGlowState): void {
  if (state.geometricShardRoutesVersion !== undefined && (state.geometricShardRoutesVersion !== GEOMETRIC_SHARD_ROUTES_VERSION || !state.wildCacheChoiceVersion)) throw new Error("Unsupported geometric shard route policy");
}
