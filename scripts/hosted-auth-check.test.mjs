import assert from "node:assert/strict";
import { generateKeyPairSync, createSign } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { HOSTED_AUTH_ORIGINS, DENIAL_PATHS, TARGET_PROJECT, validateFixtureSet, verifyFixture, inspectDenial, runAuthRequests, runLiveAuthCheck, parseArguments, safeFailureCode } from "./hosted-auth-check.mjs";
import { createObserverTokenVerifier } from "./observer-bridge-auth.mjs";
import { createObserverBridgeServer } from "./observer-bridge.mjs";

// Local RSA fixtures are deliberately separate from live evidence. The CLI
// retrieves its trust material only from Google's fixed HTTPS certificate URL.
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const certificates = { "local-fixture": publicKey };
const now = Date.now(), seconds = Math.floor(now / 1000);
const email = "mim-s007-fixture@example.invalid", subject = "mim-s007-isolated";
function token(project, { expired = false, replacement = {}, key = privateKey } = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "local-fixture" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ aud: project, iss: `https://securetoken.google.com/${project}`, sub: subject, email, email_verified: true, iat: seconds - (expired ? 7200 : 30), exp: seconds + (expired ? -3600 : 3570), ...replacement })).toString("base64url");
  const signer = createSign("RSA-SHA256"); signer.update(`${header}.${payload}`); signer.end();
  return `${header}.${payload}.${signer.sign(key).toString("base64url")}`;
}
const tokens = { valid: token(TARGET_PROJECT), expired: token(TARGET_PROJECT, { expired: true }), wrongProject: token("mimir-auth-fixture") };
assert.ok(validateFixtureSet(tokens, certificates, "mimir-auth-fixture", now).googleSignaturesVerified);
assert.throws(() => validateFixtureSet({ ...tokens, expired: tokens.valid }, certificates, "mimir-auth-fixture", now), /invalid-fixture-time/);
assert.throws(() => validateFixtureSet(tokens, certificates, TARGET_PROJECT, now), /invalid-fixture-manifest/);
assert.throws(() => validateFixtureSet({ ...tokens, expired: token(TARGET_PROJECT, { expired: true, replacement: { email: "another@example.invalid" } }) }, certificates, "mimir-auth-fixture", now), /fixture-identities-differ/);
assert.throws(() => verifyFixture(token(TARGET_PROJECT, { replacement: { sub: "personal-user" } }), certificates, { project: TARGET_PROJECT, now }), /nonisolated-fixture/);
assert.throws(() => verifyFixture(token(TARGET_PROJECT, { replacement: { email_verified: false } }), certificates, { project: TARGET_PROJECT, now }), /nonisolated-fixture/);
const edited = tokens.valid.split(".");
const alteredClaims = JSON.parse(Buffer.from(edited[1], "base64url")); alteredClaims.exp = seconds - 1000; edited[1] = Buffer.from(JSON.stringify(alteredClaims)).toString("base64url");
assert.throws(() => verifyFixture(edited.join("."), certificates, { project: TARGET_PROJECT, expired: true, now }), /untrusted-jwt/);
assert.throws(() => verifyFixture(tokens.valid, {}, { project: TARGET_PROJECT, now }), /untrusted-jwt/);

const response = (value, status = 401, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } });
assert.equal((await inspectDenial(response({ error: "approved Google account required" }))).exactPublicError, true);
for (const value of [{ error: "approved Google account required", state: { pulse: 64 } }, { error: "private upstream path /var/lib/mimir/mimir.db" }, { token: tokens.expired }]) {
  await assert.rejects(inspectDenial(response(value)), /denial-body-leak/);
}
await assert.rejects(inspectDenial(response({ error: "approved Google account required" }, 401, { "x-debug": email }), [email]), /denial-header-leak/);
await assert.rejects(inspectDenial(response({ error: "approved Google account required" }, 401, { "x-owner-token": "private-fixture" })), /denial-header-leak/);
await assert.rejects(inspectDenial(response({ padding: "x".repeat(4096) })), /response-too-large/);
await assert.rejects(inspectDenial(response({ state: "private-canary" }, 200)), /unexpected-denial-status/);
assert.equal(safeFailureCode(new Error(tokens.valid)), "check-failed");

let upstreamRequests = 0;
const upstream = createServer((request, reply) => { upstreamRequests++; reply.writeHead(200, { "content-type": "application/json" }); reply.end(JSON.stringify({ pulse: 64, privateCanary: "LOCAL_PRIVATE_UPSTREAM_CANARY" })); });
upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
const verify = createObserverTokenVerifier({ projectId: TARGET_PROJECT, approvedEmails: new Set([email]), verifyIdToken: async value => {
  const claims = verifyFixture(value, certificates, { project: TARGET_PROJECT, now });
  return claims;
} });
const bridge = createObserverBridgeServer({ upstreamOrigin: `http://127.0.0.1:${upstream.address().port}`, verifyObserverToken: verify });
bridge.listen(0, "127.0.0.1"); await once(bridge, "listening");
try {
  const origin = `http://127.0.0.1:${bridge.address().port}`;
  const result = await runAuthRequests({ tokens, origins: [origin], protectedValues: [email, subject] });
  assert.equal(result.status, "passed");
  assert.equal(result.results.length, DENIAL_PATHS.length * 2 + 2);
  assert.equal(upstreamRequests, 2, "only positive controls reach the canary upstream; both token rejections precede every private route");
  assert.ok(!JSON.stringify(result).includes("LOCAL_PRIVATE_UPSTREAM_CANARY"));
  assert.ok(!JSON.stringify(result).includes(email));
  assert.ok(!JSON.stringify(result).includes(tokens.valid));
  const baseline = await runAuthRequests({ baseline: true, origins: [origin] });
  assert.equal(baseline.coverage, "anonymous-baseline-only");
  assert.equal(upstreamRequests, 2);
  let requests = 0;
  await assert.rejects(runAuthRequests({ tokens, origins: HOSTED_AUTH_ORIGINS, fetchImpl: async () => { requests++; return response({ error: "approved Google account required" }); } }), /valid-control-rejected/);
  assert.equal(requests, 1, "a rejected positive control prevents misleading negative-case success");
  await assert.rejects(runAuthRequests({ baseline: true, origins: [origin], budgetMs: 0 }), /request-budget-exceeded/);
} finally {
  bridge.closeAllConnections(); upstream.closeAllConnections();
  await Promise.all([new Promise(done => bridge.close(done)), new Promise(done => upstream.close(done))]);
}
const missing = await runLiveAuthCheck({});
assert.equal(missing.status, "blocked-or-failed"); assert.equal(missing.reason, "fixture-manifest-required");
assert.equal(missing.fixtureProof, undefined);
console.log("Local hosted-auth harness checks passed: signed fixture validation, tamper rejection, positive controls, denial leakage, upstream isolation, budgets, and explicit missing-fixture state");

assert.deepEqual(parseArguments(["--baseline", "--output", "result.json"]), { baseline: true, outputPath: "result.json" });
for (const args of [["--unknown"], ["--output"], ["--fixtures", "--baseline"], ["--baseline", "--baseline"], ["--baseline", "--fixtures", "fixture.json"]]) {
  assert.throws(() => parseArguments(args), { code: "invalid-arguments" });
}
