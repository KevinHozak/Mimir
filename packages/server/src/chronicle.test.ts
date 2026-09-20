import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const tempRoot = join(root, ".tmp", `chronicle-${Date.now()}`);
const databasePath = join(tempRoot, "chronicle.db");
const bundleRoot = join(root, "assets", "world", "generated");
const port = 34261;
const token = "chronicle-test-owner";
let server: ChildProcess | undefined;

async function startServer() {
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_PULSE: "false", DATABASE_PATH: databasePath, OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: bundleRoot }, stdio: ["ignore", "pipe", "pipe"] });
  const output: string[] = [];
  server.stdout?.on("data", chunk => output.push(String(chunk))); server.stderr?.on("data", chunk => output.push(String(chunk)));
  for (let attempt = 0; attempt < 80; attempt += 1) { if (server.exitCode !== null) throw new Error(`server exited: ${output.join("")}`); try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`server did not start: ${output.join("")}`);
}
async function stopServer() { if (!server) return; if (server.exitCode === null) server.kill(); await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); }); server = undefined; }

try {
  mkdirSync(tempRoot, { recursive: true });
  await startServer();
  const first = await fetch(`http://127.0.0.1:${port}/api/chronicle?pulse=0`);
  const firstBody = await first.json() as { edition?: { id: string; revision: number; chapters: Array<{ kind: string }> }; reread?: boolean; error?: string };
  assert.equal(first.status, 200, firstBody.error ?? "Chronicle request failed"); assert.ok(firstBody.edition);
  assert.equal(firstBody.edition.revision, 1); assert.deepEqual(firstBody.edition.chapters.map(chapter => chapter.kind), ["moment", "personal", "season"]); assert.equal(firstBody.reread, false);
  const regenerated = await fetch(`http://127.0.0.1:${port}/api/owner/chronicle/regenerate`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": token }, body: JSON.stringify({ pulse: 0 }) });
  const regeneratedBody = await regenerated.json() as { edition?: { id: string; revision: number }; error?: string };
  assert.equal(regenerated.status, 200, regeneratedBody.error ?? "Chronicle regeneration failed"); assert.ok(regeneratedBody.edition);
  assert.equal(regeneratedBody.edition.revision, 2); assert.notEqual(regeneratedBody.edition.id, firstBody.edition.id);
  const reread = await fetch(`http://127.0.0.1:${port}/api/chronicle?pulse=0`); const rereadBody = await reread.json() as { edition: { id: string; revision: number }; reread: boolean };
  assert.equal(rereadBody.edition.id, regeneratedBody.edition.id); assert.equal(rereadBody.edition.revision, 2); assert.equal(rereadBody.reread, true);
  await stopServer(); await startServer();
  const afterRestart = await fetch(`http://127.0.0.1:${port}/api/chronicle?pulse=0`); const afterRestartBody = await afterRestart.json() as { edition: { id: string; revision: number } };
  assert.equal(afterRestartBody.edition.id, regeneratedBody.edition.id); assert.equal(afterRestartBody.edition.revision, 2);
  console.log("Chronicle persistence and immutable revision checks passed");
} finally { await stopServer(); for (const suffix of ["", "-wal", "-shm"]) { const path = `${databasePath}${suffix}`; if (existsSync(path)) rmSync(path); } if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true }); }
