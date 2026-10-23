import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";
import { testPort, stopTestProcesses, waitForTestExit } from "./test-runtime.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temp = join(root, ".tmp", "local-observer-tests", String(Date.now()));
mkdirSync(temp, { recursive: true });
const database = join(temp, "observer.db");
const apiPort = await testPort(), webPort = await testPort();
const api = `http://127.0.0.1:${apiPort}`, preview = `http://127.0.0.1:${webPort}`;
const token = "local-observer-test";
let launcher;
let output = "";
async function start(origin) {
  const env = { ...process.env, HOST: "127.0.0.1", PORT: String(apiPort), WEB_PORT: String(webPort), DATABASE_PATH: database, AUTO_PULSE: "false", AI_ENABLED: "false", PUBLIC_OBSERVER_AUTH_REQUIRED: "false", OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") };
  delete env.OBSERVER_ORIGIN;
  delete env.VITE_API_URL;
  delete env.VITE_LIVE_API_URL;
  if (origin !== undefined) env.OBSERVER_ORIGIN = origin;
  if (origin !== undefined) delete env.npm_execpath; // Exercise standalone Node fallback on restart.
  output = "";
  launcher = spawn(process.execPath, [join(root, "scripts/run-local.mjs")], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  const capture = chunk => { output = (output + String(chunk)).slice(-12000); };
  launcher.stdout.on("data", capture); launcher.stderr.on("data", capture);
  for (let attempt = 0; attempt < 180; attempt++) {
    if (launcher.exitCode !== null) throw new Error(`Launcher exited: ${output}`);
    try { if (output.includes(`Mimir is running at ${preview}/`) && (await fetch(`${api}/health`)).ok && (await fetch(preview)).ok) return; } catch { /* building/starting */ }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Launcher failed to start: ${output}`);
}
async function stop() {
  if (!launcher) return;
  if (process.platform === "win32" && launcher.exitCode === null && launcher.signalCode === null) {
    // The entire tree belongs to this test; Windows SIGTERM does not invoke Node's handler.
    execFileSync("taskkill", ["/PID", String(launcher.pid), "/T", "/F"], { stdio: "ignore" });
    await waitForTestExit(launcher);
  } else await stopTestProcesses([launcher]);
  launcher = undefined;
}
function historyHash() {
  const db = new DatabaseSync(database, { readOnly: true });
  try { return createHash("sha256").update(JSON.stringify(["timeline_checkpoints", "timeline_events", "timeline_interpretations", "runtime_metadata"].map(table => db.prepare(`SELECT * FROM ${table} ORDER BY 1, 2`).all()))).digest("hex"); }
  finally { db.close(); }
}
try {
  await start();
  for (const path of ["/api/world", "/api/events", "/api/resonance"]) {
    const response = await fetch(api + path, { headers: { Origin: preview } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), preview);
  }
  const preflight = await fetch(`${api}/api/world`, { method: "OPTIONS", headers: { Origin: preview, "Access-Control-Request-Method": "GET" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), preview);
  const denied = await fetch(`${api}/api/world`, { headers: { Origin: "https://unrelated.example" } });
  assert.notEqual(denied.headers.get("access-control-allow-origin"), "https://unrelated.example");
  const pulse = await fetch(`${api}/api/pulse`, { method: "POST", headers: { "x-owner-token": token } });
  assert.equal(pulse.status, 200);
  const fixtures = await (await fetch(`${api}/api/resonance`)).json();
  assert.equal(fixtures.source, "resonance-contract-fixtures");
  assert.ok(fixtures.observations.length > 0);
  assert.equal(Object.hasOwn(fixtures, "committedEventCount"), false);
  assert.equal(Object.hasOwn(fixtures, "currentPulse"), false);
  const before = historyHash();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(preview);
    const examples = page.getByTestId("resonance-review");
    await examples.getByRole("heading", { name: "Resonance examples", exact: true }).waitFor();
    await page.locator("#village-canvas canvas").waitFor();
    assert.match(await examples.innerText(), /Illustrative scenarios, separate from this world's recorded events/);
    assert.doesNotMatch(await examples.innerText(), /live event|committed evidence|private Spark knowledge/i);
    await examples.locator("summary").first().click();
    assert.match(await examples.locator("details").first().innerText(), /Example evidence/);
    assert.equal(await page.getByTestId("first-glow-refresh-error").count(), 0);
    assert.match(await page.getByTestId("objective-events").innerText(), /Pulse 1/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await examples.isVisible());
    assert.equal(await page.evaluate(() => document.querySelector('[data-testid="resonance-review"]').scrollWidth > document.querySelector('[data-testid="resonance-review"]').clientWidth), false);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  assert.equal(historyHash(), before, "Viewing examples must not change simulation history");
  assert.equal((await (await fetch(`${api}/api/reflection`)).json()).runtime.calls, 0);
  await stop();
  const explicit = `http://localhost:${webPort}`;
  await start(explicit);
  const allowedOverride = await fetch(`${api}/api/world`, { headers: { Origin: explicit } });
  assert.equal(allowedOverride.headers.get("access-control-allow-origin"), explicit);
  const generatedOrigin = await fetch(`${api}/api/world`, { headers: { Origin: preview } });
  assert.notEqual(generatedOrigin.headers.get("access-control-allow-origin"), preview);
  console.log("Local launcher CORS, explicit override, fixture labels, desktop/mobile, read-only history, and zero provider calls passed");
} finally { await stop(); rmSync(temp, { recursive: true, force: true }); }
