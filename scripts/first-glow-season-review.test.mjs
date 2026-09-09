import assert from "node:assert/strict";
import test from "node:test";
import { FIRST_GLOW_SEASON_SCENARIOS, runFirstGlowSeason } from "./first-glow-season-review.mjs";

test("the authored season suite defines four controlled First Glow reviews", () => {
  assert.deepEqual(FIRST_GLOW_SEASON_SCENARIOS.map(scenario => scenario.id), ["abundance-baseline", "supply-scarcity", "information-gap", "promise-breach"]);
  for (const scenario of FIRST_GLOW_SEASON_SCENARIOS) {
    assert.ok(scenario.question && scenario.controlledVariable && scenario.expectedObservable && scenario.interpretation);
    assert.equal(scenario.seeds.length, 3);
    assert.equal(new Set(scenario.seeds).size, scenario.seeds.length);
  }
});

test("matched season runs and their evidence chains are deterministic", () => {
  for (const scenario of FIRST_GLOW_SEASON_SCENARIOS) {
    const first = runFirstGlowSeason(scenario, scenario.seeds[1]);
    const second = runFirstGlowSeason(scenario, scenario.seeds[1]);
    assert.deepEqual(second, first);
    assert.ok(first.arcs.length >= 3, `${scenario.id} should preserve three Spark arcs`);
    assert.equal(first.metrics.appliedChoices, 3, `${scenario.id} should apply its three planned choices`);
  }
  const breach = runFirstGlowSeason(FIRST_GLOW_SEASON_SCENARIOS.find(scenario => scenario.id === "promise-breach"), 1402);
  assert.ok(breach.metrics.brokenCommitments >= 1);
  assert.ok(breach.metrics.fulfilledCommitments >= 1);
});
