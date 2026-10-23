import { testPort, stopTestProcesses } from "../../../scripts/test-runtime.mjs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", ".."); const apiPort = await testPort(); const webPort = await testPort(); const hash = "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601"; const database = join(root, ".tmp", "browser-tests", `history-viewer-${Date.now()}.db`); mkdirSync(join(root, ".tmp", "browser-tests"), { recursive: true }); const children: ChildProcess[] = [];
let startupOutput = "";
const start = (args: string[], cwd: string, env: NodeJS.ProcessEnv) => {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const capture = (chunk: Buffer) => { startupOutput = (startupOutput + chunk.toString()).slice(-6000); };
  child.stdout?.on("data", capture); child.stderr?.on("data", capture);
  child.on("error", error => capture(Buffer.from(error.message)));
  children.push(child);
};
const waitFor = async (url: string) => { for (let attempt = 0; attempt < 60; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`service did not start: ${url}\n${startupOutput}`); };
try {
  const env = { ...process.env, HOST: "127.0.0.1", AI_ENABLED: "false", PUBLIC_OBSERVER_AUTH_REQUIRED: "false", MIMIR_HOSTED: "false", PORT: String(apiPort), AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: "history-viewer", WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated"), OBSERVER_ORIGIN: `http://127.0.0.1:${webPort}` };
  start([join(root, "packages", "server", "dist", "index.js")], root, env); start([join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], join(root, "packages", "web"), { ...env, VITE_API_URL: `http://127.0.0.1:${apiPort}` }); await waitFor(`http://127.0.0.1:${apiPort}/health`); await waitFor(`http://127.0.0.1:${webPort}/`);
  assert.equal((await fetch(`http://127.0.0.1:${apiPort}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": env.OWNER_TOKEN }, body: JSON.stringify({ bundleHash: hash, seed: 39 }) })).status, 200); assert.equal((await fetch(`http://127.0.0.1:${apiPort}/api/pulse`, { method: "POST", headers: { "x-owner-token": env.OWNER_TOKEN } })).status, 200);
  const assertDarkOuterPage = async (page: import("playwright").Page, view: string) => {
    const pageStyle = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { background: style.backgroundColor, colorScheme: style.colorScheme, contentLeft: document.querySelector("main")!.getBoundingClientRect().left };
    });
    assert.ok(pageStyle.contentLeft > 0, `${view} must expose outer desktop margins for this regression check`);
    assert.equal(pageStyle.background, "rgb(5, 9, 18)", `${view} outer margins must match the near-black observer background`);
    assert.equal(pageStyle.colorScheme, "dark", `${view} must use dark native controls and scrollbars`);
  };
  const browser = await chromium.launch({ headless: true }); try { const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); await page.goto(`http://127.0.0.1:${webPort}/?view=history`); await page.getByTestId("history-viewer").waitFor(); await page.getByTestId("chronicle-reader").waitFor(); await assertDarkOuterPage(page, "Chronicle"); assert.ok((await page.getByText("Selected historical state").count()) === 1); assert.ok((await page.getByText("recorded outcomes and readings only").count()) === 1); assert.ok((await page.getByText("Simulation").count()) === 1); assert.ok((await page.getByText(/Pulse 1/).count()) >= 1); assert.ok((await page.getByText("Return to live observer").count()) === 1); await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.activeElement instanceof HTMLElement)); await page.setViewportSize({ width: 390, height: 844 }); assert.ok(await page.getByTestId("chronicle-reader").isVisible()); await page.setViewportSize({ width: 1440, height: 900 }); const live = await page.goto(`http://127.0.0.1:${webPort}/`); assert.ok(live); await page.locator(".history-entry-float").waitFor(); await page.locator("main.first-glow").waitFor(); await assertDarkOuterPage(page, "Live First Glow"); console.log("Dedicated First Glow history viewer browser test passed"); } finally { await browser.close(); }
} finally { await stopTestProcesses(children); for (const path of [database, `${database}-wal`, `${database}-shm`]) if (existsSync(path)) rmSync(path, { force: true }); }
