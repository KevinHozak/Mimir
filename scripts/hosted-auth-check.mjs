import { createVerify, createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HOSTED_AUTH_ORIGINS = ["https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app", "https://mimir-realm.web.app"];
export const GOOGLE_CERTIFICATES_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
export const TARGET_PROJECT = "mimir-realm";
const bundle = "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e";
export const DENIAL_PATHS = ["/api/world", "/api/events", "/api/interpretations", "/api/live", `/api/world/bundles/${bundle}`, `/api/world/bundles/${bundle}/assets/auth-check.svg`];
const denial = { error: "approved Google account required" };
const fail = code => { const error = new Error(code); error.code = code; throw error; };
const safeCodes = new Set(["invalid-arguments", "fixture-manifest-required", "fixture-file-unavailable", "invalid-fixture-manifest", "emulator-not-allowed", "invalid-jwt", "untrusted-jwt", "nonisolated-fixture", "wrong-fixture-project", "invalid-fixture-time", "fixture-identities-differ", "certificate-fetch-failed", "request-failed", "request-budget-exceeded", "unexpected-denial-status", "denial-body-leak", "denial-header-leak", "response-too-large", "valid-control-rejected"]);
export const safeFailureCode = error => safeCodes.has(error?.code) ? error.code : "check-failed";

export async function boundedBody(response, maximum) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) fail("response-too-large");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { await reader.cancel().catch(() => {}); }
}

