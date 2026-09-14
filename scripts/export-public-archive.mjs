import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const [databasePath, outputPath, ...flags] = process.argv.slice(2);
if (!databasePath || !outputPath) throw new Error("usage: node scripts/export-public-archive.mjs <database> <output-directory> [--timeline <id>] [--pulses <0,32,64>] [--source-backup <label>]");
const flagValue = name => { const index = flags.indexOf(name); return index < 0 ? undefined : flags[index + 1]; };
const timelineId = flagValue("--timeline");
const pulseValue = flagValue("--pulses");
const sourceBackup = flagValue("--source-backup") ?? basename(resolve(databasePath));
const selectedPulses = pulseValue === undefined ? undefined : pulseValue.split(",").map(value => Number(value.trim()));
if (selectedPulses && (selectedPulses.length < 3 || selectedPulses.some(pulse => !Number.isInteger(pulse) || pulse < 0) || new Set(selectedPulses).size !== selectedPulses.length || !selectedPulses.includes(0))) throw new Error("--pulses must contain at least three unique non-negative pulses including 0");

const database = new DatabaseSync(resolve(databasePath), { readOnly: true });
const root = resolve(outputPath);
mkdirSync(root, { recursive: true });
const timelines = timelineId
  ? database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines WHERE id = ? AND status = 'archived'").all(timelineId)
  : database.prepare("SELECT id, parent_id, created_at, status, archived_at FROM timelines WHERE status = 'archived' ORDER BY created_at, id").all();
if (timelineId && timelines.length === 0) throw new Error(`archived timeline not found: ${timelineId}`);
const catalog = [];
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
for (const timeline of timelines) {
  const archiveId = timeline.id.replace(/[^a-zA-Z0-9._-]/g, "-");
  const archiveRoot = join(root, archiveId);
  const chunksRoot = join(archiveRoot, "chunks");
  mkdirSync(chunksRoot, { recursive: true });
  const allCheckpoints = database.prepare("SELECT pulse, state_json FROM timeline_checkpoints WHERE timeline_id = ? ORDER BY pulse").all(timeline.id);
  const checkpoints = selectedPulses ? selectedPulses.map(pulse => allCheckpoints.find(checkpoint => checkpoint.pulse === pulse)).filter(Boolean) : allCheckpoints;
  if (checkpoints.length < 3 || checkpoints[0]?.pulse !== 0) throw new Error(`timeline ${timeline.id} must publish at least three checkpoints including pulse 0`);
  if (selectedPulses && checkpoints.length !== selectedPulses.length) throw new Error(`timeline ${timeline.id} is missing one or more selected checkpoints`);
  const chunks = [];
  for (let index = 0; index < checkpoints.length; index += 1) {
    const checkpoint = checkpoints[index];
    const world = JSON.parse(checkpoint.state_json);
    const payload = {
      schemaVersion: 1,
      timeline,
      pulse: checkpoint.pulse,
      world,
      events: database.prepare("SELECT event_json FROM timeline_events WHERE timeline_id = ? AND pulse <= ? ORDER BY pulse, id").all(timeline.id, checkpoint.pulse).flatMap(row => JSON.parse(row.event_json)),
      interpretations: database.prepare("SELECT interpretation_json FROM timeline_interpretations WHERE timeline_id = ? AND pulse <= ? ORDER BY pulse, id").all(timeline.id, checkpoint.pulse).map(row => JSON.parse(row.interpretation_json)),
      movementRecords: world.firstGlowState?.history?.movements?.filter(record => record.pulse <= checkpoint.pulse) ?? [],
      decisionRecords: world.firstGlowState?.history?.decisions?.filter(record => record.pulse <= checkpoint.pulse) ?? [],
    };
    const bytes = Buffer.from(JSON.stringify(payload) + "\n");
    const name = `chunk-${String(index).padStart(6, "0")}.json`;
    writeFileSync(join(chunksRoot, name), bytes);
    chunks.push({ name, pulse: checkpoint.pulse, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const manifest = { schemaVersion: 1, archiveId, simulationVersion: "mimir-sim-v3-first-glow", source: { backup: sourceBackup, timelineId: timeline.id }, timeline, chunks };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(archiveRoot, "manifest.json"), manifestBytes);
  catalog.push({ archiveId, timeline, source: manifest.source, chunkCount: chunks.length, checkpoints: chunks.map(chunk => chunk.pulse), manifestSha256: sha256(manifestBytes) });
}
writeFileSync(join(root, "catalog.json"), JSON.stringify({ schemaVersion: 1, simulationVersion: "mimir-sim-v3-first-glow", archives: catalog }, null, 2) + "\n");
database.close();
