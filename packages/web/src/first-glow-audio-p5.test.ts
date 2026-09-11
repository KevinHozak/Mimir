import assert from "node:assert/strict";
import { chromium } from "playwright";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const nodeModules = existsSync(join(root, "node_modules")) ? join(root, "node_modules") : join(root, "..", "..", "node_modules");
const apiPort = 34212;
const webPort = 5189;
const token = "audio-p5-browser";
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const tempRoot = join(root, ".tmp", "browser-tests");
mkdirSync(tempRoot, { recursive: true });
const database = join(tempRoot, `first-glow-audio-p5-${Date.now()}.db`);
const evidence = join(root, "docs", "evidence");
mkdirSync(evidence, { recursive: true });
const children: ChildProcess[] = [];
const waitFor = async (url: string) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`service did not start: ${url}`);
};

try {
  const env = { ...process.env, PORT: String(apiPort), AUTO_TICK: "false", TICK_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: token, WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") };
  children.push(spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env, stdio: "ignore" }));
  children.push(spawn(process.execPath, [join(nodeModules, "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort)], { cwd: join(root, "packages", "web"), env: { ...env, VITE_API_URL: `http://127.0.0.1:${apiPort}` }, stdio: "ignore" }));
  await waitFor(`http://127.0.0.1:${apiPort}/health`);
  await waitFor(`http://127.0.0.1:${webPort}/`);
  const reset = await fetch(`http://127.0.0.1:${apiPort}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": token }, body: JSON.stringify({ bundleHash: hash, seed: 23, sparkCount: 6 }) });
  assert.equal(reset.status, 200);

  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const audioRequests: string[] = [];
    desktop.on("request", request => { if (request.url().includes("/audio/first-glow/")) audioRequests.push(new URL(request.url()).pathname); });
    await desktop.goto(`http://127.0.0.1:${webPort}/`);
    await desktop.locator('main[data-theme="living-circuit"]').waitFor();
    await desktop.getByTestId("first-glow-audio-controls").locator("summary").click();
    assert.equal(await desktop.getByRole("button", { name: "Enable audio" }).count(), 1);
    assert.match(await desktop.getByRole("status").first().innerText(), /Silent until/);
    assert.equal(audioRequests.length, 0, "audio must remain opt-in before a user gesture");
    await desktop.getByRole("button", { name: "Enable audio" }).click();
    await desktop.getByRole("button", { name: "Disable audio" }).waitFor();
    await desktop.getByRole("checkbox", { name: "Enable ambience" }).uncheck();
    await desktop.getByRole("checkbox", { name: "Enable ambient score" }).check();
    await desktop.locator("#audio-effects").fill("25");
    await desktop.waitForTimeout(400);
    assert.ok(audioRequests.length >= 17, `enabled audio should request the music and effect library, got ${audioRequests.length}`);
    assert.equal(new Set(audioRequests).size, 17, "each shipped audio asset should be loaded once");
    await desktop.screenshot({ path: join(evidence, "first-glow-audio-p5-desktop.png"), fullPage: true });

    await desktop.reload();
    await desktop.getByTestId("first-glow-audio-controls").locator("summary").click();
    assert.match(await desktop.getByRole("status").first().innerText(), /preference restored/);
    assert.equal(await desktop.getByRole("checkbox", { name: "Enable ambience" }).isChecked(), false);
    assert.equal(await desktop.getByRole("checkbox", { name: "Enable ambient score" }).isChecked(), true);
    assert.equal(await desktop.locator("#audio-effects").inputValue(), "25");
    await desktop.getByRole("checkbox", { name: "Mute all audio" }).check();
    const beforeEvents = await desktop.getByTestId("objective-events").innerText();
    const tick = await fetch(`http://127.0.0.1:${apiPort}/api/tick`, { method: "POST", headers: { "x-owner-token": token } });
    assert.equal(tick.status, 200);
    await desktop.waitForTimeout(300);
    const afterEvents = await desktop.getByTestId("objective-events").innerText();
    assert.notEqual(afterEvents, beforeEvents, "muting audio must not hide committed events");
    const requestsAfterTick = audioRequests.length;
    await desktop.locator("#timeline").evaluate((element) => { const input = element as HTMLInputElement; input.value = "0"; input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); });
    await desktop.waitForTimeout(250);
    assert.equal(audioRequests.length, requestsAfterTick, "history navigation must not load or replay audio assets");

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const mobile = await mobileContext.newPage();
    await mobile.goto(`http://127.0.0.1:${webPort}/`);
    await mobile.locator('main[data-theme="living-circuit"]').waitFor();
    await mobile.locator("#village-canvas").waitFor();
    assert.equal(await mobile.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches), true);
    const overflow = await mobile.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    assert.ok(overflow.width <= overflow.viewport + 1, `reduced-motion mobile layout overflowed: ${JSON.stringify(overflow)}`);
    await mobile.getByTestId("first-glow-audio-controls").locator("summary").click();
    assert.equal(await mobile.getByRole("button", { name: "Enable audio" }).count(), 1);
    await mobile.screenshot({ path: join(evidence, "first-glow-audio-p5-mobile.png"), fullPage: true });
    await mobileContext.close();
    console.log("First Glow Audio-P5 browser validation passed");
  } finally { await browser.close(); }
} finally {
  await Promise.all(children.map(child => new Promise<void>(resolve => { if (child.exitCode !== null) { resolve(); return; } child.once("exit", () => resolve()); child.kill(); setTimeout(resolve, 3000); })));
  for (const path of [database, `${database}-wal`, `${database}-shm`]) if (existsSync(path)) rmSync(path, { force: true });
}
