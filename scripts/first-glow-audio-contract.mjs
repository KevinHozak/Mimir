import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const palettePath = resolve(process.env.AUDIO_PALETTE_PATH ?? join(root, "assets/audio/first-glow/palette.json"));
const docsPath = join(root, "docs/audio-production.md");
const expectedIds = [
  "first-glow-open-space-hum",
  "first-glow-charge-pool-tone",
  "first-glow-shelter-stillness",
  "first-glow-route-current-texture",
  "first-glow-paired-exchange-tone",
  "first-glow-short-warning",
  "first-glow-selection-focus-feedback",
];
const fail = messages => { if (messages.length) throw new Error(messages.map(message => `- ${message}`).join("\n")); };
const readJson = path => JSON.parse(readFileSync(path, "utf8"));

export const check = () => {
  const errors = [];
  if (!existsSync(palettePath)) return fail([`${palettePath}: missing audio palette contract`]);
  const palette = readJson(palettePath);
  if (palette.schemaVersion !== 1) errors.push(`${palettePath}: schemaVersion must be 1`);
  if (palette.status !== "contract-only") errors.push(`${palettePath}: Audio-P2 palette must remain contract-only until binary assets are reviewed`);
  if (!Array.isArray(palette.assets)) errors.push(`${palettePath}: assets[] is required`);
  const assets = Array.isArray(palette.assets) ? palette.assets : [];
  const ids = new Set(assets.map(asset => asset.id));
  if (assets.length !== expectedIds.length) errors.push(`${palettePath}: expected exactly ${expectedIds.length} palette entries`);
  for (const id of expectedIds) if (!ids.has(id)) errors.push(`${palettePath}: missing required palette entry ${id}`);
  for (const asset of assets) {
    for (const field of ["id", "kind", "intendedUse", "meaning", "allowedWhen", "loudness", "loop", "sourceFormat", "edits", "status", "license", "provenance"]) if (asset[field] === undefined || asset[field] === "") errors.push(`${palettePath}: ${asset.id ?? "<missing>"} is missing ${field}`);
    if (!["ambience", "feedback"].includes(asset.kind)) errors.push(`${palettePath}: ${asset.id}: kind must be ambience or feedback`);
    if (asset.status !== "planned") errors.push(`${palettePath}: ${asset.id}: only planned entries are allowed in this contract-only palette`);
    if (!Array.isArray(asset.allowedWhen) || asset.allowedWhen.length === 0) errors.push(`${palettePath}: ${asset.id}: allowedWhen must not be empty`);
    if (!Number.isFinite(asset.loudness?.targetIntegratedLufs) || !Number.isFinite(asset.loudness?.maxPeakDbtp)) errors.push(`${palettePath}: ${asset.id}: loudness targets must be numeric`);
    if (!["loop-safe", "one-shot"].includes(asset.loop?.mode)) errors.push(`${palettePath}: ${asset.id}: loop mode must be loop-safe or one-shot`);
    if (asset.loop?.mode === "loop-safe" && (!Number.isInteger(asset.loop.targetDurationSeconds) || asset.loop.targetDurationSeconds < 2)) errors.push(`${palettePath}: ${asset.id}: loop-safe entries need a short target duration`);
    if (asset.loop?.mode === "one-shot" && asset.loop.targetDurationSeconds >= 3) errors.push(`${palettePath}: ${asset.id}: feedback one-shots must remain brief`);
    if (asset.license?.status !== "required-before-shipping" || asset.provenance?.status !== "required-before-shipping") errors.push(`${palettePath}: ${asset.id}: planned entries must explicitly require provenance before shipping`);
    if (asset.license?.spdx !== null || asset.license?.attribution !== null || asset.provenance?.sourceType !== null || asset.provenance?.sourceUrl !== null || asset.provenance?.retrievalDate !== null || asset.provenance?.sourceId !== null) errors.push(`${palettePath}: ${asset.id}: unreviewed planned entries must not claim provenance`);
  }
  const docs = existsSync(docsPath) ? readFileSync(docsPath, "utf8") : "";
  if (!docs) errors.push(`${docsPath}: missing audio production guidance`);
  for (const phrase of ["near-silent", "silent mode", "immutable world-bundle", "provenance", "ambience", "feedback"]) if (!docs.includes(phrase)) errors.push(`${docsPath}: missing review term ${phrase}`);
  fail(errors);
  return { paletteId: palette.paletteId, assetCount: assets.length, status: palette.status };
};

console.log(JSON.stringify(check(), null, 2));