// Inspect only Google-signed fixtures. Editing a JWT expiry/audience would test
// signature rejection, not the expired/wrong-project cases this issue needs.
export function verifyFixture(token, certificates, { project, expired = false, now = Date.now() }) {
  if (typeof token !== "string" || token.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) fail("invalid-jwt");
  let header, claims;
  const [encodedHeader, encodedClaims, signature] = token.split(".");
  try { header = JSON.parse(Buffer.from(encodedHeader, "base64url")); claims = JSON.parse(Buffer.from(encodedClaims, "base64url")); } catch { fail("invalid-jwt"); }
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !Object.hasOwn(certificates, header.kid)) fail("untrusted-jwt");
  try {
    const verifier = createVerify("RSA-SHA256"); verifier.update(`${encodedHeader}.${encodedClaims}`); verifier.end();
    if (!verifier.verify(certificates[header.kid], Buffer.from(signature, "base64url"))) fail("untrusted-jwt");
  } catch { fail("untrusted-jwt"); }
  if (claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}`) fail("wrong-fixture-project");
  if (typeof claims.sub !== "string" || !/^mim-s007-[A-Za-z0-9_-]{1,100}$/.test(claims.sub)
    || claims.email_verified !== true || typeof claims.email !== "string" || !claims.email.trim()) fail("nonisolated-fixture");
  const seconds = now / 1000;
  if (!Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || claims.iat > seconds + 30
    || claims.exp <= claims.iat || claims.exp - claims.iat > 3660
    || (expired ? claims.exp > seconds - 60 : claims.exp < seconds + 180)) fail("invalid-fixture-time");
  return claims;
}

export function validateFixtureSet(tokens, certificates, wrongProject, now = Date.now()) {
  if (typeof wrongProject !== "string" || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(wrongProject) || wrongProject === TARGET_PROJECT) fail("invalid-fixture-manifest");
  const valid = verifyFixture(tokens.valid, certificates, { project: TARGET_PROJECT, now });
  const expired = verifyFixture(tokens.expired, certificates, { project: TARGET_PROJECT, expired: true, now });
  const wrong = verifyFixture(tokens.wrongProject, certificates, { project: wrongProject, now });
  const email = value => value.email.trim().toLowerCase();
  if (valid.sub !== expired.sub || email(valid) !== email(expired) || email(valid) !== email(wrong)) fail("fixture-identities-differ");
  return { subjectSha256: createHash("sha256").update(valid.sub).digest("hex"), googleSignaturesVerified: true, matchingApprovedIdentityRequired: true };
}

export async function inspectDenial(response, protectedValues = []) {
  if (response.status !== 401) { await response.body?.cancel().catch(() => {}); fail("unexpected-denial-status"); }
  for (const [name, value] of response.headers) {
    if (["authorization", "x-owner-token", "set-cookie", "location", "x-goog-authenticated-user-email"].includes(name)
      || /Bearer\s|gs:\/\/|\/(?:var\/lib|opt\/mimir)|OWNER_TOKEN|access_token|refresh_token|private[_-]?key/i.test(value)
      || protectedValues.some(secret => secret && value.includes(secret))) { await response.body?.cancel().catch(() => {}); fail("denial-header-leak"); }
  }
  const text = await boundedBody(response, 2048);
  let body;
  try { body = JSON.parse(text); } catch { fail("denial-body-leak"); }
  if (!/^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "")
    || JSON.stringify(body) !== JSON.stringify(denial)
    || protectedValues.some(secret => secret && text.includes(secret))) fail("denial-body-leak");
  return { status: 401, exactPublicError: true, credentialAndPrivateDataLeak: false };
}

export async function runAuthRequests({ tokens, origins = HOSTED_AUTH_ORIGINS, baseline = false, protectedValues = [], fetchImpl = fetch, now = Date.now, budgetMs = 180000 }) {
  const started = now(), results = [];
  const request = async (origin, path, token) => {
    const remaining = budgetMs - (now() - started);
    if (remaining <= 0) fail("request-budget-exceeded");
    try { return await fetchImpl(`${origin}${path}`, { method: "GET", redirect: "error", headers: { origin: "https://mimir-realm.web.app", ...(token ? { authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(Math.min(5000, remaining)) }); }
    catch { fail("request-failed"); }
  };
  const control = async origin => {
    const response = await request(origin, "/api/world", tokens.valid);
    if (response.status !== 200) { await response.body?.cancel().catch(() => {}); fail("valid-control-rejected"); }
    let body;
    try { body = JSON.parse(await boundedBody(response, 4 * 1024 * 1024)); } catch { fail("valid-control-rejected"); }
    if (!Number.isSafeInteger(body?.pulse ?? body?.state?.pulse)) fail("valid-control-rejected");
    results.push({ origin, case: "valid-control", path: "/api/world", status: 200, privateBodyRetained: false });
  };
  for (const origin of origins) {
    if (!baseline) await control(origin);
    const cases = baseline ? [["missing", undefined], ["malformed", "mim-s007-invalid-sentinel"]] : [["expired", tokens.expired], ["wrong-project", tokens.wrongProject]];
    for (const [name, token] of cases) {
      for (const path of baseline ? ["/api/world", "/api/live"] : DENIAL_PATHS) {
        const result = await inspectDenial(await request(origin, path, token), [...protectedValues, ...(token ? [token] : [])]);
        results.push({ origin, case: name, path, ...result });
      }
    }
    if (!baseline) await control(origin);
  }
  return { status: "passed", coverage: baseline ? "anonymous-baseline-only" : "request-matrix-only", durationMs: now() - started, results };
}

function readTokens(manifest) {
  if (manifest.schemaVersion !== 1 || manifest.targetProjectId !== TARGET_PROJECT) fail("invalid-fixture-manifest");
  const tokens = {};
  for (const [name, property] of [["valid", "validTokenFile"], ["expired", "expiredTokenFile"], ["wrongProject", "wrongProjectTokenFile"]]) {
    if (typeof manifest[property] !== "string" || !isAbsolute(manifest[property])) fail("invalid-fixture-manifest");
    try { tokens[name] = readFileSync(manifest[property], "utf8").trim(); } catch { fail("fixture-file-unavailable"); }
  }
  return tokens;
}

export async function runLiveAuthCheck({ fixturePath, baseline = false, outputPath }) {
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), targetProjectId: TARGET_PROJECT, sourceKind: "deployed-bridge", mutations: false, providerCalls: 0 };
  try {
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) fail("emulator-not-allowed");
    let tokens, protectedValues = [];
    if (!baseline) {
      if (!fixturePath) fail("fixture-manifest-required");
      let manifest;
      try { manifest = JSON.parse(readFileSync(fixturePath, "utf8").replace(/^\uFEFF/, "")); } catch { fail("fixture-file-unavailable"); }
      tokens = readTokens(manifest);
      let certificates;
      try {
        const response = await fetch(GOOGLE_CERTIFICATES_URL, { redirect: "error", signal: AbortSignal.timeout(10000) });
        if (!response.ok) fail("certificate-fetch-failed");
        certificates = JSON.parse(await boundedBody(response, 128 * 1024));
      } catch { fail("certificate-fetch-failed"); }
      report.fixtureProof = validateFixtureSet(tokens, certificates, manifest.wrongProjectId);
      protectedValues = Object.values(tokens).flatMap(token => {
        const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
        return [token, claims.email, claims.sub];
      });
    }
    Object.assign(report, await runAuthRequests({ tokens, baseline, protectedValues }));
    if (!baseline) report.coverage = "live-expired-and-wrong-project";
  } catch (error) {
    Object.assign(report, { status: "blocked-or-failed", coverage: "incomplete", requestedCoverage: baseline ? "anonymous-baseline-only" : "live-expired-and-wrong-project", reason: safeFailureCode(error) });
  }
  if (outputPath) { mkdirSync(dirname(resolve(outputPath)), { recursive: true }); writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600, flag: "wx" }); }
  return report;
}

export function parseArguments(args) {
  const options = {}, seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!["--baseline", "--fixtures", "--output"].includes(flag) || seen.has(flag)) fail("invalid-arguments");
    seen.add(flag);
    if (flag === "--baseline") options.baseline = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith("--")) fail("invalid-arguments");
      options[flag === "--fixtures" ? "fixturePath" : "outputPath"] = value;
    }
  }
  if (options.baseline && options.fixturePath) fail("invalid-arguments");
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await runLiveAuthCheck(parseArguments(process.argv.slice(2)));
    console.log(JSON.stringify(report));
    if (report.status !== "passed") process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify({ status: "blocked-or-failed", coverage: "incomplete", reason: safeFailureCode(error) }));
    process.exitCode = 1;
  }
}
