import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createWorldFromBundle } from "./index.js";
import { applyShelterLoomChoice } from "./resonance-loom-choice.js";
import { advanceFirstGlowState } from "./structured.js";
import type { ResonanceAnchorRecord } from "./resonance-anchor.js";

const bundle = JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url)), "utf8"));

function setup() {
  const world = createWorldFromBundle(bundle, 7, "loom-test", 2);
  const firstGlowState = world.firstGlowState;
  const settlement = firstGlowState.settlements[0];
  const object = settlement.bundle.objects.find(item => item.id === "tiled-107")!;
  const slot = settlement.bundle.objectDefinitions[object.definitionId].slots.find(item => item.id === "rest")!;
  const cell = { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y };
  for (const spark of settlement.sparks) { spark.position = { ...cell }; spark.status = "idle"; spark.knownEvidenceEventIds = ["evidence-1"]; }
  const anchor: ResonanceAnchorRecord = { id: "anchor-candidate-loom", candidateId: "candidate-loom", anchorKind: "shelter-loom", authoredObjectId: "tiled-107", authoredSlotId: "rest", createdPulse: 3, accessRuleId: "shelter-loom-shared-rest-v1", possibility: "shared rest", tension: "limited access", state: "active", evidenceEventIds: ["evidence-1"] };
  return { firstGlowState, anchor };
}

test("Shelter Loom yield and hold are deterministic, resource-accounted alternatives", () => {
  const first = setup();
  const yielded = applyShelterLoomChoice(first.firstGlowState, first.anchor, "spark-1", "spark-2", "yield-rest", ["evidence-1"]);
  const repeated = applyShelterLoomChoice(first.firstGlowState, first.anchor, "spark-1", "spark-2", "yield-rest", ["evidence-1"]);
  assert.deepEqual(yielded, repeated);
  assert.equal(yielded.ok, true);
  if (yielded.ok) {
    assert.equal(yielded.decision.outcome, "priority-granted");
    assert.equal(yielded.state.ledger.at(-1)?.reason, "shelter-loom-yield-rest");
    assert.equal(yielded.event.kind, "shelter-loom-choice");
  }
  const held = applyShelterLoomChoice(setup().firstGlowState, setup().anchor, "spark-1", "spark-2", "hold-rest", ["evidence-1"]);
  assert.equal(held.ok, true);
  if (held.ok) assert.equal(held.decision.outcome, "priority-refused");
  assert.notDeepEqual(yielded, held);
  if (yielded.ok && held.ok) {
    const afterYield = advanceFirstGlowState(yielded.state);
    const afterHold = advanceFirstGlowState(held.state);
    const yieldedSpark = afterYield.settlements[0].sparks.find(spark => spark.id === "spark-2")!;
    const heldSpark = afterHold.settlements[0].sparks.find(spark => spark.id === "spark-2")!;
    assert.notEqual(yieldedSpark.readiness, heldSpark.readiness, "the Loom choice persists into the next deterministic season step");
  }
});

test("Shelter Loom refuses private or out-of-place evidence", () => {
  const fixture = setup();
  assert.deepEqual(applyShelterLoomChoice(fixture.firstGlowState, fixture.anchor, "spark-1", "spark-2", "yield-rest", ["missing"]), { ok: false, code: "invalid-evidence" });
  fixture.firstGlowState.settlements[0].sparks[1].position.x += 1;
  assert.deepEqual(applyShelterLoomChoice(fixture.firstGlowState, fixture.anchor, "spark-1", "spark-2", "yield-rest", ["evidence-1"]), { ok: false, code: "not-at-loom" });
});
