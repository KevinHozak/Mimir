import assert from "node:assert/strict";
import { test } from "node:test";
import { createPollingRefreshHarness } from "./hosted-polling-refresh-harness.js";

// Any accidental fallback to native fetch fails before a network request.
globalThis.fetch = async () => { throw new Error("Network forbidden in synthetic qualification"); };
const flush = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
function fixture(expired = false) {
  let time = 1000000, visible = true, notify = () => {}, visibility = () => {}, disposed = 0;
  let current = "synthetic-before", forced = 0, calls = 0, streams = 0, writes = 0, notifications = 0;
  let next = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock = { wall: () => time, mono: () => time,
    later(fn: () => void, ms: number) { const key = ++next; timers.set(key, { at: time + ms, fn }); return key as unknown as ReturnType<typeof setTimeout>; },
    cancel(key: ReturnType<typeof setTimeout>) { timers.delete(key as unknown as number); } };
  const adapter = { capture: async () => ({ token: current, expiresAt: time + (expired ? -1 : 60000) }),
    getToken: async (force = false) => { if (force) { forced++; current = "synthetic-after"; } return current; },
    observe(fn: () => void) { notify = fn; notifications++; return () => { notifications--; notify = () => {}; }; },
    dispose: async () => { disposed++; } };
  const request: typeof fetch = async (input, init) => {
    calls++; if (String(input).includes("/api/live")) streams++;
    if ((init?.method ?? "GET") !== "GET") writes++;
    assert.equal(new URL(String(input)).origin, "https://synthetic-observer.invalid");
    assert.equal(init?.redirect, "error");
    const stale = expired && new Headers(init?.headers).get("authorization") === "Bearer synthetic-before";
    return new Response(stale ? '{"error":"approved Google account required"}' : '{"private":"discard-me"}', { status: stale ? 401 : 200 });
  };
  const options = { syntheticOnly: true as const, request, clock, visible: () => visible,
    subscribeVisibility(fn: () => void) { visibility = fn; return () => { visibility = () => {}; }; } };
  return { adapter, options, timers, rotate() { current = "synthetic-after"; notify(); }, notify: () => notify(),
    hide() { visible = false; visibility(); }, show() { visible = true; visibility(); },
    async advance(ms: number) { const target = time + ms;
      while (true) { const entry = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break; time = entry[1].at; timers.delete(entry[0]); entry[1].fn(); await flush(); }
      time = target; await flush(); },
    counts: () => ({ calls, streams, writes, forced, disposed, notifications }) };
}

test("polling uses changed synthetic credential only at the next four-minute eight-read batch, never SSE", async () => {
  const f = fixture(), h = createPollingRefreshHarness(f.adapter, f.options);
  await h.prepare(); assert.equal(f.counts().calls, 0); h.start("automatic"); await f.advance(0);
  assert.equal(h.report().completedBatches, 1); assert.equal(f.counts().calls, 8);
  f.rotate(); await f.advance(15000); assert.equal(f.counts().calls, 8);
  await f.advance(224999); assert.equal(f.counts().calls, 8);
  await f.advance(1); await h.close();
  assert.equal(h.report().transportObserved, true); assert.equal(h.report().successfulReads, 16);
  assert.equal(h.report().notificationCredentialUses, 8);
  assert.deepEqual(f.counts(), { calls: 16, streams: 0, writes: 0, forced: 0, disposed: 1, notifications: 0 });
  assert.equal(f.timers.size, 0); assert.equal(h.report().hostedUiVerified, false); assert.equal(h.report().genuineFirebaseVerified, false);
  assert.ok(!JSON.stringify(h.report()).match(/synthetic-before|synthetic-after|discard-me/));
  assert.throws(() => h.start("automatic")); await f.advance(500000); assert.equal(f.counts().calls, 16);
});

test("expired synthetic read exercises actual transport 401 and exactly one forced retry without a stream", async () => {
  const f = fixture(true), h = createPollingRefreshHarness(f.adapter, f.options);
  await h.prepare(); h.start("forced"); await f.advance(0); await h.close();
  assert.deepEqual(h.report().statuses, [401, 200]); assert.equal(h.report().transportObserved, true);
  assert.equal(f.counts().forced, 1); assert.equal(f.counts().streams, 0); assert.equal(f.counts().calls, 2);
});

test("notifications alone or ordinary token change without notification cannot pass automatic observation", async () => {
  for (const changed of [false, true]) {
    const f = fixture(); if (changed) f.adapter.observe = () => () => {};
    const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("automatic"); await f.advance(0);
    if (changed) f.rotate(); else f.notify(); await f.advance(240000); await h.close();
    assert.equal(h.report().transportObserved, false);
  }
});

test("hidden tabs do not bypass cadence and missed refresh boundaries expire without another aging loop", async () => {
  const f = fixture(), h = createPollingRefreshHarness(f.adapter, f.options);
  await h.prepare(); h.start("automatic"); await f.advance(0); f.hide(); f.rotate(); await f.advance(100000); f.show();
  await f.advance(139999); assert.equal(f.counts().calls, 8); f.hide(); await f.advance(120001); await h.close();
  f.show(); await f.advance(1000000); assert.equal(f.counts().calls, 8); assert.equal(h.report().transportObserved, false); assert.equal(f.timers.size, 0);
});

