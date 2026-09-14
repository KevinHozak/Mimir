import { queryCell, type DecodedWorldBundle } from "@mimir/world-data";

export interface ShelterLoomRule {
  id: "shelter-loom-v1";
  anchorKind: "shelter-loom";
  qualifyingEventKinds: string[];
  requiredOccurrences: number;
  distinctParticipantMinimum: number;
  minimumChargeCost: number;
  maximumPulseSpan: number;
  requiredLocation: { objectId: string; slotId: string };
  accessRuleId: "shelter-loom-shared-rest-v1";
  possibility: string;
  tension: string;
  alteration: { eventKinds: string[]; effect: "altered" | "decayed" };
}

export const SHELTER_LOOM_RULE: ShelterLoomRule = {
  id: "shelter-loom-v1",
  anchorKind: "shelter-loom",
  qualifyingEventKinds: ["idle", "meet", "share"],
  requiredOccurrences: 3,
  distinctParticipantMinimum: 2,
  minimumChargeCost: 6,
  maximumPulseSpan: 12,
  requiredLocation: { objectId: "tiled-107", slotId: "rest" },
  accessRuleId: "shelter-loom-shared-rest-v1",
  possibility: "Sparks may choose a durable shared-rest practice at this niche.",
  tension: "The rest slot is limited; access and help cannot be presumed to belong to one Spark.",
  alteration: { eventKinds: ["shelter-refusal", "shelter-loom-damage"], effect: "altered" },
};

export interface ResonanceCandidateRecord {
  id: string;
  ruleId: string;
  location: { objectId: string; slotId: string };
  qualifyingEventIds: string[];
  participantSparkIds: string[];
  totalChargeCost: number;
  formedPulse: number;
  status: "pending" | "created" | "failed" | "altered" | "decayed";
  auditEvidenceEventIds: string[];
  failure?: { code: string; evidenceEventIds: string[] };
}

export interface ResonanceAnchorRecord {
  id: string;
  candidateId: string;
  anchorKind: "shelter-loom" | "crossing-voices";
  authoredObjectId: string;
  authoredSlotId: string;
  createdPulse: number;
  accessRuleId: string;
  possibility: string;
  tension: string;
  state: "active" | "altered" | "decayed";
  evidenceEventIds: string[];
}

export interface ResonanceState {
  schemaVersion: 1;
  candidates: ResonanceCandidateRecord[];
  anchors: ResonanceAnchorRecord[];
  decisions?: ShelterLoomDecisionRecord[];
  crossingDecisions?: CrossingVoicesDecisionRecord[];
}

export type ShelterLoomChoice = "yield-rest" | "hold-rest";

export interface ShelterLoomDecisionRecord {
  id: string;
  anchorId: string;
  pulse: number;
  actorSparkId: string;
  beneficiarySparkId: string;
  choice: ShelterLoomChoice;
  accessRuleId: string;
  chargeCost: number;
  actorReadinessDelta: number;
  beneficiaryReadinessDelta: number;
  actorChargeDelta: number;
  actorDeficitDelta: number;
  outcome: "priority-granted" | "priority-refused";
  durableConsequence: string;
  evidenceEventIds: string[];
}

export interface CrossingVoicesDecisionRecord {
  id: string;
  anchorId: string;
  pulse: number;
  actorSparkId: string;
  choice: "follow-signal" | "hold-course";
  accessRuleId: string;
  chargeCost: number;
  readinessDelta: number;
  intendedActivity: string;
  outcome: "new-signal-followed" | "known-course-held";
  durableConsequence: string;
  evidenceEventIds: string[];
}

export type ShelterLoomCreationResult =
  | { ok: true; candidate: ResonanceCandidateRecord; anchor: ResonanceAnchorRecord }
  | { ok: false; code: "invalid-candidate" | "missing-bundle-object" | "missing-bundle-slot" | "missing-capability" | "unwalkable-placement" | "candidate-not-pending" };

const sortedUnique = (values: string[]) => values.length === new Set(values).size && values.every((value, index) => index === 0 || values[index - 1] < value);

export function createShelterLoomAnchor(candidate: ResonanceCandidateRecord, bundle: DecodedWorldBundle, createdPulse: number): ShelterLoomCreationResult {
  if (candidate.status !== "pending") return { ok: false, code: "candidate-not-pending" };
  if (candidate.ruleId !== SHELTER_LOOM_RULE.id || candidate.location.objectId !== SHELTER_LOOM_RULE.requiredLocation.objectId || candidate.location.slotId !== SHELTER_LOOM_RULE.requiredLocation.slotId || candidate.qualifyingEventIds.length < SHELTER_LOOM_RULE.requiredOccurrences || candidate.participantSparkIds.length < SHELTER_LOOM_RULE.distinctParticipantMinimum || candidate.totalChargeCost < SHELTER_LOOM_RULE.minimumChargeCost || candidate.totalChargeCost < 0 || candidate.formedPulse < 0 || !sortedUnique(candidate.qualifyingEventIds) || !sortedUnique(candidate.participantSparkIds) || !sortedUnique(candidate.auditEvidenceEventIds)) return { ok: false, code: "invalid-candidate" };
  const object = bundle.objects.find((item) => item.id === candidate.location.objectId);
  if (!object) return { ok: false, code: "missing-bundle-object" };
  const definition = bundle.objectDefinitions[object.definitionId];
  const slot = definition?.slots.find((item) => item.id === candidate.location.slotId);
  if (!definition || !slot) return { ok: false, code: "missing-bundle-slot" };
  if (!definition.capabilities.includes("shelter-niche")) return { ok: false, code: "missing-capability" };
  const cell = { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y };
  if (!queryCell(bundle, { navigationRevision: 0, objects: [], reservations: [] }, cell).walkable) return { ok: false, code: "unwalkable-placement" };
  const anchor: ResonanceAnchorRecord = {
    id: `anchor-${candidate.id}`,
    candidateId: candidate.id,
    anchorKind: SHELTER_LOOM_RULE.anchorKind,
    authoredObjectId: object.id,
    authoredSlotId: slot.id,
    createdPulse,
    accessRuleId: SHELTER_LOOM_RULE.accessRuleId,
    possibility: SHELTER_LOOM_RULE.possibility,
    tension: SHELTER_LOOM_RULE.tension,
    state: "active",
    evidenceEventIds: [...new Set([...candidate.qualifyingEventIds, ...candidate.auditEvidenceEventIds])].sort(),
  };
  return { ok: true, candidate: { ...candidate, status: "created" }, anchor };
}
