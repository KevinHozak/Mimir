import assert from "node:assert/strict";
import { fork, spawn, execFileSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type Page } from "playwright";
import { testPort, stopTestProcesses } from "../../../scripts/test-runtime.mjs";

const root = resolve("../..");
const directory = mkdtempSync(join(root, ".tmp", "observer-outage-"));
const database = join(directory, "world.db");
const archiveRoot = join(directory, "export");
const apiPort = await testPort(), bridgePort = await testPort(), webPort = await testPort();
const apiOrigin = `http://127.0.0.1:${apiPort}`, bridgeOrigin = `http://127.0.0.1:${bridgePort}`, webOrigin = `http://127.0.0.1:${webPort}`;
const children: ChildProcess[] = [];
const telemetry: Array<{ event: string; processSession: string; activeRequests: number; activeUpstreamStreams: number }> = [];
const until = async (predicate: () => boolean | Promise<boolean>, label: string) => {
  for (let i = 0; i < 150; i++) { if (await predicate()) return; await delay(100); }
  throw new Error(`Timed out: ${label}`);
};
const ready = (origin: string) => until(async () => { try { return (await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; } }, "backend ready");
const startBackend = async () => {
  const child = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], {
    cwd: root, stdio: "ignore", env: { ...process.env, PORT: String(apiPort), DATABASE_PATH: database, AUTO_PULSE: "false", OWNER_TOKEN: "outage-owner-fixture", WORLD_BUNDLE_ROOT: join(root, "assets/world/generated") },
  });
  children.push(child); await ready(apiOrigin); return child;
};
const startBridge = async () => {
  const child = fork(join(root, "scripts/observer-bridge-fault-fixture.mjs"), [String(bridgePort), apiOrigin, webOrigin], { cwd: root, stdio: ["ignore", "ignore", "inherit", "ipc"] });
  children.push(child);
  await new Promise<void>((resolveReady, reject) => {
    const timeout = setTimeout(() => reject(new Error("bridge fixture startup timeout")), 30000);
    child.once("error", reject);
    child.on("message", (record: any) => { telemetry.push(record); if (record.event === "ready") { clearTimeout(timeout); resolveReady(); } });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`bridge exited: ${code}`)); });
  });
  return child;
};
const owner = async (path: string, body = {}) => {
  const response = await fetch(`${apiOrigin}${path}`, { method: "POST", headers: { "content-type": "application/json", "x-owner-token": "outage-owner-fixture" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); return response.json();
};
let tamper = false, storageReads = 0;
const storage = createServer((request, response) => {
  response.setHeader("access-control-allow-origin", webOrigin);
  response.setHeader("access-control-allow-headers", "authorization");
  if (request.method === "OPTIONS") return response.writeHead(204).end();
  if (request.headers.authorization !== "Bearer outage-fixture") return response.writeHead(401).end('{"error":"approved observer required"}');
  if (request.method !== "GET") return response.writeHead(405).end();
  const path = resolve(archiveRoot, decodeURIComponent(new URL(request.url!, "http://fixture").pathname).replace(/^\/archives\//, ""));
  if (!path.startsWith(archiveRoot + sep)) return response.writeHead(404).end();
  try {
    const bytes = readFileSync(path); storageReads++;
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(tamper && path.includes(`${sep}chunks${sep}`) ? Buffer.from("{}") : bytes);
  } catch { response.writeHead(404).end(); }
});
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  console.log("Preparing isolated archived backend");
  let backend = await startBackend();
  const initial = await owner("/api/owner/reset-v3", { bundleHash: "sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601", seed: 9, sparkCount: 6 });
  await owner("/api/pulse"); await owner("/api/pulse"); await owner("/api/owner/archive");
  const before = await (await fetch(`${apiOrigin}/api/world`)).json();
  execFileSync(process.execPath, [join(root, "scripts/export-public-archive.mjs"), database, archiveRoot, "--timeline", initial.state.worldId, "--pulses", "0,1,2", "--source-backup", "isolated-outage-fixture"], { cwd: root, stdio: "pipe" });
  storage.listen(0, "127.0.0.1"); await once(storage, "listening");
  const storageOrigin = `http://127.0.0.1:${(storage.address() as import("node:net").AddressInfo).port}`;
  const vite = spawn(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { cwd: join(root, "packages/web"), stdio: "ignore", env: { ...process.env, VITE_LIVE_API_URL: bridgeOrigin } });
  children.push(vite);
  await until(async () => { try { return (await fetch(webOrigin)).ok; } catch { return false; } }, "web ready");
  let bridge = await startBridge();
  browser = await chromium.launch({ headless: true });
  const prepare = async (page: Page, signedIn = true) => {
    await page.route("**/src/firebase-auth.ts", route => route.fulfill({ contentType: "text/javascript", body: `
      export const hostedAuthEnabled = true;
      export const observeAuth = callback => { callback(${signedIn ? "{ email: '' }" : "null"}); return () => {}; };
      export const observeTokenRefresh = () => () => {};
      export const getGoogleIdToken = async () => 'outage-fixture';
      export const signInWithGoogle = async () => {};
      export const signOutGoogle = async () => {};
      export const readFirebaseBytes = async path => {
        const response = await fetch(${JSON.stringify(storageOrigin)} + '/' + path, { headers: { authorization: 'Bearer outage-fixture' } });
        if (!response.ok) throw new Error('protected archive unavailable');
        return new Uint8Array(await response.arrayBuffer());
      };
    ` }));
  };
  const live = await browser.newPage(); await prepare(live);
  const errors: string[] = []; live.on("pageerror", error => errors.push(error.message));
  await live.goto(webOrigin); await live.locator(".observer-control-area").waitFor();
  const outcomes = await live.getByTestId("objective-events").innerText();
  await live.getByTestId("reflection-observer").waitFor();
  assert.match(await live.getByTestId("reflection-observer").innerText(), /Runtime[\s\S]*calls[\s\S]*cost/);
  const controls = live.locator(".observer-control-area");
  const initialZoom = await live.locator("#village-canvas canvas").getAttribute("data-camera-zoom");
  await controls.getByRole("button", { name: "Zoom in", exact: true }).click();
  await live.waitForFunction(previous => document.querySelector("#village-canvas canvas")?.getAttribute("data-camera-zoom") !== previous, initialZoom);
  const zoom = await live.locator("#village-canvas canvas").getAttribute("data-camera-zoom");
  const sessionBefore = telemetry.find(record => record.event === "ready")!.processSession;
  console.log("Checking bridge process crash and reconnect");
  const exit = once(bridge, "exit"); bridge.kill("SIGKILL"); await exit;
  await live.getByTestId("first-glow-refresh-error").waitFor();
  bridge = await startBridge();
  await until(() => telemetry.some(record => record.event === "stream-open" && record.processSession !== sessionBefore), "reconnect after bridge process restart");
  await live.getByTestId("first-glow-refresh-error").waitFor({ state: "hidden" });
  assert.equal(await live.getByTestId("objective-events").innerText(), outcomes);
  assert.equal(await live.locator("#village-canvas canvas").getAttribute("data-camera-zoom"), zoom);
  const ids = await live.getByTestId("objective-events").locator("p[id]").evaluateAll(nodes => nodes.map(node => node.id));
  assert.equal(new Set(ids).size, ids.length);
  // Stop the actual isolated backend; do not merely inject a canned 503.
  console.log("Checking stopped backend and cold protected archive replay");
  await stopTestProcesses([backend]);
  await live.getByTestId("first-glow-refresh-error").waitFor();
  assert.equal(await live.getByTestId("objective-events").innerText(), outcomes);
  const unavailable = await fetch(`${bridgeOrigin}/api/world`, { headers: { authorization: "Bearer outage-fixture" }, signal: AbortSignal.timeout(5000) });
  assert.equal(unavailable.status, 502); assert.deepEqual(await unavailable.json(), { error: "observer upstream unavailable" });
  const denied = await fetch(`${bridgeOrigin}/api/world`); assert.equal(denied.status, 401);
  assert.deepEqual(await denied.json(), { error: "approved Google account required" });

  const sessionCount = new Set(telemetry.map(record => record.processSession)).size;
  assert.equal(sessionCount, 2);
  // New contexts and no-store storage responses prevent cached success masking the outage.
  for (const width of [1280, 390]) {
    const archive = await browser.newPage({ viewport: { width, height: 844 } }); await prepare(archive);
    archive.on("pageerror", error => errors.push(error.message));
    let backendRequests = 0;
    const backendPaths: string[] = [];
    await archive.route("**/api/**", route => { backendRequests++; backendPaths.push(new URL(route.request().url()).pathname); return route.abort(); });
    await archive.goto(`${webOrigin}/?view=history`);
    const viewer = archive.getByTestId("hosted-archive-viewer"); await viewer.waitFor();
    await viewer.getByRole("combobox").first().selectOption(initial.state.worldId);
    await archive.getByRole("heading", { name: "Verified local replay" }).waitFor();
    await archive.waitForFunction(() => document.querySelector(".history-identity")?.textContent?.includes("Pulse 2"));
    await archive.locator("#village-canvas canvas").waitFor();
    await viewer.getByRole("button", { name: "Previous", exact: true }).click();
    await archive.waitForFunction(() => document.querySelector(".history-identity")?.textContent?.includes("Pulse 1"));
    assert.equal(backendRequests, 0, `archive contacted backend: ${backendPaths.join(", ")}`);
    tamper = true;
    await viewer.getByRole("button", { name: "Previous", exact: true }).click();
    await archive.getByRole("alert").waitFor();
    assert.match(await archive.getByRole("alert").innerText(), /checksum or schema/);
    assert.equal(await archive.getByRole("heading", { name: "Verified local replay" }).count(), 0);
    tamper = false; await archive.close();
  }
  const deniedArchive = await fetch(`${storageOrigin}/archives/catalog.json`);
  assert.equal(deniedArchive.status, 401); assert.equal(await deniedArchive.text(), '{"error":"approved observer required"}');
  const anonymous = await browser.newPage(); await prepare(anonymous, false);
  const readsBefore = storageReads;
  await anonymous.goto(`${webOrigin}/?view=history`);
  await anonymous.getByRole("button", { name: "Sign in with Google" }).waitFor();
  assert.equal(storageReads, readsBefore); await anonymous.close();
  console.log("Checking exact paused backend recovery");
  backend = await startBackend();
  const after = await (await fetch(`${apiOrigin}/api/world`)).json();
  assert.equal(digest(after.state), digest(before.state)); assert.equal(after.schedulerPaused, true);
  const recovered = await fetch(`${bridgeOrigin}/api/world`, { headers: { authorization: "Bearer outage-fixture" } });
  assert.equal(recovered.status, 200); assert.equal(digest((await recovered.json()).state), digest(before.state));
  await live.getByTestId("first-glow-refresh-error").waitFor({ state: "hidden" });
  assert.equal(await live.getByTestId("objective-events").innerText(), outcomes);
  assert.equal(await live.locator("#village-canvas canvas").getAttribute("data-camera-zoom"), zoom);
  await live.close();
  await until(() => { const last = telemetry.at(-1); return last?.activeRequests === 0 && last.activeUpstreamStreams === 0; }, "bridge resource cleanup");
  assert.deepEqual(errors, []);
  assert.doesNotMatch(JSON.stringify(telemetry), /outage-fixture|authorization|owner|Bearer|http:|email/i);
  assert.ok(telemetry.every(record => record.activeRequests >= 0 && record.activeRequests <= 2 && record.activeUpstreamStreams >= 0 && record.activeUpstreamStreams <= 2));
  console.log("Observer outage passed: bridge process crash/restart, retained state, backend loss, cold authenticated archive replay on desktop/mobile, denied/corrupt archive rejection, zero backend replay requests, exact paused recovery");
} finally {
  await browser?.close();
  await stopTestProcesses(children);
  storage.closeAllConnections(); await new Promise<void>(resolveClosed => storage.close(() => resolveClosed()));
}
