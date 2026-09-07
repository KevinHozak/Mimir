import assert from "node:assert/strict";
import { existsSync, unlinkSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

const projectRoot = join(process.cwd(), "..", "..");
const bundleHash = "sha256-6a2e1ffe6a311d4cbb08a616bec272cc82e47809dea635b4b3f121aa8e991987";
const token = "restart-owner";
let serial = 0;
function start(databasePath: string, port: number): ChildProcess { return spawn(process.execPath, [join(projectRoot, "packages", "server", "dist", "index.js")], { cwd: projectRoot, env: { ...process.env, PORT: String(port), AUTO_TICK: "false", DATABASE_PATH: databasePath, OWNER_TOKEN: token }, stdio: "ignore" }); }
async function waitFor(port: number) { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* startup */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`server ${port} did not start`); }
async function post(port: number, path: string, body: Record<string, unknown>) { const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": token }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(`${path}: ${await response.text()}`); return response.json() as Promise<Record<string, unknown>>; }
async function stop(server: ChildProcess) { if (server.exitCode === null) { server.kill(); await new Promise<void>(resolve => { server.once("exit", () => resolve()); setTimeout(resolve, 3000); }); } }
function comparable(value: unknown): unknown { if (Array.isArray(value)) return value.map(comparable); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => key !== "worldId").sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, comparable(child)])); return value; }
const restartedDb = join(projectRoot, `structured-restart-${Date.now()}.db`); const controlDb = join(projectRoot, `structured-control-${Date.now()}.db`); const restartedPort = 34133 + serial++; const controlPort = 34134 + serial++;
let first: ChildProcess | undefined; let second: ChildProcess | undefined; let control: ChildProcess | undefined;
try {
  first = start(restartedDb, restartedPort); await waitFor(restartedPort); await post(restartedPort, "/api/owner/reset-v2", { bundleHash, seed: 77 }); const firstTick = await post(restartedPort, "/api/tick", {}); const firstState = firstTick.state as { structuredState?: { tick: number } }; assert.equal(firstState.structuredState?.tick, 1); await stop(first); first = undefined;
  second = start(restartedDb, restartedPort); await waitFor(restartedPort); const resumed = await post(restartedPort, "/api/tick", {}); await stop(second); second = undefined;
  control = start(controlDb, controlPort); await waitFor(controlPort); await post(controlPort, "/api/owner/reset-v2", { bundleHash, seed: 77 }); await post(controlPort, "/api/tick", {}); const expected = await post(controlPort, "/api/tick", {}); await stop(control); control = undefined;
  assert.deepEqual(comparable(resumed.state), comparable(expected.state)); assert.deepEqual(comparable(resumed.events), comparable(expected.events)); console.log("structured restart equivalence passed");
} finally { if (first) await stop(first); if (second) await stop(second); if (control) await stop(control); for (const database of [restartedDb, controlDb]) for (const suffix of ["", "-shm", "-wal"]) { const path = `${database}${suffix}`; if (existsSync(path)) unlinkSync(path); } }
