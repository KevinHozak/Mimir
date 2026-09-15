import assert from "node:assert/strict";
import { requiresHostedObserverAuth } from "./hosted-auth-boundary.js";

assert.equal(requiresHostedObserverAuth("mimir-realm.web.app", false), true, "the production host must require Google auth");
assert.equal(requiresHostedObserverAuth("127.0.0.1", false), false, "local development must remain available without hosted auth");
assert.equal(requiresHostedObserverAuth("127.0.0.1", true), true, "explicit auth configuration must remain honored");

console.log("Hosted auth boundary checks passed");
