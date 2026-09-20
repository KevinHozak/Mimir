import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { createFirstGlowState } from "./structured.js";
import { recordFirstGlowWitnesses } from "./first-glow-social.js";
import { applyFirstGlowConversation, createFirstGlowConversation, validateFirstGlowConversation } from "./first-glow-conversations.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8"))) as FirstGlowWorldBundle;

test("bounded meeting conversation records witnessed evidence and changes recipient memory", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const event = { id: "event-1-meet", pulse: 1, kind: "meet" as const, actorId: "spark-1", participants: ["spark-1", "spark-2"], evidenceEventIds: ["event-1-meet"], message: "The Sparks meet." };
  recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants, event.pulse);
  const conversation = createFirstGlowConversation(state, event);
  assert.ok(conversation);
  validateFirstGlowConversation(conversation, ["spark-1", "spark-2"]);
  const next = applyFirstGlowConversation(state.social, conversation);
  assert.equal(next.knowledge.find(item => item.sparkId === "spark-2")?.communicatedClaims.length, 1);
  assert.equal(next.knowledge.find(item => item.sparkId === "spark-2")?.communicatedClaims[0].eventId, event.id);
  assert.equal(conversation.turns.length, 2);
});

test("conversation validation rejects hidden evidence and duplicate turn ids", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  const event = { id: "event-2-meet", pulse: 2, kind: "meet" as const, actorId: "spark-1", participants: ["spark-1", "spark-2"], evidenceEventIds: ["event-2-meet"], message: "The Sparks meet." };
  recordFirstGlowWitnesses(state.social, [event.id], event.actorId, event.participants, event.pulse);
  const conversation = createFirstGlowConversation(state, event)!;
  const hidden = structuredClone(conversation);
  hidden.turns[0].evidenceEventIds = ["future-event"];
  assert.throws(() => applyFirstGlowConversation(state.social, hidden));
  const duplicate = structuredClone(conversation);
  duplicate.turns[1].id = duplicate.turns[0].id;
  assert.throws(() => validateFirstGlowConversation(duplicate, ["spark-1", "spark-2"]));
});

test("a refusal is a valid completed encounter without a forced effect", () => {
  const record = {
    schemaVersion: 1 as const,
    id: "conversation-refused",
    pulse: 3,
    encounterEventId: "event-3-meet",
    speakerSparkIds: ["spark-1", "spark-2"],
    turns: [{ id: "utterance-refused", speakerSparkId: "spark-1", recipientSparkId: "spark-2", quote: "I will keep following my own trace.", evidenceEventIds: ["event-3-meet"], accepted: false }],
    status: "refused" as const,
    effects: [],
    promptVersion: "first-glow-conversation-v1" as const,
    contextVersion: "spark-local-context-v1" as const
  };
  assert.doesNotThrow(() => validateFirstGlowConversation(record, ["spark-1", "spark-2"]));
  assert.equal(record.effects.length, 0);
});
