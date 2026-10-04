import assert from "node:assert/strict";
import { resolveObserverApiOrigin } from "./deploy-hosting.mjs";

const approved = resolveObserverApiOrigin({});
assert.match(approved, /^https:\/\/mimir-observer-bridge-[a-z0-9-]+\.a\.run\.app$/);
assert.equal(resolveObserverApiOrigin({ VITE_API_URL: approved }), approved);
assert.equal(resolveObserverApiOrigin({ VITE_LIVE_API_URL: approved, VITE_API_URL: "https://unrelated.invalid" }), approved);
for (const environment of [
  { VITE_API_URL: "" },
  { VITE_API_URL: "https://mimir-realm.web.app" },
  { VITE_API_URL: "https://unrelated.a.run.app" },
  { VITE_LIVE_API_URL: "https://unrelated.invalid", VITE_API_URL: approved },
]) assert.throws(() => resolveObserverApiOrigin(environment), /existing authenticated observer bridge directly/);
console.log("Hosting API destination and environment precedence checks passed");
