import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowReflectionCapacityState, designateFirstGlowHero, requestFirstGlowReflection } from "./first-glow-reflection-capacity.js";
import { projectFirstGlowObserver } from "./first-glow-observer.js";

test("observer projection exposes capacity and committed reflection effects without private memory", () => {
  const capacity = createFirstGlowReflectionCapacityState(["spark-1", "spark-2"]);
  designateFirstGlowHero(capacity, "spark-2");
  requestFirstGlowReflection(capacity, "spark-1", 10);
  const state = { pulse: 10, events: [{ id: "event-1" }], reflectionCapacity: capacity, settlements: [{ sparks: [{ id: "spark-1", name: "Lumen", knownEvidenceEventIds: [], intention: { activity: "explore", status: "active", source: "rules", summary: "Follow the next visible route.", createdPulse: 10, evidenceEventIds: [], causalEventIds: [] } }, { id: "spark-2", name: "Veil", knownEvidenceEventIds: [] }] }] } as never;
  const projection = projectFirstGlowObserver(state);
  assert.equal(projection.policy.baselineCapacity, 1);
  assert.equal(projection.sparks.find(spark => spark.id === "spark-2")?.capacity, 2);
  assert.equal(projection.sparks[0].intention?.summary, "Follow the next visible route.");
  assert.equal("reflectionMemory" in projection.sparks[0], false);
});
