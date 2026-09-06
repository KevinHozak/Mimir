import Fastify from "fastify";
import cors from "@fastify/cors";
import { DatabaseSync } from "node:sqlite";
import { advanceWorld, createWorld, type WorldEvent, type WorldState } from "@philosophy-world/engine";

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? "philosophy-world.db";
const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode = WAL;");
database.exec(`CREATE TABLE IF NOT EXISTS checkpoints (tick INTEGER PRIMARY KEY, state_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, tick INTEGER NOT NULL, event_json TEXT NOT NULL);`);

const saved = database.prepare("SELECT state_json FROM checkpoints ORDER BY tick DESC LIMIT 1").get() as { state_json: string } | undefined;
let state: WorldState = saved ? JSON.parse(saved.state_json) as WorldState : createWorld(20260906);
if (!saved) database.prepare("INSERT INTO checkpoints (tick, state_json) VALUES (?, ?)").run(state.tick, JSON.stringify(state));

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true, tick: state.tick, databasePath }));
app.get("/api/world", async () => ({ state }));
app.get("/api/events", async (request) => {
  const query = request.query as { limit?: string };
  const limit = Math.min(200, Math.max(1, Number(query.limit ?? 50)));
  const rows = database.prepare("SELECT event_json FROM events ORDER BY tick DESC LIMIT ?").all(limit) as { event_json: string }[];
  return { events: rows.reverse().map((row) => JSON.parse(row.event_json) as WorldEvent) };
});

app.post("/api/tick", async () => {
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
  return { state, events: result.events };
});

await app.listen({ port, host: "0.0.0.0" });
