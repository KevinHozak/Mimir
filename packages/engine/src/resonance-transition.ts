import type { WorldState } from "./index.js";
import type { ResonanceAnchorRecord, ResonanceState } from "./resonance-anchor.js";

export const HEARTH_CIRCUIT_TRANSITION_SCHEMA_VERSION = 1 as const;
export const HEARTH_CIRCUIT_TARGET_AGE = "hearth-circuit" as const;

export interface ResonanceMaintenanceWindow {
  season: number;
  startPulse: number;
  endPulse: number;
  maintainedAnchorIds: string[];
  objectiveEvidenceEventIds: string[];
  decisionIds: string[];
  unresolvedTensionIds: string[];
}

export interface HearthCircuitEligibilityInput {
  simulationVersion: string;
  spatialModel: string;
  resonance: ResonanceState | undefined;
  maintenanceWindows: ResonanceMaintenanceWindow[];
}

export interface HearthCircuitEligibilityResult {
  status: "eligible" | "deferred";
  eligible: boolean;
  reasons: string[];
  scorecard: {
    activeAnchorKinds: string[];
    maintainedSeasons: number;
    objectiveEvidenceCount: number;
    decisionCount: number;
    unresolvedTensionCount: number;
  };
}

export interface HearthCircuitCarryForward {
  schemaVersion: typeof HEARTH_CIRCUIT_TRANSITION_SCHEMA_VERSION;
  targetAgeId: typeof HEARTH_CIRCUIT_TARGET_AGE;
  sourceTimelineId: string;
  sourceWorldId: string;
  sourcePulse: number;
  sourceSimulationVersion: string;
  sourceSpatialModel: string;
  sourceBundleHashes: string[];
  sparks: Array<{ id: string; name: string; position: { x: number; y: number }; carriedCharge: number; chargeDeficit: number; readiness: number }>;
  relationships: unknown[];
  commitments: unknown[];
  records: { objectiveEventIds: string[]; interpretationIds: string[] };
  places: Array<Pick<ResonanceAnchorRecord, "id" | "anchorKind" | "authoredObjectId" | "authoredSlotId" | "state" | "evidenceEventIds">>;
  unresolvedTensions: string[];
  transition: HearthCircuitEligibilityResult;
}

const uniqueSorted = (values: string[]) => [...new Set(values)].sort();

export function evaluateHearthCircuitEligibility(input: HearthCircuitEligibilityInput): HearthCircuitEligibilityResult {
  const anchors = input.resonance?.anchors ?? [];
  const activeAnchors = anchors.filter(anchor => anchor.state === "active");
  const activeAnchorKinds = uniqueSorted(activeAnchors.map(anchor => anchor.anchorKind));
  const validAnchorIds = new Set(activeAnchors.map(anchor => anchor.id));
  const windows = input.maintenanceWindows.slice().sort((left, right) => left.season - right.season || left.startPulse - right.startPulse);
  const validWindows = windows.filter(window => Number.isInteger(window.season) && window.startPulse >= 0 && window.endPulse > window.startPulse && window.maintainedAnchorIds.length > 0 && window.maintainedAnchorIds.every(id => validAnchorIds.has(id)));
  const evidence = uniqueSorted(validWindows.flatMap(window => window.objectiveEvidenceEventIds));
  const decisions = uniqueSorted(validWindows.flatMap(window => window.decisionIds));
  const tensions = uniqueSorted(validWindows.flatMap(window => window.unresolvedTensionIds));
  const reasons: string[] = [];
  if (input.simulationVersion !== "mimir-sim-v3-first-glow" || input.spatialModel !== "structured-v2") reasons.push("source-runtime-is-not-first-glow-structured-v2");
  if (activeAnchorKinds.length < 2) reasons.push("two-distinct-active-anchor-kinds-required");
  if (validWindows.length < 2) reasons.push("two-maintained-season-windows-required");
  if (evidence.length < 6) reasons.push("six-objective-evidence-events-required");
  if (decisions.length < 2) reasons.push("two-recorded-practice-decisions-required");
  if (activeAnchors.some(anchor => anchor.evidenceEventIds.length === 0)) reasons.push("active-anchors-require-formation-evidence");
  return { status: reasons.length === 0 ? "eligible" : "deferred", eligible: reasons.length === 0, reasons, scorecard: { activeAnchorKinds, maintainedSeasons: validWindows.length, objectiveEvidenceCount: evidence.length, decisionCount: decisions.length, unresolvedTensionCount: tensions.length } };
}

export function buildHearthCircuitCarryForward(world: WorldState, timelineId: string, maintenanceWindows: ResonanceMaintenanceWindow[], unresolvedTensions: string[] = []): HearthCircuitCarryForward {
  const firstGlow = world.firstGlowState;
  const resonance = world.resonance;
  const transition = evaluateHearthCircuitEligibility({ simulationVersion: world.simulationVersion, spatialModel: world.spatialModel, resonance, maintenanceWindows });
  const settlement = firstGlow.settlements[0];
  return {
    schemaVersion: HEARTH_CIRCUIT_TRANSITION_SCHEMA_VERSION,
    targetAgeId: HEARTH_CIRCUIT_TARGET_AGE,
    sourceWorldId: world.worldId,
    sourceTimelineId: timelineId,
    sourcePulse: world.pulse,
    sourceSimulationVersion: world.simulationVersion,
    sourceSpatialModel: world.spatialModel,
    sourceBundleHashes: uniqueSorted(firstGlow.settlements.map(item => item.bundle.bundle.contentHash)),
    sparks: firstGlow.settlements.flatMap(item => item.sparks.map(spark => ({ id: spark.id, name: spark.name, position: { ...spark.position }, carriedCharge: spark.carriedCharge, chargeDeficit: spark.chargeDeficit, readiness: spark.readiness }))),
    relationships: structuredClone(firstGlow.social.trust),
    commitments: structuredClone(firstGlow.social.commitments),
    records: { objectiveEventIds: uniqueSorted(world.events.map((event: { id: string }) => event.id)), interpretationIds: uniqueSorted(world.interpretations.map((interpretation: { id: string }) => interpretation.id)) },
    places: (resonance?.anchors ?? []).map(anchor => ({ id: anchor.id, anchorKind: anchor.anchorKind, authoredObjectId: anchor.authoredObjectId, authoredSlotId: anchor.authoredSlotId, state: anchor.state, evidenceEventIds: anchor.evidenceEventIds.slice().sort() })),
    unresolvedTensions: uniqueSorted(unresolvedTensions.concat(maintenanceWindows.flatMap(window => window.unresolvedTensionIds))),
    transition,
  };
}
