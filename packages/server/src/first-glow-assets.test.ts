import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", ".."); const port = 34142; const database = join(root, `first-glow-assets-${Date.now()}.db`); const hash = "sha256-92cc5cee6d8859375c046057ef6341fa6844cf6cbe610177d1d81726af0decf3"; let server: ChildProcess | undefined;
const waitFor = async () => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error("First Glow asset server did not start"); };
try {
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_TICK: "false", DATABASE_PATH: database, OWNER_TOKEN: "first-glow-assets-owner", WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") }, stdio: "ignore" }); await waitFor();
  const bundle = await (await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}`)).json() as { bundle: { assets: { path: string; mediaType: string }[] } }; const asset = bundle.bundle.assets[0]; assert.ok(asset);
  const response = await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}/${asset.path.replace(/^assets\//, "assets/")}`); assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/svg+xml"); assert.ok((await response.arrayBuffer()).byteLength > 0);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}/assets/not-referenced.svg`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/world/bundles/${hash}/assets/../world.json`)).status, 404);
  console.log("First Glow hash-qualified asset serving passed");
} finally { if (server && server.exitCode === null) server.kill(); await new Promise(resolve => server?.once("exit", resolve)); for (const suffix of ["", "-wal", "-shm"]) { const path = `${database}${suffix}`; if (existsSync(path)) rmSync(path); } }
