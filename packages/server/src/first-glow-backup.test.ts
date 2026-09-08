import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const stamp = Date.now();
const database = join(root, `first-glow-backup-${stamp}.db`);
const backup = join(root, `first-glow-backup-${stamp}-copy.db`);
const restored = join(root, `first-glow-backup-${stamp}-restored.db`);
const restoredBundles = `${restored}.bundles`;
const bundleRoot = join(root, "assets", "world", "generated");
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
let child: ReturnType<typeof spawn> | undefined;
const waitFor = async (port: number) => { for (let i = 0; i < 80; i += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error("First Glow backup server did not start"); };
try {
  child = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], { cwd: root, env: { ...process.env, PORT: "34140", AUTO_TICK: "false", DATABASE_PATH: database, OWNER_TOKEN: "backup-owner", WORLD_BUNDLE_ROOT: bundleRoot }, stdio: "ignore" });
  await waitFor(34140);
  const reset = await fetch("http://127.0.0.1:34140/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "backup-owner" }, body: JSON.stringify({ bundleHash: hash, seed: 31, sparkCount: 2 }) });
  assert.equal(reset.status, 200, await reset.text());
  child.kill(); await new Promise(resolve => child?.once("exit", resolve)); child = undefined;
  const env = { ...process.env, DATABASE_PATH: database, WORLD_BUNDLE_ROOT: bundleRoot };
  execFileSync(process.execPath, ["dist/backup.js", "backup", backup], { cwd: join(root, "packages/server"), env });
  const manifest = JSON.parse(readFileSync(`${backup}.manifest.json`, "utf8")) as { bundleHashes: string[] };
  assert.deepEqual(manifest.bundleHashes, [hash]);
  execFileSync(process.execPath, ["dist/backup.js", "restore", backup, restored], { cwd: join(root, "packages/server"), env });
  assert.ok(existsSync(`${restored}.bundles/${hash}/world.json`));
  const restoredDb = new DatabaseSync(restored);
  const checkpoint = restoredDb.prepare("SELECT state_json FROM timeline_checkpoints ORDER BY tick DESC LIMIT 1").get() as { state_json: string };
  const state = JSON.parse(checkpoint.state_json) as { simulationVersion: string; spatialModel: string; firstGlowState: { themeId: string; ageId: string } };
  assert.equal(state.simulationVersion, "mimir-sim-v3-first-glow"); assert.equal(state.spatialModel, "structured-v2"); assert.equal(state.firstGlowState.themeId, "living-circuit"); assert.equal(state.firstGlowState.ageId, "first-glow"); restoredDb.close();
  console.log("First Glow bundle-inclusive backup/restore passed");
} finally {
  if (child && child.exitCode === null) child.kill();
  // Restore creates the sidecar before validating bundle contents, so clean it even when restore fails.
  for (const path of [database, backup, restored, `${database}-wal`, `${database}-shm`, `${backup}-wal`, `${backup}-shm`, `${restored}-wal`, `${restored}-shm`, `${backup}.manifest.json`, `${backup}.bundles`, restoredBundles, `${restored}.manifest.json`]) if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}
