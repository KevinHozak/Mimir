import test from "node:test";
import assert from "node:assert/strict";
import { createGoalFixtureWorld } from "./first-glow-goals-fixture.js";
import { buildFirstGlowGoalContext } from "./first-glow-goals.js";
import { compactFirstGlowGoalContext, validateFirstGlowGoalContextProjection } from "./first-glow-goal-context.js";

test("goal projection bounds growing local trust without rewriting its input", () => {
  const base = buildFirstGlowGoalContext(createGoalFixtureWorld().firstGlowState, "spark-1")!;
  const ids = Array.from({ length: 1000 }, (_, i) => `event-${i}`);
  const input = { ...base, projection: undefined, pulse: 1000, evidenceEventIds: ids, relationships: { trust: Array.from({ length: 64 }, (_, i) => ({ sourceSparkId: base.sparkId, targetSparkId: `spark-${i + 2}`, value: i, lastUpdatedPulse: i, evidenceEventIds: ids })), commitments: [] } };
  const before = JSON.stringify(input);
  const result = compactFirstGlowGoalContext(input);
  validateFirstGlowGoalContextProjection(result);
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.relationships!.trust.length, 6);
  assert.equal(result.relationships!.trust[0].value, 63);
  assert.equal(result.projection!.omittedTrust, 58);
  assert.ok(result.evidenceEventIds.length <= 16);
  assert.ok(result.relationships!.trust.every(t => t.evidenceEventIds.length <= 2 && t.omittedEvidence! >= 998));
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 12000);
  assert.deepEqual(compactFirstGlowGoalContext(result), result);
  const invalid = structuredClone(result);
  invalid.relationships!.trust[0].sourceSparkId = "other-spark";
  assert.throws(() => validateFirstGlowGoalContextProjection(invalid), /Invalid/);
  const legacy = { ...input, relationships: { trust: [...input.relationships.trust, { ...input.relationships.trust[0], sourceSparkId: "other-spark" }, { ...input.relationships.trust[0], targetSparkId: "future", lastUpdatedPulse: 1001 }], commitments: [] } };
  assert.equal(compactFirstGlowGoalContext(legacy).projection!.omittedTrust, 60);
});
