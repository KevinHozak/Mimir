import { createObserverFetch, startObserverStream } from "./observer-session.js";

export type RefreshAdmission = {
  approved: boolean; origin: string; checkedAt: number; validUntil: number;
  existingObservers: number; cumulativeCeilingUsd: number; retainedAllocationUsd: number;
  additionalUpperUsd: number; costVerified: boolean; deployedCodeVerified: boolean;
  directTelemetryVerified: boolean; recoveryBaselineVerified: boolean;
};
export function assertRefreshAdmission(a: RefreshAdmission, now = Date.now()) {
  const n = [a.checkedAt, a.validUntil, a.existingObservers, a.cumulativeCeilingUsd, a.retainedAllocationUsd, a.additionalUpperUsd];
  if (n.some(x => !Number.isFinite(x)) || !a.approved || !a.costVerified || !a.deployedCodeVerified || !a.directTelemetryVerified || !a.recoveryBaselineVerified ||
      a.origin !== "https://mimir-realm.web.app" || a.checkedAt > now || now - a.checkedAt > 300000 || a.validUntil <= now ||
      !Number.isInteger(a.existingObservers) || a.existingObservers < 0 || a.existingObservers > 1 ||
      a.cumulativeCeilingUsd !== 0.15 || a.retainedAllocationUsd < 0.1469663581 || a.additionalUpperUsd <= 0 ||
      a.retainedAllocationUsd + a.additionalUpperUsd > 0.15) throw new Error("Refresh admission blocked");
}

type Adapter = {
  capture(): Promise<{ token: string; expiresAt: number }>;
  getToken(force?: boolean): Promise<string>;
  observe(callback: () => void): () => void;
  dispose(): Promise<void>;
};
type Clock = { wall(): number; mono(): number; later(fn: () => void, ms: number): ReturnType<typeof setTimeout>; cancel(id: ReturnType<typeof setTimeout>): void };
const clock: Clock = { wall: () => Date.now(), mono: () => performance.now(), later: (fn, ms) => setTimeout(fn, ms), cancel: id => clearTimeout(id) };

