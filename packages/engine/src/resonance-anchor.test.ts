import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { createShelterLoomAnchor, type ResonanceCandidateRecord } from "./resonance-anchor.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url)), "utf8")));
const candidate = (overrides: Partial<ResonanceCandidateRecord> = {}): ResonanceCandidateRecord => ({ id: "candidate-shelter-loom-v1-tiled-107-rest-event-14-help", ruleId: "shelter-loom-v1", location: { objectId: "tiled-107", slotId: "rest" }, qualifyingEventIds: ["event-14-help", "event-4-help", "event-9-help"], participantSparkIds: ["spark-a", "spark-b", "spark-c"], totalChargeCost: 6, formedPulse: 14, status: "pending", auditEvidenceEventIds: ["event-14-help", "event-4-help", "event-9-help"], ...overrides });

test("Shelter Loom creation is deterministic at the authored niche companion", () => {
  const first = createShelterLoomAnchor(candidate(), bundle, 14);
  const second = createShelterLoomAnchor(candidate(), bundle, 14);
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);
  if (first.ok) {
    assert.equal(first.anchor.authoredObjectId, "tiled-107");
    assert.equal(first.anchor.authoredSlotId, "rest");
    assert.equal(first.anchor.state, "active");
    assert.deepEqual(first.anchor.evidenceEventIds, ["event-14-help", "event-4-help", "event-9-help"]);
  }
});

test("near misses and invalid placements fail without creating an Anchor", () => {
  assert.deepEqual(createShelterLoomAnchor(candidate({ totalChargeCost: 5 }), bundle, 14), { ok: false, code: "invalid-candidate" });
  assert.deepEqual(createShelterLoomAnchor(candidate({ location: { objectId: "missing-object", slotId: "rest" } }), bundle, 14), { ok: false, code: "invalid-candidate" });
  assert.deepEqual(createShelterLoomAnchor(candidate({ status: "created" }), bundle, 14), { ok: false, code: "candidate-not-pending" });
});
