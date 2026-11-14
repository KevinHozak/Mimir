import { canonicalize } from "@mimir/world-data";
import { initializeRoutePatterns, type RoutePattern } from "./first-glow-route-patterns.js";
import type { FirstGlowSpark, FirstGlowState } from "./structured.js";
import type { WildCacheChoice } from "./first-glow-cache-choice.js";

export const PATTERN_GUIDED_RETRY_VERSION = "pattern-guided-retry-v1" as const;
export interface PatternGuidedRetry {
  sparkId: string; cacheObjectId: string; patternId: string; encounterEventId: string;
  useEventId: string; committedPulse: number; priorChoice: WildCacheChoice;
  choice?: WildCacheChoice; outcomeEventId?: string;
}
export interface PatternGuidedRetryState { version: typeof PATTERN_GUIDED_RETRY_VERSION; attempts: PatternGuidedRetry[]; }

export function initializePatternGuidedRetry(state: FirstGlowState): void {
  if (state.patternGuidedRetry || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.settlements.some(s => s.sparks.some(spark => spark.wildCacheChoice || spark.knownEvidenceEventIds.length)) || Object.values(state.history ?? {}).some(value => Array.isArray(value) && value.length)) throw new Error("Pattern-guided retry requires a fresh history");
  if (!state.routePatterns) initializeRoutePatterns(state);
  state.patternGuidedRetry = { version: PATTERN_GUIDED_RETRY_VERSION, attempts: [] };
}

/** A later encounter can reopen conservation, never a completed survey or an unknown cache. */
export function patternRetryRefusal(state: FirstGlowState, spark: FirstGlowSpark, pattern: RoutePattern): string | undefined {
  const prior = spark.wildCacheChoice;
  if (!prior) return undefined;
  if (!state.patternGuidedRetry) return "already considered the Wild Cache";
  if (state.patternGuidedRetry.attempts.some(item => item.sparkId === spark.id && item.cacheObjectId === pattern.targetObjectId)) return "pattern-guided retry already committed for this cache";
  if (prior.alternative !== "conserve") return "already surveyed the Wild Cache";
  if (!prior.cacheObjectId || prior.cacheObjectId !== pattern.targetObjectId) return "prior conservation does not identify this cache";
  const encounter = pattern.encounters.find(item => item.sparkId === spark.id);
  if (!encounter || encounter.pulse <= prior.pulse) return "no new encounter after conservation";
  return undefined;
}

export function activePatternRetry(state: FirstGlowState, spark: FirstGlowSpark, cacheObjectId: string | undefined): PatternGuidedRetry | undefined {
  if (!cacheObjectId || !spark.routePatternUse) return undefined;
  const attempt = state.patternGuidedRetry?.attempts.find(item => item.sparkId === spark.id && item.cacheObjectId === cacheObjectId && item.useEventId === spark.routePatternUse!.eventId && !item.choice && !item.outcomeEventId);
  const pattern = state.routePatterns?.patterns.find(item => item.id === attempt?.patternId);
  const encounter = pattern?.encounters.find(item => item.sparkId === spark.id);
  const settlement = state.settlements.find(item => item.id === pattern?.settlementId);
  return attempt && spark.routePatternUse.patternId === attempt.patternId && pattern && encounter?.use?.eventId === attempt.useEventId && encounter.eventId === attempt.encounterEventId && encounter.pulse > attempt.priorChoice.pulse && pattern.targetObjectId === cacheObjectId && pattern.navigationRevision === settlement?.runtime.navigationRevision && spark.wildCacheChoice?.decisionEventId === attempt.priorChoice.decisionEventId ? attempt : undefined;
}

export function validatePatternGuidedRetry(state: FirstGlowState): void {
  const data = state.patternGuidedRetry;
  if (data === undefined) return;
  if (!data || data.version !== PATTERN_GUIDED_RETRY_VERSION || !state.routePatterns || !Array.isArray(data.attempts) || data.attempts.length > 4096) throw new Error("Unsupported pattern-guided retry policy");
  const seen = new Set<string>();
  for (const attempt of data.attempts) {
    const pattern = state.routePatterns.patterns.find(item => item.id === attempt.patternId);
    const settlement = state.settlements.find(item => item.id === pattern?.settlementId);
    const spark = settlement?.sparks.find(item => item.id === attempt.sparkId);
    const encounter = pattern?.encounters.find(item => item.sparkId === attempt.sparkId);
    const prior = attempt.priorChoice;
    const key = `${attempt.sparkId}:${attempt.cacheObjectId}`;
    if (seen.has(key) || !spark || !pattern || !prior || prior.alternative !== "conserve" || !["seek-charge", "seek-shelter", "idle"].includes(prior.nextActivity) || prior.routeFact || prior.cacheObjectId !== attempt.cacheObjectId || pattern.targetObjectId !== attempt.cacheObjectId || !Number.isInteger(prior.pulse) || prior.pulse < 1 || !encounter || encounter.pulse <= prior.pulse || encounter.eventId !== attempt.encounterEventId || !encounter.use?.retry || encounter.use.eventId !== attempt.useEventId || encounter.use.pulse !== attempt.committedPulse || attempt.committedPulse <= encounter.pulse || attempt.committedPulse > state.pulse || !spark.knownEvidenceEventIds.includes(prior.decisionEventId) || !spark.knownEvidenceEventIds.includes(prior.outcomeEventId) || (attempt.outcomeEventId !== encounter.use.outcomeEventId)) throw new Error("Invalid pattern-guided retry provenance or limit");
    if (!attempt.outcomeEventId && (spark.routePatternUse?.eventId !== attempt.useEventId || spark.routePatternUse.patternId !== attempt.patternId)) throw new Error("Pending retry is missing its active use");
    const current = attempt.choice ?? prior;
    if (JSON.stringify(canonicalize(current)) !== JSON.stringify(canonicalize(spark.wildCacheChoice)) || (attempt.choice && (attempt.choice.pulse < attempt.committedPulse || attempt.choice.cacheObjectId !== attempt.cacheObjectId))) throw new Error("Invalid pattern-guided retry choice history");
    seen.add(key);
  }
  for (const pattern of state.routePatterns.patterns) for (const encounter of pattern.encounters) {
    if (encounter.use?.retry && !data.attempts.some(item => item.sparkId === encounter.sparkId && item.patternId === pattern.id && item.useEventId === encounter.use!.eventId)) throw new Error("Retry use is missing its committed attempt");
  }
}