/** No credentials, claims, private payloads or arbitrary exception messages enter evidence. */
export function createRefreshHarness(adapter: Adapter, options: {
  request?: typeof fetch; clock?: Clock; preparationMs?: number; verifierSkewMs?: number;
} = {}) {
  const c = options.clock ?? clock, preparationMs = options.preparationMs ?? 4500000;
  const skew = options.verifierSkewMs ?? 300000;
  if (!Number.isFinite(preparationMs) || preparationMs <= 0 || preparationMs > 4500000 || !Number.isFinite(skew) || skew < 0 || skew > 300000) throw new Error("Invalid preparation bounds");
  let phase: "preparing" | "prepared" | "active" | "closed" = "preparing";
  let initial: { token: string; expiresAt: number } | undefined, captureStarted = false;
  let stream: ReturnType<typeof startObserverStream> | undefined, unsubscribe: (() => void) | undefined;
  let disposal: Promise<void> | undefined, disposalFailed = false;
  let forced = 0, changes = 0, connections = 0, messages = 0, denied = 0, successfulReads = 0;
  let changed = false, failed = false, mode: "forced" | "automatic" | undefined;
  let started = 0, activeDeadline = 0, overallDeadline = 0, admissionExpiry = 0;
  const statuses: number[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  const pending = new Set<AbortController>();
  const preparationDeadline = c.mono() + preparationMs;
  const close = () => {
    if (disposal) return disposal;
    phase = "closed"; initial = undefined; stream?.stop(); unsubscribe?.();
    for (const timer of timers) c.cancel(timer);
    for (const controller of pending) controller.abort();
    disposal = Promise.resolve().then(() => adapter.dispose()).catch(() => { disposalFailed = true; });
    return disposal;
  };
  timers.push(c.later(() => { void close(); }, preparationMs));
  const ensure = () => {
    if (phase !== "active" || c.mono() >= activeDeadline || c.mono() >= overallDeadline || c.wall() >= admissionExpiry) {
      void close(); throw new Error("Refresh window closed");
    }
  };
  const guarded: typeof fetch = async (input, init) => {
    ensure();
    const url = new URL(String(input));
    if (url.origin !== "https://mimir-realm.web.app" || !["/api/world", "/api/live"].includes(url.pathname) || url.search || (init?.method ?? "GET") !== "GET") {
      failed = true; throw new Error("Read-only refresh scope violation");
    }
    const controller = new AbortController(); pending.add(controller);
    try {
      const signal = init?.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal;
      const response = await (options.request ?? fetch)(input, { ...init, redirect: "error", signal });
      ensure(); statuses.push(response.status);
      if (response.status === 401) {
        denied++;
        // Existing bridge denials contain a fixed JSON error, never world data.
        const reader = response.clone().body?.getReader(); let body = "";
        if (reader) { try { while (true) { const part = await reader.read(); if (part.done) break; body += new TextDecoder().decode(part.value); if (body.length > 256) break; } } finally { void reader.cancel(); reader.releaseLock(); } }
        if (body !== '{"error":"approved Google account required"}') {
          failed = true; await response.body?.cancel(); throw new Error("Denial body failed privacy gate");
        }
      }
      return response;
    } finally { pending.delete(controller); }
  };
  const token = async (force = false) => {
    ensure();
    if (force) forced++;
    const value = await adapter.getToken(force); ensure();
    if (!value) throw new Error("Credential unavailable");
    if (initial && value !== initial.token) changed = true;
    return value;
  };
  const request = createObserverFetch(token, guarded);
  return {
    async prepare() {
      if (phase !== "preparing" || captureStarted) throw new Error("Preparation already used");
      captureStarted = true;
      try {
        const captured = await adapter.capture();
        if (phase !== "preparing" || c.mono() >= preparationDeadline || !captured.token || !Number.isFinite(captured.expiresAt)) throw new Error("Preparation expired");
        initial = captured; phase = "prepared";
      } catch { failed = true; await close(); throw new Error("Credential preparation failed"); }
    },
    async start(a: RefreshAdmission, selected: "forced" | "automatic") {
      assertRefreshAdmission(a, c.wall());
      if (phase !== "prepared" || !initial || c.mono() >= preparationDeadline || !["forced", "automatic"].includes(selected)) throw new Error("Refresh not prepared");
      if (selected === "forced" && c.wall() < initial.expiresAt + skew) throw new Error("Credential not naturally expired");
      if (selected === "automatic" && initial.expiresAt <= c.wall()) throw new Error("Automatic refresh boundary unavailable");
      phase = "active"; mode = selected; started = c.mono(); activeDeadline = started + 120000; overallDeadline = started + 180000; admissionExpiry = a.validUntil;
      timers.push(c.later(() => { void close(); }, Math.min(120000, a.validUntil - c.wall())));
      try {
        unsubscribe = adapter.observe(() => {
          if (phase !== "active" || selected !== "automatic") return;
          changes++; stream?.refresh();
        });
        const response = await request(a.origin + "/api/world", {}, selected === "forced" ? Promise.resolve(initial.token) : undefined);
        if (response.status !== 200) throw new Error("Protected retry failed");
        await response.body?.cancel(); successfulReads++; ensure();
        stream = startObserverStream({ url: a.origin + "/api/live", request,
          onConnected: () => { connections++; }, onMessage: () => { messages++; },
          onDisconnected: () => { failed = true; }, retryMs: 3000 });
      } catch { failed = true; await close(); throw new Error("Refresh trial failed"); }
    },
    close,
    report() {
      return { schemaVersion: 1, phase, mode: mode ?? "unstarted", forcedRefreshes: forced, tokenChangeNotifications: changes,
        tokenChanged: changed, connections, messages, denied, successfulReads, statuses: [...statuses], failed, disposalFailed,
        elapsedMs: started ? Math.max(0, c.mono() - started) : 0,
        // These counters are harness observations, never hosted process cleanup or UI acceptance.
        transportObserved: !failed && !disposalFailed && successfulReads === 1 && changed && connections > 0 && (mode === "forced" ? denied === 1 && forced === 1 : changes > 0 && forced === 0 && connections >= 2),
        hostedUiVerified: false, directProcessCleanupVerified: false };
    },
  };
}
