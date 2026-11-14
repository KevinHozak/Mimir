import { activePatternRetry } from "./first-glow-pattern-retry.js";
import type { FirstGlowSpark, FirstGlowState, StructuredEvent } from "./structured.js";

export const WILD_CACHE_CHOICE_VERSION = "choice-before-probe-v1" as const;
export interface WildCacheChoice {
  cacheObjectId?: string;
  pulse: number;
  alternative: "probe" | "conserve";
  decisionEventId: string;
  outcomeEventId: string;
  nextActivity: "shape-pattern" | "seek-charge" | "seek-shelter" | "idle";
  routeFact?: { originObjectId?: string; objectId: string; cost: number; navigationRevision: number };
}

/** Explicit fresh-history opt-in. Untagged checkpoints retain their original rules. */
export function initializeWildCacheChoice(state: FirstGlowState): void {
  if (state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.history?.movements.length || state.history?.decisions.length || state.history?.conversations?.length || state.history?.intentions?.length || state.wildCacheChoiceVersion || state.settlements.some(s => s.sparks.some(spark => spark.wildCacheChoice))) throw new Error("Wild Cache choice requires a fresh history");
  state.wildCacheChoiceVersion = WILD_CACHE_CHOICE_VERSION;
}

export function resolveWildCacheChoice(state: FirstGlowState, spark: FirstGlowSpark, routeFact: WildCacheChoice["routeFact"], recovery: WildCacheChoice["nextActivity"]): void {
  if (state.wildCacheChoiceVersion !== WILD_CACHE_CHOICE_VERSION) throw new Error("Wild Cache choice rule is not enabled");
  const cacheObjectId = routeFact?.originObjectId ?? spark.destinationObjectId;
  const committedRetry = state.patternGuidedRetry?.attempts.find(item => item.sparkId === spark.id && item.cacheObjectId === cacheObjectId && item.useEventId === spark.routePatternUse?.eventId && !item.choice && !item.outcomeEventId);
  if (state.patternGuidedRetry && spark.wildCacheChoice && !committedRetry) throw new Error("Repeated cache choice requires a committed pattern-guided retry");
  const retry = activePatternRetry(state, spark, cacheObjectId);
  const probe = (!spark.wildCacheChoice || Boolean(retry)) && spark.carriedCharge >= 3 && spark.chargeDeficit === 0 && spark.readiness >= 75 && Boolean(routeFact);
  const decisionEventId = `event-${state.pulse}-${spark.id}-cache-choice`;
  const outcomeEventId = `event-${state.pulse}-${spark.id}-cache-${probe ? "survey" : "conserved"}`;
  const nextActivity = probe ? "shape-pattern" : recovery;
  const decision: StructuredEvent = { id: decisionEventId, kind: "wild-cache-choice", actorId: spark.id, source: "rules", message: `${spark.name} chose to ${probe ? "probe rather than conserve: at least 3 charge, no charge deficit, and at least 75 readiness" : "conserve rather than probe: protect remaining charge and readiness"}.` };
  state.events.push(decision); // Decision precedes every probe effect.
  if (probe) {
    spark.carriedCharge -= 1;
    spark.readiness -= 2;
    state.ledger.push({ kind: "consumption", actorId: spark.id, amount: 1, reason: "wild-cache-probe" }, { kind: "adjustment", actorId: spark.id, amount: 2, reason: "wild-cache-probe-readiness" });
  }
  const outcome: StructuredEvent = { id: outcomeEventId, kind: "wild-cache-choice", actorId: spark.id, source: "rules", evidenceEventIds: [decisionEventId], message: probe
    ? `${spark.name} spent 1 charge and 2 readiness surveying the Wild Cache exit: a route to Pattern Shard ${routeFact!.objectId} costs ${routeFact!.cost} navigation units at revision ${routeFact!.navigationRevision}. Next: shape pattern, subject to renewed need and route checks.`
    : `${spark.name} left the Wild Cache unprobed, paying no probe charge or readiness and learning no route fact. Next: ${nextActivity.replaceAll("-", " ")}; earlier travel costs remain spent.` };
  state.events.push(outcome);
  spark.wildCacheChoice = { pulse: state.pulse, alternative: probe ? "probe" : "conserve", decisionEventId, outcomeEventId, nextActivity, ...(probe ? { routeFact } : {}) };
  if (committedRetry) { spark.wildCacheChoice.cacheObjectId = committedRetry.cacheObjectId; committedRetry.choice = structuredClone(spark.wildCacheChoice); }
  spark.knownEvidenceEventIds.push(decisionEventId, outcomeEventId);
  const evidence = [decision, outcome].map(event => ({ id: event.id, pulse: state.pulse, message: event.message }));
  state.explanations.push({ id: `explanation-${decisionEventId}`, pulse: state.pulse, dilemmaId: "wild-cache-risk", actorSparkId: spark.id, actorName: spark.name, alternativeId: probe ? "enter-wild-cache" : "stay-on-trace", alternativeLabel: probe ? "Probe the Wild Cache" : "Conserve strength", summary: decision.message, score: { need: 0, values: 0, localKnowledge: 0, trust: 0, commitments: 0, cost: 0, risk: 0, total: 0 }, evidenceEventIds: [decisionEventId, outcomeEventId], objectiveEvents: [evidence[0]], consequenceEvents: [evidence[1]], knownFacts: probe ? [evidence[1]] : [], uncertainInferences: ["The surveyed route is a local navigation fact, not a promise of discovery or future success. Other Sparks do not automatically learn it."] });
}

export function validateWildCacheChoices(state: FirstGlowState): void {
  if (state.wildCacheChoiceVersion !== undefined && state.wildCacheChoiceVersion !== WILD_CACHE_CHOICE_VERSION) throw new Error("unsupported Wild Cache choice version");
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const choice = spark.wildCacheChoice;
    if (!choice) continue;
    const fact = choice.routeFact;
    const validFact = fact && Number.isInteger(fact.cost) && fact.cost >= 0 && Number.isInteger(fact.navigationRevision) && fact.navigationRevision >= 0 && fact.navigationRevision <= settlement.runtime.navigationRevision && settlement.bundle.objects.some(o => o.id === fact.objectId && settlement.bundle.objectDefinitions[o.definitionId].capabilities.includes("pattern-shard"));
    if (!state.wildCacheChoiceVersion || !Number.isInteger(choice.pulse) || choice.pulse < 1 || choice.pulse > state.pulse
      || !["probe", "conserve"].includes(choice.alternative)
      || !["shape-pattern", "seek-charge", "seek-shelter", "idle"].includes(choice.nextActivity)
      || !spark.knownEvidenceEventIds.includes(choice.decisionEventId) || !spark.knownEvidenceEventIds.includes(choice.outcomeEventId)
      || (choice.alternative === "probe" ? !validFact || choice.nextActivity !== "shape-pattern" : Boolean(fact) || choice.nextActivity === "shape-pattern")) throw new Error("invalid Wild Cache choice record");
  }
}
