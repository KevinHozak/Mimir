import { createObserverFetch } from "./observer-session.js";
import { startObserverPolling } from "./observer-polling.js";
import type { RefreshAdapter, RefreshClock } from "./hosted-refresh-harness.js";

const origin = "https://synthetic-observer.invalid";
const paths = ["/api/world", "/api/events?limit=200", "/api/interpretations?limit=200", "/api/metrics", "/api/design", "/api/region", "/api/resonance", "/api/reflection"];
const denial = '{"error":"approved Google account required"}';
const realClock: RefreshClock = { wall: Date.now, mono: () => performance.now(), later: setTimeout, cancel: clearTimeout };

/** Local synthetic qualification only. No Firebase import, live admission or default fetch. */
export function createPollingRefreshHarness(adapter: RefreshAdapter, options: {
  syntheticOnly: true;
  request: typeof fetch;
  clock?: RefreshClock;
  preparationMs?: number;
  visible: () => boolean;
  subscribeVisibility: (changed: () => void) => () => void;
}) {
  if (options.syntheticOnly !== true || typeof options.request !== "function") throw new Error("Synthetic request adapter required");
  const c = options.clock ?? realClock, preparationMs = options.preparationMs ?? 4500000;
  if (!Number.isFinite(preparationMs) || preparationMs <= 0 || preparationMs > 4500000) throw new Error("Invalid preparation bound");
  let phase: "preparing" | "prepared" | "active" | "closed" = "preparing";
  let initial: { token: string; expiresAt: number } | undefined, captureStarted = false;
  let mode: "forced" | "automatic" | undefined, polling: ReturnType<typeof startObserverPolling> | undefined;
  let unsubscribe: (() => void) | undefined, disposal: Promise<void> | undefined;
  let failed = false, disposalFailed = false, disposalComplete = false, forced = 0, changes = 0, notificationsUsed = 0;
  let requests = 0, activeRequests = 0, peakRequests = 0, batches = 0, completedBatches = 0, denied = 0, reads = 0;
  let changed = false, started = 0, deadline = 0;
  const statuses: number[] = [], lifetime = new AbortController();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const close = () => {
    if (disposal) return disposal;
    phase = "closed"; initial = undefined; lifetime.abort();
    try { polling?.stop(); } catch { failed = true; }
    try { unsubscribe?.(); } catch { failed = true; }
    for (const timer of timers) c.cancel(timer);
    timers.clear();
    disposal = Promise.resolve().then(() => adapter.dispose()).then(() => { disposalComplete = true; }).catch(() => { disposalFailed = true; });
    return disposal;
  };
  const arm = (ms: number) => { const timer = c.later(() => { void close(); }, ms); timers.add(timer); };
  arm(preparationMs);
  const bounded = <T>(task: Promise<T>, signal: AbortSignal): Promise<T> => new Promise((resolve, reject) => {
    const abort = () => reject(new Error("Synthetic operation canceled"));
    if (signal.aborted) { task.catch(() => {}); abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
  const ensure = () => {
    if (phase !== "active" || c.mono() >= deadline) throw new Error("Synthetic polling window closed");
  };
  const guarded: typeof fetch = async (input, init) => {
    ensure();
    const url = new URL(String(input));
    if (url.origin !== origin || !paths.includes(url.pathname + url.search) || (init?.method ?? "GET") !== "GET") throw new Error("Synthetic read scope violation");
    // Two eight-read batches plus one forced retry are the entire fixture allowance.
    if (++requests > 17) throw new Error("Synthetic request bound exceeded");
    const signal = AbortSignal.any([lifetime.signal, ...(init?.signal ? [init.signal] : [])]);
    activeRequests++; peakRequests = Math.max(peakRequests, activeRequests);
    let response: Response | undefined;
    try {
      response = await bounded(options.request(input, { ...init, redirect: "error", signal }), signal);
      ensure(); statuses.push(response.status);
      if (response.status === 401) {
        denied++;
        // Read a bounded denial only. Successful private payloads never enter reports.
        const reader = response.body?.getReader(); let body = "";
        if (reader) {
          try {
            while (true) {
              const part = await bounded(reader.read(), signal);
              if (part.done) break;
              body += new TextDecoder().decode(part.value);
              if (body.length > 256) break;
            }
          } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
        }
        if (body !== denial) throw new Error("Synthetic denial privacy gate failed");
        // Transport owns cancellation of the returned denial body.
        return new Response(denial, { status: 401 });
      }
      return new Response(null, { status: response.status });
    } finally {
      if (response && !response.bodyUsed) void response.body?.cancel().catch(() => {});
      activeRequests--;
    }
  };
  const poll = async (signal: AbortSignal) => {
    ensure();
    if (++batches > (mode === "forced" ? 1 : 2)) throw new Error("Synthetic batch bound exceeded");
    const request = createObserverFetch(async force => {
      ensure();
      if (force) forced++;
      const value = await bounded(adapter.getToken(force), AbortSignal.any([signal, lifetime.signal]));
      ensure();
      if (!value) throw new Error("Synthetic credential unavailable");
      if (initial && value !== initial.token) { changed = true; if (changes > 0 && !force) notificationsUsed++; }
      return value;
    }, guarded);
    // Forced expiry tests one request; automatic mode uses the actual eight-read shape.
    const selected = mode === "forced" ? paths.slice(0, 1) : paths;
    try {
      await Promise.all(selected.map(async path => {
        const response = await request(origin + path, { signal }, mode === "forced" ? Promise.resolve(initial!.token) : undefined);
        if (response.status !== 200) throw new Error("Synthetic protected read failed");
        reads++;
      }));
      ensure(); completedBatches++;
      if (mode === "forced" || completedBatches === 2) await close();
    } catch {
      if (phase === "active" && !signal.aborted) { failed = true; await close(); }
    }
  };
  return {
    async prepare() {
      if (phase !== "preparing" || captureStarted) throw new Error("Synthetic preparation already used");
      captureStarted = true;
      try {
        const value = await bounded(adapter.capture(), lifetime.signal);
        if (phase !== "preparing" || !value.token || !Number.isFinite(value.expiresAt)) throw new Error("Synthetic preparation expired");
        initial = value; phase = "prepared";
      } catch { failed = true; await close(); throw new Error("Synthetic preparation failed"); }
    },
    start(selected: "forced" | "automatic") {
      if (phase !== "prepared" || !initial || !["forced", "automatic"].includes(selected)) throw new Error("Synthetic refresh not prepared");
      if (selected === "forced" ? initial.expiresAt > c.wall() : initial.expiresAt <= c.wall()) throw new Error("Synthetic expiry boundary unavailable");
      for (const timer of timers) c.cancel(timer);
      timers.clear();
      phase = "active"; mode = selected; started = c.mono(); deadline = started + (selected === "forced" ? 120000 : 360000);
      arm(deadline - started);
      try {
        unsubscribe = adapter.observe(() => { if (phase === "active" && mode === "automatic") changes++; });
        polling = startObserverPolling({ intervalMs: 240000, now: c.mono, schedule: c.later,
          cancel: timer => c.cancel(timer as ReturnType<typeof setTimeout>),
          visible: options.visible, subscribeVisibility: options.subscribeVisibility, poll,
          onError: () => { failed = true; void close(); } });
      } catch { failed = true; void close(); throw new Error("Synthetic polling setup failed"); }
    },
    close,
    report() {
      return { schemaVersion: 1, evidenceKind: "local-synthetic", phase, mode: mode ?? "unstarted", requests, activeRequests, peakRequests,
        batches, completedBatches, successfulReads: reads, denied, forcedRefreshes: forced, tokenChangeNotifications: changes,
        tokenChanged: changed, notificationCredentialUses: notificationsUsed, statuses: [...statuses], failed, disposalFailed, disposalComplete,
        elapsedMs: mode ? Math.max(0, c.mono() - started) : 0,
        transportObserved: phase === "closed" && !failed && disposalComplete && !disposalFailed && activeRequests === 0 && changed &&
          (mode === "forced" ? completedBatches === 1 && denied === 1 && forced === 1 : completedBatches === 2 && changes > 0 && notificationsUsed > 0 && forced === 0),
        hostedUiVerified: false, genuineFirebaseVerified: false, directProcessCleanupVerified: false };
    },
  };
}
