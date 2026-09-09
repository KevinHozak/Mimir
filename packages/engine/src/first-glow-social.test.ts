import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { applyFirstGlowDilemmaChoice, canFirstGlowActOnEvent, createFirstGlowSocialState, firstGlowActionScore, recordFirstGlowWitnesses, validateFirstGlowSocialState } from "./first-glow-social.js";
import { createFirstGlowState, validateFirstGlowState } from "./structured.js";
import { decodeWorldBundle } from "@mimir/world-data";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8")));
if (bundle.schemaVersion !== 3) throw new Error("social fixture is not schema 3");

test("First Glow social state is bounded, local, and schema-3 serializable", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const reloaded = JSON.parse(JSON.stringify(state)) as typeof state;
  validateFirstGlowState(reloaded);
  assert.equal(reloaded.social.schemaVersion, 1);
  assert.deepEqual(reloaded.social.trust.map(record => `${record.sourceSparkId}->${record.targetSparkId}`), ["spark-1->spark-2", "spark-2->spark-1"]);
  assert.throws(() => validateFirstGlowState({ ...reloaded, social: undefined } as never), /predates social state/);
});

test("Sparks act only on witnessed or credibly communicated evidence", () => {
  const social = createFirstGlowSocialState(["spark-1", "spark-2"]);
  recordFirstGlowWitnesses(social, ["event-pool"], "spark-1", [], 1);
  assert.equal(canFirstGlowActOnEvent(social, "spark-1", "event-pool"), true);
  assert.equal(canFirstGlowActOnEvent(social, "spark-2", "event-pool"), false);
  const revealed = applyFirstGlowDilemmaChoice(social, { dilemmaId: "weakening-pool-report", alternativeId: "reveal-pool", actorSparkId: "spark-1", targetSparkId: "spark-2", evidenceEventIds: ["event-pool"], tick: 2 });
  assert.equal(canFirstGlowActOnEvent(revealed, "spark-2", "event-pool"), true);
  assert.doesNotThrow(() => applyFirstGlowDilemmaChoice(revealed, { dilemmaId: "public-or-private-mark", alternativeId: "keep-mark-private", actorSparkId: "spark-2", targetSparkId: "spark-1", evidenceEventIds: ["event-pool"], tick: 3 }));
  assert.throws(() => applyFirstGlowDilemmaChoice(social, { dilemmaId: "public-or-private-mark", alternativeId: "make-mark-public", actorSparkId: "spark-2", targetSparkId: "spark-1", evidenceEventIds: ["event-pool"], tick: 2 }), /not witnessed/);
});

test("the three authored dilemmas update commitments, trust, claims, and inferences deterministically", () => {
  const makeState = (eventId: string) => { const social = createFirstGlowSocialState(["spark-1", "spark-2"]); recordFirstGlowWitnesses(social, [eventId], "spark-1", [], 1); return social; };
  const pool = applyFirstGlowDilemmaChoice(makeState("pool"), { dilemmaId: "weakening-pool-report", alternativeId: "reveal-pool", actorSparkId: "spark-1", targetSparkId: "spark-2", evidenceEventIds: ["pool"], tick: 2 });
  const shelter = applyFirstGlowDilemmaChoice(makeState("shelter"), { dilemmaId: "shelter-or-trace", alternativeId: "continue-exploration", actorSparkId: "spark-1", targetSparkId: "spark-2", evidenceEventIds: ["shelter"], tick: 2 });
  const mark = applyFirstGlowDilemmaChoice(makeState("mark"), { dilemmaId: "public-or-private-mark", alternativeId: "keep-mark-private", actorSparkId: "spark-1", targetSparkId: "spark-2", evidenceEventIds: ["mark"], tick: 2 });
  assert.equal(pool.commitments[0].status, "fulfilled");
  assert.equal(pool.knowledge.find(item => item.sparkId === "spark-2")?.communicatedClaims[0].eventId, "pool");
  assert.equal(shelter.commitments[0].status, "broken");
  assert.equal(mark.knowledge.find(item => item.sparkId === "spark-1")?.uncertainInferences[0].aboutEventId, "mark");
  assert.equal(pool.trust[0].value, 1);
  assert.equal(shelter.trust[0].value, -1);
  assert.ok(firstGlowActionScore(pool, "spark-1", "spark-2", "weakening-pool-report") > firstGlowActionScore(shelter, "spark-1", "spark-2", "shelter-or-trace"));
  assert.deepEqual(pool, applyFirstGlowDilemmaChoice(makeState("pool"), { dilemmaId: "weakening-pool-report", alternativeId: "reveal-pool", actorSparkId: "spark-1", targetSparkId: "spark-2", evidenceEventIds: ["pool"], tick: 2 }));
  validateFirstGlowSocialState(pool, ["spark-1", "spark-2"]);
});

test("runtime events become durable local facts without changing replay order", () => {
  const initial = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const next = structuredClone(initial);
  next.events = [{ id: "event-1-spark-1", kind: "explore", actorId: "spark-1", message: "Spark 1 explored a trace." }];
  next.tick = 1;
  recordFirstGlowWitnesses(next.social, ["event-1-spark-1"], "spark-1", [], 1);
  assert.equal(next.social.knowledge.find(item => item.sparkId === "spark-1")?.witnessedFacts[0].eventId, "event-1-spark-1");
  validateFirstGlowState(JSON.parse(JSON.stringify(next)));
  assert.deepEqual(next, JSON.parse(JSON.stringify(next)));
});
