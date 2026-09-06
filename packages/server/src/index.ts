import Fastify from "fastify";
import cors from "@fastify/cors";
import { DatabaseSync } from "node:sqlite";
import type { ServerResponse } from "node:http";
import { advanceWorld, createWorld, LOCATION_TILES, type WorldEvent, type WorldState } from "@philosophy-world/engine";

const port = Number(process.env.PORT ?? 3000);
const tickIntervalMs = Number(process.env.TICK_INTERVAL_MS ?? 15000);
const autoTick = process.env.AUTO_TICK !== "false";
const seasonTickLimit = Number(process.env.SEASON_TICK_LIMIT ?? 60);
let schedulerPaused = !autoTick;
const databasePath = process.env.DATABASE_PATH ?? "philosophy-world.db";
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode = WAL;");
database.exec(`CREATE TABLE IF NOT EXISTS checkpoints (tick INTEGER PRIMARY KEY, state_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, tick INTEGER NOT NULL, event_json TEXT NOT NULL);`);

const saved = database.prepare("SELECT state_json FROM checkpoints ORDER BY tick DESC LIMIT 1").get() as { state_json: string } | undefined;
const savedState = saved ? JSON.parse(saved.state_json) as WorldState : createWorld(20260906);
let state: WorldState = {
  ...savedState,
  villagers: savedState.villagers.map((villager, index) => ({
    ...villager,
    position: villager.position ?? { x: 2 + (index % 6) * 4, y: 2 + Math.floor(index / 6) * 2 },
    route: villager.route ?? [],
    location: villager.location ?? Object.keys(LOCATION_TILES)[index % Object.keys(LOCATION_TILES).length]
  }))
};
if (!saved) database.prepare("INSERT INTO checkpoints (tick, state_json) VALUES (?, ?)").run(state.tick, JSON.stringify(state));
const liveClients = new Set<ServerResponse>();

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true, tick: state.tick, schedulerPaused, databasePath }));
app.get("/api/live", async (_request, reply) => {
  reply.hijack();
  const response = reply.raw;
  response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": "*" });
  response.write(`data: ${JSON.stringify({ state })}\n\n`);
  liveClients.add(response);
  response.on("close", () => liveClients.delete(response));
});
app.get("/api/world", async (request, reply) => {
  const query = request.query as { tick?: string };
  if (query.tick === undefined) return { state, schedulerPaused };
  const tick = Number(query.tick);
  if (!Number.isInteger(tick) || tick < 0) return reply.code(400).send({ error: "tick must be a non-negative integer" });
  const row = database.prepare("SELECT state_json FROM checkpoints WHERE tick = ?").get(tick) as { state_json: string } | undefined;
  if (!row) return reply.code(404).send({ error: `No checkpoint exists for tick ${tick}` });
  return { state: JSON.parse(row.state_json) as WorldState, schedulerPaused };
});
app.post("/api/scheduler", async (request, reply) => {
  const body = request.body as { paused?: unknown } | undefined;
  if (typeof body?.paused !== "boolean") return reply.code(400).send({ error: "paused must be a boolean" });
  schedulerPaused = body.paused;
  return { schedulerPaused };
});
app.get("/api/events", async (request) => {
  const query = request.query as { limit?: string };
  const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
  const rows = database.prepare("SELECT event_json FROM events ORDER BY tick DESC LIMIT ?").all(limit) as { event_json: string }[];
  return { events: rows.reverse().map((row) => JSON.parse(row.event_json) as WorldEvent) };
});

function commitTick(): { state: WorldState; events: WorldEvent[] } | null {
  if (state.tick >= seasonTickLimit) return null;
  const result = advanceWorld(state);
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("INSERT INTO checkpoints (tick, state_json) VALUES (?, ?)").run(result.state.tick, JSON.stringify(result.state));
    const insertEvent = database.prepare("INSERT INTO events (id, tick, event_json) VALUES (?, ?, ?)");
    for (const event of result.events) insertEvent.run(event.id, event.tick, JSON.stringify(event));
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  state = result.state;
  const message = `data: ${JSON.stringify({ state: result.state, events: result.events })}\n\n`;
  for (const client of liveClients) {
    if (!client.destroyed) client.write(message);
    else liveClients.delete(client);
  }
  return { state, events: result.events };
}

app.post("/api/tick", async (request, reply) => {
  const result = commitTick();
  if (!result) return reply.code(409).send({ error: "season boundary reached", state });
  return result;
});

await app.listen({ port, host: "0.0.0.0" });

if (tickIntervalMs > 0) {
  setInterval(() => {
    if (!schedulerPaused && state.tick < seasonTickLimit) commitTick();
  }, tickIntervalMs).unref();
  app.log.info({ tickIntervalMs, seasonTickLimit, schedulerPaused }, "automatic tick scheduler configured");
}
