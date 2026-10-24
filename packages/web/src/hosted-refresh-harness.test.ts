import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { chromium } from "playwright";
import { createServer as createViteServer } from "vite";
import { assertRefreshAdmission, createRefreshHarness, type RefreshAdmission } from "./hosted-refresh-harness.js";

const admission = (now = Date.now()): RefreshAdmission => ({ approved: true, origin: "https://mimir-realm.web.app", checkedAt: now, validUntil: now + 180000,
  existingObservers: 0, cumulativeCeilingUsd: 0.15, retainedAllocationUsd: 0.1469663581, additionalUpperUsd: 0.001,
  costVerified: true, deployedCodeVerified: true, directTelemetryVerified: true, recoveryBaselineVerified: true });
function fixture() {
  let now = 1000000, disposed = 0, calls = 0, forced = 0, notify = () => {};
  const timers = new Map<number, { at: number; fn: () => void }>(); let id = 0;
  const adapter = { capture: async () => ({ token: "synthetic-original", expiresAt: 999000 }),
    getToken: async (force = false) => { if (force) forced++; return "synthetic-new"; },
    observe: (fn: () => void) => { notify = fn; return () => { notify = () => {}; }; }, dispose: async () => { disposed++; } };
  const c = { wall: () => now, mono: () => now, later(fn: () => void, ms: number) { const key = ++id; timers.set(key, { at: now + ms, fn }); return key as unknown as ReturnType<typeof setTimeout>; },
    cancel(key: ReturnType<typeof setTimeout>) { timers.delete(key as unknown as number); } };
  const request: typeof fetch = async (url, init) => { calls++;
    if (String(url).endsWith("/api/live")) return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"id":"fixture"}\n\n')); } }));
    return new Response(new Headers(init?.headers).get("authorization") === "Bearer synthetic-original" ? '{"error":"approved Google account required"}' : "{}", { status: new Headers(init?.headers).get("authorization") === "Bearer synthetic-original" ? 401 : 200 }); };
  return { adapter, c, request, notify: () => notify(), advance(ms: number) { now += ms; for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); } },
    counts: () => ({ disposed, calls, forced }), now: () => now };
}
test("admission rejects missing approval, stale evidence, nonfinite costs, wrong origin and ceiling changes", () => {
  const now = Date.now(); assert.doesNotThrow(() => assertRefreshAdmission(admission(now), now));
  for (const patch of [{ approved: false }, { costVerified: false }, { directTelemetryVerified: false }, { recoveryBaselineVerified: false }, { deployedCodeVerified: false }, { checkedAt: now - 300001 }, { validUntil: now }, { additionalUpperUsd: NaN }, { additionalUpperUsd: -1 }, { additionalUpperUsd: 0.004 }, { retainedAllocationUsd: 0 }, { cumulativeCeilingUsd: 0.16 }, { existingObservers: 2 }, { existingObservers: 0.5 }, { origin: "https://other.invalid" }]) {
    assert.throws(() => assertRefreshAdmission({ ...admission(now), ...patch }, now));
  }
});
test("preparation makes zero observer requests, expires once and never exposes credentials", async () => {
  const f = fixture(), h = createRefreshHarness(f.adapter, { clock: f.c, request: f.request, preparationMs: 100 });
  await h.prepare(); assert.equal(f.counts().calls, 0); assert.ok(!JSON.stringify(h.report()).includes("synthetic-original"));
  f.advance(101); await h.close(); await h.close(); assert.equal(f.counts().disposed, 1);
  await assert.rejects(h.start(admission(f.now()), "forced")); assert.equal(f.counts().calls, 0);
});
test("real transport performs one 401 refresh retry, stops at absolute cutoff and cannot rearm", async () => {
  const f = fixture(), h = createRefreshHarness(f.adapter, { clock: f.c, request: f.request, verifierSkewMs: 0 });
  await h.prepare(); await h.start(admission(f.now()), "forced"); await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(f.counts().forced, 1); assert.deepEqual(h.report().statuses.slice(0, 2), [401, 200]); assert.equal(h.report().transportObserved, true);
  f.advance(120001); await h.close(); const calls = f.counts().calls; f.notify(); await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.counts().calls, calls); assert.equal(h.report().phase, "closed"); await assert.rejects(h.start(admission(f.now()), "forced"));
});
test("unexpired forced case and automatic expired case cannot send protected requests", async () => {
  const f = fixture(), h = createRefreshHarness(f.adapter, { clock: f.c, request: f.request }); await h.prepare();
  await assert.rejects(h.start(admission(f.now()), "forced")); await assert.rejects(h.start(admission(f.now()), "automatic")); assert.equal(f.counts().calls, 0); await h.close();
});
test("denial leakage and refresh errors are fixed failures without exporting private error text", async () => {
  for (const leak of [true, false]) {
    const f = fixture(); if (!leak) f.adapter.getToken = async () => { throw new Error("private-credential-value"); };
    const request: typeof fetch = async () => new Response(leak ? '{"world":"private"}' : '{"error":"approved Google account required"}', { status: 401 });
    const h = createRefreshHarness(f.adapter, { clock: f.c, request, verifierSkewMs: 0 }); await h.prepare();
    await assert.rejects(h.start(admission(f.now()), "forced"), { message: "Refresh trial failed" });
    assert.equal(h.report().failed, true); assert.equal(h.report().phase, "closed"); assert.ok(!JSON.stringify(h.report()).includes("private"));
  }
});
test("hung token acquisition is canceled by the preparation deadline", async () => {
  const f = fixture(); let release!: (value: { token: string; expiresAt: number }) => void;
  f.adapter.capture = () => new Promise(resolve => { release = resolve; });
  const h = createRefreshHarness(f.adapter, { clock: f.c, request: f.request, preparationMs: 100 }); const waiting = h.prepare(); f.advance(101); await h.close(); release({ token: "private", expiresAt: f.now() });
  await assert.rejects(waiting); assert.equal(f.counts().calls, 0); assert.equal(f.counts().disposed, 1);
});
test("short admission expiry closes the window and disposal failures stay explicit", async () => {
  const f = fixture(); f.adapter.dispose = async () => { throw new Error("private exception"); };
  const h = createRefreshHarness(f.adapter, { clock: f.c, request: f.request, verifierSkewMs: 0 }); await h.prepare();
  await h.start({ ...admission(f.now()), validUntil: f.now() + 10 }, "forced"); f.advance(11); await h.close();
  assert.equal(h.report().disposalFailed, true); assert.equal(h.report().transportObserved, false); assert.ok(!JSON.stringify(h.report()).includes("private exception"));
});

