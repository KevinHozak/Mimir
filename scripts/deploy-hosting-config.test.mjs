import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveObserverApiOrigin } from "./deploy-hosting-config.mjs";

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

// The entry point must fail before Git/network work for invalid destinations,
// including invocation spellings that Node canonicalizes differently.
const entry = fileURLToPath(new URL("./deploy-hosting.mjs", import.meta.url));
function assertEntryGuard(path) {
  const result = spawnSync(process.execPath, [path], {
    encoding: "utf8",
    env: { ...process.env, VITE_LIVE_API_URL: "https://unrelated.invalid" },
  });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /existing authenticated observer bridge directly/);
}
assertEntryGuard(entry);
if (process.platform === "win32") assertEntryGuard(entry.toUpperCase());
else {
  const directory = mkdtempSync(join(tmpdir(), "mimir-hosting-entry-"));
  try {
    const link = join(directory, "deploy.mjs");
    symlinkSync(entry, link);
    assertEntryGuard(link);
  } finally {
    rmSync(directory, { recursive: true });
  }
}
console.log("Hosting API destination and environment precedence checks passed");
