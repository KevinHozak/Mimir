import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const tempRoot = join(root, ".tmp", `security-p5-${Date.now()}`);
const databasePath = join(tempRoot, "first-glow.db");
const bundleRoot = join(root, "assets", "world", "generated");
const port = 34155;
const token = "security-p5-owner";
let server: ChildProcess | undefined;

async function startServer(): Promise<void> {
  server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(port), AUTO_PULSE: "false", DATABASE_PATH: databasePath, OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: bundleRoot }, stdio: ["ignore", "pipe", "pipe"] });
  const output: string[] = [];
  server.stdout?.on("data", chunk => output.push(String(chunk)));
  server.stderr?.on("data", chunk => output.push(String(chunk)));
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`server exited during startup with ${server.exitCode}: ${output.join("")}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server did not start: ${output.join("")}`);
}

async function stopServer(): Promise<void> {
  if (!server) return;
  if (server.exitCode === null) server.kill();
  await new Promise<void>(resolve => { if (server?.exitCode !== null) resolve(); else server?.once("exit", () => resolve()); });
}

const headers = { "content-type": "application/json", "x-owner-token": token };

try {
  mkdirSync(tempRoot, { recursive: true });
  await startServer();
  const reset = await fetch(`http://127.0.0.1:${port}/api/owner/reset-v3`, { method: "POST", headers, body: JSON.stringify({ bundleHash: "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e", seed: 41, sparkCount: 2 }) });
  assert.equal(reset.status, 200, await reset.text());
  await stopServer();
  server = undefined;

  const database = new DatabaseSync(databasePath);
  const timelineId = (database.prepare("SELECT value FROM runtime_metadata WHERE key = 'active_timeline'").get() as { value: string }).value;
  const row = database.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = 0").get(timelineId) as { state_json: string };
  const state = JSON.parse(row.state_json) as any;
  const settlement = state.firstGlowState.settlements[0];
  const object = settlement.bundle.objects.find((item: any) => item.id === "tiled-107");
  const slot = settlement.bundle.objectDefinitions[object.definitionId].slots.find((item: any) => item.id === "rest");
  const target = { x: object.origin.x + slot.offset.x, y: object.origin.y + slot.offset.y };
  const [actor, beneficiary] = settlement.sparks;
  for (const spark of [actor, beneficiary]) { spark.position = target; spark.status = "idle"; spark.knownEvidenceEventIds = ["evidence-1"]; }
  state.resonance = { schemaVersion: 1, candidates: [], anchors: [{ id: "anchor-test", candidateId: "candidate-test", anchorKind: "shelter-loom", authoredObjectId: "tiled-107", authoredSlotId: "rest", createdPulse: 0, accessRuleId: "shelter-loom-shared-rest-v1", possibility: "test", tension: "test", state: "active", evidenceEventIds: ["evidence-1"] }], decisions: [] };
  const before = JSON.stringify(state);
  database.prepare("UPDATE timeline_checkpoints SET state_json = ? WHERE timeline_id = ? AND pulse = 0").run(before, timelineId);
  database.prepare("INSERT INTO timeline_events (timeline_id, id, pulse, event_json) VALUES (?, ?, 0, ?)").run(timelineId, "evidence-1", JSON.stringify({ id: "evidence-1", pulse: 0, kind: "world-object", message: "Evidence", villagerIds: [], settlementIds: [settlement.id] }));
  database.close();

  await startServer();
  const choice = await fetch(`http://127.0.0.1:${port}/api/owner/resonance-choice`, { method: "POST", headers, body: JSON.stringify({ anchorId: "anchor-test", actorSparkId: actor.id, beneficiarySparkId: beneficiary.id, choice: "yield-rest", evidenceEventIds: ["evidence-1"] }) });
  assert.equal(choice.status, 200, await choice.text());
  const afterDatabase = new DatabaseSync(databasePath);
  const pulseZero = (afterDatabase.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = 0").get(timelineId) as { state_json: string }).state_json;
  const pulseOne = afterDatabase.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id = ? AND pulse = 1").get(timelineId) as { state_json: string };
  assert.equal(pulseZero, before);
  assert.ok(pulseOne);
  afterDatabase.close();
  const history = await fetch(`http://127.0.0.1:${port}/api/history?timelineId=${encodeURIComponent(timelineId)}&pulse=0`);
  assert.equal(history.status, 200);
  const historyBody = await history.json() as { events: Array<{ id: string }> };
  assert.ok(historyBody.events.some(event => event.id === "evidence-1"));
  assert.ok(!historyBody.events.some(event => event.id.includes("loom-decision")));
  console.log("Security-P5 append-only resonance checkpoint checks passed");
} finally {
  await stopServer();
  for (const suffix of ["", "-wal", "-shm"]) { const path = `${databasePath}${suffix}`; if (existsSync(path)) rmSync(path); }
  if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
}
