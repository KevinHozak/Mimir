/**
 * Pure, observer-facing Resonance candidate evaluation.
 *
 * This module intentionally has no First Glow state mutation and no Anchor
 * lifecycle. It evaluates already-committed objective evidence only.
 */
export interface ResonanceLocation {
  objectId: string;
  slotId: string;
}

export interface ResonanceObservationRule {
  id: string;
  anchorKind: string;
  requiredOccurrences: number;
  distinctParticipantMinimum: number;
  minimumChargeCost: number;
  maximumTickSpan: number;
  location: ResonanceLocation;
}

export interface ResonanceObservationEvent {
  id: string;
  tick: number;
  participants: string[];
  chargeCost: number;
  visibility: "observer" | "participants";
  location: ResonanceLocation;
  pattern?: string;
}

export type ResonanceObservationStatus = "qualifying" | "near-miss" | "conflicting" | "unresolved";

export interface ResonanceObservation {
  id: string;
  ruleId: string;
  anchorKind: string;
  status: ResonanceObservationStatus;
  location: ResonanceLocation;
  evidenceEventIds: string[];
  participantSparkIds: string[];
  occurrenceCount: number;
  distinctParticipantCount: number;
  totalChargeCost: number;
  tickSpan: number;
  threshold: {
    requiredOccurrences: number;
    distinctParticipantMinimum: number;
    minimumChargeCost: number;
    maximumTickSpan: number;
  };
  reasons: string[];
  observerVisible: boolean;
  privateKnowledgeExcluded: true;
}

const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function matchingEvents(events: ResonanceObservationEvent[], rule: ResonanceObservationRule): ResonanceObservationEvent[] {
  return events
    .filter((event) => event.pattern !== "shelter-refusal")
    .filter((event) => event.location.objectId === rule.location.objectId && event.location.slotId === rule.location.slotId)
    .slice()
    .sort((left, right) => left.tick - right.tick || compare(left.id, right.id));
}

/** Evaluate one authored rule against committed objective records. */
export function observeResonance(events: readonly ResonanceObservationEvent[], rule: ResonanceObservationRule): ResonanceObservation {
  const qualifying = matchingEvents([...events], rule);
  const participants = [...new Set(qualifying.flatMap((event) => event.participants))].sort(compare);
  const first = qualifying[0];
  const last = qualifying.at(-1);
  const tickSpan = first && last ? last.tick - first.tick : 0;
  const totalChargeCost = qualifying.reduce((total, event) => total + event.chargeCost, 0);
  const reasons: string[] = [];
  if (qualifying.length < rule.requiredOccurrences) reasons.push("required-occurrences-not-met");
  if (tickSpan > rule.maximumTickSpan) reasons.push("maximum-tick-span-exceeded");
  if (participants.length < rule.distinctParticipantMinimum) reasons.push("distinct-participant-minimum-not-met");
  if (totalChargeCost < rule.minimumChargeCost) reasons.push("minimum-charge-cost-not-met");
  const conflicting = [...events].some((event) => event.pattern === "shelter-refusal" && event.location.objectId === rule.location.objectId && event.location.slotId === rule.location.slotId);
  const status: ResonanceObservationStatus = reasons.length === 0 && qualifying.length > 0
    ? "qualifying"
    : conflicting && qualifying.length > 0 ? "conflicting"
      : qualifying.length > 0 ? "near-miss" : "unresolved";
  return {
    id: `observation-${rule.id}-${rule.location.objectId}-${rule.location.slotId}`,
    ruleId: rule.id,
    anchorKind: rule.anchorKind,
    status,
    location: { ...rule.location },
    evidenceEventIds: qualifying.map((event) => event.id).sort(compare),
    participantSparkIds: participants,
    occurrenceCount: qualifying.length,
    distinctParticipantCount: participants.length,
    totalChargeCost,
    tickSpan,
    threshold: {
      requiredOccurrences: rule.requiredOccurrences,
      distinctParticipantMinimum: rule.distinctParticipantMinimum,
      minimumChargeCost: rule.minimumChargeCost,
      maximumTickSpan: rule.maximumTickSpan,
    },
    reasons,
    // The observer projection is derived from committed objective records. A
    // participant-only record can still be shown as public history here; its
    // visibility must never be confused with what an individual Spark knows.
    observerVisible: true,
    privateKnowledgeExcluded: true,
  };
}
