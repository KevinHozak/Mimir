import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const biblePath = join(root, "docs/first-glow-art-bible.md");
const outputRoot = join(root, ".tmp/first-glow-art-review");
const required = ["## 1. North star and composition", "## 2. Tokens, contrast, and glow", "## 3. Shape language and Spark signatures", "## 4. Nodes, routes, and interaction states", "## 5. Interface, typography, and icons", "## 6. Motion and reduced motion", "## 7. Source, dimensions, naming, and provenance", "## 8. Safe production and review path", "## 9. Review sheet: practical do/don't examples"];
const tokens = ["#050914", "#101A2B", "#3D6EA8", "#8DE8FF", "#A9B9CC", "#EDF7FF", "#C7B7FF", "#EF8B9A"];
const states = ["Normal", "Selected", "Low-charge", "Blocked", "Gathering", "Reduced motion"];
const fail = messages => { if (messages.length) throw new Error(messages.map(message => `- ${message}`).join("\n")); };
const check = bundlePath => {
  const errors = []; const bible = readFileSync(biblePath, "utf8");
  for (const heading of required) if (!bible.includes(heading)) errors.push(`${biblePath}: missing required section ${heading}`);
  for (const token of tokens) if (!bible.includes(token)) errors.push(`${biblePath}: missing palette token ${token}`);
  for (const state of states) if (!bible.includes(state)) errors.push(`${biblePath}: missing interaction treatment ${state}`);
  for (const link of ["docs/world-theme.md", "assets/licenses/first-glow-assets.md", "assets/world/README.md"]) if (!existsSync(join(root, link))) errors.push(`missing linked source ${link}`);
  if (!bible.includes("Generated hash directories are output, never hand-edited")) errors.push(`${biblePath}: missing immutable-output rule`);
  const production = spawnSync(process.execPath, [join(root, "scripts/art-production.mjs"), "check"], { cwd: root, env: process.env, encoding: "utf8" });
  if (production.status !== 0) errors.push(`art-production provenance check failed: ${(production.stderr || production.stdout).trim()}`);
  if (bundlePath) {
    const path = resolve(root, bundlePath); if (!existsSync(path)) errors.push(`missing review bundle ${bundlePath}`);
    else { const world = JSON.parse(readFileSync(path, "utf8")); if (world.themeId !== "living-circuit" || world.ageId !== "first-glow" || world.schemaVersion !== 3) errors.push(`${bundlePath}: not a schema-3 Living Circuit First Glow bundle`); if (!world.bundle?.contentHash) errors.push(`${bundlePath}: missing content hash`); }
  }
  const generatedRoot = join(root, "assets/world/generated"); const bundles = readdirSync(generatedRoot, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name.startsWith("sha256-")); if (!bundles.length) errors.push(`${generatedRoot}: no retained content-addressed bundles found`);
  fail(errors); return { sections: required.length, tokens: tokens.length, states: states.length, retainedBundles: bundles.length };
};
const writeReview = bundlePath => {
  mkdirSync(outputRoot, { recursive: true }); const label = bundlePath ? basename(resolve(root, bundlePath, "..")) : "retained First Glow bundles";
  const frame = (width, height, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#050914"/><path d="M${width * .1} ${height * .55}H${width * .9}" stroke="#3D6EA8" stroke-width="3"/><circle cx="${width * .5}" cy="${height * .55}" r="38" fill="#8DE8FF" fill-opacity=".14" stroke="#A9B9CC" stroke-width="3"/><path d="M${width * .5} ${height * .55}l18 -18m-18 18l-18 -18" stroke="#EDF7FF" stroke-width="5"/><text x="24" y="34" fill="#E3ECF7" font-family="sans-serif" font-size="18">${title}</text><text x="24" y="${height - 24}" fill="#A7B9CF" font-family="sans-serif" font-size="12">Review only · ${label} · not bundle source</text></svg>`;
  writeFileSync(join(outputRoot, "desktop-frame.svg"), frame(1280, 720, "First Glow desktop frame")); writeFileSync(join(outputRoot, "mobile-frame.svg"), frame(390, 844, "First Glow mobile frame"));
  writeFileSync(join(outputRoot, "review-sheet.html"), `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>First Glow art bible review</title><style>body{background:#050914;color:#E3ECF7;font:14px system-ui;max-width:1280px;margin:auto;padding:24px}img{max-width:100%;border:1px solid #3D6EA8;margin:8px 0}table{border-collapse:collapse}td,th{border:1px solid #A9B9CC;padding:8px}</style><h1>First Glow art bible review</h1><p>${label}. Review at normal zoom, zoomed out, and reduced motion.</p><picture><source media="(max-width:600px)" srcset="mobile-frame.svg"><img src="desktop-frame.svg" alt="First Glow desktop/mobile review frame"></picture><h2>Review cues</h2><table><tr><th>Do</th><th>Don't</th></tr><tr><td>Near-black space, local structure, crisp Spark core</td><td>Global bloom, human portrait, implied route</td></tr><tr><td>State shape plus text/icon cue</td><td>Color-only or flickering status</td></tr></table>`);
  return [".tmp/first-glow-art-review/desktop-frame.svg", ".tmp/first-glow-art-review/mobile-frame.svg", ".tmp/first-glow-art-review/review-sheet.html"];
};
const index = process.argv.indexOf("--bundle"); const bundlePath = index >= 0 ? process.argv[index + 1] : undefined; const command = process.argv[2] ?? "check";
if (command === "check") console.log(JSON.stringify(check(bundlePath), null, 2)); else if (command === "review") { console.log(JSON.stringify({ ...check(bundlePath), outputs: writeReview(bundlePath) }, null, 2)); } else throw new Error("usage: node scripts/first-glow-art-bible.mjs <check|review> [--bundle path]");
