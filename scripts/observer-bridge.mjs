import { createServer } from "node:http";
import { resolve } from "node:path";
import { pipeline, Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createObserverTokenVerifier } from "./observer-bridge-auth.mjs";

const allowedExact = new Set(["/api/world", "/api/events", "/api/interpretations", "/api/metrics", "/api/design", "/api/region", "/api/resonance", "/api/reflection", "/api/live"]);
function allowedPath(pathname) {
  if (allowedExact.has(pathname)) return true;
  return /^\/api\/world\/bundles\/sha256-[a-f0-9]{64}(?:\/assets\/.+)?$/.test(pathname);
}
export function createObserverBridgeServer({ upstreamOrigin, hostedOrigin = "https://mimir-realm.web.app", streamMaxMs = 900000, verifyObserverToken }) {
const upstream = new URL(upstreamOrigin);
if (upstream.protocol !== "http:") throw new Error("observer upstream must use HTTP");
if (typeof verifyObserverToken !== "function") throw new Error("observer token verifier is required");
return createServer(async (request, response) => {
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
  const abort = () => controller.abort();
  request.on("aborted", abort);
  response.on("close", abort);
  const timer = setTimeout(abort, parsed.pathname === "/api/live" ? streamMaxMs : 30000);
  timer.unref();
  try {
    const target = new URL(parsed.pathname + parsed.search, upstream);
    const upstreamResponse = await fetch(target, { method: request.method, headers: { authorization: request.headers.authorization }, signal: controller.signal });
    const headers = {};
    for (const name of ["content-type", "cache-control", "etag", "last-modified"]) {
      const value = upstreamResponse.headers.get(name);
      if (value) headers[name] = value;
    }
    response.writeHead(upstreamResponse.status, headers);
    if (request.method === "HEAD" || !upstreamResponse.body) return response.end();
    pipeline(Readable.fromWeb(upstreamResponse.body), response, error => {
      if (error && error.name !== "AbortError" && !response.destroyed) response.destroy(error);
    });
  } catch (error) {
    if (!response.headersSent) response.writeHead(error?.name === "AbortError" ? 504 : 502, { "content-type": "application/json" });
    if (!response.writableEnded) response.end(JSON.stringify({ error: "observer upstream unavailable" }));
  } finally {
    clearTimeout(timer);
  }
});
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
  const server = createObserverBridgeServer({ upstreamOrigin, hostedOrigin, streamMaxMs, verifyObserverToken });
  server.listen({ port, host: "0.0.0.0" });
}

