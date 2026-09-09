import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWorldFromBundle } from "@mimir/engine";
import { normalizeState } from "./state.js";

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/fixtures/first-glow-schema-3.json", import.meta.url)), "utf8"));
test("server normalization accepts only a complete First Glow checkpoint", () => {
  const state = createWorldFromBundle(fixture, 11, "state-test");
  assert.equal(normalizeState(state).firstGlowState.themeId, "living-circuit");
  assert.throws(() => normalizeState({ ...state, simulationVersion: "mimir-sim-v2" } as never), /First Glow/);
  assert.throws(() => normalizeState({ ...state, firstGlowState: { ...state.firstGlowState, social: undefined } } as never), /predates social state/);
});
