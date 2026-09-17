import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const tempRoot = join(root, ".tmp", `security-p4-${Date.now()}`);
const bundleRoot = join(root, "assets", "world", "generated");
const firstGlowHash = "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e";
const database = join(tempRoot, "first-glow.db");
const unsupportedDatabase = join(tempRoot, "unsupported.db");
const emptyDatabase = join(tempRoot, "empty-child.db");
const children: ChildProcess[] = [];

async function startServer(databasePath: string, port: number): Promise<ChildProcess> {
  const child = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), AUTO_PULSE: "false", DATABASE_PATH: databasePath, OWNER_TOKEN: "security-p4-owner", WORLD_BUNDLE_ROOT: bundleRoot },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  const output: string[] = [];
  child.stdout?.on("data", chunk => output.push(String(chunk)));
  child.stderr?.on("data", chunk => output.push(String(chunk)));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited during startup: ${output.join("")}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return child;
    } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server did not start: ${output.join("")}`);
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode === null) child.kill();
  await new Promise<void>(resolve => { if (child.exitCode !== null) resolve(); else child.once("exit", () => resolve()); });
}

async function waitForFailure(databasePath: string, port: number, expected: RegExp): Promise<void> {
  const child = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), AUTO_PULSE: "false", DATABASE_PATH: databasePath, OWNER_TOKEN: "security-p4-owner", WORLD_BUNDLE_ROOT: bundleRoot },
    stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  const output: string[] = [];
  child.stdout?.on("data", chunk => output.push(String(chunk)));
  child.stderr?.on("data", chunk => output.push(String(chunk)));
  const code = await new Promise<number | null>(resolve => child.once("exit", (exitCode) => resolve(exitCode)));
  assert.notEqual(code, 0);
  assert.match(output.join(""), expected);
}

function plantTimeline(databasePath: string, timelineId: string, stateJson?: string): void {
  const database = new DatabaseSync(databasePath);
  database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, 'main', ?, 'active')").run(timelineId, new Date().toISOString());
  if (stateJson) database.prepare("INSERT INTO timeline_checkpoints (timeline_id, pulse, state_json) VALUES (?, 0, ?)").run(timelineId, stateJson);
  database.prepare("UPDATE runtime_metadata SET value = ? WHERE key = 'active_timeline'").run(timelineId);
  database.close();
}

try {
  mkdirSync(tempRoot, { recursive: true });
  const running = await startServer(database, 34150);
  assert.equal((await fetch("http://127.0.0.1:34150/api/owner/reset", { method: "POST", headers: { "x-owner-token": "security-p4-owner" } })).status, 404);
  assert.equal((await fetch("http://127.0.0.1:34150/api/owner/reset-v2", { method: "POST", headers: { "x-owner-token": "security-p4-owner" } })).status, 404);
  const reset = await fetch("http://127.0.0.1:34150/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "security-p4-owner" }, body: JSON.stringify({ bundleHash: firstGlowHash, seed: 31, sparkCount: 2 }) });
  assert.equal(reset.status, 200, await reset.text());
  await stopServer(running);

  const unsupported = await startServer(unsupportedDatabase, 34151);
  await stopServer(unsupported);
  plantTimeline(unsupportedDatabase, "legacy", JSON.stringify({ simulationVersion: "legacy", spatialModel: "v1" }));
  await waitForFailure(unsupportedDatabase, 34154, /Mimir startup refused: unsupported persisted timeline legacy/);

  const empty = await startServer(emptyDatabase, 34152);
  await stopServer(empty);
  plantTimeline(emptyDatabase, "empty-child");
  await waitForFailure(emptyDatabase, 34153, /Mimir startup refused: timeline empty-child has no supported First Glow checkpoint/);
  console.log("Security-P4 legacy reset and startup refusal checks passed");
} finally {
  for (const child of children) if (child.exitCode === null) child.kill();
  if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
}
