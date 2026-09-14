import { queryCell, type DecodedWorldBundle } from "@mimir/world-data";
import type { ResonanceAnchorRecord, ResonanceCandidateRecord } from "./resonance-anchor.js";

export const CROSSING_VOICES_RULE = {
  id: "crossing-voices-v1",
  anchorKind: "crossing-voices" as const,
  qualifyingEventKinds: ["meet", "mark-trace", "explore"],
  requiredOccurrences: 3,
  distinctParticipantMinimum: 3,
  minimumChargeCost: 4,
  maximumPulseSpan: 16,
  requiredLocation: { objectId: "tiled-103", slotId: "crossing" },
  accessRuleId: "crossing-voices-witnessed-choice-v1",
  possibility: "Sparks may choose whether a newer crossing signal should redirect the group.",
  tension: "A fresh signal may reveal a safer route, but following it can discard the dependable course that earlier witnesses defend.",
  alteration: { eventKinds: ["crossing-signal-fades", "crossing-route-blocked"], effect: "altered" as const },
};

const sortedUnique = (values: string[]) => values.length === new Set(values).size && values.every((value, index) => index === 0 || values[index - 1] < value);

export type CrossingVoicesCreationResult =
  | { ok: true; candidate: ResonanceCandidateRecord; anchor: ResonanceAnchorRecord }
  | { ok: false; code: "candidate-not-pending" | "invalid-candidate" | "missing-bundle-object" | "unwalkable-placement" | "missing-capability" };

export function createCrossingVoicesAnchor(candidate: ResonanceCandidateRecord, bundle: DecodedWorldBundle, createdPulse: number): CrossingVoicesCreationResult {
  if (candidate.status !== "pending") return { ok: false, code: "candidate-not-pending" };
  if (candidate.ruleId !== CROSSING_VOICES_RULE.id || candidate.location.objectId !== CROSSING_VOICES_RULE.requiredLocation.objectId || candidate.location.slotId !== CROSSING_VOICES_RULE.requiredLocation.slotId || candidate.qualifyingEventIds.length < CROSSING_VOICES_RULE.requiredOccurrences || candidate.participantSparkIds.length < CROSSING_VOICES_RULE.distinctParticipantMinimum || candidate.totalChargeCost < CROSSING_VOICES_RULE.minimumChargeCost || candidate.formedPulse < 0 || !sortedUnique(candidate.qualifyingEventIds) || !sortedUnique(candidate.participantSparkIds) || !sortedUnique(candidate.auditEvidenceEventIds)) return { ok: false, code: "invalid-candidate" };
  const object = bundle.objects.find(item => item.id === candidate.location.objectId);
  if (!object) return { ok: false, code: "missing-bundle-object" };
  const definition = bundle.objectDefinitions[object.definitionId];
  if (!definition.capabilities.includes("relay-crossing")) return { ok: false, code: "missing-capability" };
  if (!queryCell(bundle, { navigationRevision: 0, objects: [], reservations: [] }, object.origin).walkable) return { ok: false, code: "unwalkable-placement" };
  const anchor: ResonanceAnchorRecord = { id: `anchor-${candidate.id}`, candidateId: candidate.id, anchorKind: CROSSING_VOICES_RULE.anchorKind, authoredObjectId: object.id, authoredSlotId: candidate.location.slotId, createdPulse, accessRuleId: CROSSING_VOICES_RULE.accessRuleId, possibility: CROSSING_VOICES_RULE.possibility, tension: CROSSING_VOICES_RULE.tension, state: "active", evidenceEventIds: [...new Set([...candidate.qualifyingEventIds, ...candidate.auditEvidenceEventIds])].sort() };
  return { ok: true, candidate: { ...candidate, status: "created" }, anchor };
}
