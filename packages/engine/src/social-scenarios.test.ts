import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowSocialScenario, FIRST_GLOW_DESIGN, validateFirstGlowDesign } from "./design.js";
import { createWorldFromBundle } from "./index.js";
import { decodeWorldBundle } from "@mimir/world-data";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("First Glow social authorship validates as six cards and four dilemmas", () => {
  validateFirstGlowDesign();
  assert.equal(FIRST_GLOW_DESIGN.cards.length, 6);
  assert.equal(new Set(FIRST_GLOW_DESIGN.cards.map(card => card.id)).size, 6);
  assert.deepEqual(FIRST_GLOW_DESIGN.dilemmas.map(dilemma => dilemma.id), ["weakening-pool-report", "shelter-or-trace", "public-or-private-mark", "wild-cache-risk"]);
  assert.ok(FIRST_GLOW_DESIGN.dilemmas.every(dilemma => dilemma.alternatives.length >= 2 && dilemma.objectiveFacts.length > 0));
});

test("social scenario consumption is deterministic for a fixed seed", () => {
  assert.deepEqual(createFirstGlowSocialScenario(41), createFirstGlowSocialScenario(41));
  assert.notEqual(createFirstGlowSocialScenario(41).openingDilemmaId, createFirstGlowSocialScenario(42).openingDilemmaId);
});

test("social authorship is consumable beside a schema-3 First Glow timeline", () => {
  const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8")));
  const state = createWorldFromBundle(bundle, 41, "social-fixture", 6);
  const scenario = createFirstGlowSocialScenario(state.seed);
  assert.equal(state.simulationVersion, "mimir-sim-v3-first-glow");
  assert.equal(state.firstGlowState.schemaVersion, 3);
  assert.equal(scenario.cards.length, state.firstGlowState.settlements[0].sparks.length);
  assert.equal(scenario.dilemmas[0].alternatives.length, 2);
});
