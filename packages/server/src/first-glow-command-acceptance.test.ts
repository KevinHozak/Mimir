import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = join(process.cwd(), "..", "..");
const tempRoot = join(root, ".tmp", "first-glow-command-acceptance");
mkdirSync(tempRoot, { recursive: true });
const database = join(tempRoot, "commands.db");
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const token = "first-glow-command-acceptance-owner";
const port = 34144;
let server: ChildProcess | undefined;

const start = () => {
  server = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") }, stdio: ["ignore", "pipe", "pipe"] });
  const output: string[] = [];
  server.stdout?.on("data", chunk => output.push(String(chunk)));
  server.stderr?.on("data", chunk => output.push(String(chunk)));
  return output;
};
const stop = async () => { if (!server) return; if (server.exitCode === null) server.kill(); await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); }); server = undefined; };
const waitFor = async (output: string[]) => { for (let attempt = 0; attempt < 300; attempt += 1) { if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`server exited: ${output.join("")}`); try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`server did not start: ${output.join("")}`); };
const request = (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, { ...init, headers: { "x-owner-token": token, ...(init?.headers ?? {}) } });
const json = (value: unknown) => JSON.stringify(value);

try {
  let output = start(); await waitFor(output);
  let response = await request("/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json" }, body: json({ bundleHash: hash, seed: 71, sparkCount: 1 }) }); assert.equal(response.status, 200);
  const first = { settlementId: "first-glow-region", objectId: "tiled-101", blocked: true, idempotencyKey: "ordered-first" };
  const second = { settlementId: "first-glow-region", objectId: "tiled-102", blocked: true, idempotencyKey: "ordered-second" };
  const firstQueued = await request("/api/owner/world/object", { method: "POST", headers: { "content-type": "application/json" }, body: json(first) }); assert.equal(firstQueued.status, 202); const firstResult = await firstQueued.json() as { commandId: string; status: string };
  const secondQueued = await request("/api/owner/world/object", { method: "POST", headers: { "content-type": "application/json" }, body: json(second) }); assert.equal(secondQueued.status, 202);
  const duplicate = await request("/api/owner/world/object", { method: "POST", headers: { "content-type": "application/json" }, body: json(first) }); assert.equal(duplicate.status, 202); assert.equal((await duplicate.json() as { commandId: string }).commandId, firstResult.commandId);
  await stop();

  output = start(); await waitFor(output);
  response = await request("/api/pulse", { method: "POST" }); assert.equal(response.status, 200); const applied = await response.json() as { state: { firstGlowState: { settlements: { runtime: { objects: { objectId: string; blocked: boolean }[] } }[] } } }; assert.deepEqual(applied.state.firstGlowState.settlements[0].runtime.objects, [{ objectId: "tiled-101", blocked: true }, { objectId: "tiled-102", blocked: true }]);
  const retry = await request("/api/owner/world/object", { method: "POST", headers: { "content-type": "application/json" }, body: json(first) }); assert.equal(retry.status, 202); assert.equal((await retry.json() as { status: string }).status, "applied");

  response = await request("/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json" }, body: json({ bundleHash: hash, seed: 73, sparkCount: 1 }) }); assert.equal(response.status, 200);
  const parentCommand = { settlementId: "first-glow-region", objectId: "tiled-101", blocked: true, idempotencyKey: "parent-pending" };
  response = await request("/api/owner/world/object", { method: "POST", headers: { "content-type": "application/json" }, body: json(parentCommand) }); assert.equal(response.status, 202);
  const beforeBranch = new DatabaseSync(database); const parentCheckpoint = (beforeBranch.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = (SELECT value FROM runtime_metadata WHERE key = 'active_timeline') AND pulse = 0").get() as { state_json: string }).state_json; beforeBranch.close();
  response = await request("/api/owner/branch", { method: "POST", headers: { "content-type": "application/json" }, body: json({ pulse: 0 }) }); assert.equal(response.status, 200); const branched = await response.json() as { timeline: { id: string }; state: { firstGlowState: { settlements: { runtime: { objects: unknown[] } }[] } } }; assert.deepEqual(branched.state.firstGlowState.settlements[0].runtime.objects, []);
  const timelineRows = await (await request("/api/timelines")).json() as { timelines: { id: string; parent_id: string | null }[] };
  const parentId = timelineRows.timelines.find(timeline => timeline.id === branched.timeline.id)?.parent_id;
  assert.ok(parentId);
  const afterBranch = new DatabaseSync(database); const parentStillSame = (afterBranch.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = 0").get(parentId) as { state_json: string }).state_json; const branchPending = (afterBranch.prepare("SELECT COUNT(*) AS count FROM pending_commands WHERE timeline_id = ? AND status = 'pending'").get(branched.timeline.id) as { count: number }).count; afterBranch.close(); assert.equal(parentStillSame, parentCheckpoint); assert.equal(branchPending, 0);
  response = await request("/api/pulse", { method: "POST" }); assert.equal(response.status, 200); const branchPulse = await response.json() as { state: { firstGlowState: { settlements: { runtime: { objects: unknown[] } }[] } } }; assert.deepEqual(branchPulse.state.firstGlowState.settlements[0].runtime.objects, []);

  await stop();
  const edit = new DatabaseSync(database); const activeId = (edit.prepare("SELECT value FROM runtime_metadata WHERE key = 'active_timeline'").get() as { value: string }).value; const row = edit.prepare("SELECT timeline_id, pulse, state_json FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY pulse DESC LIMIT 1").get(activeId) as { timeline_id: string; pulse: number; state_json: string }; const altered = JSON.parse(row.state_json) as { firstGlowState: { settlements: { sparks: { position: { x: number; y: number }; committedCells: { x: number; y: number }[] }[] }[] } }; altered.firstGlowState.settlements[0].sparks[0].position = { x: 4, y: 4 }; altered.firstGlowState.settlements[0].sparks[0].committedCells = [{ x: 4, y: 4 }]; edit.prepare("UPDATE timeline_checkpoints SET state_json = ? WHERE timeline_id = ? AND pulse = ?").run(JSON.stringify(altered), row.timeline_id, row.pulse); edit.close();
  output = start(); await waitFor(output); response = await request("/api/owner/world/object", { method: "POST", headers: { "content-type": "application/json" }, body: json({ settlementId: "first-glow-region", objectId: "tiled-101", blocked: true, idempotencyKey: "occupied-crossing" }) }); assert.equal(response.status, 409); assert.match(await response.text(), /occupied/);
  console.log("First Glow command restart, ordering, idempotency, branching, immutability, and occupied-cell rejection passed");
} finally { await stop(); for (const path of [database, `${database}-wal`, `${database}-shm`]) if (existsSync(path)) rmSync(path, { force: true }); }
