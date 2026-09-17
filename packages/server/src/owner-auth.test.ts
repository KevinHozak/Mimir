import assert from "node:assert/strict";
import { assertOwnerAuthConfiguration, hasValidOwnerToken, isLoopbackHost, ownerAuthRequired } from "./owner-auth.js";

assert.equal(isLoopbackHost("127.0.0.1"), true);
assert.equal(isLoopbackHost("::1"), true);
assert.equal(isLoopbackHost("0.0.0.0"), false);
assert.equal(ownerAuthRequired("127.0.0.1", false, false), false);
assert.equal(ownerAuthRequired("127.0.0.1", true, false), true);
assert.equal(ownerAuthRequired("0.0.0.0", false, false), true);
assert.doesNotThrow(() => assertOwnerAuthConfiguration("127.0.0.1", false, false, undefined));
assert.throws(() => assertOwnerAuthConfiguration("0.0.0.0", false, false, undefined), /OWNER_TOKEN is required/);
assert.equal(hasValidOwnerToken("correct horse", "correct horse"), true);
assert.equal(hasValidOwnerToken("correct horse", "wrong token"), false);
assert.equal(hasValidOwnerToken("correct horse", undefined), false);
console.log("Owner authentication rules passed");
