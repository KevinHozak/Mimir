import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { advanceWorld, createWorldV3, validateFirstGlowState } from "../packages/engine/dist/index.js";
import { routePatternFixture, routePatternFixtureBundle } from "../packages/engine/dist/first-glow-route-patterns-fixture.js";
import { normalizeState } from "../packages/server/dist/state.js";

// This harness has no live mode, provider, credentials, transport, or retries.
globalThis.fetch = () => { throw new Error("Network forbidden in offline route-pattern review"); };
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const directory = mkdtempSync(join(root, ".tmp", "route-patterns-review-"));
const database = join(directory, "observer.db"), db = new DatabaseSync(database);
db.exec(`CREATE TABLE timelines(id TEXT PRIMARY KEY,parent_id TEXT,created_at TEXT NOT NULL,status TEXT NOT NULL,archived_at TEXT);
CREATE TABLE timeline_checkpoints(timeline_id TEXT NOT NULL,pulse INTEGER NOT NULL,state_json TEXT NOT NULL,PRIMARY KEY(timeline_id,pulse));
CREATE TABLE timeline_events(timeline_id TEXT NOT NULL,id TEXT NOT NULL,pulse INTEGER NOT NULL,event_json TEXT NOT NULL,PRIMARY KEY(timeline_id,id));
CREATE TABLE timeline_interpretations(timeline_id TEXT NOT NULL,id TEXT NOT NULL,pulse INTEGER NOT NULL,interpretation_json TEXT NOT NULL,PRIMARY KEY(timeline_id,id));
CREATE TABLE runtime_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const cases = [
  { name: "use", timelineId: "main", charge: 32, enabled: true, encounter: true },
  { name: "need-decline", timelineId: "need-decline", charge: 0, enabled: true, encounter: true },
  { name: "no-encounter", timelineId: "no-encounter", charge: 32, enabled: true, encounter: false },
  { name: "no-pattern", timelineId: "no-pattern", charge: 32, enabled: false, encounter: true }
];
function run(scenario, restart = false) {
  let state = createWorldV3(routePatternFixtureBundle, 2, scenario.timelineId, 2);
  state.firstGlowState = routePatternFixture(scenario.charge, scenario.enabled, scenario.encounter);
  state.worldRuntime = state.firstGlowState.settlements[0].runtime;
  state.settlements = state.firstGlowState.settlements.map(s => ({ id: s.id, name: s.name, villagerIds: [], foodReserve: 0, worldRuntime: s.runtime }));
  const checkpoints = [state], events = [], interpretations = [];
  for (let pulse = 1; pulse <= 24; pulse++) {
    if (restart && pulse === 13) state = normalizeState(JSON.parse(db.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id=? AND pulse=12").get(scenario.timelineId).state_json));
    const next = advanceWorld(state);
    state = next.state;
    validateFirstGlowState(state.firstGlowState);
    checkpoints.push(state); events.push(...next.events); interpretations.push(...next.interpretations);
  }
  return { checkpoints, events, interpretations };
}

const histories = [];
for (const scenario of cases) {
  const history = run(scenario);
  db.exec("BEGIN");
  db.prepare("INSERT INTO timelines VALUES(?,NULL,?,?,?)").run(scenario.timelineId, new Date().toISOString(), scenario.name === "use" ? "active" : "archived", scenario.name === "use" ? null : new Date().toISOString());
  for (const state of history.checkpoints) db.prepare("INSERT INTO timeline_checkpoints VALUES(?,?,?)").run(scenario.timelineId, state.pulse, JSON.stringify(state));
  for (const event of history.events) db.prepare("INSERT INTO timeline_events VALUES(?,?,?,?)").run(scenario.timelineId, event.id, event.pulse, JSON.stringify(event));
  for (const item of history.interpretations) db.prepare("INSERT INTO timeline_interpretations VALUES(?,?,?,?)").run(scenario.timelineId, item.id, item.pulse, JSON.stringify(item));
  db.exec("COMMIT");
  const before = hash(history), restarted = run(scenario, true);
  assert.equal(hash(restarted), before, `${scenario.name}: SQLite checkpoint restart mismatch`);
  const final = history.checkpoints.at(-1), patterns = final.firstGlowState.routePatterns?.patterns ?? [];
  const pattern = patterns.find(item => item.creatorId === "spark-1"), reader = pattern?.encounters.find(item => item.sparkId === "spark-2");
  if (scenario.name === "use") { assert.ok(reader?.use?.outcomeEventId); assert.ok(history.events.some(e => e.id === reader.use.outcomeEventId && /reached Wild Cache/.test(e.message))); }
  if (scenario.name === "need-decline") { assert.ok(reader?.decline); assert.equal(reader.use, undefined); }
  if (scenario.name === "no-encounter") assert.equal(reader, undefined);
  if (scenario.name === "no-pattern") assert.equal(patterns.length, 0);
  const lifecycle = history.events.filter(event => event.structuredKind === "route-pattern").map(event => ({ id: event.id, pulse: event.pulse, actorId: event.actorId, message: event.message }));
  histories.push({ ...scenario, pulses: 24, sha256: before, sqliteRestartEquivalent: true, lifecycle });
  writeFileSync(join(directory, `${scenario.name}.json`), JSON.stringify(history));
}
const withPattern = JSON.parse(db.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id='main' AND pulse=11").get().state_json);
const withoutPattern = JSON.parse(db.prepare("SELECT state_json FROM timeline_checkpoints WHERE timeline_id='no-pattern' AND pulse=11").get().state_json);
assert.equal(withPattern.firstGlowState.settlements[0].sparks[1].intendedActivity, "scavenge-cache");
assert.equal(withoutPattern.firstGlowState.settlements[0].sparks[1].intendedActivity, "explore");
db.prepare("INSERT INTO runtime_metadata VALUES('active_timeline','main')").run();
const baseline = {};
for (const table of ["timelines", "timeline_checkpoints", "timeline_events", "timeline_interpretations", "runtime_metadata"]) {
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
  baseline[table] = { count: rows.length, sha256: hash(rows) };
}
db.close();
const summary = { ruleVersion: "persistent-route-pattern-v1", mode: "offline controlled initial-condition histories", providerCalls: 0, aiEnabled: false, pulsesPerCase: 24, decisionCounterfactualAtPulse11: { withPattern: "scavenge-cache", withoutPattern: "explore" }, histories };
writeFileSync(join(directory, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
writeFileSync(join(directory, "baseline.json"), JSON.stringify(baseline, null, 2) + "\n");
console.log(JSON.stringify({ directory, database, summary: join(directory, "summary.json"), cases: histories.length, providerCalls: 0, sqliteRestartEquivalent: true }));
