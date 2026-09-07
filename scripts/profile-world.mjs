import { spawn } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { chromium } from "playwright";
import { createStructuredState, advanceStructuredState } from "../packages/engine/dist/structured.js";
import { readFileSync } from "node:fs";

const root = process.cwd();
const hash = "sha256-1f24c63c9168eb2e8d6a76be1b1d42c12b601ef9f3955a34a9cf25d4d2854564";
const bundle = JSON.parse(readFileSync(join(root, "assets", "world", "generated", hash, "world.json"), "utf8"));
const engineRuns = [];
for (let run = 0; run < 2; run += 1) {
  let state = createStructuredState(bundle, "first-village", "Hearthmere", 12);
  const samples = [];
  for (let tick = 0; tick < 120; tick += 1) { const start = performance.now(); state = advanceStructuredState(state); samples.push(performance.now() - start); }
  const sorted = samples.slice().sort((a, b) => a - b);
  engineRuns.push({ medianMs: sorted[Math.floor(sorted.length * 0.5)], p95Ms: sorted[Math.floor(sorted.length * 0.95)], maxMs: sorted.at(-1), finalTick: state.tick });
}

const database = join(root, `profile-world-${Date.now()}.db`);
const apiPort = 34138;
const webPort = 5178;
const server = spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env: { ...process.env, PORT: String(apiPort), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: "profile-owner" }, stdio: "ignore" });
const web = spawn(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort)], { cwd: join(root, "packages", "web"), env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${apiPort}` }, stdio: "ignore" });
const waitFor = async (url) => { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`profile service did not start: ${url}`); };
try {
  await waitFor(`http://127.0.0.1:${apiPort}/health`); await waitFor(`http://127.0.0.1:${webPort}/`);
  const reset = await fetch(`http://127.0.0.1:${apiPort}/api/owner/reset-v2`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "profile-owner" }, body: JSON.stringify({ bundleHash: hash, seed: 20260906 }) });
  if (!reset.ok) throw new Error(await reset.text());
  const browser = await chromium.launch({ headless: true });
  try { const page = await browser.newPage(); await page.goto(`http://127.0.0.1:${webPort}/`); await page.getByText("Owner operations").waitFor(); const frame = await page.evaluate(() => new Promise(resolve => { const samples = []; let previous = performance.now(); let count = 0; const step = now => { samples.push(now - previous); previous = now; count += 1; if (count === 120) resolve(samples); else requestAnimationFrame(step); }; requestAnimationFrame(step); })); const sorted = frame.sort((a, b) => a - b); console.log(JSON.stringify({ bundleHash: hash, map: { width: bundle.width, height: bundle.height, objectCount: bundle.objects.length, spawnCount: bundle.spawns.filter(spawn => spawn.settlementId === "first-village").length }, build: "production Vite bundle", seed: 20260906, ticks: 120, engineRuns, browserFrames: { medianMs: sorted[Math.floor(sorted.length * 0.5)], p95Ms: sorted[Math.floor(sorted.length * 0.95)], maxMs: sorted.at(-1), frameCount: sorted.length }, browser: "Playwright Chromium headless", viewport: "1280x900" }, null, 2)); } finally { await browser.close(); }
} finally { server.kill(); web.kill(); for (const child of [server, web]) await new Promise(resolve => { if (child.exitCode !== null) resolve(); else { child.once("exit", resolve); setTimeout(resolve, 3000); } }); for (const suffix of ["", "-shm", "-wal"]) { const path = `${database}${suffix}`; if (existsSync(path)) unlinkSync(path); } }
