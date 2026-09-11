import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { createWorldFromBundle } from "./index.js";
import { createCrossingVoicesAnchor, CROSSING_VOICES_RULE } from "./resonance-crossing-rule.js";
import { applyCrossingVoicesChoice } from "./resonance-crossing.js";
import { applyShelterLoomChoice } from "./resonance-loom-choice.js";
import type { ResonanceCandidateRecord } from "./resonance-anchor.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url)), "utf8")));
const candidate: ResonanceCandidateRecord = { id: "candidate-crossing-voices-tiled-103", ruleId: CROSSING_VOICES_RULE.id, location: { ...CROSSING_VOICES_RULE.requiredLocation }, qualifyingEventIds: ["event-crossing-1", "event-crossing-2", "event-crossing-3"], participantSparkIds: ["spark-1", "spark-2", "spark-3"], totalChargeCost: 4, formedTick: 16, status: "pending", auditEvidenceEventIds: ["event-crossing-1", "event-crossing-2", "event-crossing-3"] };

test("Crossing of Voices forms only from plural, distinct evidence at the authored relay", () => {
  const first = createCrossingVoicesAnchor(candidate, bundle, 16);
  assert.deepEqual(first, createCrossingVoicesAnchor(candidate, bundle, 16));
  assert.equal(first.ok, true);
  if (first.ok) { assert.equal(first.anchor.anchorKind, "crossing-voices"); assert.equal(first.anchor.authoredObjectId, "tiled-103"); assert.equal(first.anchor.authoredSlotId, "crossing"); }
  assert.deepEqual(createCrossingVoicesAnchor({ ...candidate, participantSparkIds: ["spark-1", "spark-2"] }, bundle, 16), { ok: false, code: "invalid-candidate" });
});

test("Crossing of Voices keeps follow and hold paths defensible but durable", () => {
  const world = createWorldFromBundle(bundle, 11, "crossing-test", 1);
  const state = world.firstGlowState;
  const spark = state.settlements[0].sparks[0];
  spark.position = { x: 16, y: 12 }; spark.status = "idle"; spark.carriedCharge = 2; spark.knownEvidenceEventIds = ["event-crossing-1"];
  const anchor = createCrossingVoicesAnchor(candidate, bundle, 16);
  assert.equal(anchor.ok, true);
  if (!anchor.ok) return;
  const follow = applyCrossingVoicesChoice(state, anchor.anchor, spark.id, "follow-signal", ["event-crossing-1"]);
  const hold = applyCrossingVoicesChoice(state, anchor.anchor, spark.id, "hold-course", ["event-crossing-1"]);
  assert.equal(follow.ok, true); assert.equal(hold.ok, true); assert.notDeepEqual(follow, hold);
  if (follow.ok && hold.ok) { assert.equal(follow.decision.outcome, "new-signal-followed"); assert.equal(hold.decision.outcome, "known-course-held"); assert.equal(follow.state.settlements[0].sparks[0].intendedActivity, "explore"); assert.equal(hold.state.settlements[0].sparks[0].intendedActivity, "seek-charge"); }
});

test("fixed-seed comparison keeps Crossing of Voices distinct from Shelter Loom", () => {
  const crossingWorld = createWorldFromBundle(bundle, 11, "comparison-crossing", 1);
  const crossingState = crossingWorld.firstGlowState;
  const crossingSpark = crossingState.settlements[0].sparks[0];
  crossingSpark.position = { x: 16, y: 12 }; crossingSpark.status = "idle"; crossingSpark.carriedCharge = 2; crossingSpark.knownEvidenceEventIds = ["event-crossing-1"];
  const crossingAnchor = createCrossingVoicesAnchor(candidate, bundle, 16);
  assert.equal(crossingAnchor.ok, true);
  if (!crossingAnchor.ok) return;
  const crossing = applyCrossingVoicesChoice(crossingState, crossingAnchor.anchor, crossingSpark.id, "follow-signal", ["event-crossing-1"]);

  const shelterWorld = createWorldFromBundle(bundle, 11, "comparison-shelter", 2);
  const shelterState = shelterWorld.firstGlowState;
  const shelterSettlement = shelterState.settlements[0];
  const shelterCell = { x: 27, y: 5 };
  for (const spark of shelterSettlement.sparks) { spark.position = shelterCell; spark.status = "idle"; spark.knownEvidenceEventIds = ["event-shelter-1"]; }
  const shelter = applyShelterLoomChoice(shelterState, { id: "anchor-shelter", candidateId: "candidate-shelter", anchorKind: "shelter-loom", authoredObjectId: "tiled-107", authoredSlotId: "rest", createdTick: 16, accessRuleId: "shelter-loom-shared-rest-v1", possibility: "shared rest", tension: "limited access", state: "active", evidenceEventIds: ["event-shelter-1"] }, "spark-1", "spark-2", "yield-rest", ["event-shelter-1"]);
  assert.equal(crossing.ok, true); assert.equal(shelter.ok, true);
  if (crossing.ok && shelter.ok) { assert.equal(crossing.decision.choice, "follow-signal"); assert.equal(shelter.decision.choice, "yield-rest"); assert.equal(crossing.state.settlements[0].sparks[0].intendedActivity, "explore"); assert.notEqual(crossing.state.settlements[0].sparks[0].intendedActivity, shelter.state.settlements[0].sparks[0].intendedActivity); assert.notEqual(crossing.state.settlements[0].sparks[1], shelter.state.settlements[0].sparks[1]); }
});
