import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle } from "@mimir/world-data";
import { appendFirstGlowExplanations } from "./first-glow-explanations.js";
import { advanceWorld, createWorldV3 } from "./index.js";
import { createFirstGlowState, validateFirstGlowState } from "./structured.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("explanation fixture is not schema 3");

test("committed First Glow events produce three deterministic explanation chains", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.tick = 1;
  state.events = [
    { id: "event-1-spark-1-draw", kind: "draw", actorId: "spark-1", message: "Spark 1 drew 8 charge." },
    { id: "event-1-spark-1-idle", kind: "idle", actorId: "spark-1", message: "Spark 1 idled at a shelter niche." },
    { id: "event-1-spark-1-mark", kind: "mark-trace", actorId: "spark-1", message: "Spark 1 completed mark trace." }
  ];
  appendFirstGlowExplanations(state, state.events);
  assert.deepEqual(state.explanations.map(item => item.dilemmaId), ["weakening-pool-report", "shelter-or-trace", "public-or-private-mark"]);
  for (const explanation of state.explanations) {
    assert.ok(explanation.evidenceEventIds.length > 0);
    assert.equal(explanation.objectiveEvents[0].id, explanation.evidenceEventIds[0]);
    assert.equal(explanation.consequenceEvents[0].id, explanation.evidenceEventIds[0]);
    assert.ok(Number.isFinite(explanation.score.total));
  }
  const reloaded = JSON.parse(JSON.stringify(state)) as typeof state;
  validateFirstGlowState(reloaded);
  assert.deepEqual(reloaded.explanations, state.explanations);
});

test("explanation chains remain deterministic through committed replay and tolerate older social checkpoints", () => {
  const run = () => { let state = createWorldV3(bundle, 23, "explanations", 2); for (let tick = 0; tick < 8; tick += 1) state = advanceWorld(state).state; return state; };
  assert.deepEqual(run(), run());
  const legacy = createFirstGlowState(bundle);
  const withoutExplanations = { ...legacy, explanations: undefined } as never;
  assert.doesNotThrow(() => validateFirstGlowState(withoutExplanations));
});
