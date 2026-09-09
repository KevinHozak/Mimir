import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd(); const output = join(root, ".tmp", "art-production-test"); mkdirSync(output, { recursive: true });
const run = (...args) => spawnSync(process.execPath, ["scripts/art-production.mjs", ...args], { cwd: root, encoding: "utf8" });
try {
  const check = run("check"); assert.equal(check.status, 0, check.stderr); assert.match(check.stdout, /sourceCount/);
  const inventory = run("inventory"); assert.equal(inventory.status, 0, inventory.stderr); assert.ok(existsSync(join(root, ".tmp/art-review/contact-sheet.svg")));
  const review = run("review"); assert.equal(review.status, 0, review.stderr); assert.ok(existsSync(join(root, ".tmp/art-review/mobile-reference.svg")));
  const metadataPath = join(root, "assets/world/art-production/assets.json"); const original = readFileSync(metadataPath, "utf8"); const broken = JSON.parse(original); broken.assets[0].provenance = "assets/licenses/does-not-exist.md"; writeFileSync(metadataPath, JSON.stringify(broken));
  const failure = run("check"); assert.notEqual(failure.status, 0); assert.match(failure.stderr, /missing provenance/); writeFileSync(metadataPath, original);
  console.log("art-production fixture checks passed");
} finally { const reviewRoot = join(root, ".tmp/art-review"); if (existsSync(reviewRoot)) rmSync(reviewRoot, { recursive: true, force: true }); if (existsSync(output)) rmSync(output, { recursive: true, force: true }); }