test("Chromium automatic rotation preserves one-stream ownership and closes on navigation without auth network", async () => {
  let active = 0, peak = 0, forced = 0, writes = 0;
  const sockets = new Set<import("node:http").ServerResponse>();
  const server = createServer((req, res) => {
    if (req.method !== "GET") writes++;
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === "/api/live") {
      active++; peak = Math.max(peak, active); sockets.add(res);
      res.writeHead(200, { "content-type": "text/event-stream" }); res.write('data: {"id":"fixture"}\n\n');
      res.on("close", () => { active--; sockets.delete(res); });
    } else res.end("{}");
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening"); const address = server.address() as { port: number };
  const vite = await createViteServer({ configFile: false, root: process.cwd(), server: { host: "127.0.0.1", port: 0, proxy: { "/api": `http://127.0.0.1:${address.port}` } },
    plugins: [{ name: "isolated-refresh-fixture", configureServer(server) { server.middlewares.use((req, res, next) => {
      if (req.url !== "/refresh-fixture") return next();
      res.setHeader("content-type", "text/html"); res.end("<!doctype html><title>Isolated refresh fixture</title>");
    }); } }] }); await vite.listen();
  const browser = await chromium.launch({ headless: true }); const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.addInitScript("window.__name = (value) => value;");
    await page.goto(vite.resolvedUrls!.local[0] + "refresh-fixture");
    await page.evaluate(async ({ port, a }) => {
      const { createRefreshHarness } = await import(/* @vite-ignore */ ["/src", "hosted-refresh-harness.ts"].join("/"));
      let current = "synthetic-before", callback = () => {}, forcedCount = 0;
      const adapter = { capture: async () => ({ token: current, expiresAt: Date.now() + 60000 }), getToken: async (force = false) => { if (force) forcedCount++; return current; },
        observe: (fn: () => void) => { callback = fn; return () => { callback = () => {}; }; }, dispose: async () => {} };
      const request: typeof fetch = (url, init) => fetch(new URL(String(url)).pathname, { signal: init?.signal });
      const harness = createRefreshHarness(adapter, { request }); await harness.prepare();
      const w = window as unknown as { refreshFixture: { rotate(): void; report(): unknown; forced(): number } };
      w.refreshFixture = { rotate() { current = "synthetic-after"; callback(); }, report: harness.report, forced: () => forcedCount };
      window.addEventListener("pagehide", () => { void harness.close(); });
      await harness.start(a, "automatic");
    }, { port: address.port, a: admission() });
    await page.waitForFunction(() => (window as any).refreshFixture.report().connections === 1);
    await page.evaluate(() => (window as any).refreshFixture.rotate());
    await page.waitForFunction(() => (window as any).refreshFixture.report().connections >= 2);
    const report = await page.evaluate(() => ({ result: (window as any).refreshFixture.report(), forced: (window as any).refreshFixture.forced() })); forced = report.forced;
    assert.equal(report.result.transportObserved, true); assert.equal(report.result.hostedUiVerified, false);
    assert.ok(!JSON.stringify(report).includes("synthetic-after"));
    await page.goto("about:blank");
    for (let i = 0; active && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(active, 0); assert.ok(peak <= 2); assert.equal(forced, 0); assert.equal(writes, 0);
  } finally { for (const socket of sockets) socket.destroy(); await context.close(); await browser.close(); await vite.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
