import assert from "node:assert/strict";
import test from "node:test";
import { buildFirstGlowReflectionMemoryContext } from "./first-glow-reflection-memory.js";
import { buildFirstGlowInterpretationContext } from "./first-glow-interpretations.js";
import { designateFirstGlowHero } from "./first-glow-reflection-capacity.js";
import { createFirstGlowState } from "./structured.js";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8"))) as FirstGlowWorldBundle;

test("reflection memory keeps objective, received, and subjective provenance separate", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.pulse = 12;
  state.events = [
    { id: "event-witnessed", pulse: 4, kind: "explore", actorId: "spark-1", message: "Spark 1 found a new trace." },
    { id: "event-private-future", pulse: 13, kind: "explore", actorId: "spark-2", message: "A future trace." }
  ];
  state.social.knowledge[0].witnessedFacts = [{ eventId: "event-witnessed", witnessedPulse: 4 }];
  state.social.knowledge[0].communicatedClaims = [{ id: "claim-1", eventId: "event-witnessed", sourceSparkId: "spark-2", recipientSparkId: "spark-1", claim: "The trace leads toward shelter.", evidenceEventIds: ["event-witnessed"], communicatedPulse: 8 }];
  state.social.knowledge[0].uncertainInferences = [{ id: "inference-1", aboutEventId: "event-witnessed", inference: "The route may be safer.", confidence: "tentative", evidenceEventIds: ["event-witnessed"] }];
  const context = buildFirstGlowReflectionMemoryContext(state, "spark-1");
  assert.equal(context.version, "lived-memory-v1");
  assert.deepEqual(context.memories.map(item => item.kind), ["witnessed-fact", "received-report", "subjective-inference"]);
  assert.equal(context.memories.some(item => item.sourceEventId === "event-private-future"), false);
  assert.equal(context.memories.every(item => item.retention === "bounded-summary" && item.retentionVersion === "lived-memory-v1"), true);
});

test("bounded memory ordering and context hashes change with lived history, not RC", () => {
  const young = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const experienced = structuredClone(young);
  for (const state of [young, experienced]) {
    state.pulse = 8;
    state.events = [{ id: "event-current", pulse: 8, kind: "draw", actorId: "spark-1", message: "The pool dims." }];
    state.social.knowledge[0].witnessedFacts = [{ eventId: "event-current", witnessedPulse: 8 }];
  }
  experienced.events.unshift({ id: "event-old", pulse: 2, kind: "explore", actorId: "spark-1", message: "An earlier trace was found." });
  experienced.social.knowledge[0].witnessedFacts.unshift({ eventId: "event-old", witnessedPulse: 2 });
  const youngContext = buildFirstGlowInterpretationContext(young, young.events[0]);
  const experiencedContext = buildFirstGlowInterpretationContext(experienced, experienced.events[1]);
  assert.ok(youngContext && experiencedContext);
  assert.equal(young.reflectionCapacity?.assignments["spark-1"].capacity, experienced.reflectionCapacity?.assignments["spark-1"].capacity);
  assert.notEqual(youngContext.contextHash, experiencedContext.contextHash);
  assert.equal(experiencedContext.reflectionMemory.memories[0].sourceEventId, "event-old");
  assert.equal(experiencedContext.reflectionMemory.omittedCount, 0);
});

test("a young Hero can have more capacity while retaining little lived history", () => {
  const heroState = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  designateFirstGlowHero(heroState.reflectionCapacity!, "spark-1");
  heroState.pulse = 4;
  heroState.events = [{ id: "event-current", pulse: 4, kind: "draw", actorId: "spark-1", message: "The pool dims." }];
  heroState.social.knowledge[0].witnessedFacts = [{ eventId: "event-current", witnessedPulse: 4 }];
  const context = buildFirstGlowReflectionMemoryContext(heroState, "spark-1");
  assert.equal(heroState.reflectionCapacity?.assignments["spark-1"].capacity, 2);
  assert.equal(context.memories.length, 1);
  assert.equal(context.reconstruction.spawnedPulse, 0);
});

test("memory projection is bounded and excludes future facts", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.pulse = 10;
  state.events = Array.from({ length: 12 }, (_, index) => ({ id: `event-${index}`, pulse: index, kind: "explore" as const, actorId: "spark-1", message: `Trace ${index}` }));
  state.social.knowledge[0].witnessedFacts = state.events.map((event, index) => ({ eventId: event.id, witnessedPulse: index }));
  state.social.knowledge[0].witnessedFacts.push({ eventId: "future", witnessedPulse: 11 });
  const context = buildFirstGlowReflectionMemoryContext(state, "spark-1", { maxMemories: 3 });
  assert.equal(context.memories.length, 3);
  assert.equal(context.omittedCount, 8);
  assert.equal(context.memories.some(item => item.sourceEventId === "future"), false);
  assert.deepEqual(context.memories.map(item => item.sourceEventId), ["event-8", "event-9", "event-10"]);
});
