import { chromium } from "playwright";
import { cpus, platform, release, totalmem } from "node:os";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { decodeWorldBundle } from "../packages/world-data/dist/index.js";
import { advanceFirstGlow, createFirstGlowState } from "../packages/engine/dist/index.js";

const root = process.cwd();
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const apiPort = Number(process.env.MIMIR_PROFILE_API_PORT ?? 34144);
const webPort = Number(process.env.MIMIR_PROFILE_WEB_PORT ?? 5179);
const ticks = Number(process.env.MIMIR_PROFILE_TICKS ?? 120);
const seed = Number(process.env.MIMIR_PROFILE_SEED ?? 20260911);
const runtimeRoot = join(root, ".tmp", `first-glow-profile-${Date.now()}`);
const database = join(runtimeRoot, "runtime.db");
const bundle = decodeWorldBundle(JSON.parse(readFileSync(join(root, "assets", "world", "generated", hash, "world.json"), "utf8")));
const outputPath = join(root, "docs", "evidence", "first-glow-production-profile-2026-09-11.json");
const captureRoot = join(root, "docs", "evidence");
const ownerToken = "profile-first-glow";
const apiUrl = `http://127.0.0.1:${apiPort}`;
const engineRuns = [];

mkdirSync(runtimeRoot, { recursive: true });

for (let run = 0; run < 2; run += 1) {
  let state = createFirstGlowState(bundle, "first-glow-region", "Opening region", 12);
  const samples = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const start = performance.now();
    state = advanceFirstGlow(state);
    samples.push(performance.now() - start);
  }
  const sorted = samples.slice().sort((a, b) => a - b);
  engineRuns.push({ medianMs: sorted[Math.floor(sorted.length * 0.5)], p95Ms: sorted[Math.floor(sorted.length * 0.95)], maxMs: sorted.at(-1), finalTick: state.tick });
}

const processOutput = [];
const server = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], { cwd: root, env: { ...process.env, PORT: String(apiPort), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: ownerToken, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") }, stdio: ["ignore", "pipe", "pipe"] });
const preview = spawn(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", String(webPort)], { cwd: join(root, "packages/web"), env: { ...process.env, VITE_API_URL: apiUrl }, stdio: ["ignore", "pipe", "pipe"] });
for (const child of [server, preview]) { child.stdout?.on("data", chunk => processOutput.push(String(chunk))); child.stderr?.on("data", chunk => processOutput.push(String(chunk))); }

const waitFor = async url => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null || preview.exitCode !== null) throw new Error(`profile service exited: ${processOutput.join("")}`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(500) })).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`profile service did not start: ${url}`);
};

const reset = async () => {
  const response = await fetch(`${apiUrl}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": ownerToken }, body: JSON.stringify({ bundleHash: hash, seed, sparkCount: 12 }) });
  if (!response.ok) throw new Error(await response.text());
};

const browserProfile = async (page, tickCount) => page.evaluate(tickTotal => new Promise(resolve => {
  const frameSamples = [];
  const longTasks = [];
  const memorySamples = [];
  const observer = typeof PerformanceObserver === "undefined" ? undefined : new PerformanceObserver(list => list.getEntries().forEach(entry => longTasks.push(entry.duration)));
  try { observer?.observe({ entryTypes: ["longtask"] }); } catch { /* unsupported */ }
  let previous = performance.now();
  let count = 0;
  const step = now => {
    frameSamples.push(now - previous);
    previous = now;
    const memory = performance.memory?.usedJSHeapSize;
    if (typeof memory === "number") memorySamples.push(memory);
    count += 1;
    if (count >= tickTotal) {
      observer?.disconnect();
      const sorted = frameSamples.slice().sort((a, b) => a - b);
      resolve({ frameMedianMs: sorted[Math.floor(sorted.length * 0.5)], frameP95Ms: sorted[Math.floor(sorted.length * 0.95)], frameMaxMs: sorted.at(-1), longTaskCount: longTasks.length, longTaskTotalMs: longTasks.reduce((total, value) => total + value, 0), memoryBeforeBytes: memorySamples[0] ?? null, memoryAfterBytes: memorySamples.at(-1) ?? null, memoryGrowthBytes: memorySamples.length > 1 ? memorySamples.at(-1) - memorySamples[0] : null });
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), ticks);

const advanceTicks = async () => {
  for (let tick = 0; tick < ticks; tick += 1) {
    const response = await fetch(`${apiUrl}/api/tick`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": ownerToken }, body: "{}" });
    if (!response.ok) throw new Error(`tick failed: ${response.status}`);
  }
};

const runView = async (browser, name, viewport, deviceScaleFactor, reducedMotion, overlay) => {
  await reset();
  const context = await browser.newContext({ viewport, deviceScaleFactor, reducedMotion });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${webPort}/${overlay ? "?debug=1" : ""}`);
  await page.getByTestId("first-glow-inspector").waitFor();
  await page.getByText("12 Sparks", { exact: true }).first().waitFor();
  const overlaySummary = page.getByTestId("first-glow-overlay-summary");
  if (overlay ? await overlaySummary.count() !== 1 : await overlaySummary.count() !== 0) throw new Error(`unexpected debug overlay state for ${name}`);
  const tickWorkload = advanceTicks();
  const metrics = await browserProfile(page, ticks);
  await tickWorkload;
  const capturePath = join(captureRoot, `first-glow-production-${name}.png`);
  await page.screenshot({ path: capturePath, fullPage: true });
  await context.close();
  return { name, viewport: `${viewport.width}x${viewport.height}`, deviceScaleFactor, reducedMotion, overlay, capture: `docs/evidence/${capturePath.split("docs\\evidence\\")[1].replaceAll("\\", "/")}`, metrics };
};

try {
  await waitFor(`${apiUrl}/health`);
  await waitFor(`http://127.0.0.1:${webPort}/`);
  const browser = await chromium.launch({ headless: true });
  try {
    const browserVersion = browser.version();
    const views = [
      await runView(browser, "desktop", { width: 1280, height: 900 }, 1, "no-preference", false),
      await runView(browser, "desktop-overlay", { width: 1280, height: 900 }, 1, "no-preference", true),
      await runView(browser, "mobile", { width: 390, height: 844 }, 2, "reduce", false),
    ];
    const output = { generatedAt: new Date().toISOString(), commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), bundleHash: hash, themeId: "living-circuit", ageId: "first-glow", map: { width: bundle.width, height: bundle.height, objectCount: bundle.objects.length, assetCount: bundle.assets.length, spawnCount: bundle.spawns.length }, seed, sparks: 12, ticks, build: "production Vite preview of packages/web/dist", runtime: { apiPort, webPort, database: ".tmp/first-glow-profile-*/runtime.db", productionPreview: true }, engineRuns, environment: { os: `${platform()} ${release()}`, hardware: cpus()[0]?.model ?? "unknown", logicalCpuCount: cpus().length, totalMemoryBytes: totalmem(), node: process.version, browser: `Playwright Chromium ${browserVersion}`, browserVersion, viewports: views.map(view => view.viewport) }, views };
    writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
    console.log(JSON.stringify(output, null, 2));
  } finally { await browser.close(); }
} finally {
  for (const child of [server, preview]) { if (child.exitCode === null) child.kill(); }
  for (const child of [server, preview]) await new Promise(resolve => { if (child.exitCode !== null) resolve(); else { child.once("exit", resolve); setTimeout(resolve, 3000); } });
  if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
}
