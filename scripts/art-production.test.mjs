import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
mkdirSync(join(root, ".tmp"), { recursive: true });
const fixtureRoot = mkdtempSync(join(root, ".tmp", "art-production-fixtures-"));
const metadataSource = join(root, "assets/world/art-production/assets.json");
const originalMetadata = readFileSync(metadataSource, "utf8");
const fixture = () => {
  const dir = mkdtempSync(join(fixtureRoot, "case-"));
  cpSync(join(root, "assets/world/art-production/assets.json"), join(dir, "assets.json"));
  cpSync(join(root, "assets/world/assets"), join(dir, "assets"), { recursive: true });
  cpSync(join(root, "assets/world/templates"), join(dir, "templates"), { recursive: true });
  cpSync(join(root, "assets/world/generated"), join(dir, "generated"), { recursive: true });
  return { dir, metadata: join(dir, "assets.json"), source: join(dir, "assets"), templates: join(dir, "templates"), bundles: join(dir, "generated") };
};
const run = paths => spawnSync(process.execPath, ["scripts/art-production.mjs", "check"], { cwd: root, env: { ...process.env, ART_METADATA_PATH: paths.metadata, ART_SOURCE_ROOT: paths.source, ART_TEMPLATE_ROOT: paths.templates, ART_BUNDLE_ROOT: paths.bundles }, encoding: "utf8" });
const mutate = (paths, edit) => { const metadata = JSON.parse(readFileSync(paths.metadata, "utf8")); edit(metadata, paths); writeFileSync(paths.metadata, JSON.stringify(metadata, null, 2) + "\n"); };
const failsWith = (edit, pattern) => { const paths = fixture(); try { mutate(paths, edit); const result = run(paths); assert.notEqual(result.status, 0, result.stdout); assert.match(result.stderr + result.stdout, pattern); } finally { rmSync(paths.dir, { recursive: true, force: true }); } };
try {
  const valid = fixture(); const good = run(valid); assert.equal(good.status, 0, good.stderr); rmSync(valid.dir, { recursive: true, force: true });
  failsWith(metadata => { delete metadata.assets[0].role; }, /missing role/);
  failsWith(metadata => { metadata.assets[0].path = "missing.svg"; }, /missing editable source/);
  failsWith(metadata => { metadata.assets[0].dimensions.width = 0; }, /dimensions must be positive/);
  failsWith(metadata => { delete metadata.assets[0].version; }, /missing version/);
  failsWith(metadata => { delete metadata.assets[0].license; }, /missing license|invalid license/);
  failsWith(metadata => { delete metadata.assets[0].attribution; }, /missing attribution|invalid license/);
  failsWith(metadata => { metadata.assets[0].sourceType = "external"; }, /requires sourceUrl and retrievalDate/);
  failsWith((metadata, paths) => { const templatePath = join(paths.templates, "first-glow-charge-pool.json"); const template = JSON.parse(readFileSync(templatePath, "utf8")); template.visualAsset = "untracked.svg"; writeFileSync(templatePath, JSON.stringify(template)); }, /active Tiled reference/);
  failsWith(metadata => { metadata.assets.push({ ...metadata.assets[0], id: "orphan", path: "orphan.svg", status: "active" }); }, /orphaned active metadata|missing editable source/);
  failsWith((metadata, paths) => { const bundle = join(paths.bundles, "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601"); const world = JSON.parse(readFileSync(join(bundle, "world.json"), "utf8")); rmSync(join(bundle, world.assets[0].path)); }, /missing bundled asset/);
  failsWith((metadata, paths) => { const bundle = join(paths.bundles, "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601"); const worldPath = join(bundle, "world.json"); const world = JSON.parse(readFileSync(worldPath, "utf8")); world.assets[0].provenance = "assets/licenses/broken.md"; writeFileSync(worldPath, JSON.stringify(world)); }, /broken provenance/);
  assert.equal(readFileSync(metadataSource, "utf8"), originalMetadata, "tracked metadata changed during fixture tests");
  console.log("art-production isolated negative fixtures passed");
} finally { rmSync(fixtureRoot, { recursive: true, force: true }); }
