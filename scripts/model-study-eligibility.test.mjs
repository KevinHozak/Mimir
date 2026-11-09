import test from "node:test";
import assert from "node:assert/strict";
import { createFirstGlowReflectionCapacityState, requestFirstGlowReflection, firstGlowReflectionCadence } from "@mimir/engine";
import { studyEligibility } from "./model-study-eligibility.mjs";

test("only recorded RC1 slots are eligible, once per Spark per 64-pulse day", () => {
  const reflectionCapacity = createFirstGlowReflectionCapacityState(["spark-1"]);
  const state = { reflectionCapacity };
  const eligible = studyEligibility();
  const pulse = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  const context = { actorSparkId: "spark-1", pulse };
  assert.equal(eligible(state, context), false);
  requestFirstGlowReflection(reflectionCapacity, "spark-1", pulse);
  const before = JSON.stringify(state);
  assert.equal(eligible(state, context), true);
  assert.equal(eligible(state, context), false);
  assert.equal(JSON.stringify(state), before, "eligibility must not mutate canonical RC state");
  requestFirstGlowReflection(reflectionCapacity, "spark-1", pulse + 64);
  assert.equal(eligible(state, { ...context, pulse: pulse + 64 }), true);
  reflectionCapacity.assignments["spark-1"].capacity = 2;
  assert.throws(() => eligible(state, context), /policy mismatch/);
});
