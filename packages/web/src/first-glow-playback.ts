export const firstGlowPlaybackStepMs = (playbackRate: number) => Math.max(40, Math.round(180 / Math.max(0.25, playbackRate)));
