import assert from "node:assert/strict";
import { DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES, FIRST_GLOW_AUDIO_STORAGE_KEY, audioPreferencePercent, loadFirstGlowAudioPreferences, saveFirstGlowAudioPreferences } from "./first-glow-audio.js";

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};

assert.deepEqual(loadFirstGlowAudioPreferences(storage), DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES);
saveFirstGlowAudioPreferences({ enabled: true, muted: true, master: 1.4, music: -1, effects: 0.425 }, storage);
assert.equal(values.has(FIRST_GLOW_AUDIO_STORAGE_KEY), true);
assert.deepEqual(loadFirstGlowAudioPreferences(storage), { enabled: true, muted: true, master: 1, music: 0, effects: 0.425 });
values.set(FIRST_GLOW_AUDIO_STORAGE_KEY, "not json");
assert.deepEqual(loadFirstGlowAudioPreferences(storage), DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES);
assert.equal(audioPreferencePercent(0.726), 73);
console.log("First Glow audio preference tests passed");
