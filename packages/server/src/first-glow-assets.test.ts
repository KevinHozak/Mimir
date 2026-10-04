import { testPort, stopTestProcesses, waitForTestExit } from "../../../scripts/test-runtime.mjs";
import assert from "node:assert/strict";
import { appendFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", ".."); const tempRoot = join(root, ".tmp", `first-glow-assets-${Date.now()}`); const port = await testPort(); const database = join(tempRoot, "source.db"); const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601"; let server: ChildProcess | undefined;
const waitFor = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error("First Glow asset server did not start"); };
const corruptPort = await testPort();
const corruptRoot = join(tempRoot, "corrupt-bundles");
try {
  mkdirSync(tempRoot, { recursive: true });
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_PULSE: "false", DATABASE_PATH: database, OWNER_TOKEN: "first-glow-assets-owner", WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") }, stdio: "ignore" }); await waitFor();
  const reset = await fetch(`http://127.0.0.1:${port}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "first-glow-assets-owner" }, body: JSON.stringify({ bundleHash: hash, seed: 43 }) }); assert.equal(reset.status, 200, await reset.text());
  const bundle = await (await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}`)).json() as { bundle: { assets: { path: string; mediaType: string }[] } }; const asset = bundle.bundle.assets[0]; assert.ok(asset);
  const response = await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}/${asset.path.replace(/^assets\//, "assets/")}`); assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/svg+xml"); assert.ok((await response.arrayBuffer()).byteLength > 0);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}/assets/not-referenced.svg`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}/assets/../world.json`)).status, 404);
  await stopTestProcesses([server]); server = undefined;
  cpSync(join(root, "assets", "world", "generated"), corruptRoot, { recursive: true }); appendFileSync(join(corruptRoot, hash, asset.path), "corrupt\n");
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(corruptPort), AUTO_PULSE: "false", DATABASE_PATH: database, OWNER_TOKEN: "first-glow-assets-owner", WORLD_BUNDLE_ROOT: corruptRoot }, stdio: "ignore" });
  await waitForTestExit(server); assert.notEqual(server?.exitCode, null, "corrupt persisted bundle should fail before startup");
  console.log("First Glow hash-qualified asset serving passed");
} finally { await stopTestProcesses([server]); for (const suffix of ["", "-wal", "-shm"]) { const path = `${database}${suffix}`; if (existsSync(path)) rmSync(path); } if (existsSync(corruptRoot)) rmSync(corruptRoot, { recursive: true, force: true }); }
