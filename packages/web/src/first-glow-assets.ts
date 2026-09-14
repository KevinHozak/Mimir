export const firstGlowAssetKey = (contentHash: string, path: string) => `${contentHash}:${path}`;
export const firstGlowAssetUrl = (apiBase: string, contentHash: string, path: string) => path.endsWith("first-glow-light-mark.svg") && typeof window !== "undefined" && apiBase === window.location.origin ? "/mimir-light-mark.svg" : `${apiBase}/api/world/bundles/${contentHash}/${path}`;
