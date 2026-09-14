import assert from "node:assert/strict";
import { chromium } from "playwright";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const arg = name => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
const bundlePath = arg("--bundle");
if (!bundlePath) throw new Error("usage: npm run art:review -- --bundle assets/world/generated/<sha256>/world.json [--api-port 34376] [--web-port 53776]");
const bundleFile = resolve(root, bundlePath);
const bundle = JSON.parse(readFileSync(bundleFile, "utf8"));
const bundleHash = bundle.bundle?.contentHash;
if (!bundleHash) throw new Error(bundlePath + ": missing bundle.contentHash");
const check = spawnSync(process.execPath, ["scripts/art-production.mjs", "check", "--bundle", bundlePath], { cwd: root, encoding: "utf8" });
if (check.status !== 0) throw new Error(check.stderr || check.stdout);
const apiPort = Number(arg("--api-port") ?? process.env.ART_REVIEW_API_PORT ?? 34376);
const webPort = Number(arg("--web-port") ?? process.env.ART_REVIEW_WEB_PORT ?? 53776);
const outputRoot = join(root, ".tmp/art-review");
mkdirSync(outputRoot, { recursive: true });
const database = join(outputRoot, "review.db");
const ownerToken = "art-review-owner";
const node = process.execPath;
const children = [];
const nodeModules = existsSync(join(root, "node_modules")) ? join(root, "node_modules") : join(root, "..", "..", "node_modules");
const waitFor = async url => { for (let attempt = 0; attempt < 100; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch { /* starting */ } await new Promise(resolveWait => setTimeout(resolveWait, 100)); } throw new Error("review service did not start: " + url); };
const env = { ...process.env, PORT: String(apiPort), AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: ownerToken, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated"), VITE_API_URL: "http://127.0.0.1:" + apiPort };
const start = (command, args, options = {}) => { const child = spawn(command, args, { cwd: options.cwd ?? root, env: { ...env, ...(options.env ?? {}) }, stdio: "ignore" }); children.push(child); return child; };
try {
  if (!existsSync(join(root, "packages/server/dist/index.js")) || !existsSync(join(root, "packages/web/dist/index.html"))) { const build = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { cwd: root, stdio: "inherit" }); if (build.status !== 0) throw new Error("npm run build failed before art review"); }
  start(node, [join(root, "packages/server/dist/index.js")]);
  start(node, [join(nodeModules, "vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort)], { cwd: join(root, "packages/web") });
  await waitFor("http://127.0.0.1:" + apiPort + "/health");
  await waitFor("http://127.0.0.1:" + webPort + "/");
  const reset = await fetch("http://127.0.0.1:" + apiPort + "/api/owner/reset-v3", { method: "POST", headers: { "content-type": "application/json", "x-owner-token": ownerToken }, body: JSON.stringify({ bundleHash, seed: 76, sparkCount: 6 }) });
  assert.equal(reset.status, 200, await reset.text());
  const browser = await chromium.launch({ headless: true });
  const context = { bundleHash, simulationVersion: bundle.simulationVersion, themeId: bundle.themeId, ageId: bundle.ageId, capturedAt: new Date().toISOString(), gitCommit: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), browser: await browser.version(), captures: [] };
  const capture = async (page, name, settings) => {
    await page.goto("http://127.0.0.1:" + webPort + "/");
    await page.locator('main[data-theme="living-circuit"]').waitFor();
    await page.locator("#village-canvas canvas").waitFor();
    await page.getByTestId("first-glow-inspector").waitFor();
    await page.waitForTimeout(400);
    const canvas = await page.locator("#village-canvas canvas").evaluate(element => ({ width: element.width, height: element.height, displayWidth: element.getBoundingClientRect().width, displayHeight: element.getBoundingClientRect().height, zoom: element.dataset.cameraZoom }));
    const path = join(outputRoot, name);
    await page.screenshot({ path, fullPage: true });
    context.captures.push({ name, path: ".tmp/art-review/" + name, viewport: page.viewportSize(), deviceScaleFactor: settings.deviceScaleFactor, zoomMode: settings.zoomMode ?? "normal", zoom: canvas.zoom, reducedMotion: settings.reducedMotion, glow: settings.glow, canvas });
  };
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await capture(desktop, "desktop.png", { deviceScaleFactor: 1, reducedMotion: "no-preference", glow: "enabled", zoomMode: "normal" });
  for (let click = 0; click < 12; click += 1) await desktop.getByRole("button", { name: "Zoom out" }).click();
  await capture(desktop, "desktop-zoomed-out.png", { deviceScaleFactor: 1, reducedMotion: "no-preference", glow: "enabled", zoomMode: "zoomed-out" });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mobile = await mobileContext.newPage();
  await capture(mobile, "mobile.png", { deviceScaleFactor: 2, reducedMotion: "no-preference", glow: "enabled", zoomMode: "normal" });
  for (let click = 0; click < 12; click += 1) await mobile.getByRole("button", { name: "Zoom out" }).click();
  await capture(mobile, "mobile-zoomed-out.png", { deviceScaleFactor: 2, reducedMotion: "no-preference", glow: "enabled", zoomMode: "zoomed-out" });
  const noGlow = "*,*::before,*::after{animation-duration:0.001ms!important;animation-iteration-count:1!important;transition-duration:0.001ms!important;box-shadow:none!important;filter:none!important;}";
  await desktop.emulateMedia({ reducedMotion: "reduce" }); await desktop.addStyleTag({ content: noGlow });
  await capture(desktop, "desktop-reduced-motion-glow-disabled.png", { deviceScaleFactor: 1, reducedMotion: "reduce", glow: "disabled-by-review-style", zoomMode: "zoomed-out" });
  await mobile.emulateMedia({ reducedMotion: "reduce" }); await mobile.addStyleTag({ content: noGlow });
  await capture(mobile, "mobile-reduced-motion-glow-disabled.png", { deviceScaleFactor: 2, reducedMotion: "reduce", glow: "disabled-by-review-style", zoomMode: "zoomed-out" });
  await browser.close();
  writeFileSync(join(outputRoot, "review-context.json"), JSON.stringify(context, null, 2) + "\n");
  console.log(JSON.stringify({ bundleHash, captures: context.captures.map(captureInfo => captureInfo.path), context: ".tmp/art-review/review-context.json" }, null, 2));
} finally {
  for (const child of children) if (child.exitCode === null) {
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    else child.kill();
  }
  for (const suffix of ["", "-wal", "-shm"]) { const path = database + suffix; if (existsSync(path)) { try { rmSync(path, { force: true }); } catch { console.warn(`preserved busy disposable artifact: ${path}`); } } }
}
