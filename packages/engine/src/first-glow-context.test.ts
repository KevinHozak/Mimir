import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeWorldBundle, type FirstGlowWorldBundle } from "@mimir/world-data";
import { createFirstGlowState } from "./structured.js";
import { buildFirstGlowContextPacket, buildFirstGlowWorldCodex, estimateFirstGlowTokens, validateFirstGlowContextPacket } from "./first-glow-context.js";

const bundle = decodeWorldBundle(JSON.parse(readFileSync(fileURLToPath(new URL("../../../assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601/world.json", import.meta.url)), "utf8"))) as FirstGlowWorldBundle;

test("World Codex and context packets are versioned and reconstructible", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.tick = 4;
  state.events = [
    { id: "event-private", tick: 3, kind: "explore", actorId: "spark-2", message: "A private trace." },
    { id: "event-seen", tick: 4, kind: "draw", actorId: "spark-1", message: "The pool is dim." }
  ];
  state.social.knowledge[0].witnessedFacts = [{ eventId: "event-seen", witnessedTick: 4 }];
  const first = buildFirstGlowContextPacket(state, "spark-1", ["event-seen"]);
  const second = buildFirstGlowContextPacket(structuredClone(state), "spark-1", ["event-seen"]);
  assert.equal(first.packetHash, second.packetHash);
  assert.equal(first.codex.hash, buildFirstGlowWorldCodex().hash);
  assert.deepEqual(first.recentEvents.map(event => event.id), ["event-seen"]);
  validateFirstGlowContextPacket(first);
  assert.ok(estimateFirstGlowTokens(first) > 0);
});

test("context packet rejects tampered or hidden evidence", () => {
  const state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 2);
  state.tick = 1;
  state.events = [{ id: "event-seen", tick: 1, kind: "draw", actorId: "spark-1", message: "A pool." }];
  state.social.knowledge[0].witnessedFacts = [{ eventId: "event-seen", witnessedTick: 1 }];
  const packet = buildFirstGlowContextPacket(state, "spark-1", ["event-seen"]);
  const tampered = structuredClone(packet);
  tampered.recentEvents[0].evidenceEventIds = ["event-private"];
  assert.throws(() => validateFirstGlowContextPacket(tampered), /invalid|hidden/);
});
