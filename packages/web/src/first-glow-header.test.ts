import { testPort, stopTestProcesses } from "../../../scripts/test-runtime.mjs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const apiPort = await testPort();
const webPort = await testPort();
const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601";
const tempRoot = join(root, ".tmp", "browser-tests");
mkdirSync(tempRoot, { recursive: true });
const database = join(tempRoot, `first-glow-header-${Date.now()}.db`);
const children: ChildProcess[] = [];
const waitFor = async (url: string) => { for (let attempt = 0; attempt < 60; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`service did not start: ${url}`); };
try {
  const env = { ...process.env, PORT: String(apiPort), AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: "browser-header", WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") };
  children.push(spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env, stdio: "ignore" }));
  children.push(spawn(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { cwd: join(root, "packages", "web"), env: { ...env, VITE_API_URL: `http://127.0.0.1:${apiPort}` }, stdio: "ignore" }));
  await waitFor(`http://127.0.0.1:${apiPort}/health`); await waitFor(`http://127.0.0.1:${webPort}/`);
  const reset = await fetch(`http://127.0.0.1:${apiPort}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "browser-header" }, body: JSON.stringify({ bundleHash: hash, seed: 23 }) }); assert.equal(reset.status, 200);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); await page.goto(`http://127.0.0.1:${webPort}/`); const header = page.locator(".first-glow-header"); await header.waitFor(); assert.equal(await header.getByRole("heading", { name: "Mimir" }).count(), 1); assert.equal(await header.getByText("A Light of Our Own", { exact: true }).count(), 1); assert.equal(await header.getByText("Season 0", { exact: true }).count(), 1); assert.equal(await header.getByText("The First Glow", { exact: true }).count(), 1); assert.equal(await header.getByRole("img", { name: "Mimir light mark" }).count(), 1); assert.equal(await header.getByText("Living Circuit", { exact: true }).count(), 0); assert.equal(await header.locator(".identity-panel").count(), 2); assert.equal(await header.locator(".identity-title-panel").getByRole("heading", { name: "Mimir" }).count(), 1); assert.match(await header.locator(".season-stats").innerText(), /Pulse \d+\n\d+ Sparks\n\d+ sites/i);
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } }); await mobile.goto(`http://127.0.0.1:${webPort}/`); const mobileHeader = mobile.locator(".first-glow-header"); await mobileHeader.waitFor(); const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); assert.equal(overflow, false); assert.equal(await mobileHeader.locator(".identity-panel").count(), 2);
    console.log("First Glow header desktop and mobile test passed");
  } finally { await browser.close(); }
} finally {
  await stopTestProcesses(children);
  for (const path of [database, `${database}-wal`, `${database}-shm`]) if (existsSync(path)) rmSync(path, { force: true });
}
