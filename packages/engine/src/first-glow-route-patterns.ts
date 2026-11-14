import { canPublishGeometricReturnRoute } from "./first-glow-geometric-return-publication.js";
import { patternRetryRefusal } from "./first-glow-pattern-retry.js";
import type { Cell } from "@mimir/world-data";
import { initializeWildCacheChoice } from "./first-glow-cache-choice.js";
import type { FirstGlowExplanation } from "./first-glow-explanations.js";
import { canReachRoutePatternTarget } from "./structured.js";
import type { FirstGlowSettlement, FirstGlowSpark, FirstGlowState, StructuredEvent } from "./structured.js";

export const ROUTE_PATTERN_VERSION = "persistent-route-pattern-v1" as const;
export interface RoutePatternEncounter {
  sparkId: string; pulse: number; eventId: string;
  decline?: { pulse: number; eventId: string; reason: string };
  use?: { pulse: number; eventId: string; outcomeEventId?: string; retry?: true };
}
export interface RoutePattern {
  id: string; public: true; creatorId: string; settlementId: string;
  createdPulse: number; creationEventId: string; sourceEventIds: string[];
  at: Cell; targetObjectId: string; navigationRevision: number;
  encounters: RoutePatternEncounter[];
}
export interface RoutePatternState { version: typeof ROUTE_PATTERN_VERSION; patterns: RoutePattern[]; }
export interface RoutePatternDecision { patternId: string; sparkId: string; use: boolean; reason: string; }
const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const ordered = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** The explicit public artifact replaces the old post-action public/private label. */
export function isRoutePatternCreationSource(state: FirstGlowState, event: StructuredEvent): boolean {
  return event.kind === "shape-pattern" && Boolean(state.routePatterns?.patterns.some(pattern => pattern.sourceEventIds.includes(event.id)));
}

export function initializeRoutePatterns(state: FirstGlowState): void {
  if (state.routePatterns || state.pulse !== 0 || state.events.length || state.ledger.length || state.explanations.length || state.history?.movements.length || state.history?.decisions.length || state.history?.conversations?.length || state.history?.intentions?.length) throw new Error("Route patterns require a fresh history");
  if (!state.wildCacheChoiceVersion) initializeWildCacheChoice(state);
  state.routePatterns = { version: ROUTE_PATTERN_VERSION, patterns: [] };
}

export function knownRoutePattern(state: FirstGlowState, settlementId: string, sparkId: string): RoutePattern | undefined {
  return state.routePatterns?.patterns.slice().sort(ordered).find(pattern => pattern.settlementId === settlementId && pattern.encounters.some(encounter => encounter.sparkId === sparkId && encounter.pulse <= state.pulse && !encounter.use));
}

function emit(state: FirstGlowState, id: string, actorId: string, message: string, evidenceEventIds: string[]): StructuredEvent {
  const event: StructuredEvent = { id, pulse: state.pulse, kind: "route-pattern", actorId, message, evidenceEventIds, source: "rules" };
  state.events.push(event);
  return event;
}

function explain(state: FirstGlowState, spark: FirstGlowSpark, event: StructuredEvent, label: string, knownEventIds: string[]): void {
  const evidence = { id: event.id, pulse: state.pulse, message: event.message };
  const explanation: FirstGlowExplanation = {
    id: `explanation-${event.id}`, pulse: state.pulse, dilemmaId: "route-pattern-use", actorSparkId: spark.id, actorName: spark.name,
    alternativeId: label, alternativeLabel: label, summary: event.message,
    score: { need: 0, values: 0, localKnowledge: 0, trust: 0, commitments: 0, cost: 0, risk: 0, total: 0 },
    evidenceEventIds: [...knownEventIds, event.id], objectiveEvents: [evidence], knownFacts: [evidence], uncertainInferences: ["A public route pattern conveys a route fact, not private memories or a guarantee of benefit."], consequenceEvents: [evidence]
  };
  state.explanations.push(explanation);
}

