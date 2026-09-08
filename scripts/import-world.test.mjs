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
  const source = JSON.parse(readFileSync(mapPath, "utf8")); const objects = source.layers.find(layer => layer.role === "objects").objects; const shelter = objects.find(object => object.id === 102); shelter.properties = [{ name: "displayHint", type: "string", value: "safe" }]; shelter.x = 288; writeFileSync(mapPath, JSON.stringify(source)); const moved = run(); const movedWorld = JSON.parse(readFileSync(moved.path, "utf8")); assert.notEqual(moved.bundle.contentHash, first.bundle.contentHash); assert.ok(moved.path.includes("sha256-")); assert.deepEqual(movedWorld.objects.find(object => object.id === "tiled-102")?.origin, { x: 12, y: 2 }); assert.deepEqual(movedWorld.objects.filter(object => object.id !== "tiled-102"), world.objects.filter(object => object.id !== "tiled-102"));
  objects.push({ id: 106, name: "mark-b", template: "../templates/first-glow-light-mark.json", x: 144, y: 168 }, { id: 107, name: "shard-b", template: "../templates/first-glow-pattern-shard.json", x: 216, y: 168 }); writeFileSync(mapPath, JSON.stringify(source)); const authored = run(); const authoredWorld = JSON.parse(readFileSync(authored.path, "utf8")); assert.equal(authoredWorld.objects.filter(object => object.definitionId === "light-mark").length, 2); assert.equal(authoredWorld.objects.filter(object => object.definitionId === "pattern-shard").length, 2);
  const expectFailure = (mutate, message) => { const original = readFileSync(mapPath, "utf8"); const changed = JSON.parse(original); mutate(changed); writeFileSync(mapPath, JSON.stringify(changed)); assert.throws(run, message); writeFileSync(mapPath, original); };
  expectFailure(changed => { changed.tilesets[0].firstgid = 2; }, /firstgid 1/);
  expectFailure(changed => { changed.layers.find(layer => layer.role === "objects").objects[0].rotation = 90; }, /unsupported transform/);
  const templatePath = join(temp, "templates", "first-glow-light-mark.json"); const templateOriginal = readFileSync(templatePath, "utf8"); const template = JSON.parse(templateOriginal); template.visualAsset = "missing.svg"; writeFileSync(templatePath, JSON.stringify(template)); assert.throws(run, /missing asset/); writeFileSync(templatePath, templateOriginal);
  expectFailure(changed => { changed.layers.find(layer => layer.role === "objects").objects.push({ id: 108, name: "pool-b", template: "../templates/first-glow-charge-pool.json", x: 48, y: 48 }); }, /solid objects/);
  expectFailure(changed => { changed.layers.find(layer => layer.role === "spawns").objects[0].x = 48; changed.layers.find(layer => layer.role === "spawns").objects[0].y = 48; }, /spawn/);
  expectFailure(changed => { const objectsLayer = changed.layers.find(layer => layer.role === "objects"); objectsLayer.objects = Array.from({ length: 16 }, (_, x) => x === 8 ? null : ({ id: 300 + x, name: `barrier-${x}`, template: "../templates/first-glow-pattern-shard.json", x: x * 24, y: 24 })).filter(Boolean).concat({ id: 109, name: "unreachable", template: "../templates/first-glow-pattern-shard.json", x: 336, y: 72 }); changed.layers.find(layer => layer.role === "spawns").objects.forEach(spawn => { spawn.x = 0; spawn.y = 0; }); }, /unreachable/);
  console.log("First Glow import tests passed");
} finally { rmSync(temp, { recursive: true, force: true }); }
