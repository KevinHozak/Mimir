import { loadObserverReturn, saveObserverReturn } from "./observer-navigation.js";
import assert from "node:assert/strict";
import { DEFAULT_FIRST_GLOW_VIEWER_SETTINGS, FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY, loadFirstGlowViewerSettings, saveFirstGlowViewerSettings } from "./first-glow-settings.js";

const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };

assert.deepEqual(loadFirstGlowViewerSettings(storage), DEFAULT_FIRST_GLOW_VIEWER_SETTINGS);
saveFirstGlowViewerSettings({ zoom: 2.345, playbackRate: 2 }, storage);
assert.equal(values.has(FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY), true);
assert.deepEqual(loadFirstGlowViewerSettings(storage), { zoom: 2.35, playbackRate: 2 });
values.set(FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY, JSON.stringify({ zoom: 99, playbackRate: 3 }));
assert.deepEqual(loadFirstGlowViewerSettings(storage), { zoom: 4, playbackRate: 1 });
saveFirstGlowViewerSettings({ zoom: 0.5, playbackRate: 1 }, storage);
assert.equal(loadFirstGlowViewerSettings(storage).zoom, 0.5);
values.set(FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY, "not json");
assert.deepEqual(loadFirstGlowViewerSettings(storage), DEFAULT_FIRST_GLOW_VIEWER_SETTINGS);

const context = { sparkId: "spark-4", follow: true, presentation: "immersive" as const };
saveObserverReturn(context, storage);
assert.deepEqual(loadObserverReturn(storage), context);
assert.equal(loadObserverReturn({ getItem: () => "not json" }), undefined);
assert.equal(loadObserverReturn({ getItem: () => JSON.stringify({ ...context, sparkId: "../bad" }) }), undefined);
assert.equal(loadObserverReturn({ getItem: () => { throw Error("denied"); } }), undefined);

console.log("First Glow viewer settings and return-context tests passed");