/** Commit choices made before movement. The list precedes the physical events in this pulse. */
export function recordRoutePatternDecisions(state: FirstGlowState, decisions: RoutePatternDecision[]): void {
  const physicalEvents = state.events;
  state.events = [];
  for (const decision of decisions) {
    const pattern = state.routePatterns?.patterns.find(item => item.id === decision.patternId);
    const settlement = state.settlements.find(item => item.id === pattern?.settlementId);
    const spark = settlement?.sparks.find(item => item.id === decision.sparkId);
    const encounter = pattern?.encounters.find(item => item.sparkId === decision.sparkId);
    if (!pattern || !spark || !encounter || encounter.pulse >= state.pulse || encounter.use) throw new Error("Route pattern decision lacks an earlier encounter");
    if (!decision.use && encounter.decline) continue;
    const retry = decision.use && state.patternGuidedRetry && spark.wildCacheChoice;
    if (state.patternGuidedRetry && decision.use && (pattern.navigationRevision !== settlement!.runtime.navigationRevision || !canReachRoutePatternTarget(settlement!, spark, pattern.targetObjectId))) throw new Error("Unavailable pattern-guided route");
    if (retry && patternRetryRefusal(state, spark, pattern)) throw new Error("Ineligible pattern-guided retry");
    const eventId = `event-${state.pulse}-${spark.id}-${pattern.id}-${decision.use ? "use" : "decline"}`;
    const event = emit(state, eventId, spark.id, decision.use
      ? `${spark.name} used public route pattern ${pattern.id}, encountered at pulse ${encounter.pulse}, to choose the Wild Cache ${pattern.targetObjectId}. This records route-guided activity, not arrival or a benefit.`
      : `${spark.name} did not use public route pattern ${pattern.id}: ${decision.reason}. The learned route fact remains available.`, [encounter.eventId, ...(retry ? [spark.wildCacheChoice!.outcomeEventId] : [])]);
    if (decision.use) {
      if (retry) state.patternGuidedRetry!.attempts.push({ sparkId: spark.id, cacheObjectId: pattern.targetObjectId, patternId: pattern.id, encounterEventId: encounter.eventId, useEventId: eventId, committedPulse: state.pulse, priorChoice: structuredClone(spark.wildCacheChoice!) });
      encounter.use = { pulse: state.pulse, eventId, ...(retry ? { retry: true as const } : {}) };
      spark.routePatternUse = { patternId: pattern.id, eventId };
    } else encounter.decline = { pulse: state.pulse, eventId, reason: decision.reason };
    spark.knownEvidenceEventIds.push(eventId);
    explain(state, spark, event, decision.use ? "Use the encountered route pattern" : "Continue without using the route pattern", [encounter.eventId]);
  }
  state.events.push(...physicalEvents);
}

export function finishRoutePatternUses(state: FirstGlowState): void {
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    const active = spark.routePatternUse;
    if (!active) continue;
    const pattern = state.routePatterns?.patterns.find(item => item.id === active.patternId);
    const encounter = pattern?.encounters.find(item => item.sparkId === spark.id);
    if (!pattern || !encounter?.use || encounter.use.eventId !== active.eventId) throw new Error("Invalid active route pattern use");
    const reachedCache = spark.wildCacheChoice?.pulse === state.pulse;
    const arrival = reachedCache && spark.wildCacheChoice?.cacheObjectId === pattern.targetObjectId;
    const interrupted = reachedCache || spark.intendedActivity !== "scavenge-cache" || ["no-route", "no-free-slot", "invalid-destination"].includes(spark.waitReason ?? "");
    if (!arrival && !interrupted) continue;
    const event = emit(state, `event-${state.pulse}-${spark.id}-${pattern.id}-outcome`, spark.id,
      `${spark.name}'s use of route pattern ${pattern.id} ${arrival ? `reached Wild Cache ${pattern.targetObjectId}; cache choice: ${spark.wildCacheChoice!.alternative}` : `was interrupted (${spark.waitReason ?? spark.intendedActivity})`}. Recorded resources: ${spark.carriedCharge} charge, ${spark.chargeDeficit} charge deficit, ${spark.readiness} readiness. No travel savings or social benefit are inferred.`,
      [active.eventId, ...(arrival ? [spark.wildCacheChoice!.outcomeEventId] : [])]);
    encounter.use.outcomeEventId = event.id;
    const retry = state.patternGuidedRetry?.attempts.find(item => item.useEventId === active.eventId);
    if (retry) retry.outcomeEventId = event.id;
    const explanation = state.explanations.find(item => item.id === `explanation-${active.eventId}`);
    explanation?.consequenceEvents.push({ id: event.id, pulse: state.pulse, message: event.message });
    spark.knownEvidenceEventIds.push(event.id);
    spark.routePatternUse = undefined;
    spark.routePatternTargetObjectId = undefined;
  }
}

