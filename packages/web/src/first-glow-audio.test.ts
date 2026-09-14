import assert from "node:assert/strict";
import { DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES, FIRST_GLOW_AUDIO_STORAGE_KEY, audioPreferencePercent, loadFirstGlowAudioPreferences, saveFirstGlowAudioPreferences } from "./first-glow-audio.js";
import { FirstGlowAudioEventLedger, firstGlowAudioCueForEvent } from "./first-glow-audio-runtime.js";
import { firstGlowAmbientContext, planFirstGlowAudioMix } from "./first-glow-audio-ambience.js";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};

assert.deepEqual(loadFirstGlowAudioPreferences(storage), DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES);
saveFirstGlowAudioPreferences({ enabled: true, muted: true, ambienceEnabled: false, scoreEnabled: true, master: 1.4, music: -1, effects: 0.425 }, storage);
assert.equal(values.has(FIRST_GLOW_AUDIO_STORAGE_KEY), true);
assert.deepEqual(loadFirstGlowAudioPreferences(storage), { enabled: true, muted: true, ambienceEnabled: false, scoreEnabled: true, master: 1, music: 0, effects: 0.425 });
values.set(FIRST_GLOW_AUDIO_STORAGE_KEY, "not json");
assert.deepEqual(loadFirstGlowAudioPreferences(storage), DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES);
assert.equal(audioPreferencePercent(0.726), 73);
assert.equal(firstGlowAudioCueForEvent({ id: "draw", pulse: 2, kind: "collection", message: "Spark 1 drew 2 charge." }), "charge-draw");
assert.equal(firstGlowAudioCueForEvent({ id: "share", pulse: 2, kind: "sharing", message: "Spark 1 shared 1 charge with Spark 2." }), "charge-share");
assert.equal(firstGlowAudioCueForEvent({ id: "wait", pulse: 2, kind: "pulse", message: "Spark 1 is waiting: no reachable shelter site." }), "warning");
assert.equal(firstGlowAudioCueForEvent({ id: "arrival", pulse: 2, kind: "pulse", message: "Spark 1 completed explore." }), "arrival");
assert.equal(firstGlowAudioCueForEvent({ id: "meet", pulse: 2, kind: "pulse", message: "Spark 1 met Spark 2 at a shared contact site." }), "interaction");
assert.equal(firstGlowAudioCueForEvent({ id: "move", pulse: 2, kind: "world-object", message: "Spark 1 moved 1 cell(s)." }), null);
const ledger = new FirstGlowAudioEventLedger();
assert.deepEqual(ledger.accept([
  { id: "share", pulse: 3, kind: "sharing", message: "Spark 1 shared 1 charge with Spark 2." },
  { id: "draw", pulse: 2, kind: "collection", message: "Spark 1 drew 2 charge." },
  { id: "draw", pulse: 2, kind: "collection", message: "Spark 1 drew 2 charge." },
]), ["charge-draw", "charge-share"]);
assert.deepEqual(ledger.accept([{ id: "share", pulse: 3, kind: "sharing", message: "Spark 1 shared 1 charge with Spark 2." }]), []);
const replayLedger = new FirstGlowAudioEventLedger();
const committedBatch = [
  { id: "arrival-1", pulse: 4, kind: "activity", message: "Spark 1 completed explore." },
  { id: "warning-1", pulse: 5, kind: "activity", message: "Spark 2 is waiting: no reachable shelter site." },
];
assert.deepEqual(replayLedger.accept(committedBatch), ["arrival", "warning"]);
assert.deepEqual(replayLedger.accept(committedBatch), [], "history/replay or SSE reconnect must not replay committed cues");
assert.deepEqual(replayLedger.accept([{ ...committedBatch[0], message: "Spark 1 completed explore again." }]), [], "event IDs remain the dedupe boundary");
const renderedContext = {
  selectedEntityId: "spark:spark-1",
  sparks: [{ id: "spark-1", position: { x: 2, y: 1 } }],
  objects: [{ id: "pool", definitionId: "charge-pool", origin: { x: 2, y: 2 } }, { id: "shelter", definitionId: "shelter-niche", origin: { x: 5, y: 2 } }],
  surfaces: [{ id: "trace", enabled: true, cells: [{ x: 2, y: 1 }] }],
};
assert.equal(firstGlowAmbientContext(renderedContext), "quiet-route");
assert.equal(firstGlowAmbientContext({ ...renderedContext, selectedEntityId: "object:pool" }), "charge-pool");
assert.equal(firstGlowAmbientContext({ ...renderedContext, selectedEntityId: "object:shelter" }), "shelter-niche");
assert.equal(firstGlowAmbientContext({ ...renderedContext, selectedEntityId: null }), "open-space");
assert.equal(planFirstGlowAudioMix(renderedContext).scoreLevel > 0, true);
console.log("First Glow audio preference tests passed");
