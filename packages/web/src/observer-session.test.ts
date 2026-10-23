import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { createObserverFetch, startObserverStream } from "./observer-session.js";
import { chromium } from "playwright";
import { createServer } from "vite";

// Synthetic credentials and a read-only authority: no Firebase or cloud mutations.
let active = 0, maximum = 0, requests = 0, rejected = 0, writes = 0;
let mode: "open" | "eof" | "disconnect" = "open";
// Concurrent 401s share one refresh, and rejected tokens cannot loop forever.
let forced = 0;
const rejectedFetch = createObserverFetch(async force => {
  if (force) { forced++; await new Promise(resolve => setTimeout(resolve, 10)); }
  return "fixture";
}, async () => new Response(null, { status: 401 }));
const denied = await Promise.all([rejectedFetch("http://fixture/one"), rejectedFetch("http://fixture/two")]);
assert.equal(forced, 1); assert.ok(denied.every(response => response.status === 401));
let sent = 0;
let release!: (value: string) => void;
const pending = new Promise<string>(resolve => { release = resolve; });
const aborted = new AbortController();
const delayedFetch = createObserverFetch(() => pending, async () => { sent++; return new Response(); });
const result = delayedFetch("http://fixture", { signal: aborted.signal });
aborted.abort(); release("fixture");
await assert.rejects(result, { name: "AbortError" }); assert.equal(sent, 0);
let failures = 0;
const failedRefresh = createObserverFetch(async force => { if (force) throw new Error("refresh unavailable"); return "expired"; }, async () => new Response(null, { status: 401 }));
const failing = startObserverStream({ url: "http://fixture", request: failedRefresh, onMessage: () => assert.fail("private response reached observer"), onDisconnected: () => { failures++; }, retryMs: 5 });
await new Promise(resolve => setTimeout(resolve, 40)); failing.stop();
assert.ok(failures > 1);
const stoppedFailures = failures;
await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(failures, stoppedFailures);
const sockets = new Set<import("node:http").ServerResponse>();
const authority = createHttpServer((req, res) => {
  requests++;
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization");
  if (req.method === "OPTIONS") { res.end(); return; }
  if (req.method !== "GET") { writes++; res.writeHead(405).end(); return; }
  if (req.headers.authorization !== "Bearer fresh-fixture") { rejected++; res.writeHead(401).end(); return; }
  res.writeHead(200, { "content-type": "text/event-stream" });
  active++; maximum = Math.max(maximum, active); sockets.add(res);
  res.on("close", () => { active--; sockets.delete(res); });
  res.write('data: {"id":"committed-64","pulse":64}\r\n\r\n');
  if (mode === "eof") { mode = "open"; res.end(); }
  else if (mode === "disconnect") { mode = "open"; setTimeout(() => res.destroy(), 20); }
});
await new Promise<void>(resolve => authority.listen(0, "127.0.0.1", resolve));
const port = (authority.address() as import("node:net").AddressInfo).port;
const vite = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error", plugins: [{ name: "session-test-page", configureServer(server) { server.middlewares.use("/session-test", (_req, res) => { res.setHeader("content-type", "text/html"); res.end("<html><body>Observer session test</body></html>"); }); } }] });
await vite.listen();
const origin = vite.resolvedUrls!.local[0];
const browser = await chromium.launch({ headless: true });
const until = async (predicate: () => boolean) => {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
  assert.ok(predicate(), "stream resource did not settle within 2.5 seconds");
};
try {
  const page = await browser.newPage();
  await page.addInitScript("window.__name = (value) => value");
  await page.goto(`${origin}session-test`);
  await page.evaluate(async (url) => {
    const { createObserverFetch, startObserverStream } = await import(/* @vite-ignore */ String("/src/observer-session.ts"));
    const state = { token: "expired-fixture", refreshes: 0, connections: 0, messages: new Map() };
    const request = createObserverFetch(async (force: boolean) => {
      if (force) { state.refreshes++; state.token = "fresh-fixture"; }
      return state.token;
    });
    const stream = startObserverStream({ url, request, retryMs: 30,
      onConnected: () => state.connections++,
      onMessage: (data: string) => { const event = JSON.parse(data); state.messages.set(event.id, event); },
    });
    window.addEventListener("pagehide", stream.stop);
    Object.assign(window, { sessionTest: { state, stream, request } });
  }, `http://127.0.0.1:${port}/api/live`);
  const snapshot = () => page.evaluate(() => {
    const { state } = (window as any).sessionTest;
    return { ...state, messages: [...state.messages.values()] };
  });
  await until(() => active === 1);
  assert.equal((await snapshot()).refreshes, 1);
  assert.equal(rejected, 1);
  // A clean end must reconnect, rather than silently freezing the live observer.
  mode = "eof";
  for (const res of sockets) res.end();
  await page.waitForFunction(() => (window as any).sessionTest.state.connections >= 3);
  // Abrupt network loss must also reconnect.
  mode = "disconnect";
  for (const res of sockets) res.destroy();
  await page.waitForFunction(() => (window as any).sessionTest.state.connections >= 5);
  // A refreshed token rotates the in-flight request without replacing observer state.
  await page.evaluate(() => (window as any).sessionTest.stream.refresh());
  await page.waitForFunction(() => (window as any).sessionTest.state.connections >= 6);
  const state = await snapshot();
  assert.deepEqual(state.messages, [{ id: "committed-64", pulse: 64 }]);
  assert.equal(state.refreshes, 1); assert.equal(writes, 0);
  await page.close(); await until(() => active === 0);
  const settled = requests;
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(requests, settled, "closed tab must not reconnect");
  assert.equal(maximum, 1, "refresh/reconnect must not overlap upstream streams");
  console.log("Observer browser session passed: expiration, forced refresh, clean EOF, disconnect, rotation, deduplication and tab-close cleanup");
} finally {
  await browser.close();
  for (const res of sockets) res.destroy();
  await vite.close();
  await new Promise<void>(resolve => authority.close(() => resolve()));
}
