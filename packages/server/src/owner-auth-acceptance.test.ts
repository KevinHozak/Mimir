import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const tempRoot = join(root, ".tmp", `owner-auth-${Date.now()}`);
const database = join(tempRoot, "public-bind.db");
const port = 34144;
const token = "owner-auth-test-token";
let server: ChildProcess | undefined;

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("public-bind owner-auth server did not start");
};

try {
  mkdirSync(tempRoot, { recursive: true });
  const rejected = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], {
    cwd: root,
    env: { ...process.env, PORT: "34145", HOST: "0.0.0.0", AUTO_PULSE: "false", SERVE_WEB: "false", DATABASE_PATH: join(tempRoot, "rejected.db"), OWNER_TOKEN: undefined, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") },
    stdio: ["ignore", "ignore", "pipe"]
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { rejected.kill(); reject(new Error("public bind without OWNER_TOKEN did not fail closed")); }, 3000);
    rejected.once("exit", code => { clearTimeout(timeout); assert.notEqual(code, 0); resolve(); });
  });
  server = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: "0.0.0.0", AUTO_PULSE: "false", SERVE_WEB: "false", DATABASE_PATH: database, OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForHealth();
  const pulse = await fetch(`http://127.0.0.1:${port}/api/pulse`, { method: "POST" });
  assert.equal(pulse.status, 401);
  const reset = await fetch(`http://127.0.0.1:${port}/api/owner/reset`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seed: 7 }) });
  assert.equal(reset.status, 401);
  const preflight = await fetch(`http://127.0.0.1:${port}/api/pulse`, { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "POST", "access-control-request-headers": "x-owner-token" } });
  assert.equal(preflight.headers.get("access-control-allow-origin"), null);
  console.log("Public-bind owner authentication and CORS rejection passed");
} finally {
  if (server && server.exitCode === null) server.kill();
  if (server) await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); });
  for (const suffix of ["", "-wal", "-shm"]) { const path = `${database}${suffix}`; if (existsSync(path)) rmSync(path); }
  if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
}
