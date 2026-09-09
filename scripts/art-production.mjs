import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const metadataPath = join(root, "assets/world/art-production/assets.json");
const sourceRoot = join(root, "assets/world/assets");
const outputRoot = join(root, ".tmp/art-review");
const fail = (messages) => { if (messages.length) throw new Error(messages.map(message => `- ${message}`).join("\n")); };
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
const activeTemplateAssets = () => {
  const templateRoot = join(root, "assets/world/templates");
  const assets = readdirSync(templateRoot).filter(name => name.endsWith(".json")).flatMap(name => { const template = readJson(join(templateRoot, name)); return typeof template.visualAsset === "string" && !template.visualAsset.startsWith("assets/") ? [template.visualAsset] : []; });
  return assets;
};
const generatedBundles = () => readdirSync(join(root, "assets/world/generated"), { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name.startsWith("sha256-")).map(entry => join(root, "assets/world/generated", entry.name));
const check = ({ bundlePath } = {}) => {
  const errors = [];
  if (metadata.schemaVersion !== 1 || !Array.isArray(metadata.assets)) errors.push(`${metadataPath}: expected schemaVersion 1 and assets[]`);
  const ids = new Set(); const paths = new Set();
  for (const entry of metadata.assets ?? []) {
    if (!entry.id || ids.has(entry.id)) errors.push(`${metadataPath}: duplicate or missing asset id ${entry.id ?? "<missing>"}`); ids.add(entry.id);
    if (!entry.path || paths.has(entry.path)) errors.push(`${metadataPath}: duplicate or missing asset path ${entry.path ?? "<missing>"}`); paths.add(entry.path);
    if (entry.path?.includes("..") || entry.path?.includes("generated")) errors.push(`${metadataPath}: source path escapes editable source root: ${entry.path}`);
    if (!existsSync(sourcePath(entry))) errors.push(`${metadataPath}: missing editable source ${entry.path}`);
    const provenance = entry.provenance && join(root, entry.provenance);
    if (!provenance || !existsSync(provenance)) errors.push(`${metadataPath}: missing provenance ${entry.provenance ?? "<missing>"} for ${entry.id}`);
    if (entry.format === "svg" && existsSync(sourcePath(entry))) { const size = svgSize(sourcePath(entry)); if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) errors.push(`${entry.path}: SVG needs positive viewBox or width/height dimensions`); }
  }
  const active = activeTemplateAssets();
  for (const asset of active) if (!paths.has(asset)) errors.push(`active template asset ${asset} has no metadata entry`);
  for (const entry of metadata.assets ?? []) if (entry.status === "active" && !active.includes(entry.path)) errors.push(`active metadata asset ${entry.path} is orphaned from Tiled templates`);
  for (const bundle of generatedBundles()) {
    const worldPath = join(bundle, "world.json"); if (!existsSync(worldPath)) { errors.push(`${bundle}: missing world.json`); continue; }
    const world = readJson(worldPath);
    for (const asset of world.assets ?? []) { if (!asset.path || !asset.path.startsWith("assets/") || !existsSync(join(bundle, asset.path))) errors.push(`${relative(root, worldPath)}: missing bundled asset ${asset.path}`); if (!asset.provenance || !existsSync(join(root, asset.provenance))) errors.push(`${relative(root, worldPath)}: missing asset provenance ${asset.provenance ?? "<missing>"}`); }
  }
  if (bundlePath) { const world = readJson(resolve(root, bundlePath)); if (!world.bundle?.contentHash) errors.push(`${bundlePath}: missing content hash`); }
  fail(errors); return { sourceCount: metadata.assets.length, activeCount: active.length, bundleCount: generatedBundles().length };
};
const writeInventory = () => {
  mkdirSync(outputRoot, { recursive: true });
  const entries = metadata.assets.map(entry => ({ ...entry, source: relative(root, sourcePath(entry)).replaceAll("\\", "/"), dimensions: svgSize(sourcePath(entry)) }));
  writeFileSync(join(outputRoot, "asset-inventory.json"), JSON.stringify({ generatedBy: "scripts/art-production.mjs", sourceMetadata: relative(root, metadataPath).replaceAll("\\", "/"), assets: entries }, null, 2) + "\n");
  const cells = entries.map((entry, index) => { const x = (index % 3) * 240; const y = Math.floor(index / 3) * 190; return `<g transform="translate(${x} ${y})"><rect width="220" height="170" rx="12" fill="#101a2b" stroke="#a9b9cc"/><image href="../../assets/world/assets/${entry.path}" x="20" y="15" width="180" height="110" preserveAspectRatio="xMidYMid meet"/><text x="16" y="145" fill="#f4f7fb" font-family="sans-serif" font-size="12">${entry.id}</text><text x="16" y="160" fill="#8de8ff" font-family="sans-serif" font-size="10">${entry.role} · ${entry.dimensions.width}×${entry.dimensions.height}</text></g>`; }).join("\n");
  writeFileSync(join(outputRoot, "contact-sheet.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="${Math.ceil(entries.length / 3) * 190}" viewBox="0 0 720 ${Math.ceil(entries.length / 3) * 190}"><rect width="100%" height="100%" fill="#050914"/>${cells}</svg>\n`);
  return entries;
};
const writeReview = bundlePath => {
  mkdirSync(outputRoot, { recursive: true }); const bundleLabel = bundlePath ? basename(dirname(resolve(root, bundlePath))) : "active generated bundles";
  const frame = (width, height, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#050914"/><path d="M40 ${height / 2} H${width - 40} M${width / 2} 40 V${height - 40}" stroke="#233b60" stroke-width="3"/><circle cx="${width / 2}" cy="${height / 2}" r="46" fill="#8de8ff" fill-opacity=".16" stroke="#a9b9cc" stroke-width="3"/><circle cx="${width / 2}" cy="${height / 2}" r="10" fill="#f4f7fb"/><text x="24" y="32" fill="#f4f7fb" font-family="sans-serif" font-size="18">${label}</text><text x="24" y="${height - 24}" fill="#8de8ff" font-family="sans-serif" font-size="12">Review artifact · ${bundleLabel} · not authored world data</text></svg>`;
  writeFileSync(join(outputRoot, "desktop-reference.svg"), frame(1280, 720, "First Glow desktop reference")); writeFileSync(join(outputRoot, "mobile-reference.svg"), frame(390, 844, "First Glow mobile reference"));
  writeFileSync(join(outputRoot, "review.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>First Glow art review</title><style>body{margin:0;background:#050914;color:#f4f7fb;font:14px system-ui}main{max-width:1280px;margin:auto;padding:24px}img{max-width:100%;display:block;margin:12px 0;border:1px solid #233b60}</style><main><h1>First Glow art review</h1><p>${bundleLabel}; generated review artifact only.</p><img src="contact-sheet.svg" alt="Asset contact sheet"><picture><source media="(max-width:600px)" srcset="mobile-reference.svg"><img src="desktop-reference.svg" alt="Responsive desktop/mobile reference"></picture></main>`);
  return ["asset-inventory.json", "contact-sheet.svg", "desktop-reference.svg", "mobile-reference.svg", "review.html"].map(name => join(".tmp/art-review", name));
};
const command = process.argv[2] ?? "check"; const bundleArg = process.argv.indexOf("--bundle"); const bundlePath = bundleArg >= 0 ? process.argv[bundleArg + 1] : undefined;
if (command === "check") console.log(JSON.stringify(check({ bundlePath }), null, 2));
else if (command === "inventory") { check(); writeInventory(); console.log(`wrote ${relative(root, outputRoot)}`); }
else if (command === "review") { check({ bundlePath }); writeInventory(); console.log(JSON.stringify({ outputs: writeReview(bundlePath) }, null, 2)); }
else throw new Error(`usage: node scripts/art-production.mjs <check|inventory|review> [--bundle path]`);
