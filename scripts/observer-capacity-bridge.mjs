import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createObserverBridgeServer } from "./observer-bridge.mjs";
import { createObserverTokenVerifier } from "./observer-bridge-auth.mjs";

export function resourceSample(read = path => readFileSync(path, "utf8")) {
  let memory, usageUsec;
  try {
    const cpu = Object.fromEntries(read("/sys/fs/cgroup/cpu.stat").trim().split("\n").map(line => line.split(/\s+/)));
    memory = Number(read("/sys/fs/cgroup/memory.current")); usageUsec = Number(cpu.usage_usec);
  } catch {
    memory = Number(read("/sys/fs/cgroup/memory/memory.usage_in_bytes"));
    usageUsec = Number(read("/sys/fs/cgroup/cpuacct/cpuacct.usage")) / 1000;
  }
  if (![memory, usageUsec].every(n => Number.isFinite(n) && n >= 0)) throw new Error("Resource sample unavailable");
  return { cpuUsageUsec: usageUsec, memoryBytes: memory };
}

export function installCapacityTelemetry(server, { emit, revision, sample = resourceSample, intervalMs = 1000, leaseMs = 600000 }) {
  if (!Number.isInteger(intervalMs) || intervalMs < 250 || intervalMs > 2000 || !Number.isInteger(leaseMs) || leaseMs <= 0 || leaseMs > 600000) throw new Error("Invalid collector lease");
  let sequence = 0;
  const tick = () => {
    try { emit({ kind: "observer-capacity", revision, ...server.observerStreamSnapshot(), sequence: ++sequence, ...sample() }); }
    catch { emit({ kind: "observer-capacity", revision, sequence: ++sequence, unavailable: true }); }
  };
  tick(); const timer = setInterval(tick, intervalMs);
  const sessions = new Set(); server.on("session", session => { sessions.add(session); session.once("close", () => sessions.delete(session)); });
  const expiry = setTimeout(() => { clearInterval(timer); server.closeAllConnections?.(); for (const session of sessions) session.destroy(); server.close(); }, leaseMs);
  server.once("close", () => { clearInterval(timer); clearTimeout(expiry); });
  return { close: () => { clearInterval(timer); clearTimeout(expiry); } };
}

export function closeIdleUpstreamConnections(upstreamOrigin, original = globalThis.fetch) {
  const origin = new URL(upstreamOrigin).origin;
  return (input, init = {}) => {
    const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    if (target.origin !== origin || target.pathname === "/api/live") return original(input, init);
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set("connection", "close");
    return original(input, { ...init, headers });
  };
}

export function capacityLeaseMs(stopAt, now = Date.now()) {
  if (stopAt === undefined) return 600000;
  const deadline = Number(stopAt);
  if (!Number.isFinite(deadline) || deadline <= 0 || deadline - now > 600000) throw new Error("Invalid absolute collector deadline");
  return Math.max(1, Math.floor(deadline - now));
}

export function startCapacityBridge(env = process.env, { sample = resourceSample } = {}) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim(), upstreamOrigin = env.OBSERVER_UPSTREAM_ORIGIN?.trim();
  const approvedEmails = new Set((env.PUBLIC_OBSERVER_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
  if (!projectId || !upstreamOrigin || !approvedEmails.size || !/^http:\/\/10\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}(?::[0-9]+)?\/?$/.test(upstreamOrigin)) throw new Error("Private observer configuration required");
  const leaseMs = capacityLeaseMs(env.MIMIR_CAPACITY_STOP_AT);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = closeIdleUpstreamConnections(upstreamOrigin, originalFetch);
  const auth = getAuth(getApps()[0] ?? initializeApp({ projectId }));
  const verifyObserverToken = createObserverTokenVerifier({ projectId, approvedEmails, verifyIdToken: token => auth.verifyIdToken(token) });
  const server = createObserverBridgeServer({ upstreamOrigin, hostedOrigin: env.FIREBASE_HOSTING_ORIGIN ?? "https://mimir-realm.web.app", streamMaxMs: 165000, verifyObserverToken, http2: env.OBSERVER_HTTP2 === "1" });
  const key = env.MIMIR_CAPACITY_KEY;
  const expiresAt = Number(env.MIMIR_CAPACITY_EXPIRES_AT);
  const digest = key ? createHash("sha256").update(key).digest() : undefined;
  let probeSequence = 0;
  const originalHandlers = server.listeners("request"); server.removeAllListeners("request");
  server.on("request", (request, response) => {
    if (new URL(request.url ?? "/", "http://collector.invalid").pathname !== "/__capacity") {
      for (const handler of originalHandlers) handler.call(server, request, response);
      return;
    }
    const supplied = request.headers["x-mimir-capacity-key"];
    const authorized = request.method === "GET" && digest && typeof supplied === "string" && Number.isFinite(expiresAt)
      && Date.now() < expiresAt && timingSafeEqual(createHash("sha256").update(supplied).digest(), digest);
    response.setHeader("cache-control", "no-store"); response.setHeader("content-type", "application/json");
    if (!authorized) { response.writeHead(401); response.end(JSON.stringify({ error: "collector unavailable" })); return; }
    try {
      const row = { kind: "observer-capacity", revision: env.K_REVISION ?? "local", sequence: ++probeSequence, ...server.observerStreamSnapshot(), ...sample() };
      response.writeHead(200); response.end(JSON.stringify(row));
    } catch { response.writeHead(503); response.end(JSON.stringify({ error: "collector resources unavailable" })); }
  });
  server.once("close", () => { globalThis.fetch = originalFetch; });
  let totalHttpRequests = 0, responseBytes = 0;
  server.prependListener("request", (_request, response) => {
    totalHttpRequests++;
    for (const name of ["write", "end"]) {
      const original = response[name];
      response[name] = function(chunk, ...args) {
        if (typeof chunk === "string" || Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) responseBytes += Buffer.byteLength(chunk);
        if (totalHttpRequests > 1000 || responseBytes > 24 * 1024 * 1024) { response.destroy(); return false; }
        return original.call(this, chunk, ...args);
      };
    }
  });
  const snapshot = server.observerStreamSnapshot;
  server.observerStreamSnapshot = () => ({ ...snapshot(), totalHttpRequests, responseBytes });
  installCapacityTelemetry(server, { sample, emit: record => console.log(JSON.stringify(record)), revision: env.K_REVISION ?? "local", leaseMs });
  server.listen({ port: Number(env.PORT ?? 8080), host: "0.0.0.0" });
  return server;
}
