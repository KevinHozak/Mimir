import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { createFirstGlowState } from "./structured.js";
import { createFirstGlowAgeModelPolicy, createFirstGlowAgeModelTransition, validateFirstGlowAgeModelPolicy, validateFirstGlowAgeModelTransition } from "./first-glow-age-model-policy.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8"))) as FirstGlowWorldBundle;

test("policy keeps capability independent from frequency, memory, planning, and expression", () => {
  const policy = createFirstGlowAgeModelPolicy({ model: { provider: "diagnostic", model: "stronger-fixture", version: "fixture-v1" }, status: "diagnostic" });
  validateFirstGlowAgeModelPolicy(policy);
  assert.equal(policy.worldAge.ordinal, 1);
  assert.notEqual(policy.model.model, "rules-only");
});

test("transition records continuity without changing the First Glow runtime", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const oldPolicy = createFirstGlowAgeModelPolicy();
  const diagnostic = createFirstGlowAgeModelPolicy({ status: "diagnostic", model: { provider: "offline", model: "stronger-fixture", version: "fixture-v1" }, planning: { maxSteps: 2 } });
  const transition = createFirstGlowAgeModelTransition(oldPolicy, diagnostic, state, "authorized-evaluation");
  validateFirstGlowAgeModelTransition(transition);
  assert.deepEqual(transition.before, transition.after);
  assert.equal(transition.effectivePulse, 0);
});

test("future age candidates cannot become active automatically", () => {
  const candidate = createFirstGlowAgeModelPolicy({ status: "candidate", worldAge: { id: "hearth-circuit", ordinal: 2 } });
  validateFirstGlowAgeModelPolicy(candidate, { allowCandidateAge: true });
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 1);
  assert.throws(() => createFirstGlowAgeModelTransition(createFirstGlowAgeModelPolicy(), { ...candidate, status: "active" }, state, "authorized-evaluation"), /automatic live age upgrades/);
});
