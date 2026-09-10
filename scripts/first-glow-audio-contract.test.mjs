import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const script = join(root, "scripts/first-glow-audio-contract.mjs");
const palette = join(root, "assets/audio/first-glow/palette.json");
mkdirSync(join(root, ".tmp"), { recursive: true });
const temp = mkdtempSync(join(root, ".tmp", "first-glow-audio-contract-"));
const run = env => spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" });
try {
  const check = run({});
  assert.equal(check.status, 0, check.stderr || check.stdout);
  assert.match(check.stdout, /"assetCount": 7/);
  const broken = join(temp, "palette.json");
  const metadata = JSON.parse(readFileSync(palette, "utf8"));
  metadata.assets[0].license.status = "approved";
  writeFileSync(broken, JSON.stringify(metadata));
  const failure = run({ AUDIO_PALETTE_PATH: broken });
  assert.notEqual(failure.status, 0);
  assert.match(failure.stderr + failure.stdout, /planned entries must explicitly require provenance/);
  assert.equal(existsSync(palette), true);
  console.log("First Glow audio contract tests passed");
} finally { rmSync(temp, { recursive: true, force: true }); }
