import { spawn } from "node:child_process";
import { existsSync, readdirSync, unlinkSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(process.cwd(), "..", "..");
const databasePath = join(projectRoot, `phase5-integration-${Date.now()}.db`);
const backupDirectory = join(projectRoot, `phase5-backups-${Date.now()}`);
const port = 34129;
const token = "integration-owner";
const server = spawn(process.execPath, [join(projectRoot, "packages", "server", "dist", "index.js")], {
  cwd: projectRoot,
  env: { ...process.env, PORT: String(port), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", SEASON_TICK_LIMIT: "60", SERVE_WEB: "true", DATABASE_PATH: databasePath, OWNER_TOKEN: token, BACKUP_INTERVAL_MS: "1000", BACKUP_DIR: backupDirectory },
  stdio: "ignore",
});
const endpoint = `http://localhost:${port}`;
const waitForServer = async () => { for (let attempt = 0; attempt < 40; attempt += 1) { try { if ((await fetch(`${endpoint}/health`)).ok) return; } catch { /* server is still starting */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("integration server did not start"); };
const request = async (path: string, body: Record<string, unknown> = {}, authorized = true) => fetch(`${endpoint}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(authorized ? { "x-owner-token": token } : {}) }, body: JSON.stringify(body) });
try {
  await waitForServer();
  const browserShell = await (await fetch(`${endpoint}/`)).text();
  if (!browserShell.includes("<div id=\"root\">")) throw new Error("hosted web shell was not served");
  if ((await request("/api/tick", {}, false)).status !== 401) throw new Error("owner token was not enforced");
  const speed = await request("/api/scheduler", { paused: true, intervalMs: 1000 });
  if (speed.status !== 200 || ((await speed.json()) as { tickIntervalMs: number }).tickIntervalMs !== 1000) throw new Error("scheduler speed was not accepted");
  if ((await request("/api/scheduler", { intervalMs: 100 })).status !== 400) throw new Error("invalid scheduler speed was accepted");
  if ((await request("/api/tick")).status !== 200) throw new Error("authorized tick failed");
  const branch = await request("/api/owner/branch", { tick: 1 });
  if (branch.status !== 200) throw new Error("branch failed");
  const timelines = await (await fetch(`${endpoint}/api/timelines`)).json() as { timelines: { parent_id: string | null }[] };
  if (!timelines.timelines.some((timeline) => timeline.parent_id === "main")) throw new Error("branch parent was not persisted");
  if ((await request("/api/owner/archive")).status !== 200) throw new Error("archive failed");
  if ((await request("/api/tick")).status !== 409) throw new Error("archived timeline accepted a tick");
  const reset = await request("/api/owner/reset", { seed: 7 });
  if (reset.status !== 200 || ((await reset.json()) as { state: { tick: number } }).state.tick !== 0) throw new Error("reset failed");
const design = await (await fetch(`${endpoint}/api/design`)).json() as { characterCards: unknown[]; dilemmas: unknown[]; sharedStore: { id: string } };
if (design.characterCards.length !== 6 || design.dilemmas.length !== 3 || design.sharedStore.id !== "shared-granary") throw new Error("design contract was incomplete");
const region = await (await fetch(`${endpoint}/api/region`)).json() as { settlements: { id: string }[]; routes: { id: string }[]; tradeHistory: unknown[]; weather: { kind: string }; hazards: unknown[] };
if (region.settlements.length !== 2 || region.routes.some((route) => route.id !== "road-mimir-riverbend") || region.weather.kind !== "clear" || region.hazards.length !== 0) throw new Error("region contract was incomplete");
  const metrics = await (await fetch(`${endpoint}/api/metrics`)).json() as { metrics: { tick: number }[] };
  if (metrics.metrics.length !== 1 || metrics.metrics[0].tick !== 0) throw new Error("metrics did not include the initial checkpoint");
  const blocked = await request("/api/owner/world/object", { settlementId: "first-village", objectId: "bridge-1", blocked: true, idempotencyKey: "block-bridge-1" });
  if (blocked.status !== 202) throw new Error("runtime object command was not queued");
  const blockedWorld = await (await fetch(`${endpoint}/api/world`)).json() as { state: { worldRuntime?: { blockedObjectIds: string[] } } };
  if (blockedWorld.state.worldRuntime?.blockedObjectIds.includes("bridge-1")) throw new Error("pending blocker changed live state early");
  if ((await request("/api/tick")).status !== 200) throw new Error("pending blocker did not apply on tick");
  const appliedWorld = await (await fetch(`${endpoint}/api/world`)).json() as { state: { worldRuntime?: { blockedObjectIds: string[] } } };
  if (!appliedWorld.state.worldRuntime?.blockedObjectIds.includes("bridge-1")) throw new Error("runtime object block was not applied");
  if ((await request("/api/owner/branch", { tick: 1 })).status !== 200) throw new Error("runtime-state branch failed");
  const branchedWorld = await (await fetch(`${endpoint}/api/world`)).json() as { state: { worldRuntime?: { blockedObjectIds: string[] } } };
  if (!branchedWorld.state.worldRuntime?.blockedObjectIds.includes("bridge-1")) throw new Error("runtime object block was not copied into branch");
  if ((await request("/api/owner/world/object", { settlementId: "first-village", objectId: "bridge-1", blocked: false, idempotencyKey: "unblock-bridge-1" })).status !== 202) throw new Error("runtime object unblock was not queued");
  if ((await request("/api/tick")).status !== 200) throw new Error("runtime object unblock did not apply");
  const report = await (await fetch(`${endpoint}/api/report`)).json() as { tick: number; checkpoints: number };
  if (report.tick !== 2 || report.checkpoints !== 3) throw new Error("report did not reflect queued commands");
  if ((await request("/api/owner/reset", { seed: 101 })).status !== 200) throw new Error("season test reset failed");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  if (!existsSync(backupDirectory) || readdirSync(backupDirectory).filter((entry) => entry.endsWith(".db")).length === 0) throw new Error("scheduled backup was not created");
  const v2Reset = await request("/api/owner/reset-v2", { bundleHash: "sha256-6a2e1ffe6a311d4cbb08a616bec272cc82e47809dea635b4b3f121aa8e991987", seed: 11 });
  if (v2Reset.status !== 200) throw new Error(`structured-v2 reset failed: ${await v2Reset.text()}`);
  const v2State = (await v2Reset.json()) as { state: { spatialModel?: string; simulationVersion?: string; structuredState?: unknown } };
  if (v2State.state.spatialModel !== "structured-v2" || v2State.state.simulationVersion !== "mimir-sim-v2" || !v2State.state.structuredState) throw new Error("structured-v2 timeline did not retain its bundle state");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const scheduledManifest = readdirSync(backupDirectory).filter((entry) => entry.endsWith(".manifest.json")).map((entry) => JSON.parse(readFileSync(join(backupDirectory, entry), "utf8")) as { bundleHashes?: string[] }).find((manifest) => manifest.bundleHashes?.includes("sha256-6a2e1ffe6a311d4cbb08a616bec272cc82e47809dea635b4b3f121aa8e991987"));
  if (!scheduledManifest) throw new Error("scheduled backup did not include the active world bundle");
  if ((await request("/api/tick")).status !== 200) throw new Error("structured-v2 tick failed");
  if ((await request("/api/owner/reset", { seed: 101 })).status !== 200) throw new Error("legacy season test reset failed after v2 timeline");
  for (let season = 1; season <= 3; season += 1) {
    for (let tick = 0; tick < 60; tick += 1) if ((await request("/api/tick")).status !== 200) throw new Error(`season ${season} stopped before tick 60`);
    if ((await request("/api/tick")).status !== 409) throw new Error(`season ${season} exceeded its boundary`);
    if (season < 3 && (await request("/api/owner/reset", { seed: season + 100 })).status !== 200) throw new Error(`season ${season + 1} reset failed`);
  }
const completedReport = await (await fetch(`${endpoint}/api/report`)).json() as { tick: number; checkpoints: number; summary?: { dilemmasResolved?: number } };
if (completedReport.tick !== 60 || completedReport.checkpoints !== 61 || completedReport.summary?.dilemmasResolved !== 3) throw new Error("completed season report was incomplete");
const recordedEvents = await (await fetch(`${endpoint}/api/events?limit=200`)).json() as { events: { kind: string; tick: number }[] };
if (![12, 24, 36].every((tick) => recordedEvents.events.some((event) => event.kind === "dilemma" && event.tick === tick))) throw new Error("dilemma events were not persisted for replay");
console.log("server integration tests passed");
} finally {
  server.kill();
  await new Promise<void>((resolve) => server.once("exit", () => resolve()));
  for (const suffix of ["", "-shm", "-wal"]) { const path = `${databasePath}${suffix}`; if (existsSync(path)) unlinkSync(path); }
  if (existsSync(backupDirectory)) rmSync(backupDirectory, { recursive: true, force: true });
}
