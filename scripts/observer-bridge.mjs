import { createServer } from "node:http";
import { createServer as createHttp2Server } from "node:http2";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createObserverTokenVerifier } from "./observer-bridge-auth.mjs";

const allowedExact = new Set(["/api/world", "/api/events", "/api/interpretations", "/api/metrics", "/api/design", "/api/region", "/api/resonance", "/api/reflection", "/api/live"]);
function allowedPath(pathname) {
  if (allowedExact.has(pathname)) return true;
  return /^\/api\/world\/bundles\/sha256-[a-f0-9]{64}(?:\/assets\/.+)?$/.test(pathname);
}
export function createObserverBridgeServer({ upstreamOrigin, hostedOrigin = "https://mimir-realm.web.app", streamMaxMs = 900000, verifyObserverToken, onStreamTelemetry, http2 = false }) {
const upstream = new URL(upstreamOrigin);
if (upstream.protocol !== "http:") throw new Error("observer upstream must use HTTP");
if (typeof verifyObserverToken !== "function") throw new Error("observer token verifier is required");
if (!Number.isFinite(streamMaxMs) || streamMaxMs <= 0 || streamMaxMs > 2147483647) throw new Error("invalid observer stream timeout");
const processSession = randomUUID();
let activeRequests = 0;
let activeUpstreamStreams = 0;
const snapshot = () => ({ timestamp: new Date().toISOString(), processSession, activeRequests, activeUpstreamStreams });
const emit = (event, details = {}) => {
  // Only fixed lifecycle fields are emitted: never tokens, URLs, claims, or raw errors.
  try { onStreamTelemetry?.({ ...snapshot(), event, ...details }); } catch { /* telemetry must not interrupt cleanup */ }
};
const server = (http2 ? createHttp2Server : createServer)(async (request, response) => {
  const parsed = new URL(request.url ?? "/", "http://bridge.invalid");
  const origin = request.headers.origin;
  if (origin === hostedOrigin) {
    response.setHeader("access-control-allow-origin", hostedOrigin);
    response.setHeader("vary", "Origin");
    response.setHeader("access-control-allow-headers", "Authorization, Content-Type");
    response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  }
  if (request.method === "OPTIONS") return response.writeHead(204).end();
  if (request.method !== "GET" && request.method !== "HEAD") return response.writeHead(405, { allow: "GET, HEAD, OPTIONS" }).end("read-only observer");
  if (!allowedPath(parsed.pathname)) return response.writeHead(404).end("observer route unavailable");
  if (!await verifyObserverToken(request.headers.authorization)) return response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "approved Google account required" }));

  const controller = new AbortController();
  const isLive = request.method === "GET" && parsed.pathname === "/api/live";
  const started = performance.now();
  let reason = "completed";
  let upstreamStream = false;
  const abort = cause => {
    if (!controller.signal.aborted) {
      if (reason !== "upstream-error") reason = cause;
      controller.abort();
    }
  };
  const onAborted = () => abort("client-close");
  const onClose = () => { if (!response.writableFinished) abort("client-close"); };
  request.on("aborted", onAborted);
  response.on("close", onClose);
  if (isLive) { activeRequests += 1; emit("request-open"); }
  const timer = setTimeout(() => abort("timeout"), isLive ? streamMaxMs : 30000);
  timer.unref();
  try {
    if (request.aborted || response.destroyed) abort("client-close");
    const target = new URL(parsed.pathname + parsed.search, upstream);
    const upstreamResponse = await fetch(target, { method: request.method, headers: { authorization: request.headers.authorization }, signal: controller.signal });
    const headers = {};
    for (const name of ["content-type", "cache-control", "etag", "last-modified"]) {
      const value = upstreamResponse.headers.get(name);
      if (value) headers[name] = value;
    }
    response.writeHead(upstreamResponse.status, headers);
    if (request.method === "HEAD" || !upstreamResponse.body) return response.end();
    if (isLive && upstreamResponse.ok && /^text\/event-stream(?:;|$)/i.test(upstreamResponse.headers.get("content-type") ?? "")) {
      upstreamStream = true; activeUpstreamStreams += 1; emit("stream-open");
    } else if (isLive) reason = "upstream-rejected";
    const body = Readable.fromWeb(upstreamResponse.body);
    body.once("error", () => { if (!controller.signal.aborted) reason = "upstream-error"; });
    await pipeline(body, response, { signal: controller.signal });
  } catch (error) {
    if (!controller.signal.aborted) reason = "upstream-error";
    if (!response.headersSent) response.writeHead(error?.name === "AbortError" ? 504 : 502, { "content-type": "application/json" });
    if (!response.writableEnded && !response.destroyed) response.end(JSON.stringify({ error: "observer upstream unavailable" }));
  } finally {
    clearTimeout(timer);
    request.off("aborted", onAborted);
    response.off("close", onClose);
    if (isLive) {
      activeRequests -= 1;
      if (upstreamStream) activeUpstreamStreams -= 1;
      emit("request-close", { reason, durationMs: Math.round(performance.now() - started) });
    }
  }
});
// In-process diagnostics only; this is not an HTTP route or an all-instance count.
server.observerStreamSnapshot = snapshot;
return server;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();
if (isMain) {
  const port = Number(process.env.PORT ?? 8080);
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const approvedEmails = new Set((process.env.PUBLIC_OBSERVER_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
  const upstreamOrigin = process.env.OBSERVER_UPSTREAM_ORIGIN?.trim();
  const hostedOrigin = process.env.FIREBASE_HOSTING_ORIGIN?.trim() ?? "https://mimir-realm.web.app";
  const streamMaxMs = Number(process.env.OBSERVER_STREAM_MAX_MS ?? 900000);
  if (!projectId || approvedEmails.size === 0 || !upstreamOrigin) throw new Error("FIREBASE_PROJECT_ID, PUBLIC_OBSERVER_EMAILS, and OBSERVER_UPSTREAM_ORIGIN are required");
  const upstream = new URL(upstreamOrigin);
  if (upstream.protocol !== "http:" || !/^10\.(?:[0-9]{1,3}\.){2}[0-9]{1,3}$/.test(upstream.hostname)) throw new Error("OBSERVER_UPSTREAM_ORIGIN must be an HTTP private 10.x address");
  const auth = getAuth(getApps()[0] ?? initializeApp({ projectId }));
  const verifyObserverToken = createObserverTokenVerifier({ projectId, approvedEmails, verifyIdToken: token => auth.verifyIdToken(token) });
  const telemetryEnabled = process.env.OBSERVER_STREAM_TELEMETRY === "1";
  const onStreamTelemetry = telemetryEnabled ? record => console.log(JSON.stringify({ kind: "observer-stream", revision: process.env.K_REVISION ?? "local", ...record })) : undefined;
  const http2 = process.env.OBSERVER_HTTP2 === "1";
  const server = createObserverBridgeServer({ upstreamOrigin, hostedOrigin, streamMaxMs, verifyObserverToken, onStreamTelemetry, http2 });
  if (telemetryEnabled) {
    onStreamTelemetry({ ...server.observerStreamSnapshot(), event: "baseline" });
    const sampleTimer = setInterval(() => onStreamTelemetry({ ...server.observerStreamSnapshot(), event: "sample" }), 30000);
    sampleTimer.unref();
    server.on("close", () => clearInterval(sampleTimer));
  }
  server.listen({ port, host: "0.0.0.0" });
}

