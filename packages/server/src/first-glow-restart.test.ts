import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const restartedPort = 34138;
const controlPort = 34139;
const tempRoot = join(root, ".tmp", `first-glow-restart-${Date.now()}`);
const restartedDatabase = join(tempRoot, "restarted.db");
const controlDatabase = join(tempRoot, "control.db");
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const token = "first-glow-owner";
let restarted: ChildProcess | undefined;
let control: ChildProcess | undefined;

const waitFor = async (port: number) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`First Glow restart server did not start on ${port}`);
};
const start = (port: number, database: string) => spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], {
  cwd: root,
  env: { ...process.env, PORT: String(port), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: database, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated"), OWNER_TOKEN: token },
  stdio: "ignore",
});
const stop = async (child: ChildProcess | undefined) => {
  if (!child) return;
  if (child.exitCode === null) child.kill();
  await new Promise<void>(resolve => { if (child.exitCode !== null) resolve(); else child.once("exit", () => resolve()); });
};
const reset = async (port: number) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": token }, body: JSON.stringify({ bundleHash: hash, seed: 19, sparkCount: 12 }) });
  assert.equal(response.status, 200);
  return response.json() as Promise<{ state: Record<string, unknown> }>;
};
const tick = async (port: number) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/tick`, { method: "POST", headers: { "x-owner-token": token } });
  assert.equal(response.status, 200);
  return response.json() as Promise<{ state: Record<string, unknown>; events: unknown[] }>;
};
const comparable = (state: Record<string, unknown>) => { const copy = structuredClone(state); delete copy.worldId; return copy; };

try {
  mkdirSync(tempRoot, { recursive: true });
  restarted = start(restartedPort, restartedDatabase); await waitFor(restartedPort);
  control = start(controlPort, controlDatabase); await waitFor(controlPort);
  const initial = await reset(restartedPort);
  await reset(controlPort);
  assert.equal(initial.state.simulationVersion, "mimir-sim-v3-first-glow");
  const first = await tick(restartedPort);
  assert.equal(first.state.tick, 1);
  await stop(restarted); restarted = undefined;
  await tick(controlPort);
  const secondControl = await tick(controlPort);
  restarted = start(restartedPort, restartedDatabase); await waitFor(restartedPort);
  const secondRestarted = await tick(restartedPort);
  assert.deepEqual(comparable(secondRestarted.state), comparable(secondControl.state));
  assert.deepEqual(secondRestarted.events, secondControl.events);
  for (let tickNumber = 0; tickNumber < 18; tickNumber += 1) {
    const [controlResult, restartedResult] = await Promise.all([tick(controlPort), tick(restartedPort)]);
    assert.deepEqual(comparable(restartedResult.state), comparable(controlResult.state));
    assert.deepEqual(restartedResult.events, controlResult.events);
  }
  console.log("First Glow server partial-travel restart equivalence passed");
} finally {
  await stop(restarted); await stop(control);
  for (const database of [restartedDatabase, controlDatabase]) for (const suffix of ["", "-wal", "-shm"]) {
    const path = `${database}${suffix}`; if (existsSync(path)) rmSync(path);
  }
}
