import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowReflectionCapacityState, designateFirstGlowHero, firstGlowReflectionCadence, reflectionCapacityFor, requestFirstGlowReflection, validateFirstGlowReflectionCapacity } from "./first-glow-reflection-capacity.js";

test("First Glow RC uses world age and explicit Hero provenance", () => {
  const state = createFirstGlowReflectionCapacityState(["spark-2", "spark-1"]);
  assert.equal(state.policy.version, "world-age-v1");
  assert.equal(state.policy.heroPolicy.naturalGeneration, "disabled");
  assert.equal(state.assignments["spark-1"].capacity, 1);
  designateFirstGlowHero(state, "spark-2");
  assert.equal(state.assignments["spark-2"].capacity, 2);
  assert.equal(state.assignments["spark-2"].provenance, "explicit-test");
  assert.equal(reflectionCapacityFor(true, 4), 6);
  validateFirstGlowReflectionCapacity(state, ["spark-1", "spark-2"]);
});

test("RC schedules baseline and Hero opportunities across a 64-tick day", () => {
  const state = createFirstGlowReflectionCapacityState(["spark-1", "spark-2"], { ticksPerDay: 64 });
  designateFirstGlowHero(state, "spark-2");
  const baseline = state.assignments["spark-1"];
  const hero = state.assignments["spark-2"];
  const baselineAt = state.scheduler.decisions.length;
  const firstBaseline = requestFirstGlowReflection(state, baseline.sparkId, firstGlowReflectionCadence(baseline.sparkId, baseline.capacity).phaseOffset);
  assert.equal(firstBaseline.intervalTicks, 64);
  const heroFirst = requestFirstGlowReflection(state, hero.sparkId, firstGlowReflectionCadence(hero.sparkId, hero.capacity).phaseOffset);
  assert.equal(heroFirst.intervalTicks, 32);
  const nextHero = requestFirstGlowReflection(state, hero.sparkId, heroFirst.tick + heroFirst.intervalTicks);
  assert.equal(nextHero.created, true);
  assert.equal(state.scheduler.decisions.length, baselineAt + 3);
});

test("RC promotion keeps usage and never grants catch-up debt", () => {
  const state = createFirstGlowReflectionCapacityState(["spark-1"]);
  const first = requestFirstGlowReflection(state, "spark-1", firstGlowReflectionCadence("spark-1", 1).phaseOffset);
  designateFirstGlowHero(state, "spark-1");
  const beforeWindow = requestFirstGlowReflection(state, "spark-1", 16);
  assert.equal(first.created, true);
  assert.equal(beforeWindow.created, false);
  assert.equal(beforeWindow.reason, "cadence-window-not-ready");
  assert.equal(beforeWindow.nextEligibleTick >= 32, true);
  assert.equal(state.scheduler.sparkUsed["spark-1"], 1);
});

test("global contention is recorded and replay is provider-free by construction", () => {
  const state = createFirstGlowReflectionCapacityState(["spark-1", "spark-2"], { globalDailyLimit: 1 });
  const first = requestFirstGlowReflection(state, "spark-1", firstGlowReflectionCadence("spark-1", 1).phaseOffset);
  const second = requestFirstGlowReflection(state, "spark-2", firstGlowReflectionCadence("spark-2", 1).phaseOffset);
  assert.equal(first.created, true);
  assert.equal(second.reason, "global-cap-exhausted");
  assert.equal(second.created, false);
  const replay = requestFirstGlowReflection(state, "spark-1", 1, true);
  assert.equal(replay.reason, "historical-playback");
  assert.equal(replay.globalUsed, 1);
});
