import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { ServerResponse } from "node:http";
import { advanceWorld, createWorld, FIRST_WINTER_SCENARIO, LOCATION_TILES, type SocialInterpretation, type WorldEvent, type WorldState } from "@philosophy-world/engine";

const port = Number(process.env.PORT ?? 3000);
const tickIntervalMs = Number(process.env.TICK_INTERVAL_MS ?? 15000);
const autoTick = process.env.AUTO_TICK !== "false";
const seasonTickLimit = Number(process.env.SEASON_TICK_LIMIT ?? FIRST_WINTER_SCENARIO.seasonTickLimit);
const aiEnabled = process.env.AI_ENABLED === "true";
const socialBudgetCents = Number(process.env.SOCIAL_BUDGET_CENTS ?? 0);
const socialMode = aiEnabled && socialBudgetCents > 0 ? "ai-fallback" : "rules-only";
const ownerToken = process.env.OWNER_TOKEN;
const databasePath = process.env.DATABASE_PATH ?? "philosophy-world.db";
const backupIntervalMs = Number(process.env.BACKUP_INTERVAL_MS ?? 0);
const backupDirectory = resolve(process.env.BACKUP_DIR ?? "backups");
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode = WAL;");
database.exec(`CREATE TABLE IF NOT EXISTS checkpoints (tick INTEGER PRIMARY KEY, state_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, tick INTEGER NOT NULL, event_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS interpretations (id TEXT PRIMARY KEY, tick INTEGER NOT NULL, interpretation_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS timelines (id TEXT PRIMARY KEY, parent_id TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL, archived_at TEXT); CREATE TABLE IF NOT EXISTS timeline_checkpoints (timeline_id TEXT NOT NULL, tick INTEGER NOT NULL, state_json TEXT NOT NULL, PRIMARY KEY (timeline_id, tick)); CREATE TABLE IF NOT EXISTS timeline_events (timeline_id TEXT NOT NULL, id TEXT NOT NULL, tick INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (timeline_id, id)); CREATE TABLE IF NOT EXISTS timeline_interpretations (timeline_id TEXT NOT NULL, id TEXT NOT NULL, tick INTEGER NOT NULL, interpretation_json TEXT NOT NULL, PRIMARY KEY (timeline_id, id)); CREATE TABLE IF NOT EXISTS runtime_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
if (!database.prepare("SELECT id FROM timelines WHERE id = ?").get("main")) database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, NULL, ?, 'active')").run("main", new Date().toISOString());
const migrated = database.prepare("SELECT COUNT(*) AS count FROM timeline_checkpoints WHERE timeline_id = ?").get("main") as { count: number };
if (migrated.count === 0) {
  database.exec("INSERT INTO timeline_checkpoints (timeline_id, tick, state_json) SELECT 'main', tick, state_json FROM checkpoints;");
  database.exec("INSERT INTO timeline_events (timeline_id, id, tick, event_json) SELECT 'main', id, tick, event_json FROM events;");
  database.exec("INSERT INTO timeline_interpretations (timeline_id, id, tick, interpretation_json) SELECT 'main', id, tick, interpretation_json FROM interpretations;");
}
const savedTimeline = database.prepare("SELECT value FROM runtime_metadata WHERE key = 'active_timeline'").get() as { value: string } | undefined;
let activeTimelineId = savedTimeline?.value ?? "main";
let schedulerPaused = !autoTick;
let shuttingDown = false;
function createScheduledBackup(reason: string) {
  if (!existsSync(databasePath)) return;
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA wal_checkpoint(FULL);");
  database.close();
  mkdirSync(dirname(join(backupDirectory, "placeholder")), { recursive: true });
  const destination = join(backupDirectory, `philosophy-world-${new Date().toISOString().replaceAll(":", "-")}-${reason}.db`);
  copyFileSync(databasePath, destination);
  app.log.info({ destination }, "scheduled database backup created");
}

function normalizeState(raw: WorldState): WorldState {
  return { ...raw, scenario: raw.scenario ?? FIRST_WINTER_SCENARIO, villagers: raw.villagers.map((villager, index) => ({ ...villager, position: villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 }, route: villager.route ?? [], beliefs: villager.beliefs ?? { cooperation: 50, selfReliance: 50, reflection: 50 }, location: villager.location ?? Object.keys(LOCATION_TILES)[index % Object.keys(LOCATION_TILES).length] })) };
}
function loadState(timelineId: string): WorldState {
  const row = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY tick DESC LIMIT 1").get(timelineId) as { state_json: string } | undefined;
  return normalizeState(row ? JSON.parse(row.state_json) as WorldState : createWorld(20260906, timelineId));
}
let state = loadState(activeTimelineId);
if (!database.prepare("SELECT 1 FROM timeline_checkpoints WHERE timeline_id = ? LIMIT 1").get(activeTimelineId)) database.prepare("INSERT INTO timeline_checkpoints (timeline_id, tick, state_json) VALUES (?, ?, ?)").run(activeTimelineId, state.tick, JSON.stringify(state));
database.prepare("INSERT INTO runtime_metadata (key, value) VALUES ('active_timeline', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(activeTimelineId);
const liveClients = new Set<ServerResponse>();
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
function requireOwner(request: FastifyRequest, reply: FastifyReply): boolean { if (!ownerToken || request.headers["x-owner-token"] === ownerToken) return true; reply.code(401).send({ error: "owner authorization required" }); return false; }
function currentTimeline() { return database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines WHERE id = ?").get(activeTimelineId) as { id: string; parent_id: string | null; created_at: string; status: string; archived_at: string | null }; }
function saveActiveTimeline() { database.prepare("INSERT INTO runtime_metadata (key, value) VALUES ('active_timeline', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(activeTimelineId); }

app.get("/health", async () => ({ ok: true, tick: state.tick, schedulerPaused, databasePath, timeline: currentTimeline(), socialMode, socialBudgetCents }));
app.get("/api/social/config", async () => ({ mode: socialMode, aiEnabled, budgetCents: socialBudgetCents, provider: "none", historicalPlaybackUsesAI: false }));
app.get("/api/timelines", async () => ({ activeTimelineId, timelines: database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines ORDER BY created_at").all() }));
app.get("/api/live", async (_request, reply) => { reply.hijack(); const response = reply.raw; response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": "*" }); response.write(`data: ${JSON.stringify({ state, timelineId: activeTimelineId, schedulerPaused })}\n\n`); liveClients.add(response); response.on("close", () => liveClients.delete(response)); });
app.get("/api/world", async (request, reply) => { const query = request.query as { tick?: string }; if (query.tick === undefined) return { state, timelineId: activeTimelineId, schedulerPaused }; const tick = Number(query.tick); if (!Number.isInteger(tick) || tick < 0) return reply.code(400).send({ error: "tick must be a non-negative integer" }); const row = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND tick = ?").get(activeTimelineId, tick) as { state_json: string } | undefined; if (!row) return reply.code(404).send({ error: `No checkpoint exists for tick ${tick}` }); return { state: normalizeState(JSON.parse(row.state_json) as WorldState), timelineId: activeTimelineId, schedulerPaused }; });
app.get("/api/events", async (request) => { const query = request.query as { limit?: string }; const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50))); const rows = database.prepare("SELECT event_json FROM timeline_events WHERE timeline_id = ? ORDER BY tick DESC LIMIT ?").all(activeTimelineId, limit) as { event_json: string }[]; return { events: rows.reverse().map((row) => JSON.parse(row.event_json) as WorldEvent[]).flat(), timelineId: activeTimelineId }; });
app.get("/api/interpretations", async (request) => { const query = request.query as { limit?: string }; const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50))); const rows = database.prepare("SELECT interpretation_json FROM timeline_interpretations WHERE timeline_id = ? ORDER BY tick DESC LIMIT ?").all(activeTimelineId, limit) as { interpretation_json: string }[]; return { interpretations: rows.reverse().map((row) => JSON.parse(row.interpretation_json) as SocialInterpretation), timelineId: activeTimelineId }; });
app.get("/api/report", async () => { const timeline = currentTimeline(); const counts = database.prepare("SELECT (SELECT COUNT(*) FROM timeline_checkpoints WHERE timeline_id = ?) AS checkpoints, (SELECT COUNT(*) FROM timeline_events WHERE timeline_id = ?) AS events, (SELECT COUNT(*) FROM timeline_interpretations WHERE timeline_id = ?) AS interpretations").get(activeTimelineId, activeTimelineId, activeTimelineId) as { checkpoints: number; events: number; interpretations: number }; return { timeline, tick: state.tick, schedulerPaused, databaseBytes: existsSync(databasePath) ? statSync(databasePath).size : 0, socialMode, socialBudgetCents, fallbackCount: counts.interpretations, ...counts }; });
app.post("/api/scheduler", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { paused?: unknown } | undefined; if (typeof body?.paused !== "boolean") return reply.code(400).send({ error: "paused must be a boolean" }); schedulerPaused = body.paused; return { schedulerPaused }; });

function commitTick(): { state: WorldState; events: WorldEvent[]; interpretations: SocialInterpretation[] } | null {
  if (state.tick >= seasonTickLimit || currentTimeline().status !== "active") return null;
  const result = advanceWorld(state);
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO timeline_checkpoints (timeline_id, tick, state_json) VALUES (?, ?, ?)").run(activeTimelineId, result.state.tick, JSON.stringify(result.state));
    const insertEvent = database.prepare("INSERT INTO timeline_events (timeline_id, id, tick, event_json) VALUES (?, ?, ?, ?)");
    for (const event of result.events) insertEvent.run(activeTimelineId, event.id, event.tick, JSON.stringify(event));
    const insertInterpretation = database.prepare("INSERT INTO timeline_interpretations (timeline_id, id, tick, interpretation_json) VALUES (?, ?, ?, ?)");
    for (const interpretation of result.interpretations) insertInterpretation.run(activeTimelineId, interpretation.id, interpretation.tick, JSON.stringify(interpretation));
    database.exec("COMMIT");
  } catch (error) { database.exec("ROLLBACK"); throw error; }
  state = result.state;
  const message = `data: ${JSON.stringify({ state, events: result.events, interpretations: result.interpretations, timelineId: activeTimelineId, schedulerPaused })}\n\n`;
  for (const client of liveClients) { if (!client.destroyed) client.write(message); else liveClients.delete(client); }
  return result;
}
app.post("/api/tick", async (request, reply) => { if (!requireOwner(request, reply)) return; const result = commitTick(); if (!result) return reply.code(409).send({ error: "timeline is archived or season boundary reached", state }); return result; });
app.post("/api/owner/archive", async (request, reply) => { if (!requireOwner(request, reply)) return; database.prepare("UPDATE timelines SET status = 'archived', archived_at = ? WHERE id = ?").run(new Date().toISOString(), activeTimelineId); schedulerPaused = true; return { timeline: currentTimeline(), schedulerPaused }; });
app.post("/api/owner/continue", async (request, reply) => { if (!requireOwner(request, reply)) return; database.prepare("UPDATE timelines SET status = 'active', archived_at = NULL WHERE id = ?").run(activeTimelineId); return { timeline: currentTimeline(), schedulerPaused }; });
app.post("/api/owner/branch", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { tick?: unknown } | undefined; const branchTick = body?.tick === undefined ? state.tick : Number(body.tick); if (!Number.isInteger(branchTick) || branchTick < 0) return reply.code(400).send({ error: "tick must be a non-negative integer" }); const source = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND tick = ?").get(activeTimelineId, branchTick) as { state_json: string } | undefined; if (!source) return reply.code(404).send({ error: "branch source checkpoint not found" }); const newId = `timeline-${randomUUID()}`; database.exec("BEGIN IMMEDIATE"); try { database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'active')").run(newId, activeTimelineId, new Date().toISOString()); database.prepare("INSERT INTO timeline_checkpoints (timeline_id, tick, state_json) SELECT ?, tick, state_json FROM timeline_checkpoints WHERE timeline_id = ? AND tick <= ?").run(newId, activeTimelineId, branchTick); database.prepare("INSERT INTO timeline_events (timeline_id, id, tick, event_json) SELECT ?, id, tick, event_json FROM timeline_events WHERE timeline_id = ? AND tick <= ?").run(newId, activeTimelineId, branchTick); database.prepare("INSERT INTO timeline_interpretations (timeline_id, id, tick, interpretation_json) SELECT ?, id, tick, interpretation_json FROM timeline_interpretations WHERE timeline_id = ? AND tick <= ?").run(newId, activeTimelineId, branchTick); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; } activeTimelineId = newId; state = { ...normalizeState(JSON.parse(source.state_json) as WorldState), worldId: newId }; saveActiveTimeline(); return { timeline: currentTimeline(), state }; });
app.post("/api/owner/reset", async (request, reply) => { if (!requireOwner(request, reply)) return; const body = request.body as { seed?: unknown } | undefined; const seed = body?.seed === undefined ? 20260906 : Number(body.seed); if (!Number.isInteger(seed)) return reply.code(400).send({ error: "seed must be an integer" }); const parent = activeTimelineId; database.prepare("UPDATE timelines SET status = 'archived', archived_at = ? WHERE id = ?").run(new Date().toISOString(), parent); activeTimelineId = `timeline-${randomUUID()}`; state = createWorld(seed, activeTimelineId); database.prepare("INSERT INTO timelines (id, parent_id, created_at, status) VALUES (?, ?, ?, 'active')").run(activeTimelineId, parent, new Date().toISOString()); database.prepare("INSERT INTO timeline_checkpoints (timeline_id, tick, state_json) VALUES (?, 0, ?)").run(activeTimelineId, JSON.stringify(state)); schedulerPaused = true; saveActiveTimeline(); return { timeline: currentTimeline(), state, schedulerPaused }; });

await app.listen({ port, host: "0.0.0.0" });
let scheduler: NodeJS.Timeout | undefined;
if (tickIntervalMs > 0) { scheduler = setInterval(() => { if (!shuttingDown && !schedulerPaused && state.tick < seasonTickLimit) commitTick(); }, tickIntervalMs); scheduler.unref(); app.log.info({ tickIntervalMs, seasonTickLimit, schedulerPaused }, "automatic tick scheduler configured"); }
let backupScheduler: NodeJS.Timeout | undefined;
if (backupIntervalMs > 0) { backupScheduler = setInterval(() => { if (!shuttingDown) createScheduledBackup("interval"); }, backupIntervalMs); backupScheduler.unref(); app.log.info({ backupIntervalMs, backupDirectory }, "scheduled database backups configured"); }
async function shutdown(signal: string) { if (shuttingDown) return; shuttingDown = true; if (scheduler) clearInterval(scheduler); if (backupScheduler) clearInterval(backupScheduler); for (const client of liveClients) client.end(); await app.close(); database.exec("PRAGMA wal_checkpoint(FULL);"); database.close(); app.log.info({ signal, tick: state.tick, timelineId: activeTimelineId }, "server shut down cleanly"); process.exit(0); }
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
