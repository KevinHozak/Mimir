import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
mkdirSync(join(root, ".tmp"), { recursive: true });
const trackedMetadata = join(root, "assets/world/art-production/assets.json");
const original = readFileSync(trackedMetadata, "utf8");
const temp = mkdtempSync(join(root, ".tmp", "art-bible-fixture-"));
const run = (command, env = {}) => spawnSync(process.execPath, ["scripts/first-glow-art-bible.mjs", command], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" });
try {
  const check = run("check"); assert.equal(check.status, 0, check.stderr); assert.match(check.stdout, /retainedBundles/);
  const review = run("review"); assert.equal(review.status, 0, review.stderr); assert.ok(existsSync(join(root, ".tmp/first-glow-art-review/review-sheet.html")));
  const broken = join(temp, "assets.json"); const metadata = JSON.parse(original); delete metadata.assets[0].attribution; writeFileSync(broken, JSON.stringify(metadata));
  const failure = run("check", { ART_METADATA_PATH: broken }); assert.notEqual(failure.status, 0); assert.match(failure.stderr + failure.stdout, /missing attribution|invalid license/);
  assert.equal(readFileSync(trackedMetadata, "utf8"), original, "tracked metadata changed during bible fixture test");
  console.log("First Glow art bible provenance fixture passed");
} finally { rmSync(temp, { recursive: true, force: true }); rmSync(join(root, ".tmp/first-glow-art-review"), { recursive: true, force: true }); }
