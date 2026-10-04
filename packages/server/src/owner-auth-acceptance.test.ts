import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { generateKeyPairSync } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const tempRoot = join(root, ".tmp", `owner-auth-${Date.now()}`);
const database = join(tempRoot, "public-bind.db");
const port = 34144;
const token = "owner-auth-test-token";
const testPrivateKey = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" } }).privateKey;
let server: ChildProcess | undefined;

const serverOutput: string[] = [];
const waitForHealth = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) {
      throw new Error(`public-bind owner-auth server exited with code ${server.exitCode}: ${serverOutput.join("")}`);
    }
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`public-bind owner-auth server did not start: ${serverOutput.join("")}`);
};

try {
  mkdirSync(tempRoot, { recursive: true });
  const rejectedEnv: NodeJS.ProcessEnv = { ...process.env, PORT: "34145", HOST: "0.0.0.0", AUTO_PULSE: "false", SERVE_WEB: "false", DATABASE_PATH: join(tempRoot, "rejected.db"), WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") };
  delete rejectedEnv.OWNER_TOKEN;
  const rejected = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], {
    cwd: root,
    env: rejectedEnv,
    stdio: ["ignore", "ignore", "pipe"]
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { rejected.kill(); reject(new Error("public bind without OWNER_TOKEN did not fail closed")); }, 10000);
    rejected.once("exit", code => { clearTimeout(timeout); assert.notEqual(code, 0); resolve(); });
  });
  const attachLogs = (child: ChildProcess) => {
    child.stdout?.on("data", chunk => serverOutput.push(String(chunk)));
    child.stderr?.on("data", chunk => serverOutput.push(String(chunk)));
  };
  server = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: "0.0.0.0", AUTO_PULSE: "false", SERVE_WEB: "false", DATABASE_PATH: database, OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") },
    stdio: ["ignore", "pipe", "pipe"]
  });
  attachLogs(server);
  await waitForHealth();
  const unauthHealthRes = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(unauthHealthRes.status, 200);
  const unauthHealth = await unauthHealthRes.json() as Record<string, unknown>;
  assert.equal(unauthHealth.ok, true);
  assert.equal(unauthHealth.databasePath, undefined);
  assert.deepEqual(unauthHealth.backupReplication, { enabled: false, stale: false });

  const authHealthRes = await fetch(`http://127.0.0.1:${port}/health`, { headers: { "x-owner-token": token } });
  assert.equal(authHealthRes.status, 200);
  const authHealth = await authHealthRes.json() as Record<string, unknown>;
  assert.equal(authHealth.ok, true);
  assert.equal(authHealth.databasePath, database);
  assert.equal(typeof (authHealth.backupReplication as Record<string, unknown>)?.freshnessMaxAgeMs, "number");

  const unauthBackupStatus = await fetch(`http://127.0.0.1:${port}/api/backup/status`);
  assert.equal(unauthBackupStatus.status, 401);

  const authBackupStatus = await fetch(`http://127.0.0.1:${port}/api/backup/status`, { headers: { "x-owner-token": token } });
  assert.equal(authBackupStatus.status, 200);
  const backupStatus = await authBackupStatus.json() as Record<string, unknown>;
  assert.equal(backupStatus.enabled, false);

  const authOwnerBackupStatus = await fetch(`http://127.0.0.1:${port}/api/owner/backup/status`, { headers: { "x-owner-token": token } });
  assert.equal(authOwnerBackupStatus.status, 200);
  const ownerBackupStatus = await authOwnerBackupStatus.json() as Record<string, unknown>;
  assert.equal(ownerBackupStatus.enabled, false);

  const unauthOwnerBackupStatus = await fetch(`http://127.0.0.1:${port}/api/owner/backup/status`);
  assert.equal(unauthOwnerBackupStatus.status, 401);

  const pulse = await fetch(`http://127.0.0.1:${port}/api/pulse`, { method: "POST" });
  assert.equal(pulse.status, 401);
  const reset = await fetch(`http://127.0.0.1:${port}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bundleHash: "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e", seed: 7 }) });
  assert.equal(reset.status, 401);
  const preflight = await fetch(`http://127.0.0.1:${port}/api/pulse`, { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "POST", "access-control-request-headers": "x-owner-token" } });
  assert.equal(preflight.headers.get("access-control-allow-origin"), null);

  // Restart with PUBLIC_OBSERVER_AUTH_REQUIRED=true to verify owner token bypass on /api/backup/status
  server.kill();
  await new Promise<void>(resolve => { server?.once("exit", () => resolve()); });
  serverOutput.length = 0;
  server = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "0.0.0.0",
      AUTO_PULSE: "false",
      SERVE_WEB: "false",
      DATABASE_PATH: database,
      OWNER_TOKEN: token,
      PUBLIC_OBSERVER_AUTH_REQUIRED: "true",
      FIREBASE_PROJECT_ID: "test-observer-project",
      PUBLIC_OBSERVER_EMAILS: "approved@example.com",
      FIREBASE_CLIENT_EMAIL: "service-account@test-observer-project.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: testPrivateKey,
      WORLD_BUNDLE_ROOT: join(root, "assets/world/generated"),
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  attachLogs(server);
  await waitForHealth();

  // Without owner token or bearer token, /api/backup/status is rejected by observer auth
  const unauthObserverBackupRes = await fetch(`http://127.0.0.1:${port}/api/backup/status`);
  assert.equal(unauthObserverBackupRes.status, 401);

  // With owner token, /api/backup/status bypasses observer auth and succeeds
  const ownerAuthObserverBackupRes = await fetch(`http://127.0.0.1:${port}/api/backup/status`, { headers: { "x-owner-token": token } });
  assert.equal(ownerAuthObserverBackupRes.status, 200);

  // /api/owner/backup/status also succeeds with owner token
  const ownerAuthUnderOwnerBackupRes = await fetch(`http://127.0.0.1:${port}/api/owner/backup/status`, { headers: { "x-owner-token": token } });
  assert.equal(ownerAuthUnderOwnerBackupRes.status, 200);

  console.log("Public-bind owner authentication and CORS rejection passed");
} finally {
  if (server && server.exitCode === null) server.kill();
  if (server) await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); });
  for (const suffix of ["", "-wal", "-shm"]) { const path = `${database}${suffix}`; if (existsSync(path)) rmSync(path); }
  if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
}
