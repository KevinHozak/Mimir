import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { createFirstGlowState, advanceFirstGlowState, validateFirstGlowState } from "./structured.js";
import { advanceFirstGlow } from "./first-glow-actions.js";
import { buildChronicleEdition } from "./chronicle.js";
import { initializeWildCacheChoice } from "./first-glow-cache-choice.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(new URL("../../../assets/world/generated/sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca/world.json", import.meta.url), "utf8"))) as FirstGlowWorldBundle;
if (bundle.schemaVersion !== 3) throw new Error("Expected First Glow bundle");
function opportunity(charge: number, readiness = 90, sparkCount = 1) {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", sparkCount);
  initializeWildCacheChoice(state);
  const settlement = state.settlements[0], spark = settlement.sparks[0];
  const cache = bundle.objects.find(o => bundle.objectDefinitions[o.definitionId].capabilities.includes("wild-cache"))!;
  const slot = bundle.objectDefinitions[cache.definitionId].slots[0];
  spark.position = { x: cache.origin.x + slot.offset.x, y: cache.origin.y + slot.offset.y };
  spark.status = "interacting"; spark.intendedActivity = "scavenge-cache";
  spark.destinationObjectId = cache.id; spark.destinationSlotId = slot.id;
  spark.carriedCharge = charge; spark.readiness = readiness;
  settlement.runtime.reservations.push({ actorId: spark.id, objectId: cache.id, slotId: slot.id });
  return state;
}

test("decision precedes probe, exact costs buy private route evidence and guide the next activity", () => {
  const initial = opportunity(5, 90, 2);
  const before = JSON.stringify(initial);
  const result = advanceFirstGlow(initial, { resolveSocial: false });
  const spark = result.settlements[0].sparks[0];
  assert.equal(spark.wildCacheChoice?.alternative, "probe");
  assert.equal(spark.carriedCharge, 4); assert.equal(spark.readiness, 88);
  assert.ok(spark.wildCacheChoice?.routeFact);
  assert.deepEqual(result.events.filter(e => e.actorId === spark.id).map(e => e.id), [spark.wildCacheChoice!.decisionEventId, spark.wildCacheChoice!.outcomeEventId]);
  assert.deepEqual(result.ledger.filter(e => e.actorId === spark.id).map(e => [e.reason, e.amount]), [["wild-cache-probe", 1], ["wild-cache-probe-readiness", 2]]);
  assert.deepEqual(result.social.trust, initial.social.trust);
  assert.equal(result.social.knowledge.find(item => item.sparkId === "spark-2")!.witnessedFacts.some(fact => fact.eventId === spark.wildCacheChoice!.outcomeEventId), false);
  const next = advanceFirstGlow(result, { resolveSocial: false });
  assert.equal(next.settlements[0].sparks[0].intendedActivity, "shape-pattern");
  assert.equal(JSON.stringify(initial), before);
  assert.deepEqual(JSON.parse(JSON.stringify(advanceFirstGlow(result))), JSON.parse(JSON.stringify(advanceFirstGlow(JSON.parse(JSON.stringify(result))))));
  validateFirstGlowState(next);
  const events = [...result.events.map(event => ({ ...event, pulse: result.pulse })), ...next.events.map(event => ({ ...event, pulse: next.pulse }))];
  const edition = buildChronicleEdition({ timelineId: "fresh-cache", cutoffPulse: next.pulse, revision: 1, selectedSparkId: spark.id, events, interpretations: [], history: next.history!, explanations: next.explanations, sparkNames: { [spark.id]: spark.name }, bundleHash: bundle.bundle.contentHash });
  const journey = edition.chapters.find(chapter => chapter.kind === "personal")!.journey!;
  assert.ok(journey.some(item => item.text.includes("surveying the Wild Cache")));
  assert.ok(journey.some(item => item.text.includes("followed the Wild Cache choice")));
  assert.ok(journey.flatMap(item => item.evidence).some(ref => ref.id.endsWith("-cache-follow-up")));

});

