import { testPort, stopTestProcesses } from "../../../scripts/test-runtime.mjs";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(process.cwd(), "..", "..");
const apiPort = await testPort();
const webPort = await testPort();
const hash = "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e";
const tempRoot = join(root, ".tmp", "browser-tests");
mkdirSync(tempRoot, { recursive: true });
const database = join(tempRoot, `observer-zoom-${Date.now()}.db`);
const children: ChildProcess[] = [];
const waitFor = async (url: string) => { for (let attempt = 0; attempt < 60; attempt += 1) { try { if ((await fetch(url)).ok) return; } catch { /* starting */ } await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`service did not start: ${url}`); };
try {
  const env = { ...process.env, PORT: String(apiPort), AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", DATABASE_PATH: database, OWNER_TOKEN: "browser-header", WORLD_BUNDLE_ROOT: join(root, "assets", "world", "generated") };
  children.push(spawn(process.execPath, [join(root, "packages", "server", "dist", "index.js")], { cwd: root, env, stdio: "ignore" }));
  children.push(spawn(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { cwd: join(root, "packages", "web"), env: { ...env, VITE_LIVE_API_URL: `http://127.0.0.1:${apiPort}` }, stdio: "ignore" }));
  await waitFor(`http://127.0.0.1:${apiPort}/health`); await waitFor(`http://127.0.0.1:${webPort}/`);
  const reset = await fetch(`http://127.0.0.1:${apiPort}/api/owner/reset-v3`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "browser-header" }, body: JSON.stringify({ bundleHash: hash, seed: 23 }) }); assert.equal(reset.status, 200);
  const browser = await chromium.launch({ headless: true });
  try {
    // Test-only auth adapter: exercise the signed-in observer without real accounts/cloud access.
    for (const width of [390, 375, 320, 800, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const apiRequests: Array<{ method: string; path: string; authorization: string | undefined }> = [];
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.port === String(apiPort)) apiRequests.push({ method: request.method(), path: url.pathname, authorization: request.headers().authorization });
      });
      await page.route('**/src/firebase-auth.ts', route => route.fulfill({ contentType: 'text/javascript', body: `
        export const hostedAuthEnabled = true;
        export const observeAuth = callback => { callback({ email: '' }); return () => {}; };
        export const getGoogleIdToken = async () => 'local-test-token';
        export const signInWithGoogle = async () => {};
        export const signOutGoogle = async () => {};
        export const readFirebaseBytes = async () => { throw new Error('Cloud access forbidden in local layout test'); };
      ` }));
      await page.goto(`http://127.0.0.1:${webPort}/`);
      const controls = page.locator('.observer-control-area');
      await controls.waitFor();
      const canvas = page.locator('#village-canvas canvas');
      await page.waitForFunction(() => Boolean(document.querySelector('#village-canvas canvas')?.getAttribute('data-camera-zoom')));
      const bounds = await controls.evaluate(panel => {
        const rect = panel.getBoundingClientRect();
        return { panel: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
          viewport: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          buttons: [...panel.querySelectorAll('.observer-zoom-controls button')].map(button => {
            const r = button.getBoundingClientRect();
            return { name: button.getAttribute('aria-label'), left: r.left, right: r.right, top: r.top, bottom: r.bottom,
              reachable: button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
          }) };
      });
      console.log(JSON.stringify({ width, ...bounds }));
      assert.equal(bounds.overflow, false, `document overflow at ${width}`);
      assert.equal(bounds.buttons.length, 3);
      for (const button of bounds.buttons) {
        assert.ok(button.left >= bounds.panel.left && button.right <= bounds.panel.right, `${button.name} outside panel at ${width}`);
        assert.ok(button.top >= bounds.panel.top && button.bottom <= bounds.panel.bottom, `${button.name} outside panel vertically at ${width}`);
        assert.ok(button.left >= 0 && button.right <= bounds.viewport, `${button.name} clipped at ${width}`);
        assert.ok(button.reachable, `${button.name} obscured at ${width}`);
      }
      const zoom = async () => Number(await canvas.getAttribute('data-camera-zoom'));
      const initialZoom = await zoom();
      await controls.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await page.waitForFunction(previous => Number(document.querySelector('#village-canvas canvas')?.getAttribute('data-camera-zoom')) > previous, initialZoom);
      await controls.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await page.waitForFunction(previous => Number(document.querySelector('#village-canvas canvas')?.getAttribute('data-camera-zoom')) === previous, initialZoom);
      await controls.getByRole('button', { name: 'Zoom in', exact: true }).click();
      await page.waitForFunction(previous => Number(document.querySelector('#village-canvas canvas')?.getAttribute('data-camera-zoom')) > previous, initialZoom);
      await controls.getByRole('button', { name: 'Fit map', exact: true }).click();
      await page.waitForFunction(previous => Number(document.querySelector('#village-canvas canvas')?.getAttribute('data-camera-zoom')) === previous, initialZoom);
      assert.equal(await page.getByRole('button', { name: 'Advance one pulse', exact: true }).count(), 0);
      assert.ok(apiRequests.some(request => request.path === '/api/world' && request.authorization === 'Bearer local-test-token'));
      assert.ok(apiRequests.every(request => request.method === 'GET' && !request.path.startsWith('/api/owner')), 'observer controls remain read-only');
      const evidence = process.env.OBSERVER_ZOOM_EVIDENCE_DIR ?? tempRoot;
      mkdirSync(evidence, { recursive: true });
      await page.screenshot({ path: join(evidence, `observer-p6-${width}-2026-10-04.png`) });
      await page.close();
    }
    console.log('Observer zoom bounds and interaction checks passed');
  } finally { await browser.close(); }
} finally {
  await stopTestProcesses(children);
  for (const path of [database, `${database}-wal`, `${database}-shm`]) if (existsSync(path)) rmSync(path, { force: true });
}
