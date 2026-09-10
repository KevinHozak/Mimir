export const FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY = "mimir:first-glow-viewer:v1";

export type FirstGlowViewerSettings = {
  zoom: number;
  playbackRate: 0.5 | 1 | 2;
};

export const DEFAULT_FIRST_GLOW_VIEWER_SETTINGS: FirstGlowViewerSettings = {
  zoom: 1,
  playbackRate: 1,
};

const clampZoom = (value: unknown): number => {
  const number = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_FIRST_GLOW_VIEWER_SETTINGS.zoom;
  return Number(Math.min(4, Math.max(1, number)).toFixed(2));
};

const playbackRate = (value: unknown): FirstGlowViewerSettings["playbackRate"] => value === 0.5 || value === 2 ? value : 1;

export function loadFirstGlowViewerSettings(storage: Pick<Storage, "getItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage): FirstGlowViewerSettings {
  if (!storage) return { ...DEFAULT_FIRST_GLOW_VIEWER_SETTINGS };
  try {
    const raw = storage.getItem(FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FIRST_GLOW_VIEWER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<FirstGlowViewerSettings>;
    return { zoom: clampZoom(parsed.zoom), playbackRate: playbackRate(parsed.playbackRate) };
  } catch {
    return { ...DEFAULT_FIRST_GLOW_VIEWER_SETTINGS };
  }
}

export function saveFirstGlowViewerSettings(settings: FirstGlowViewerSettings, storage: Pick<Storage, "setItem"> | undefined = typeof window === "undefined" ? undefined : window.localStorage): void {
  if (!storage) return;
  try { storage.setItem(FIRST_GLOW_VIEWER_SETTINGS_STORAGE_KEY, JSON.stringify(settings)); } catch { /* Storage can be unavailable in private contexts. */ }
}
