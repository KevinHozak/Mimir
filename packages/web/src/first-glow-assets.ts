export const firstGlowAssetKey = (contentHash: string, path: string) => `${contentHash}:${path}`;
export const firstGlowAssetUrl = (apiBase: string, contentHash: string, path: string) => path.endsWith("first-glow-light-mark.svg") ? "/mimir-light-mark.svg" : `${apiBase}/api/world/bundles/${contentHash}/${path}`;
