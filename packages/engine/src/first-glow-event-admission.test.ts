import test from "node:test";
import assert from "node:assert/strict";
import { admitFirstGlowEvent, initializeFirstGlowEventAdmission } from "./first-glow-event-admission.js";
import { createFirstGlowReflectionCapacityState, firstGlowReflectionCadence, requestFirstGlowReflection, validateFirstGlowReflectionCapacity } from "./first-glow-reflection-capacity.js";
import { createWorldFromBundle, advanceWorld } from "./index.js";
import { readFileSync } from "node:fs";

test("event admission observes cadence, capacity, duplicate ownership, restart and day boundaries", () => {
  const rc = initializeFirstGlowEventAdmission(createFirstGlowReflectionCapacityState(["spark-1"]), 0);
  const phase = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  assert.equal(admitFirstGlowEvent(rc, "early", "spark-1", phase - 1).reason, "cadence-window-not-ready");
  assert.equal(admitFirstGlowEvent(rc, "first", "spark-1", phase).created, true);
  const restored = JSON.parse(JSON.stringify(rc));
  assert.equal(admitFirstGlowEvent(restored, "first", "spark-1", phase).reason, "duplicate-event");
  assert.equal(admitFirstGlowEvent(restored, "other", "spark-1", phase).reason, "slot-already-owned");
  assert.equal(admitFirstGlowEvent(restored, "slot-end", "spark-1", 63).reason, "capacity-exhausted");
  assert.equal(admitFirstGlowEvent(restored, "next-day", "spark-1", phase + 64).created, true);
  assert.equal(admitFirstGlowEvent(restored, "stale", "spark-1", phase).reason, "historical-candidate");
  validateFirstGlowReflectionCapacity(restored, ["spark-1"]);
});

test("other scheduler consumers and global caps share the same allowance", () => {
  const rc = initializeFirstGlowEventAdmission(createFirstGlowReflectionCapacityState(["spark-1", "spark-2"], { globalDailyLimit: 1 }), 0);
  const phase = firstGlowReflectionCadence("spark-1", 1).phaseOffset;
  requestFirstGlowReflection(rc, "spark-1", phase);
  assert.equal(admitFirstGlowEvent(rc, "already-owned", "spark-1", phase).created, false);
  assert.equal(admitFirstGlowEvent(rc, "global", "spark-2", 40).reason, "global-cap-exhausted");
  assert.equal(rc.scheduler.globalUsed, 1);
});

test("old or invalid policy histories fail instead of being silently relabeled", () => {
  const old = createFirstGlowReflectionCapacityState(["spark-1"]);
  assert.throws(() => admitFirstGlowEvent(old, "old", "spark-1", 40), /missing/);
  assert.throws(() => initializeFirstGlowEventAdmission(old, 1), /fresh opening/);
  const current = initializeFirstGlowEventAdmission(old, 0);
  assert.throws(() => initializeFirstGlowEventAdmission(current, 0), /fresh opening/);
  const invalid = structuredClone(current);
  invalid.eventAdmission!.version = "unknown" as never;
  assert.throws(() => validateFirstGlowReflectionCapacity(invalid, ["spark-1"]), /unsupported event/);
});

test("policy-aware dispatch permits viewing old data but prevents mixed-policy continuation", () => {
  const bundle = JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e/world.json", import.meta.url), "utf8"));
  const legacy = createWorldFromBundle(bundle, 2, "policy-test", 2);
  assert.throws(() => advanceWorld(legacy, { eventAdmissionPolicy: "event-rc-v1" }), /dispatch mismatch/);
  const current = structuredClone(legacy);
  current.firstGlowState.reflectionCapacity = initializeFirstGlowEventAdmission(current.firstGlowState.reflectionCapacity!, 0);
  assert.throws(() => advanceWorld(current), /dispatch mismatch/);
  assert.equal(advanceWorld(current, { eventAdmissionPolicy: "event-rc-v1" }).state.pulse, 1);
});
