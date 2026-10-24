import { setTimeout as delay } from "node:timers/promises";

/** Reject recognizable credentials; never forward free-form network error text. */
export function assertRedacted(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/Bearer\s+[^\s"]{15,}|\bya29\.[\w.-]{20,}|\bgh[opsur]_[\w]{20,}|-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/i.test(text)) {
    throw new Error("Potential credential leakage detected in rehearsal telemetry");
  }
}

export function validateRehearsalLimits({ maxSessions, windowMs, rampDelayMs, maxErrorThreshold }) {
  if (!Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 2
      || !Number.isFinite(windowMs) || windowMs <= 0 || windowMs > 165000
      || !Number.isFinite(rampDelayMs) || rampDelayMs < 0 || rampDelayMs >= windowMs
      || maxErrorThreshold !== 0) throw new Error("Outside approved rehearsal limits");
}

/** Read-only streams only. A client deadline leaves 15 seconds for independent cleanup. */
export async function runBoundedRehearsal({ targetOrigin, token, maxSessions = 2,
  windowMs = 120000, rampDelayMs = 200, maxErrorThreshold = 0, onTelemetry, signal }) {
  validateRehearsalLimits({ maxSessions, windowMs, rampDelayMs, maxErrorThreshold });
  const origin = new URL(targetOrigin);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/"
      || !(origin.protocol === "https:" || (origin.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)))) {
    throw new Error("Expected HTTPS origin or isolated loopback origin");
  }
  const startTime = performance.now(), sessions = [], statusCounts = {};
  let activeClients = 0, peakClients = 0, totalRequests = 0, totalErrors = 0,
    receivedBytes = 0, abortedDueToThreshold = false, abortReason = null, ending = false,
    fullCapacityStarted, fullCapacityMs = 0, callbackFailed = false;
  const emit = (event, data = {}) => {
    const record = { event, elapsedMs: performance.now() - startTime, activeClients, totalRequests, totalErrors, ...data };
    assertRedacted(record);
    try { onTelemetry?.(record); } catch { callbackFailed = true; stop("telemetry-callback-failed"); }
  };
  const cancel = () => { for (const session of sessions) session.controller.abort(); };
  const stop = reason => {
    if (!abortedDueToThreshold) { abortedDueToThreshold = true; abortReason = reason; totalErrors++; }
    ending = true; cancel();
  };
  const externalAbort = () => stop("operator-or-measurement-abort");
  signal?.addEventListener("abort", externalAbort, { once: true });
  if (signal?.aborted) externalAbort();
  const timer = setTimeout(() => { ending = true; cancel(); }, windowMs);
  const connect = async sessionId => {
    const session = { controller: new AbortController(), open: false, receivedBytes: 0 }; sessions.push(session); totalRequests++;
    let reader;
    const cancelled = new Promise(resolve => session.controller.signal.addEventListener("abort", () => resolve({ done: true }), { once: true }));
    try {
      const response = await fetch(new URL("/api/live", origin), {
        headers: token ? { authorization: token } : {}, signal: session.controller.signal, redirect: "error",
      });
      statusCounts[response.status] = (statusCounts[response.status] ?? 0) + 1;
      if (response.status !== 200) { stop(`error-threshold-exceeded: status ${response.status}`); return; }
      if (!/^text\/event-stream(?:;|$)/i.test(response.headers.get("content-type") ?? "") || !response.body) {
        stop("invalid-stream-response"); return;
      }
      session.open = true; activeClients++; peakClients = Math.max(peakClients, activeClients);
      if (activeClients === maxSessions) fullCapacityStarted = performance.now();
      emit("session-connected", { sessionId, status: response.status });
      reader = response.body.getReader();
      while (!ending) {
        const { done, value } = await Promise.race([reader.read(), cancelled]);
        if (done) { if (!ending) stop("premature-stream-eof"); break; }
        receivedBytes += value.byteLength; session.receivedBytes += value.byteLength;
      }
    } catch {
      if (!ending) stop("stream-or-connect-error");
    } finally {
      if (reader) { reader.cancel().catch(() => {}); try { reader.releaseLock(); } catch { /* pending read is cancelled independently */ } }
      session.controller.abort();
      if (session.open) {
        if (activeClients === maxSessions && fullCapacityStarted !== undefined) fullCapacityMs += performance.now() - fullCapacityStarted;
        session.open = false; activeClients--; emit("session-closed", { sessionId });
      }
    }
  };
  const connections = [];
  emit("rehearsal-start", { maxSessions, windowMs });
  try {
    for (let i = 1; i <= maxSessions && !ending; i++) {
      connections.push(connect(`client-${i}`));
      if (i < maxSessions && rampDelayMs) await delay(Math.min(rampDelayMs, Math.max(0, windowMs - (performance.now() - startTime))));
    }
    while (!ending) await delay(Math.min(20, Math.max(1, windowMs - (performance.now() - startTime))));
  } finally { ending = true; clearTimeout(timer); signal?.removeEventListener("abort", externalAbort); cancel(); await Promise.allSettled(connections); }
  const summary = { durationMs: performance.now() - startTime, maxSessions, peakClients, fullCapacityMs,
    receivedBytes, clientBytes: sessions.map(s => s.receivedBytes), activeClientsAtClose: activeClients, totalRequests, totalErrors, statusCounts,
    abortedDueToThreshold, abortReason, callbackFailed };
  emit("rehearsal-complete", summary);
  summary.callbackFailed = callbackFailed;
  return summary;
}
