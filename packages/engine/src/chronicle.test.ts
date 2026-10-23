import assert from "node:assert/strict";
import test from "node:test";
import { buildChronicleEdition, validateChronicleEdition } from "./chronicle.js";
import { createFirstGlowHistory } from "./first-glow-history.js";
import type { StructuredEvent } from "./structured.js";

function input() {
  const history = createFirstGlowHistory();
  history.conversations = [{ schemaVersion: 1, id: "conversation-meet-1", pulse: 1, encounterEventId: "meet-1", speakerSparkIds: ["spark-1", "spark-2"], turns: [{ id: "utterance-1", speakerSparkId: "spark-1", recipientSparkId: "spark-2", quote: "The light is shared.", evidenceEventIds: ["meet-1"], accepted: true }], status: "completed", effects: [{ kind: "communicated-claim", recipientSparkId: "spark-2", eventId: "meet-1", claim: "The light is shared." }], promptVersion: "first-glow-conversation-v1", contextVersion: "spark-local-context-v1" }];
  return { timelineId: "timeline-test", cutoffPulse: 2, revision: 1, bundleHash: "sha256-bundle", sparkNames: { "spark-1": "Lumen", "spark-2": "Veil" }, history, interpretations: [], events: [{ id: "meet-1", pulse: 1, kind: "meet" as const, actorId: "spark-1", participants: ["spark-1", "spark-2"], message: "Lumen and Veil met at the light." }, { id: "future-3", pulse: 3, kind: "meet" as const, actorId: "spark-2", participants: ["spark-1", "spark-2"], message: "A future meeting." }] };
}

test("Chronicle chapters preserve exact saved quotes and evidence provenance", () => {
  const edition = buildChronicleEdition(input());
  validateChronicleEdition(edition, input());
  const moment = edition.chapters.find(chapter => chapter.kind === "moment")!;
  assert.ok(moment.paragraphs.some(paragraph => paragraph.includes("“The light is shared.”")));
  assert.ok(moment.evidence.some(reference => reference.kind === "utterance" && reference.id === "utterance-1"));
  assert.equal(edition.chapters.flatMap(chapter => chapter.evidence).some(reference => reference.id === "future-3"), false);
});

test("Chronicle validation rejects a quote without its saved utterance evidence", () => {
  const edition = buildChronicleEdition(input());
  const moment = edition.chapters.find(chapter => chapter.kind === "moment")!;
  moment.evidence = moment.evidence.filter(reference => reference.kind !== "utterance");
  assert.throws(() => validateChronicleEdition(edition, input()), /utterance evidence/);
});

test("personal selection is explicit, isolated, cutoff-bounded, and never invented", () => {
  const source = input();
  source.events.push({ id: "solo-2", pulse: 2, kind: "meet", actorId: "spark-1", participants: ["spark-1"], message: "Lumen stayed alone." });
  const lumen = buildChronicleEdition({ ...source, selectedSparkId: "spark-1" });
  const veil = buildChronicleEdition({ ...source, selectedSparkId: "spark-2" });
  assert.notEqual(lumen.id, veil.id);
  assert.deepEqual(veil.chapters[1].selectedSparkIds, ["spark-2"]);
  assert.equal(veil.chapters[1].title, "Veil's trace");
  assert.deepEqual(veil.chapters[1].evidence.map(ref => ref.id), ["meet-1"]);
  assert.ok(lumen.chapters[1].evidence.some(ref => ref.id === "solo-2"));
  const quiet = buildChronicleEdition({ ...source, cutoffPulse: 0, selectedSparkId: "spark-2" });
  assert.equal(quiet.chapters[1].evidence.length, 0);
  assert.match(quiet.chapters[1].paragraphs[0], /No personal history/);
  assert.throws(() => buildChronicleEdition({ ...source, selectedSparkId: "absent" }), /unavailable/);
});

test("personal and season chapters retain distinct outcomes before repetitive travel", () => {
  const events: StructuredEvent[] = [
    { id: "share-1", pulse: 1, kind: "share", actorId: "spark-1", message: "Lumen shared charge." },
    { id: "share-2", pulse: 2, kind: "share", actorId: "spark-1", message: "Lumen shared charge again." },
    { id: "cache-3", pulse: 3, kind: "wild-cache", actorId: "spark-1", message: "Lumen probed the Wild Cache." },
    ...Array.from({ length: 12 }, (_, index): StructuredEvent => ({ id: `move-${index + 4}`, pulse: index + 4, kind: "movement", actorId: "spark-1", message: "Lumen moved one cell." })),
    { id: "future", pulse: 30, kind: "mark-trace", actorId: "spark-1", message: "A future trace." },
  ];
  const source = { ...input(), history: createFirstGlowHistory(), events, cutoffPulse: 20, selectedSparkId: "spark-1" };
  const before = JSON.stringify(source);
  const edition = buildChronicleEdition(source);
  validateChronicleEdition(edition, source);
  for (const chapter of edition.chapters.filter(chapter => chapter.kind !== "moment")) {
    assert.deepEqual(chapter.evidence.map(ref => [ref.id, ref.pulse, ref.timelineId]), [
      ["share-2", 2, "timeline-test"], ["cache-3", 3, "timeline-test"], ["move-15", 15, "timeline-test"],
    ]);
    assert.deepEqual(chapter.illustration.sourceEventIds, chapter.evidence.map(ref => ref.id));
    assert.equal(chapter.paragraphs.length, 3);
  }
  assert.equal(edition.narrator.promptVersion, "chronicle-baseline-v2");
  assert.deepEqual(buildChronicleEdition(source), edition);
  assert.equal(JSON.stringify(source), before, "selection must not rewrite recorded inputs");
});

test("movement-only chapters keep a truthful latest movement fallback", () => {
  const events: StructuredEvent[] = [1, 2, 3].map(pulse => ({ id: `move-${pulse}`, pulse, kind: "movement", actorId: "spark-1", message: `Lumen moved at pulse ${pulse}.` }));
  const source = { ...input(), history: createFirstGlowHistory(), events, cutoffPulse: 3, selectedSparkId: "spark-1" };
  const edition = buildChronicleEdition(source);
  for (const chapter of edition.chapters.filter(chapter => chapter.kind !== "moment")) {
    assert.deepEqual(chapter.paragraphs, ["Pulse 3: Lumen moved at pulse 3."]);
    assert.deepEqual(chapter.evidence.map(ref => ref.id), ["move-3"]);
  }
  validateChronicleEdition(edition, source);
});
