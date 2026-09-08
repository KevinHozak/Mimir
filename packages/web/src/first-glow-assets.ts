export const firstGlowAssetKey = (contentHash: string, path: string) => `${contentHash}:${path}`;
export const firstGlowAssetUrl = (apiBase: string, contentHash: string, path: string) => `${apiBase}/api/world/bundles/${contentHash}/${path}`;
