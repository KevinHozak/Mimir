import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", ".."); const port = 34138; const database = join(root, `first-glow-restart-${Date.now()}.db`); const hash = "sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3"; let server: ChildProcess | undefined;
const waitFor = async () => { for (let attempt = 0; attempt < 60; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error("First Glow restart server did not start"); };
const stop = async () => { if (!server) return; server.kill(); await new Promise(resolve => server?.once("exit", resolve)); server = undefined; };
try {
  const env = { ...process.env, PORT: String(port), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: database, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated"), OWNER_TOKEN: "first-glow-owner" };
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env, stdio: "ignore" }); await waitFor();
  const reset = await fetch(`http://127.0.0.1:${port}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "first-glow-owner" }, body: JSON.stringify({ bundleHash: hash, seed: 19 }) }); assert.equal(reset.status, 200); const initial = await reset.json() as { state: { simulationVersion: string; firstGlowState: { tick: number } } }; assert.equal(initial.state.simulationVersion, "mimir-sim-v3-first-glow");
  const tick = await fetch(`http://127.0.0.1:${port}/api/tick`, { method: "POST", headers: { "x-owner-token": "first-glow-owner" } }); assert.equal(tick.status, 200); const advanced = await tick.json() as { state: { tick: number; firstGlowState: { tick: number } } }; assert.equal(advanced.state.tick, 1); await stop();
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env, stdio: "ignore" }); await waitFor(); const restored = await (await fetch(`http://127.0.0.1:${port}/api/world`)).json() as { state: { simulationVersion: string; tick: number; firstGlowState: { tick: number } } }; assert.equal(restored.state.simulationVersion, "mimir-sim-v3-first-glow"); assert.equal(restored.state.tick, 1); assert.equal(restored.state.firstGlowState.tick, 1); console.log("First Glow server restart test passed");
} finally { await stop(); for (const suffix of ["", "-wal", "-shm"]) { const path = `${database}${suffix}`; if (existsSync(path)) rmSync(path); } }
