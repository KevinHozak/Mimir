import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const [databasePath, outputPath] = process.argv.slice(2);
if (!databasePath || !outputPath) throw new Error("usage: node scripts/export-public-archive.mjs <database> <output-directory>");
const database = new DatabaseSync(resolve(databasePath));
const root = resolve(outputPath);
mkdirSync(root, { recursive: true });
const timelines = database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines WHERE status = 'archived' ORDER BY created_at, id").all();
const catalog = [];
for (const timeline of timelines) {
  const archiveId = timeline.id.replace(/[^a-zA-Z0-9._-]/g, "-");
  const archiveRoot = join(root, archiveId);
  const chunksRoot = join(archiveRoot, "chunks");
  mkdirSync(chunksRoot, { recursive: true });
  const checkpoints = database.prepare("SELECT pulse, state_json FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY pulse").all(timeline.id);
  const chunks = [];
  for (let index = 0; index < checkpoints.length; index += 1) {
    const checkpoint = checkpoints[index];
    const payload = {
      schemaVersion: 1,
      timeline,
      pulse: checkpoint.pulse,
      world: JSON.parse(checkpoint.state_json),
      events: database.prepare("SELECT event_json FROM timeline_events WHERE timeline_id = ? AND pulse <= ? ORDER BY pulse, id").all(timeline.id, checkpoint.pulse).flatMap(row => JSON.parse(row.event_json)),
      interpretations: database.prepare("SELECT interpretation_json FROM timeline_interpretations WHERE timeline_id = ? AND pulse <= ? ORDER BY pulse, id").all(timeline.id, checkpoint.pulse).map(row => JSON.parse(row.interpretation_json)),
    };
    const bytes = Buffer.from(JSON.stringify(payload) + "\n");
    const name = `chunk-${String(index).padStart(6, "0")}.json`;
    writeFileSync(join(chunksRoot, name), bytes);
    chunks.push({ name, pulse: checkpoint.pulse, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  const manifest = { schemaVersion: 1, archiveId, simulationVersion: "mimir-sim-v3-first-glow", timeline, chunks };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(archiveRoot, "manifest.json"), manifestBytes);
  catalog.push({ archiveId, timeline, chunkCount: chunks.length, manifestSha256: createHash("sha256").update(manifestBytes).digest("hex") });
}
writeFileSync(join(root, "catalog.json"), JSON.stringify({ schemaVersion: 1, simulationVersion: "mimir-sim-v3-first-glow", archives: catalog }, null, 2) + "\n");
database.close();

