import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd(); const run = (...args) => spawnSync(process.execPath, ["scripts/first-glow-art-bible.mjs", ...args], { cwd: root, encoding: "utf8" });
const check = run("check"); assert.equal(check.status, 0, check.stderr); assert.match(check.stdout, /retainedBundles/);
const review = run("review"); assert.equal(review.status, 0, review.stderr); assert.ok(existsSync(join(root, ".tmp/first-glow-art-review/review-sheet.html")));
console.log("First Glow art bible checks passed");
rmSync(join(root, ".tmp/first-glow-art-review"), { recursive: true, force: true });
