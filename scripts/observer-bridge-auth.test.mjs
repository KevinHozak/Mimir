import assert from "node:assert/strict";
import { createObserverTokenVerifier } from "./observer-bridge-auth.mjs";

const projectId = "mimir-test-project";
const approvedEmails = new Set(["approved@example.test"]);
const claims = {
  aud: projectId,
  iss: `https://securetoken.google.com/${projectId}`,
  email: " APPROVED@example.test ",
  email_verified: true,
};
let verifiedToken = "";
const verify = createObserverTokenVerifier({
  projectId,
  approvedEmails,
  verifyIdToken: async token => { verifiedToken = token; return claims; },
});

assert.equal(await verify("Bearer synthetic-valid-token"), "approved@example.test");
assert.equal(verifiedToken, "synthetic-valid-token");
assert.equal(await verify(undefined), null);
assert.equal(await verify("Basic synthetic-token"), null);

const rejectClaims = async replacement => createObserverTokenVerifier({
  projectId,
  approvedEmails,
  verifyIdToken: async () => ({ ...claims, ...replacement }),
})("Bearer synthetic-token");

assert.equal(await rejectClaims({ aud: "another-project" }), null, "wrong-project audience is rejected");
assert.equal(await rejectClaims({ iss: "https://securetoken.google.com/another-project" }), null, "wrong-project issuer is rejected");
assert.equal(await rejectClaims({ email: "unapproved@example.test" }), null, "verified but unapproved account is rejected");
assert.equal(await rejectClaims({ email_verified: false }), null, "unverified email is rejected");

const expired = createObserverTokenVerifier({
  projectId,
  approvedEmails,
  verifyIdToken: async () => { throw new Error("auth/id-token-expired"); },
});
assert.equal(await expired("Bearer synthetic-expired-token"), null, "Firebase expiry failures are rejected");
console.log("Observer bridge authentication checks passed");