/** Creation is local to the completed shard activity; reading is local and strictly later. */
export function updateRoutePatterns(state: FirstGlowState, reachable: (settlement: FirstGlowSettlement, spark: FirstGlowSpark, objectId: string) => boolean): void {
  const patterns = state.routePatterns?.patterns;
  if (!patterns) return;
  for (const settlement of state.settlements) for (const spark of settlement.sparks.slice().sort(ordered)) {
    const choice = spark.wildCacheChoice;
    const fact = choice?.routeFact;
    const completion = state.events.find(event => event.actorId === spark.id && event.kind === "shape-pattern");
    const shard = settlement.bundle.objects.find(object => object.id === fact?.objectId);
    const atShard = shard && settlement.bundle.objectDefinitions[shard.definitionId].slots.some(slot => sameCell(spark.position, { x: shard.origin.x + slot.offset.x, y: shard.origin.y + slot.offset.y }));
    if (!completion || !atShard || !fact?.originObjectId || choice!.alternative !== "probe" || patterns.length >= 64 || patterns.some(pattern => pattern.creatorId === spark.id) || !(state.geometricReturnPublicationVersion ? canPublishGeometricReturnRoute(settlement, spark, fact.originObjectId) : reachable(settlement, spark, fact.originObjectId))) continue;
    const id = `route-pattern-${spark.id}-${state.pulse}`;
    const event = emit(state, `event-${state.pulse}-${spark.id}-route-pattern-created`, spark.id,
      `${spark.name} left public route pattern ${id} at (${spark.position.x}, ${spark.position.y}), recording a return connection to Wild Cache ${fact.originObjectId}. It persists for later encounters; it creates no charge or automatic shared knowledge.`, [choice!.outcomeEventId, completion.id]);
    patterns.push({ id, public: true, creatorId: spark.id, settlementId: settlement.id, createdPulse: state.pulse, creationEventId: event.id, sourceEventIds: [choice!.outcomeEventId, completion.id], at: { ...spark.position }, targetObjectId: fact.originObjectId, navigationRevision: settlement.runtime.navigationRevision, encounters: [] });
    spark.knownEvidenceEventIds.push(event.id);
    explain(state, spark, event, "Leave a public route pattern", [choice!.outcomeEventId, completion.id]);
  }
  for (const pattern of patterns.slice().sort(ordered)) {
    if (pattern.createdPulse >= state.pulse) continue;
    const settlement = state.settlements.find(item => item.id === pattern.settlementId)!;
    for (const spark of settlement.sparks.slice().sort(ordered)) {
      if (spark.id === pattern.creatorId || !sameCell(spark.position, pattern.at) || pattern.encounters.some(item => item.sparkId === spark.id)) continue;
      const event = emit(state, `event-${state.pulse}-${spark.id}-${pattern.id}-encounter`, spark.id,
        `${spark.name} encountered public route pattern ${pattern.id} at (${pattern.at.x}, ${pattern.at.y}) and learned its recorded return connection to Wild Cache ${pattern.targetObjectId} at navigation revision ${pattern.navigationRevision}. No private creator memories were shared.`, [pattern.creationEventId]);
      pattern.encounters.push({ sparkId: spark.id, pulse: state.pulse, eventId: event.id });
      spark.knownEvidenceEventIds.push(event.id);
    }
  }
}