test("conserving preserves probe resources, learns nothing and seeks recovery", () => {
  for (const [charge, readiness] of [[0, 90], [2, 90], [5, 74]]) {
    const initial = opportunity(charge, readiness);
    const result = advanceFirstGlow(initial);
    const spark = result.settlements[0].sparks[0];
    assert.equal(spark.wildCacheChoice?.alternative, "conserve");
    assert.equal(spark.carriedCharge, charge); assert.equal(spark.readiness, readiness);
    assert.equal(spark.wildCacheChoice?.routeFact, undefined);
    assert.deepEqual(result.ledger, []);
    assert.equal(result.events.some(e => e.kind === "wild-cache"), false);
    assert.equal(advanceFirstGlow(result).settlements[0].sparks[0].intendedActivity, charge === 0 ? "seek-charge" : "seek-shelter");
    assert.deepEqual(JSON.parse(JSON.stringify(advanceFirstGlow(result))), JSON.parse(JSON.stringify(advanceFirstGlow(JSON.parse(JSON.stringify(result))))));
  }
});

test("fresh-history opt-in rejects retrofits; legacy probes retain legacy outcomes", () => {
  const state = opportunity(0); delete state.wildCacheChoiceVersion;
  const legacy = advanceFirstGlowState(state);
  assert.equal(legacy.events.some(e => e.kind === "wild-cache"), true);
  assert.equal(legacy.settlements[0].sparks[0].wildCacheChoice, undefined);
  assert.equal(legacy.settlements[0].sparks[0].chargeDeficit, 1);
  assert.throws(() => initializeWildCacheChoice(legacy), /fresh history/);
  const tagged = opportunity(5); assert.throws(() => initializeWildCacheChoice(tagged), /fresh history/);
});

test("invalid contact cannot decide or spend, and malformed choice records fail validation", () => {
  const state = opportunity(5);
  state.settlements[0].runtime.reservations = [];
  const result = advanceFirstGlow(state);
  assert.equal(result.settlements[0].sparks[0].wildCacheChoice, undefined);
  assert.equal(result.events.some(event => event.kind === "wild-cache-choice"), false);
  assert.equal(result.ledger.some(entry => entry.reason.startsWith("wild-cache")), false);
  const valid = advanceFirstGlow(opportunity(5));
  valid.settlements[0].sparks[0].wildCacheChoice!.routeFact!.cost = -1;
  assert.throws(() => validateFirstGlowState(valid), /invalid Wild Cache choice/);
});

test("conserving interrupts a probe intention instead of claiming it was performed", () => {
  for (const charge of [2, 5]) {
    const state = opportunity(charge), spark = state.settlements[0].sparks[0];
    spark.intention = { version: "rule-executed-v1", id: "fresh-probe-intention", sparkId: spark.id, activity: "scavenge-cache", createdPulse: 0, source: "rules", contextHash: "a".repeat(64), evidenceEventIds: [], causalEventIds: [], status: "active", summary: "Investigate the cache." };
    const result = advanceFirstGlow(state);
    const intention = result.settlements[0].sparks[0].intention!;
    assert.equal(intention.status, charge === 2 ? "interrupted" : "completed");
    if (charge === 2) assert.equal(intention.reason, "wild-cache-conserved");
  }
});

test("fresh autonomous histories replay across JSON restarts without repeat cache decisions", () => {
  const run = (restart: boolean) => {
    let state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 6);
    initializeWildCacheChoice(state);
    const decisions: string[] = [];
    for (let pulse = 0; pulse < 80; pulse++) {
      state = advanceFirstGlow(restart && pulse === 40 ? JSON.parse(JSON.stringify(state)) : state, { sourceCharge: pulse % 4 === 0 ? 24 : 0, deterministicSeed: 8 });
      decisions.push(...state.events.filter(e => e.id.endsWith("-cache-choice")).map(e => e.actorId));
    }
    assert.ok(decisions.length > 0); assert.equal(new Set(decisions).size, decisions.length);
    return state;
  };
  assert.deepEqual(JSON.parse(JSON.stringify(run(false))), JSON.parse(JSON.stringify(run(true))));
});
