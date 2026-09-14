import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = join(process.cwd(), ".tmp", "public-archive-test");
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
const databasePath = join(root, "source.db");
const outputPath = join(root, "export");
const database = new DatabaseSync(databasePath);
database.exec("CREATE TABLE timelines (id TEXT PRIMARY KEY, parent_id TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL, archived_at TEXT); CREATE TABLE timeline_checkpoints (timeline_id TEXT NOT NULL, pulse INTEGER NOT NULL, state_json TEXT NOT NULL, PRIMARY KEY (timeline_id, pulse)); CREATE TABLE timeline_events (timeline_id TEXT NOT NULL, id TEXT NOT NULL, pulse INTEGER NOT NULL, event_json TEXT NOT NULL, PRIMARY KEY (timeline_id, id)); CREATE TABLE timeline_interpretations (timeline_id TEXT NOT NULL, id TEXT NOT NULL, pulse INTEGER NOT NULL, interpretation_json TEXT NOT NULL, PRIMARY KEY (timeline_id, id));");
database.prepare("INSERT INTO timelines VALUES (?, ?, ?, ?, ?)").run("timeline-fixture", null, "2026-09-14T00:00:00.000Z", "archived", "2026-09-14T01:00:00.000Z");
for (const pulse of [0, 32, 64]) {
  const state = { simulationVersion: "mimir-sim-v3-first-glow", spatialModel: "structured-v2", pulse, firstGlowState: { history: { movements: [], decisions: [] } } };
  database.prepare("INSERT INTO timeline_checkpoints VALUES (?, ?, ?)").run("timeline-fixture", pulse, JSON.stringify(state));
  database.prepare("INSERT INTO timeline_events VALUES (?, ?, ?, ?)").run("timeline-fixture", "event-" + pulse, pulse, JSON.stringify([{ id: "event-" + pulse, pulse, message: "Pulse " + pulse }]));
}
const before = createHash("sha256").update(readFileSync(databasePath)).digest("hex");
database.close();
execFileSync(process.execPath, ["scripts/export-public-archive.mjs", databasePath, outputPath, "--timeline", "timeline-fixture", "--pulses", "0,32,64", "--source-backup", "fixture-backup-2026-09-14"], { stdio: "pipe" });
const manifest = JSON.parse(readFileSync(join(outputPath, "timeline-fixture", "manifest.json"), "utf8"));
assert.deepEqual(manifest.chunks.map(chunk => chunk.pulse), [0, 32, 64]);
assert.equal(manifest.source.backup, "fixture-backup-2026-09-14");
const publish = execFileSync(process.execPath, ["scripts/publish-public-archive.mjs", outputPath, "gs://example/archive", "--dry-run", "--retention-days", "30"], { encoding: "utf8" });
const publication = JSON.parse(publish);
assert.equal(publication.ok, true);
assert.deepEqual(publication.publishedArchives, ["timeline-fixture"]);
assert.match(publication.publicationRecord, /publications\/run-/);
const after = createHash("sha256").update(readFileSync(databasePath)).digest("hex");
assert.equal(after, before, "export must not mutate canonical SQLite history");
rmSync(join(outputPath, "timeline-fixture", "chunks", manifest.chunks[1].name));
assert.throws(() => execFileSync(process.execPath, ["scripts/publish-public-archive.mjs", outputPath, "gs://example/archive", "--dry-run"], { stdio: "pipe" }), /archive chunk missing/);
console.log("public archive export/publish checks passed");
