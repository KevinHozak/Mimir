import { spawn } from "node:child_process";
import { existsSync, readdirSync, unlinkSync, rmSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(process.cwd(), "..", "..");
const databasePath = join(projectRoot, `phase5-integration-${Date.now()}.db`);
const backupDirectory = join(projectRoot, `phase5-backups-${Date.now()}`);
const port = 34129;
const token = "integration-owner";
const server = spawn(process.execPath, [join(projectRoot, "packages", "server", "dist", "index.js")], {
  cwd: projectRoot,
  env: { ...process.env, PORT: String(port), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: databasePath, OWNER_TOKEN: token, BACKUP_INTERVAL_MS: "200", BACKUP_DIR: backupDirectory },
  stdio: "ignore",
});
const endpoint = `http://localhost:${port}`;
const waitForServer = async () => { for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(`${endpoint}/health`)).ok) return; } catch { /* server is still starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("integration server did not start"); };
const request = async (path: string, body: Record<string, unknown> = {}, authorized = true) => fetch(`${endpoint}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(authorized ? { "x-owner-token": token } : {}) }, body: JSON.stringify(body) });
try {
  await waitForServer();
  if ((await request("/api/tick", {}, false)).status !== 401) throw new Error("owner token was not enforced");
  if ((await request("/api/tick")).status !== 200) throw new Error("authorized tick failed");
  const branch = await request("/api/owner/branch", { tick: 1 });
  if (branch.status !== 200) throw new Error("branch failed");
  const timelines = await (await fetch(`${endpoint}/api/timelines`)).json() as { timelines: { parent_id: string | null }[] };
  if (!timelines.timelines.some((timeline) => timeline.parent_id === "main")) throw new Error("branch parent was not persisted");
  if ((await request("/api/owner/archive")).status !== 200) throw new Error("archive failed");
  if ((await request("/api/tick")).status !== 409) throw new Error("archived timeline accepted a tick");
  const reset = await request("/api/owner/reset", { seed: 7 });
  if (reset.status !== 200 || ((await reset.json()) as { state: { tick: number } }).state.tick !== 0) throw new Error("reset failed");
  const blocked = await request("/api/owner/world/object", { objectId: "bridge-1", blocked: true });
  if (blocked.status !== 200) throw new Error("runtime object block failed");
  const blockedWorld = await (await fetch(`${endpoint}/api/world`)).json() as { state: { worldRuntime?: { blockedObjectIds: string[] } } };
  if (!blockedWorld.state.worldRuntime?.blockedObjectIds.includes("bridge-1")) throw new Error("runtime object block was not persisted");
  if ((await request("/api/owner/branch", { tick: 0 })).status !== 200) throw new Error("runtime-state branch failed");
  const branchedWorld = await (await fetch(`${endpoint}/api/world`)).json() as { state: { worldRuntime?: { blockedObjectIds: string[] } } };
  if (!branchedWorld.state.worldRuntime?.blockedObjectIds.includes("bridge-1")) throw new Error("runtime object block was not copied into branch");
  if ((await request("/api/owner/world/object", { objectId: "bridge-1", blocked: false })).status !== 200) throw new Error("runtime object unblock failed");
  const report = await (await fetch(`${endpoint}/api/report`)).json() as { tick: number; checkpoints: number };
  if (report.tick !== 0 || report.checkpoints !== 1) throw new Error("report did not reflect reset");
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (!existsSync(backupDirectory) || readdirSync(backupDirectory).filter((entry) => entry.endsWith(".db")).length === 0) throw new Error("scheduled backup was not created");
  for (let season = 1; season <= 3; season += 1) {
    for (let tick = 0; tick < 60; tick += 1) if ((await request("/api/tick")).status !== 200) throw new Error(`season ${season} stopped before tick 60`);
    if ((await request("/api/tick")).status !== 409) throw new Error(`season ${season} exceeded its boundary`);
    if (season < 3 && (await request("/api/owner/reset", { seed: season + 100 })).status !== 200) throw new Error(`season ${season + 1} reset failed`);
  }
  const completedReport = await (await fetch(`${endpoint}/api/report`)).json() as { tick: number; checkpoints: number };
  if (completedReport.tick !== 60 || completedReport.checkpoints !== 61) throw new Error("completed season report was incomplete");
  console.log("server integration tests passed");
} finally {
  server.kill();
  await new Promise<void>((resolve) => server.once("exit", () => resolve()));
  for (const suffix of ["", "-shm", "-wal"]) { const path = `${databasePath}${suffix}`; if (existsSync(path)) unlinkSync(path); }
  if (existsSync(backupDirectory)) rmSync(backupDirectory, { recursive: true, force: true });
}
