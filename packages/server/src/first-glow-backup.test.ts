import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const stamp = Date.now();
const database = join(root, `first-glow-backup-${stamp}.db`);
const backup = join(root, `first-glow-backup-${stamp}-copy.db`);
const restored = join(root, `first-glow-backup-${stamp}-restored.db`);
const hash = "sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3";
let server: ChildProcess | undefined;
const start = (port: number, db: string, bundleRoot: string) => spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_TICK: "false", DATABASE_PATH: db, OWNER_TOKEN: "first-glow-backup-owner", WORLD_BUNDLE_ROOT: bundleRoot }, stdio: "ignore" });
const waitFor = async (port: number) => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`First Glow backup server did not start on ${port}`); };
const stop = async () => { if (!server) return; if (server.exitCode === null) server.kill(); await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); }); server = undefined; };
try {
  server = start(34140, database, join(root, "assets", "world", "generated")); await waitFor(34140);
  const reset = await fetch("http://127.0.0.1:34140/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "first-glow-backup-owner" }, body: JSON.stringify({ bundleHash: hash, seed: 31 }) }); assert.equal(reset.status, 200, await reset.text()); await stop();
  const env = { ...process.env, DATABASE_PATH: database, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") };
  execFileSync(process.execPath, ["dist/backup.js", "backup", backup], { cwd: join(root, "packages", "server"), env, stdio: "pipe" });
  const manifest = JSON.parse(readFileSync(`${backup}.manifest.json`, "utf8")) as { bundleHashes: string[] };
  assert.deepEqual(manifest.bundleHashes, [hash]);
  execFileSync(process.execPath, ["dist/backup.js", "restore", backup, restored], { cwd: join(root, "packages", "server"), env, stdio: "pipe" });
  assert.ok(existsSync(`${restored}.bundles/${hash}/world.json`));
  server = start(34141, restored, `${restored}.bundles`); await waitFor(34141);
  const world = await (await fetch("http://127.0.0.1:34141/api/world")).json() as { state: { simulationVersion?: string; firstGlowState?: { themeId?: string; ageId?: string } } };
  assert.equal(world.state.simulationVersion, "mimir-sim-v3-first-glow"); assert.equal(world.state.firstGlowState?.themeId, "living-circuit"); assert.equal(world.state.firstGlowState?.ageId, "first-glow");
  console.log("First Glow bundle-inclusive backup/restore passed");
} finally {
  await stop();
  for (const path of [database, backup, restored, `${database}-wal`, `${database}-shm`, `${backup}-wal`, `${backup}-shm`, `${restored}-wal`, `${restored}-shm`]) if (existsSync(path)) unlinkSync(path);
  for (const path of [`${backup}.manifest.json`, `${backup}.bundles`, `${restored}.bundles`]) if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}
