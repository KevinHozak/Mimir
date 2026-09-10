import assert from "node:assert/strict";
import test from "node:test";
import { FIRST_GLOW_LONG_STORY_TICKS, FIRST_GLOW_REVIEW_TICKS_PER_SEASON, FIRST_GLOW_SEASON_SCENARIOS, FIRST_GLOW_STORY_SEASONS, runFirstGlowSeason } from "./first-glow-season-review.mjs";

test("the authored long-story suite defines four controlled First Glow reviews", () => {
  assert.deepEqual(FIRST_GLOW_SEASON_SCENARIOS.map(scenario => scenario.id), ["abundance-baseline", "supply-scarcity", "information-gap", "promise-breach"]);
  assert.equal(FIRST_GLOW_LONG_STORY_TICKS, FIRST_GLOW_REVIEW_TICKS_PER_SEASON * FIRST_GLOW_STORY_SEASONS);
  for (const scenario of FIRST_GLOW_SEASON_SCENARIOS) {
    assert.ok(scenario.question && scenario.controlledVariable && scenario.expectedObservable && scenario.interpretation);
    assert.equal(scenario.seeds.length, 3);
    assert.equal(new Set(scenario.seeds).size, scenario.seeds.length);
  }
});

test("a fixed-seed review start is deterministic and keeps its immutable world bundle", () => {
  const scenario = FIRST_GLOW_SEASON_SCENARIOS[0];
  const first = runFirstGlowSeason(scenario, scenario.seeds[1], 1);
  const second = runFirstGlowSeason(scenario, scenario.seeds[1], 1);
  assert.deepEqual(second, first);
  assert.equal(first.metrics.completedSeasons, 0);
  assert.equal(first.plannedChoices.length, 0);
  assert.ok(first.history.length > 0);
});