test("preparation deadline rejects hung capture, disposes once and forbids observer requests", async () => {
  const f = fixture(); f.adapter.capture = () => new Promise(() => {});
  const h = createPollingRefreshHarness(f.adapter, { ...f.options, preparationMs: 10 });
  const pending = assert.rejects(h.prepare(), { message: "Synthetic preparation failed" });
  await f.advance(10); await pending; await h.close(); assert.equal(f.counts().calls, 0); assert.equal(f.counts().disposed, 1);
});

test("short preparation timer is removed on admission, and wrong expiry case cannot dispatch", async () => {
  const f = fixture(), h = createPollingRefreshHarness(f.adapter, { ...f.options, preparationMs: 10 });
  await h.prepare(); assert.throws(() => h.start("forced")); assert.equal(f.counts().calls, 0);
  h.start("automatic"); await f.advance(0); await f.advance(11); assert.equal(h.report().phase, "active"); await h.close();
  const old = fixture(true), expired = createPollingRefreshHarness(old.adapter, old.options); await expired.prepare();
  assert.throws(() => expired.start("automatic")); assert.equal(old.counts().calls, 0); await expired.close();
});

test("deadline aborts stalled requests and token acquisition; reports never claim process cleanup", async () => {
  for (const hangToken of [false, true]) {
    const f = fixture(); let aborted = 0;
    if (hangToken) f.adapter.getToken = () => new Promise(() => {});
    else f.options.request = async (_, init) => { init?.signal?.addEventListener("abort", () => { aborted++; }); return new Promise(() => {}); };
    const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("automatic"); await f.advance(0);
    await f.advance(360000); await h.close(); await flush();
    assert.equal(h.report().phase, "closed"); assert.equal(h.report().activeRequests, 0);
    assert.equal(h.report().batches, 1); assert.equal(h.report().transportObserved, false);
    assert.equal(h.report().directProcessCleanupVerified, false); assert.equal(f.timers.size, 0);
    if (!hangToken) assert.equal(aborted, 8);
  }
});

test("failure, leaked denial, second denial and credential errors stop without retry storms or private diagnostics", async () => {
  for (const behavior of ["network", "leak", "denied", "token"]) {
    const f = fixture(true);
    if (behavior === "token") f.adapter.getToken = async () => { throw new Error("private-exception"); };
    if (behavior !== "token") f.options.request = async () => {
      if (behavior === "network") throw new Error("private-exception");
      return new Response(behavior === "leak" ? '{"private":"leak"}' : '{"error":"approved Google account required"}', { status: 401 });
    };
    const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("forced"); await f.advance(0); await h.close();
    assert.equal(h.report().failed, true); assert.equal(h.report().transportObserved, false);
    const calls = h.report().requests; await f.advance(500000); assert.equal(h.report().requests, calls);
    assert.ok(!JSON.stringify(h.report()).includes("private")); assert.equal(f.timers.size, 0);
  }
});

test("disposal errors remain explicit and synthetic request injection is mandatory", async () => {
  const f = fixture(true); f.adapter.dispose = async () => { throw new Error("private-disposal"); };
  const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("forced"); await f.advance(0); await h.close();
  assert.equal(h.report().disposalFailed, true); assert.equal(h.report().transportObserved, false);
  assert.throws(() => createPollingRefreshHarness(f.adapter, { ...f.options, syntheticOnly: false } as any));
  assert.throws(() => createPollingRefreshHarness(f.adapter, { ...f.options, request: undefined } as any));
});


test("stalled denial body is aborted at the absolute deadline without leaking data", async () => {
  const f = fixture(true); let canceled = 0;
  f.options.request = async () => new Response(new ReadableStream({ cancel() { canceled++; } }), { status: 401 });
  const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("forced"); await f.advance(0);
  assert.equal(h.report().activeRequests, 1); await f.advance(120000); await h.close(); await flush();
  assert.equal(h.report().activeRequests, 0); assert.equal(canceled, 1); assert.equal(h.report().transportObserved, false);
});

test("setup failure releases the credential observer and does not leave an armed lease", async () => {
  const f = fixture(); f.options.subscribeVisibility = () => { throw new Error("private-setup"); };
  const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare();
  assert.throws(() => h.start("automatic"), { message: "Synthetic polling setup failed" }); await h.close();
  assert.equal(h.report().failed, true); assert.equal(f.counts().notifications, 0); assert.equal(f.timers.size, 0);
});


test("pending credential disposal cannot report completed transport qualification", async () => {
  const f = fixture(true); let release!: () => void;
  f.adapter.dispose = () => new Promise<void>(resolve => { release = resolve; });
  const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("forced"); await f.advance(0);
  assert.equal(h.report().completedBatches, 1); assert.equal(h.report().disposalComplete, false); assert.equal(h.report().transportObserved, false);
  release(); await h.close(); await flush(); assert.equal(h.report().disposalComplete, true); assert.equal(h.report().transportObserved, true);
});


test("subscription teardown errors cannot skip timer cleanup or credential disposal", async () => {
  const f = fixture(); f.adapter.observe = () => () => { throw new Error("private-teardown"); };
  const h = createPollingRefreshHarness(f.adapter, f.options); await h.prepare(); h.start("automatic"); await f.advance(0); await h.close();
  assert.equal(h.report().failed, true); assert.equal(h.report().transportObserved, false); assert.equal(f.timers.size, 0); assert.equal(f.counts().disposed, 1);
});
