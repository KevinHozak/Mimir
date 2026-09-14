import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { buildHearthCircuitCarryForward, evaluateHearthCircuitEligibility, type ResonanceMaintenanceWindow } from "./resonance-transition.js";
import { createWorldFromBundle } from "./index.js";

const bundle = JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url)), "utf8"));
const anchors = [
  { id: "anchor-loom", candidateId: "candidate-loom", anchorKind: "shelter-loom" as const, authoredObjectId: "tiled-107", authoredSlotId: "rest", createdPulse: 8, accessRuleId: "shelter-loom-shared-rest-v1", possibility: "shared rest", tension: "limited access", state: "active" as const, evidenceEventIds: ["loom-1", "loom-2", "loom-3"] },
  { id: "anchor-crossing", candidateId: "candidate-crossing", anchorKind: "crossing-voices" as const, authoredObjectId: "tiled-103", authoredSlotId: "crossing", createdPulse: 16, accessRuleId: "crossing-voices-witnessed-choice-v1", possibility: "signal choice", tension: "known course or new signal", state: "active" as const, evidenceEventIds: ["cross-1", "cross-2", "cross-3"] },
];
const windows: ResonanceMaintenanceWindow[] = [
  { season: 1, startPulse: 0, endPulse: 24, maintainedAnchorIds: anchors.map(anchor => anchor.id), objectiveEvidenceEventIds: ["loom-1", "loom-2", "loom-3"], decisionIds: ["decision-1"], unresolvedTensionIds: ["loom-access"] },
  { season: 2, startPulse: 24, endPulse: 48, maintainedAnchorIds: anchors.map(anchor => anchor.id), objectiveEvidenceEventIds: ["cross-1", "cross-2", "cross-3"], decisionIds: ["decision-2"], unresolvedTensionIds: ["crossing-route"] },
];

test("maintained distinct Anchors earn eligibility without choosing a philosophy", () => {
  const result = evaluateHearthCircuitEligibility({ simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", resonance: { schemaVersion: 1, candidates: [], anchors }, maintenanceWindows: windows });
  assert.equal(result.status, "eligible");
  assert.equal(result.eligible, true);
  assert.deepEqual(result.scorecard.activeAnchorKinds, ["crossing-voices", "shelter-loom"]);
  assert.equal(result.scorecard.unresolvedTensionCount, 2);
  assert.deepEqual(result.reasons, []);
});

test("insufficient maintenance defers without making First Glow a loss state", () => {
  const result = evaluateHearthCircuitEligibility({ simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", resonance: { schemaVersion: 1, candidates: [], anchors: [anchors[0]] }, maintenanceWindows: [windows[0]] });
  assert.equal(result.status, "deferred");
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes("two-distinct-active-anchor-kinds-required"));
  assert.ok(result.reasons.includes("two-maintained-season-windows-required"));
});

test("carry-forward preserves Sparks, relationships, records, places, tensions, and bundle identity", () => {
  const world = createWorldFromBundle(bundle, 11, "transition-test", 2);
  world.resonance = { schemaVersion: 1, candidates: [], anchors };
  world.events = [{ id: "event-objective", pulse: 1, kind: "world-object", message: "observed", villagerIds: [] }];
  world.interpretations = [{ id: "reading-1", pulse: 1, eventId: "event-objective", source: "rules", summary: "bounded", evidenceEventIds: ["event-objective"] }];
  const candidate = buildHearthCircuitCarryForward(world, "timeline-test", windows, ["explicit-unresolved-tension"]);
  assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.targetAgeId, "hearth-circuit");
  assert.equal(candidate.sourceTimelineId, "timeline-test");
  assert.equal(candidate.transition.status, "eligible");
  assert.equal(candidate.sparks.length, 2);
  assert.deepEqual(candidate.sourceBundleHashes, [bundle.bundle.contentHash]);
  assert.deepEqual(candidate.records.objectiveEventIds, ["event-objective"]);
  assert.ok(candidate.unresolvedTensions.includes("explicit-unresolved-tension"));
  assert.equal(candidate.places.length, 2);
});
