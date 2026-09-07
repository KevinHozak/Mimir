import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "mimir-first-glow-import-"));
try {
  cpSync(join(root, "assets", "world", "maps"), join(temp, "maps"), { recursive: true });
  cpSync(join(root, "assets", "world", "templates"), join(temp, "templates"), { recursive: true });
  cpSync(join(root, "assets", "world", "tilesets"), join(temp, "tilesets"), { recursive: true });
  cpSync(join(root, "assets", "world", "assets"), join(temp, "assets"), { recursive: true });
  const mapPath = join(temp, "maps", "first-glow.tiled.json"); const outputRoot = join(temp, "generated");
  const run = () => JSON.parse(execFileSync(process.execPath, [join(root, "scripts", "import-world.mjs"), mapPath], { cwd: root, env: { ...process.env, WORLD_BUNDLE_ROOT: outputRoot }, encoding: "utf8" }));
  const first = run(); const worldBytes = readFileSync(first.path, "utf8"); const world = JSON.parse(worldBytes); assert.equal(world.schemaVersion, 3); assert.equal(world.assets.length, 5); assert.ok(world.assets.every(asset => asset.sha256.startsWith("sha256-"))); assert.ok(world.objects.every(object => object.id.startsWith("tiled-")));
  const second = run(); assert.equal(second.bundle.contentHash, first.bundle.contentHash); assert.equal(readFileSync(second.path, "utf8"), worldBytes);
  world.objects.push({ id: "tiled-106", definitionId: "light-mark", origin: { x: 6, y: 7 }, orientation: 0 }); const source = JSON.parse(readFileSync(mapPath, "utf8")); source.layers.find(layer => layer.role === "objects").objects.push({ id: 106, name: "mark-b", template: "../templates/first-glow-light-mark.json", x: 144, y: 168 }); writeFileSync(mapPath, JSON.stringify(source)); const moved = run(); assert.notEqual(moved.bundle.contentHash, first.bundle.contentHash); assert.ok(moved.path.includes("sha256-"));
  const expectFailure = (mutate, message) => { const original = readFileSync(mapPath, "utf8"); const changed = JSON.parse(original); mutate(changed); writeFileSync(mapPath, JSON.stringify(changed)); assert.throws(run, message); writeFileSync(mapPath, original); };
  expectFailure(changed => { changed.layers.find(layer => layer.role === "objects").objects[0].rotation = 90; }, /unsupported transform/);
  const templatePath = join(temp, "templates", "first-glow-light-mark.json"); const templateOriginal = readFileSync(templatePath, "utf8"); const template = JSON.parse(templateOriginal); template.visualAsset = "missing.svg"; writeFileSync(templatePath, JSON.stringify(template)); assert.throws(run, /missing asset/); writeFileSync(templatePath, templateOriginal);
  expectFailure(changed => { changed.layers.find(layer => layer.role === "objects").objects.push({ id: 107, name: "pool-b", template: "../templates/first-glow-charge-pool.json", x: 48, y: 48 }); }, /solid objects/);
  expectFailure(changed => { changed.layers.find(layer => layer.role === "spawns").objects[0].x = 48; changed.layers.find(layer => layer.role === "spawns").objects[0].y = 48; }, /spawn/);
  console.log("First Glow import tests passed");
} finally { rmSync(temp, { recursive: true, force: true }); }
