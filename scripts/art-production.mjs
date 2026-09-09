import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const metadataPath = resolve(process.env.ART_METADATA_PATH ?? join(root, "assets/world/art-production/assets.json"));
const sourceRoot = resolve(process.env.ART_SOURCE_ROOT ?? join(root, "assets/world/assets"));
const templateRoot = resolve(process.env.ART_TEMPLATE_ROOT ?? join(root, "assets/world/templates"));
const bundleRoot = resolve(process.env.ART_BUNDLE_ROOT ?? join(root, "assets/world/generated"));
const outputRoot = join(root, ".tmp/art-review");
const fail = messages => { if (messages.length) throw new Error(messages.map(message => `- ${message}`).join("\n")); };
const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const metadata = readJson(metadataPath);
const sourcePath = entry => join(sourceRoot, entry.path);
const svgSize = path => {
  const source = readFileSync(path, "utf8");
  const viewBox = source.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  const width = source.match(/<svg\b[^>]*\bwidth\s*=\s*["']([\d.]+)/i);
  const height = source.match(/<svg\b[^>]*\bheight\s*=\s*["']([\d.]+)/i);
  return viewBox ? { width: Number(viewBox[1]), height: Number(viewBox[2]) } : { width: Number(width?.[1]), height: Number(height?.[1]) };
};
const sourceDigest = path => createHash("sha256").update(readFileSync(path, "utf8").replaceAll("\r\n", "\n")).digest("hex");
const activeTemplateAssets = () => readdirSync(templateRoot).filter(name => name.startsWith("first-glow-") && name.endsWith(".json")).flatMap(name => {
  const template = readJson(join(templateRoot, name));
  return typeof template.visualAsset === "string" && !template.visualAsset.startsWith("assets/") ? [template.visualAsset] : [];
});
const generatedBundles = () => readdirSync(bundleRoot, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name.startsWith("sha256-")).map(entry => join(bundleRoot, entry.name));
const sourceNameFromBundlePath = path => path.replace(/^assets\/[0-9a-f]+-/, "");
const checkBundle = (bundle, errors, entriesByPath, activePaths, currentMatches) => {
  const worldPath = join(bundle, "world.json"); const manifestPath = join(bundle, "manifest.json");
  if (!existsSync(worldPath) || !existsSync(manifestPath)) { errors.push(`${bundle}: world.json and manifest.json are both required`); return; }
  const world = readJson(worldPath); const manifest = readJson(manifestPath); const manifestAssets = new Map((manifest.assets ?? []).map(asset => [asset.path, asset]));
  if (manifest.bundle?.contentHash !== world.bundle?.contentHash || basename(bundle) !== world.bundle?.contentHash) errors.push(`${relative(root, bundle)}: manifest, world, and directory content hashes disagree`);
  const bundledNames = new Set();
  for (const asset of world.assets ?? []) {
    const sourceName = sourceNameFromBundlePath(asset.path ?? ""); bundledNames.add(sourceName);
    const entry = entriesByPath.get(sourceName); const physical = asset.path && join(bundle, asset.path);
    if (!entry) errors.push(`${relative(root, worldPath)}: bundled asset ${asset.path} has no source metadata`);
    if (!asset.path?.startsWith("assets/") || !physical || !existsSync(physical)) errors.push(`${relative(root, worldPath)}: missing bundled asset ${asset.path}`);
    // Historical bundles retain their own imported bytes and hash claims. The current editable source may
    // legitimately have advanced since an older checkpoint; current source coverage is enforced below.
    if (entry && sourceDigest(sourcePath(entry)) === asset.sha256?.replace(/^sha256-/, "")) currentMatches.add(entry.path);
    const manifestAsset = manifestAssets.get(asset.path);
    if (!manifestAsset || manifestAsset.sha256 !== asset.sha256 || manifestAsset.provenance !== asset.provenance) errors.push(`${relative(root, manifestPath)}: manifest does not preserve asset ${asset.path}`);
    if (!asset.provenance || !existsSync(join(root, asset.provenance))) errors.push(`${relative(root, worldPath)}: broken provenance ${asset.provenance ?? "<missing>"}`);
    if (entry && !activePaths.has(entry.path)) errors.push(`${relative(root, worldPath)}: bundle references non-active source ${entry.path}`);
  }
  for (const path of activePaths) if (!bundledNames.has(path)) errors.push(`${relative(root, worldPath)}: active source ${path} is absent from the retained bundle`);
};
export const check = ({ bundlePath } = {}) => {
  const errors = []; const entries = Array.isArray(metadata.assets) ? metadata.assets : []; const entriesByPath = new Map(); const ids = new Set(); const paths = new Set();
  if (metadata.schemaVersion !== 1 || !Array.isArray(metadata.assets)) errors.push(`${metadataPath}: expected schemaVersion 1 and assets[]`);
  for (const entry of entries) {
    for (const field of ["id", "path", "format", "dimensions", "role", "version", "license", "attribution", "sourceType", "provenance"]) if (entry[field] === undefined || entry[field] === "") errors.push(`${metadataPath}: ${entry.id ?? "<missing>"} is missing ${field}`);
    if (!entry.id || ids.has(entry.id)) errors.push(`${metadataPath}: duplicate or missing asset id ${entry.id ?? "<missing>"}`); ids.add(entry.id);
    if (!entry.path || paths.has(entry.path)) errors.push(`${metadataPath}: duplicate or missing asset path ${entry.path ?? "<missing>"}`); paths.add(entry.path); entriesByPath.set(entry.path, entry);
    if (entry.path?.includes("..") || entry.path?.includes("generated")) errors.push(`${metadataPath}: unsafe source path ${entry.path}`);
    if (!existsSync(sourcePath(entry))) errors.push(`${metadataPath}: missing editable source ${entry.path}`);
    if (!entry.license || !entry.attribution) errors.push(`${metadataPath}: invalid license/attribution for ${entry.id}`);
    if (entry.sourceType === "external" && (!entry.sourceUrl || !entry.retrievalDate)) errors.push(`${metadataPath}: external asset ${entry.id} requires sourceUrl and retrievalDate`);
    if (entry.format === "svg" && existsSync(sourcePath(entry))) { const actual = svgSize(sourcePath(entry)); if (!Number.isFinite(actual.width) || !Number.isFinite(actual.height) || actual.width <= 0 || actual.height <= 0) errors.push(`${entry.path}: SVG needs positive dimensions`); if (!entry.dimensions || entry.dimensions.width !== actual.width || entry.dimensions.height !== actual.height) errors.push(`${entry.path}: declared dimensions do not match the editable source`); }
    if (entry.dimensions && (!Number.isInteger(entry.dimensions.width) || !Number.isInteger(entry.dimensions.height) || entry.dimensions.width <= 0 || entry.dimensions.height <= 0)) errors.push(`${entry.path}: dimensions must be positive integers`);
  }
  const refs = activeTemplateAssets(); const activePaths = new Set(entries.filter(entry => entry.status === "active").map(entry => entry.path));
  for (const asset of refs) { if (!paths.has(asset)) errors.push(`active Tiled reference ${asset} has no metadata entry`); else if (!activePaths.has(asset)) errors.push(`active Tiled reference ${asset} is not marked active`); }
  for (const entry of entries) if (entry.status === "active" && !refs.includes(entry.path)) errors.push(`orphaned active metadata ${entry.path}`);
  const bundles = generatedBundles(); if (!bundles.length) errors.push(`${bundleRoot}: no retained content-addressed bundles found`);
  const currentMatches = new Set(); for (const bundle of bundles) checkBundle(bundle, errors, entriesByPath, activePaths, currentMatches);
  for (const path of activePaths) if (!currentMatches.has(path)) errors.push(`active source ${path} has no retained bundle matching its current editable bytes`);
  if (bundlePath) { const explicit = dirname(resolve(root, bundlePath)); if (!bundles.includes(explicit)) errors.push(`explicit review bundle is not under retained bundle root: ${bundlePath}`); }
  fail(errors); return { sourceCount: entries.length, activeCount: activePaths.size, bundleCount: bundles.length, bundleHash: bundlePath ? readJson(resolve(root, bundlePath)).bundle.contentHash : undefined };
};
export const writeInventory = () => {
  mkdirSync(outputRoot, { recursive: true });
  const entries = metadata.assets.map(entry => ({ ...entry, source: relative(root, sourcePath(entry)).replaceAll("\\", "/"), dimensions: svgSize(sourcePath(entry)) }));
  writeFileSync(join(outputRoot, "asset-inventory.json"), JSON.stringify({ generatedBy: "scripts/art-production.mjs", sourceMetadata: relative(root, metadataPath).replaceAll("\\", "/"), assets: entries }, null, 2) + "\n");
  const cells = entries.map((entry, index) => { const x = (index % 3) * 240; const y = Math.floor(index / 3) * 190; return `<g transform="translate(${x} ${y})"><rect width="220" height="170" rx="12" fill="#101a2b" stroke="#a9b9cc"/><image href="../../assets/world/assets/${entry.path}" x="20" y="15" width="180" height="110" preserveAspectRatio="xMidYMid meet"/><text x="16" y="145" fill="#f4f7fb" font-family="sans-serif" font-size="12">${entry.id}</text><text x="16" y="160" fill="#8de8ff" font-family="sans-serif" font-size="10">${entry.role} · ${entry.dimensions.width}×${entry.dimensions.height}</text></g>`; }).join("\n");
  writeFileSync(join(outputRoot, "contact-sheet.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${Math.ceil(entries.length / 3) * 190}" viewBox="0 0 720 ${Math.ceil(entries.length / 3) * 190}"><rect width="100%" height="100%" fill="#050914"/>${cells}</svg>\n`);
};
const command = process.argv[2] ?? "check"; const bundleArg = process.argv.indexOf("--bundle"); const bundlePath = bundleArg >= 0 ? process.argv[bundleArg + 1] : undefined;
if (command === "check") console.log(JSON.stringify(check({ bundlePath }), null, 2)); else if (command === "inventory") { check(); writeInventory(); console.log(`wrote ${relative(root, outputRoot)}`); } else if (command === "review") { check({ bundlePath }); writeInventory(); console.log("art:review now uses scripts/art-review.mjs for running-observer captures"); } else throw new Error("usage: node scripts/art-production.mjs <check|inventory|review> [--bundle path]");
