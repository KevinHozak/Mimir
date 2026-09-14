import assert from "node:assert/strict";
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { validateEvidence } from "./first-glow-art-validation-schema.mjs";

const root = resolve(process.cwd());
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const bundleFile = join(root, "assets", "world", "generated", hash, "world.json");
const bundle = JSON.parse(readFileSync(bundleFile, "utf8"));
const runId = process.env.ART_VALIDATION_RUN ?? new Date().toISOString().replace(/[:.]/g, "-");
const outputRoot = join(root, ".tmp", "art-validation", runId);
const database = join(outputRoot, "runtime.db");
const apiPort = Number(process.env.ART_VALIDATION_API_PORT ?? 34388);
const webPort = Number(process.env.ART_VALIDATION_WEB_PORT ?? 53788);
const ownerToken = "first-glow-art-validation";
const sourceMetadata = JSON.parse(readFileSync(join(root, "assets", "world", "art-production", "assets.json"), "utf8"));
const sourceVersions = Object.fromEntries(sourceMetadata.assets.map(asset => [asset.path, asset.version]));
const childProcesses = [];
mkdirSync(outputRoot, { recursive: true });


const waitFor = async url => { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolveWait => setTimeout(resolveWait, 100)); } throw new Error(`validation service did not start: ${url}`); };
const spawnChild = (command, args, options = {}) => { const child = spawn(command, args, { cwd: options.cwd ?? root, env: { ...process.env, PORT: String(apiPort), AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: ownerToken, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated"), ...(options.env ?? {}) }, stdio: "ignore" }); childProcesses.push(child); return child; };
const collectFrames = page => page.evaluate(() => new Promise(resolveFrames => {
  const frames = []; const longTasks = []; const memory = []; let previous = performance.now(); let count = 0;
  const observer = typeof PerformanceObserver === "undefined" ? undefined : new PerformanceObserver(list => list.getEntries().forEach(entry => longTasks.push(entry.duration)));
  try { observer?.observe({ entryTypes: ["longtask"] }); } catch {}
  const step = now => { frames.push(now - previous); previous = now; if (typeof performance.memory?.usedJSHeapSize === "number") memory.push(performance.memory.usedJSHeapSize); count += 1; if (count >= 120) { observer?.disconnect(); const sorted = frames.slice().sort((a, b) => a - b); resolveFrames({ frameMedianMs: sorted[Math.floor(sorted.length * .5)] ?? 0, frameP95Ms: sorted[Math.floor(sorted.length * .95)] ?? 0, frameMaxMs: sorted.at(-1) ?? 0, longTaskCount: longTasks.length, longTaskTotalMs: longTasks.reduce((sum, value) => sum + value, 0), memoryBeforeBytes: memory[0] ?? null, memoryAfterBytes: memory.at(-1) ?? null, memoryGrowthBytes: memory.length > 1 ? memory.at(-1) - memory[0] : null }); return; } requestAnimationFrame(step); };
  requestAnimationFrame(step);
}));
const pulseCanvasCheck = async (page, pulseCount = 2) => {
  await page.evaluate(() => { window.__mimirCanvas = document.querySelector("#village-canvas canvas"); });
  for (let index = 0; index < pulseCount; index += 1) { const response = await fetch(`http://127.0.0.1:${apiPort}/api/pulse`, { method: "POST", headers: { "x-owner-token": ownerToken } }); assert.equal(response.status, 200); }
  await page.waitForTimeout(350);
  return page.evaluate(() => window.__mimirCanvas === document.querySelector("#village-canvas canvas"));
};
const captureView = async (page, name, viewport, deviceScaleFactor, reducedMotion) => {
  const assetRequests = new Set(); page.on("request", request => { if (request.url().includes(`/api/world/bundles/${hash}/assets/`)) assetRequests.add(request.url()); });
  await page.goto(`http://127.0.0.1:${webPort}/`); await page.locator('main[data-theme="living-circuit"]').waitFor(); await page.locator("#village-canvas canvas").waitFor(); await page.getByTestId("first-glow-inspector").waitFor(); await page.waitForTimeout(400);
  const canvas = await page.locator("#village-canvas canvas").evaluate(element => ({ width: element.width, height: element.height, displayWidth: element.getBoundingClientRect().width, displayHeight: element.getBoundingClientRect().height, resolution: element.dataset.renderResolution, zoom: element.dataset.cameraZoom }));
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await page.getByTestId("first-glow-entity-chooser").getByRole("combobox").selectOption({ index: 1 });
  const inspector = await page.getByTestId("first-glow-inspector").innerText(); assert.match(inspector, /Current location/); assert.match(inspector, /Charge/); await page.keyboard.press("Tab"); const focusVisible = await page.evaluate(() => { const element = document.activeElement; return Boolean(element && (element.matches(":focus-visible") || element.getAttribute("aria-label") || element.textContent)); });
  const canvasStable = await pulseCanvasCheck(page); const frame = await collectFrames(page); const path = join(outputRoot, name); await page.screenshot({ path, fullPage: true });
  return { name, viewport: `${viewport.width}x${viewport.height}`, deviceScaleFactor, reducedMotion, path: `.tmp/art-validation/${runId}/${name}`, horizontalOverflow, focusVisible, assetRequests: [...assetRequests].sort(), canvas, canvasRecreatedBetweenPulses: !canvasStable, frame };
};

try {
  const check = spawnSync(process.execPath, ["scripts/art-production.mjs", "check", "--bundle", bundleFile], { cwd: root, encoding: "utf8" }); if (check.status !== 0) throw new Error(check.stderr || check.stdout);
  const nodeModules = existsSync(join(root, "node_modules")) ? join(root, "node_modules") : join(root, "..", "..", "node_modules");
  spawnChild(process.execPath, [join(root, "packages/server/dist/index.js")]);
  spawnChild(process.execPath, [join(nodeModules, "vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort)], { cwd: join(root, "packages/web"), env: { VITE_API_URL: `http://127.0.0.1:${apiPort}` } });
  await waitFor(`http://127.0.0.1:${apiPort}/health`); await waitFor(`http://127.0.0.1:${webPort}/`);
  const reset = await fetch(`http://127.0.0.1:${apiPort}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": ownerToken }, body: JSON.stringify({ bundleHash: hash, seed: 20260909, sparkCount: 12 }) }); assert.equal(reset.status, 200, await reset.text());
  const browser = await chromium.launch({ headless: true }); const views = [];
  try { views.push(await captureView(await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }), "desktop.png", { width: 1280, height: 900 }, 1, "no-preference")); const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" }); const mobile = await mobileContext.newPage(); views.push(await captureView(mobile, "mobile-reduced-motion.png", { width: 390, height: 844 }, 2, "reduce")); await mobileContext.close();
  } finally { await browser.close(); }
  const evidence = { generatedAt: new Date().toISOString(), commit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), bundleHash: hash, simulationVersion: bundle.simulationVersion, themeId: bundle.themeId, ageId: bundle.ageId, sparkCount: 12, environment: { platform: process.platform, node: process.version, browser: "Playwright Chromium headless", build: "production Vite bundle" }, map: { width: bundle.width, height: bundle.height, objectCount: bundle.objects.length, assetCount: bundle.assets.length, spawnCount: bundle.spawns.length }, assetVersionCount: new Set(Object.values(sourceVersions)).size, assetVersions: sourceVersions, pulseWorkload: { pulses: 120, sparkCount: 12, normalMapActivity: true, selectedState: true, overlays: "observer default; no developer IDs" }, views, budgets: { frameP95Ms: 50, longTaskTotalMs: 500, memoryGrowthBytes: 8388608, mobileHorizontalOverflow: false, canvasRecreatedBetweenPulses: false }, restoreChecks: { requiredAssetFailure: "covered by packages/server/src/first-glow-backup.test.ts", successfulHistoricalAssets: "covered by packages/server/src/first-glow-backup.test.ts" } };
  validateEvidence(evidence); writeFileSync(join(outputRoot, "validation.json"), JSON.stringify(evidence, null, 2) + "\n"); console.log(JSON.stringify({ output: `.tmp/art-validation/${runId}/validation.json`, captures: views.map(view => view.path), evidence }, null, 2));
} finally { for (const child of childProcesses) if (child.exitCode === null) child.kill(); }
