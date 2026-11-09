import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { canonicalize } from "@mimir/world-data";
import { testPort, stopTestProcesses } from "./test-runtime.mjs";

assert.equal(process.argv.length, 3, "provide a completed isolated v4 study directory");
const source = resolve(process.argv[2]), root = process.cwd();
const report = JSON.parse(readFileSync(join(source, "report.json")));
assert.equal(report.status, "complete");
assert.equal(report.mode, "synthetic");
const manifestBytes = readFileSync(join(root, "docs/model-study-protocol.json"));
const artifact = JSON.parse(manifestBytes);
assert.equal(artifact.protocolRevision, 4);
assert.equal(report.protocolHash, createHash("sha256").update(manifestBytes).digest("hex"));
const apiPort = await testPort(), webPort = await testPort();
const api = `http://127.0.0.1:${apiPort}`, web = `http://127.0.0.1:${webPort}`;
mkdirSync(join(root, ".tmp/model-study-review"), { recursive: true });
const output = mkdtempSync(join(root, ".tmp/model-study-review/run-"));
const env = { ...process.env, HOST: "127.0.0.1", AI_ENABLED: "false", AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", MIMIR_HOSTED: "false", SERVE_WEB: "false", BACKUP_INTERVAL_MS: "0", PUBLIC_OBSERVER_AUTH_REQUIRED: "false", OWNER_TOKEN: "isolated-study-test", OBSERVER_ORIGIN: web, VITE_API_URL: api, VITE_FIREBASE_AUTH_ENABLED: "false", VITE_STUDY_OBSERVER: "true" };
const children = [];
function start(args, cwd, settings) { const child = spawn(process.execPath, args, { cwd, env: settings, stdio: "ignore" }); children.push(child); return child; }
async function ready(url) { for (let i = 0; i < 120; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error("isolated review startup failed"); }
function canonicalHash(database) {
  const db = new DatabaseSync(database, { readOnly: true });
  try { return createHash("sha256").update(JSON.stringify(["timeline_checkpoints", "timeline_events", "timeline_interpretations", "runtime_metadata"].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY 1, 2`).all()))).digest("hex"); } finally { db.close(); }
}
const receipts = [];
let browser;
try {
  start(["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"].map((arg, index) => index === 0 ? join(root, arg) : arg), join(root, "packages/web"), env);
  await ready(web);
  browser = await chromium.launch({ headless: true });
  for (const run of report.runs) {
    const database = join(output, `${run.seed}-${run.arm}.db`);
    const world = JSON.parse(readFileSync(join(source, `${run.seed}-${run.arm}-80.json`)));
    const timelineId = world.worldId;
    const db = new DatabaseSync(database);
    db.exec("CREATE TABLE timelines(id TEXT PRIMARY KEY,parent_id TEXT,created_at TEXT NOT NULL,status TEXT NOT NULL,archived_at TEXT); CREATE TABLE timeline_checkpoints(timeline_id TEXT NOT NULL,pulse INTEGER NOT NULL,state_json TEXT NOT NULL,PRIMARY KEY(timeline_id,pulse)); CREATE TABLE timeline_events(timeline_id TEXT NOT NULL,id TEXT NOT NULL,pulse INTEGER NOT NULL,event_json TEXT NOT NULL,PRIMARY KEY(timeline_id,id)); CREATE TABLE timeline_interpretations(timeline_id TEXT NOT NULL,id TEXT NOT NULL,pulse INTEGER NOT NULL,interpretation_json TEXT NOT NULL,PRIMARY KEY(timeline_id,id)); CREATE TABLE runtime_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);");
    db.prepare("INSERT INTO timelines VALUES(?,NULL,?,'active',NULL)").run(timelineId, "2026-11-08T00:00:00Z");
    db.prepare("INSERT INTO runtime_metadata VALUES('active_timeline',?)").run(timelineId);
    for (const checkpoint of run.checkpoints) {
      const json = readFileSync(join(source, `${run.seed}-${run.arm}-${checkpoint.pulse}.json`), "utf8");
      assert.equal(createHash("sha256").update(JSON.stringify(canonicalize(JSON.parse(json)))).digest("hex"), checkpoint.hash);
      db.prepare("INSERT INTO timeline_checkpoints VALUES(?,?,?)").run(timelineId, checkpoint.pulse, json);
    }
    for (const line of readFileSync(join(source, `${run.seed}-${run.arm}-outcomes.jsonl`), "utf8").trim().split("\n")) {
      const row = JSON.parse(line);
      for (const event of row.events) db.prepare("INSERT INTO timeline_events VALUES(?,?,?,?)").run(timelineId, event.id, row.pulse, JSON.stringify(event));
      for (const interpretation of row.interpretations) db.prepare("INSERT INTO timeline_interpretations VALUES(?,?,?,?)").run(timelineId, interpretation.id, row.pulse, JSON.stringify(interpretation));
    }
    db.close();
    const server = start([join(root, "packages/server/dist/index.js")], root, { ...env, PORT: String(apiPort), DATABASE_PATH: database });
    await ready(`${api}/health`);
    const before = canonicalHash(database);
    const config = await (await fetch(`${api}/api/social/config`)).json();
    assert.equal(config.aiEnabled, false);
    const projection = await (await fetch(`${api}/api/reflection`)).json();
    assert.equal(JSON.stringify(projection.projection).includes("witnessedFacts"), false);
    assert.equal(JSON.stringify(projection.projection).includes("reflectionMemory"), false);
    const context = await browser.newContext();
    let writes = 0;
    await context.route("**/*", route => {
      const request = route.request();
      const url = new URL(request.url());
      if (![api, web].includes(url.origin)) return route.abort();
      if (url.pathname.startsWith("/api/") && !["GET", "HEAD"].includes(request.method())) { writes++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(web);
      await page.getByLabel("Selected entity", { exact: true }).selectOption("spark:spark-6");
      await page.getByRole("button", { name: "Follow Spark 6", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Advance one pulse", exact: true }).count(), 0);
      await page.getByRole("link", { name: "Chronicle & history", exact: true }).click();
      await page.getByTestId("chronicle-personal").waitFor();
      assert.match(await page.getByTestId("chronicle-personal").innerText(), /Spark 6/);
      assert.equal(await page.getByTestId("historical-scene").getAttribute("data-pulse"), "80");
      const admission = run.admissions.find(item => item.created && item.sparkId === "spark-6");
      const link = page.getByTestId("chronicle-personal").locator(`a[href*="${admission.eventId}"]`).first();
      await link.click();
      await page.locator(`[data-testid="historical-scene"][data-pulse="${admission.pulse}"]`).waitFor();
      await page.getByRole("link", { name: "Return to live observer", exact: true }).click();
      await page.getByTestId("follow-controls").waitFor();
      assert.equal(await page.getByLabel("Selected entity", { exact: true }).inputValue(), "spark:spark-6");
      await page.screenshot({ path: join(output, `${run.seed}-${run.arm}-${viewport.width}.png`), fullPage: true });
    }
    await context.close();
    assert.equal(writes, 0);
    assert.deepEqual(errors, []);
    assert.equal(canonicalHash(database), before);
    receipts.push({ seed: run.seed, arm: run.arm, canonicalHash: before, widths: [1440, 390], providerCalls: config.calls });
    await stopTestProcesses([server]);
  }
  writeFileSync(join(output, "review.json"), JSON.stringify({ source, receipts, humanReview: "unmeasured" }, null, 2));
  console.log(`Study observer checks passed for six histories on desktop/mobile: ${output}`);
} finally { await browser?.close(); await stopTestProcesses(children); }
