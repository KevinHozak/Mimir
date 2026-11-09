import test from "node:test";
import assert from "node:assert/strict";
import { createFirstGlowReflectionCapacityState, firstGlowReflectionCadence } from "@mimir/engine";
import { auditCandidates } from "./model-study-opportunity-audit.mjs";

test("shadow audit distinguishes missing wiring from cadence and never mutates source RC", () => {
  const rc = createFirstGlowReflectionCapacityState(["spark-1"]);
  const before = JSON.stringify(rc);
  const phase = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  const trace = auditCandidates(rc, [
    { sparkId: "spark-1", pulse: phase, eventId: "a" },
    { sparkId: "spark-1", pulse: phase, eventId: "b" },
    { sparkId: "spark-1", pulse: phase + 64, eventId: "c" }
  ]);
  assert.deepEqual(trace.map(item => item.shadowCreated), [true, false, true]);
  assert.ok(trace.every(item => item.v2Recorded === false));
  assert.equal(JSON.stringify(rc), before);
});

test("shadow audit keeps an early candidate suppressed instead of inventing a slot", () => {
  const rc = createFirstGlowReflectionCapacityState(["spark-6"]);
  const phase = firstGlowReflectionCadence("spark-6", 1).phaseOffset;
  assert.ok(phase > 0);
  const trace = auditCandidates(rc, [{ sparkId: "spark-6", pulse: phase - 1, eventId: "early" }]);
  assert.equal(trace[0].shadowCreated, false);
  assert.equal(trace[0].shadowReason, "cadence-window-not-ready");
});
