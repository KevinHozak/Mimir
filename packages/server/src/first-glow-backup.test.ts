import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const stamp = Date.now();
const database = join(root, `first-glow-backup-${stamp}.db`);
const backup = join(root, `first-glow-backup-${stamp}-copy.db`);
const restored = join(root, `first-glow-backup-${stamp}-restored.db`);
const villageHash = "sha256-1f24c63c9168eb2e8d6a76be1b1d42c12b601ef9f3955a34a9cf25d4d2854564";
const hash = "sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3";
let server: ChildProcess | undefined;
const start = (port: number, db: string, bundleRoot: string) => spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_TICK: "false", DATABASE_PATH: db, OWNER_TOKEN: "first-glow-backup-owner", WORLD_BUNDLE_ROOT: bundleRoot }, stdio: "ignore" });
const waitFor = async (port: number) => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`First Glow backup server did not start on ${port}`); };
const stop = async () => { if (!server) return; if (server.exitCode === null) server.kill(); await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); }); server = undefined; };
const legacyState = { worldId: "legacy-fixture", seed: 5, tick: 0, season: 1, foodReserve: 12, scenario: { name: "Legacy", initialFood: 12, seasonTickLimit: 60, harvestInterval: 3, harvestAmount: 8, hungerPressure: 9 }, villagers: [{ id: "villager-legacy", name: "Mara", tradition: "Hearthkeepers", hunger: 10, rest: 80, trust: 50, food: 2, activity: "rest", location: "Homes", beliefs: { cooperation: 50, selfReliance: 50, reflection: 50 }, position: { x: 2, y: 2 }, route: [], settlementId: "first-village" }] };
try {
  server = start(34140, database, join(root, "assets", "world", "generated")); await waitFor(34140);
  const v1Reset = await fetch("http://127.0.0.1:34140/api/owner/reset", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "first-glow-backup-owner" }, body: JSON.stringify({ seed: 23 }) }); assert.equal(v1Reset.status, 200, await v1Reset.text());
  const villageReset = await fetch("http://127.0.0.1:34140/api/owner/reset-v2", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "first-glow-backup-owner" }, body: JSON.stringify({ bundleHash: villageHash, seed: 29 }) }); assert.equal(villageReset.status, 200, await villageReset.text());
  const reset = await fetch("http://127.0.0.1:34140/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "first-glow-backup-owner" }, body: JSON.stringify({ bundleHash: hash, seed: 31 }) }); assert.equal(reset.status, 200, await reset.text()); await stop();
  const seeded = new DatabaseSync(database); seeded.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'archived')").run("legacy-fixture", "main", new Date().toISOString()); seeded.prepare("INSERT INTO timeline_checkpoints (timeline_id, tick, state_json) VALUES (?, 0, ?)").run("legacy-fixture", JSON.stringify(legacyState)); seeded.close();
  const env = { ...process.env, DATABASE_PATH: database, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") };
  execFileSync(process.execPath, ["dist/backup.js", "backup", backup], { cwd: join(root, "packages", "server"), env, stdio: "pipe" });
  const manifest = JSON.parse(readFileSync(`${backup}.manifest.json`, "utf8")) as { bundleHashes: string[] };
  assert.deepEqual(manifest.bundleHashes, [hash, villageHash].sort());
  execFileSync(process.execPath, ["dist/backup.js", "restore", backup, restored], { cwd: join(root, "packages", "server"), env, stdio: "pipe" });
  assert.ok(existsSync(`${restored}.bundles/${hash}/world.json`)); assert.ok(existsSync(`${restored}.bundles/${villageHash}/world.json`));
  server = start(34141, restored, `${restored}.bundles`); await waitFor(34141);
  const world = await (await fetch("http://127.0.0.1:34141/api/world")).json() as { state: { simulationVersion?: string; firstGlowState?: { themeId?: string; ageId?: string } } };
  assert.equal(world.state.simulationVersion, "mimir-sim-v3-first-glow"); assert.equal(world.state.firstGlowState?.themeId, "living-circuit"); assert.equal(world.state.firstGlowState?.ageId, "first-glow");
  await stop();
  const restoredDb = new DatabaseSync(restored);
  const checkpoints = restoredDb.prepare("SELECT timeline_id, state_json FROM timeline_checkpoints WHERE tick = 0 ORDER BY timeline_id").all() as { timeline_id: string; state_json: string }[];
  const replayTargets = new Map<string, string>();
  for (const checkpoint of checkpoints) { const snapshot = JSON.parse(checkpoint.state_json) as { spatialModel?: string; simulationVersion?: string }; if (!snapshot.spatialModel) replayTargets.set("legacy-backdrop-v0", checkpoint.timeline_id); else if (snapshot.spatialModel === "structured-v1") replayTargets.set("structured-v1", checkpoint.timeline_id); else if (snapshot.simulationVersion === "mimir-sim-v2") replayTargets.set("structured-v2", checkpoint.timeline_id); else if (snapshot.simulationVersion === "mimir-sim-v3-first-glow") replayTargets.set("mimir-sim-v3-first-glow", checkpoint.timeline_id); }
  assert.deepEqual([...replayTargets.keys()].sort(), ["legacy-backdrop-v0", "mimir-sim-v3-first-glow", "structured-v1", "structured-v2"].sort());
  restoredDb.exec("UPDATE timelines SET status = 'archived'");
  restoredDb.close();
  for (const [expected, timelineId] of replayTargets) {
    const db = new DatabaseSync(restored); db.prepare("UPDATE runtime_metadata SET value = ? WHERE key = 'active_timeline'").run(timelineId); db.prepare("UPDATE timelines SET status = 'active', archived_at = NULL WHERE id = ?").run(timelineId); db.close();
    server = start(34150 + replayTargets.size, restored, `${restored}.bundles`); await waitFor(34150 + replayTargets.size);
    const replayed = await (await fetch(`http://127.0.0.1:${34150 + replayTargets.size}/api/world`)).json() as { state: { spatialModel?: string; simulationVersion?: string } };
    assert.equal(replayed.state.spatialModel, expected === "mimir-sim-v3-first-glow" ? "structured-v2" : expected);
    assert.equal(replayed.state.simulationVersion, expected === "legacy-backdrop-v0" ? "legacy-unknown" : expected === "structured-v1" ? "mimir-sim-v1" : expected === "structured-v2" ? "mimir-sim-v2" : expected);
    const ticked = await fetch(`http://127.0.0.1:${34150 + replayTargets.size}/api/tick`, { method: "POST", headers: { "x-owner-token": "first-glow-backup-owner" } }); assert.equal(ticked.status, 200, `${expected} did not continue after restore`); await stop();
  }
  console.log("mixed legacy/v1/v2/v3 bundle-inclusive backup/restore passed");
} finally {
  await stop();
  for (const path of [database, backup, restored, `${database}-wal`, `${database}-shm`, `${backup}-wal`, `${backup}-shm`, `${restored}-wal`, `${restored}-shm`]) if (existsSync(path)) unlinkSync(path);
  for (const path of [`${backup}.manifest.json`, `${backup}.bundles`, `${restored}.bundles`]) if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}
