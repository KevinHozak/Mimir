import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Fixed public static assets only. Does not execute the observer or attach auth.
const origin = "https://mimir-realm.web.app";
const directory = resolve(".tmp/hosted-refresh-readiness");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const report = { checkedAt: new Date().toISOString(), origin, observerClientsOpened: 0, authRequests: 0, configurationChanged: false, assets: [], frontendExactMatch: false, deployedSdkObservationVerified: false, costAdmissionVerified: false };
try {
  const response = await fetch(origin + "/", { redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("index unavailable");
  const html = await response.text();
  const paths = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[A-Za-z0-9_.-]+)"/g)].map(match => match[1]))];
  if (paths.length < 1 || paths.length > 4) throw new Error("asset list unavailable");
  for (const path of paths) {
    const result = await fetch(origin + path, { redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!result.ok || Number(result.headers.get("content-length")) > 4194304) throw new Error("asset unavailable");
    const bytes = Buffer.from(await result.arrayBuffer());
    if (bytes.length > 4194304) throw new Error("asset too large");
    let localSha256 = null;
    try { localSha256 = digest(await readFile(resolve("packages/web/dist", path.slice(1)))); } catch { /* no local build match */ }
    report.assets.push({ path, bytes: bytes.length, sha256: digest(bytes), localSha256, matches: localSha256 === digest(bytes) });
  }
  report.frontendExactMatch = report.assets.every(asset => asset.matches);
} catch { report.failure = "Public static parity check unavailable"; }
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "static.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
