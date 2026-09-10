export const FIRST_GLOW_AUDIO_STORAGE_KEY = "mimir:first-glow-audio:v1";

export type FirstGlowAudioPreferences = {
  enabled: boolean;
  muted: boolean;
  ambienceEnabled: boolean;
  scoreEnabled: boolean;
  master: number;
  music: number;
  effects: number;
};

export const DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES: FirstGlowAudioPreferences = {
  enabled: false,
  muted: false,
  ambienceEnabled: true,
  scoreEnabled: false,
  master: 0.7,
  music: 0.35,
  effects: 0.5,
};

const clamp = (value: unknown, fallback: number) => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(1, Math.max(0, number));
};

export function loadFirstGlowAudioPreferences(storage: Pick<Storage, "getItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage): FirstGlowAudioPreferences {
  if (!storage) return { ...DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES };
  try {
    const raw = storage.getItem(FIRST_GLOW_AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<FirstGlowAudioPreferences>;
    return {
      enabled: parsed.enabled === true,
      muted: parsed.muted === true,
      ambienceEnabled: parsed.ambienceEnabled !== false,
      scoreEnabled: parsed.scoreEnabled === true,
      master: clamp(parsed.master, DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES.master),
      music: clamp(parsed.music, DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES.music),
      effects: clamp(parsed.effects, DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES.effects),
    };
  } catch {
    return { ...DEFAULT_FIRST_GLOW_AUDIO_PREFERENCES };
  }
}

export function saveFirstGlowAudioPreferences(preferences: FirstGlowAudioPreferences, storage: Pick<Storage, "setItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage): void {
  if (!storage) return;
  try { storage.setItem(FIRST_GLOW_AUDIO_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Storage can be unavailable in private contexts. */ }
}

export function audioPreferencePercent(value: number): number { return Math.round(clamp(value, 0) * 100); }