export function validateRoutePatterns(state: FirstGlowState): void {
  const data = state.routePatterns;
  const sparks = state.settlements.flatMap(settlement => settlement.sparks);
  if (!data) {
    if (sparks.some(spark => spark.routePatternUse || spark.routePatternTargetObjectId)) throw new Error("Route pattern state missing");
    return;
  }
  if (data.version !== ROUTE_PATTERN_VERSION || !state.wildCacheChoiceVersion || !Array.isArray(data.patterns) || data.patterns.length > 64) throw new Error("Unsupported route pattern policy");
  const ids = new Set<string>(), creators = new Set<string>();
  for (const pattern of data.patterns) {
    const settlement = state.settlements.find(item => item.id === pattern.settlementId);
    const creator = settlement?.sparks.find(spark => spark.id === pattern.creatorId);
    const target = settlement?.bundle.objects.find(object => object.id === pattern.targetObjectId);
    if (!pattern.id || ids.has(pattern.id) || creators.has(pattern.creatorId) || pattern.public !== true || !settlement || !creator || !Number.isInteger(pattern.createdPulse) || pattern.createdPulse < 1 || pattern.createdPulse > state.pulse || !creator.knownEvidenceEventIds.includes(pattern.creationEventId) || pattern.sourceEventIds.length !== 2 || !pattern.sourceEventIds.every(id => creator.knownEvidenceEventIds.includes(id)) || !target || !settlement.bundle.objectDefinitions[target.definitionId].capabilities.includes("wild-cache") || !Number.isInteger(pattern.navigationRevision) || pattern.navigationRevision < 0 || pattern.navigationRevision > settlement.runtime.navigationRevision || !Number.isInteger(pattern.at.x) || !Number.isInteger(pattern.at.y) || !settlement.bundle.objects.some(object => settlement.bundle.objectDefinitions[object.definitionId].capabilities.includes("pattern-shard") && settlement.bundle.objectDefinitions[object.definitionId].slots.some(slot => sameCell(pattern.at, { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y })))) throw new Error("Invalid route pattern artifact");
    ids.add(pattern.id); creators.add(pattern.creatorId);
    const readers = new Set<string>();
    for (const encounter of pattern.encounters) {
      const spark = settlement.sparks.find(spark => spark.id === encounter.sparkId);
      if (!spark || spark.id === creator.id || readers.has(spark.id) || !Number.isInteger(encounter.pulse) || encounter.pulse <= pattern.createdPulse || encounter.pulse > state.pulse || !spark.knownEvidenceEventIds.includes(encounter.eventId)) throw new Error("Invalid route pattern encounter");
      readers.add(spark.id);
      for (const decision of [encounter.decline, encounter.use]) if (decision && (!Number.isInteger(decision.pulse) || decision.pulse <= encounter.pulse || decision.pulse > state.pulse || !spark.knownEvidenceEventIds.includes(decision.eventId))) throw new Error("Invalid route pattern decision");
      if (encounter.use?.retry && !state.patternGuidedRetry) throw new Error("Retry use requires pattern-guided retry policy");
      if (encounter.use?.outcomeEventId && !spark.knownEvidenceEventIds.includes(encounter.use.outcomeEventId)) throw new Error("Invalid route pattern outcome");
    }
  }
  for (const settlement of state.settlements) for (const spark of settlement.sparks) {
    if (spark.routePatternTargetObjectId && !data.patterns.some(pattern => pattern.settlementId === settlement.id && pattern.targetObjectId === spark.routePatternTargetObjectId && pattern.encounters.some(encounter => encounter.sparkId === spark.id && !encounter.use?.outcomeEventId))) throw new Error("Invalid route pattern target");
    if (spark.routePatternUse && !data.patterns.some(pattern => pattern.settlementId === settlement.id && pattern.encounters.some(encounter => encounter.sparkId === spark.id && encounter.use?.eventId === spark.routePatternUse!.eventId && !encounter.use.outcomeEventId) && pattern.id === spark.routePatternUse!.patternId && pattern.targetObjectId === spark.routePatternTargetObjectId)) throw new Error("Invalid active route pattern use");
  }
}
