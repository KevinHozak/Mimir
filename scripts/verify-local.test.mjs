import assert from "node:assert/strict";
import test from "node:test";
import { checks, checkedRestorePath, createOutputGuard, expandScript, identityChanged, runSequential } from "./verify-local.mjs";
import { join, resolve } from "node:path";

test("verification stops at the actual failing exit code and records completed steps", async () => {
  const ran = [], recorded = [];
  const code = await runSequential([{ label: "passes" }, { label: "fails" }, { label: "must not run" }], async step => {
    ran.push(step.label);
    return { exitCode: step.label === "fails" ? 7 : 0 };
  }, result => recorded.push(result));
  assert.equal(code, 7);
  assert.deepEqual(ran, ["passes", "fails"]);
  assert.deepEqual(recorded.map(result => result.exitCode), [0, 7]);
});

test("all former CI package checks resolve to runnable tests without duplicate builds", () => {
  const steps = checks.flatMap(([directory, name]) => expandScript(directory, name));
  assert.ok(steps.length > checks.length, "compound scripts retain each test");
  for (const expected of ["first-glow-gemini-provider.test.js", "first-glow-assets.test.js", "owner-auth-acceptance.test.js", "chronicle-events.test.js", "connected-observer-e2e.test.ts", "history-viewer-e2e.test.ts", "local-observer.test.mjs"]) {
    assert.ok(steps.some(step => step.args.some(arg => arg.endsWith(expected))), `missing ${expected}`);
  }
  assert.ok(steps.every(step => !step.args.includes("build")));
  assert.ok(steps.every(step => step.args.length > 0));
  assert.ok(steps.every(step => step.args.every(arg => !/[?*]/.test(arg))), "direct execution must not rely on shell wildcard expansion");
});

test("restore rejects workspace root and parent paths", () => {
  const workspace = resolve("example-workspace");
  assert.equal(checkedRestorePath(workspace, join(workspace, "packages/web/dist")), join(workspace, "packages/web/dist"));
  assert.throws(() => checkedRestorePath(workspace, workspace));
  assert.throws(() => checkedRestorePath(workspace, join(workspace, "../other")));
});

test("credential output is redacted across chunk boundaries and fails verification", async () => {
  const secrets = ["gho_" + "a".repeat(35), "ghp_" + "b".repeat(35), "github_pat_" + "c".repeat(35), "ya29." + "d".repeat(40), "Bearer " + "e".repeat(40), '"access_token":"' + "f".repeat(40) + '"', '"refresh_token":"' + "g".repeat(40) + '"', '"id_token":"' + "h".repeat(40) + '"', "-----BEGIN PRIVATE KEY-----"];
  for (const secret of secrets) {
    let output = "";
    const guard = createOutputGuard(safe => { output += safe; });
    for (let index = 0; index < secret.length; index += 3) guard.push(secret.slice(index, index + 3));
    assert.equal(output, "", "partial line must not be emitted");
    guard.push("\n"); guard.end();
    assert.equal(guard.failed, true);
    assert.ok(output.includes("[REDACTED CREDENTIAL]"));
    assert.equal(output.includes(secret), false);
    assert.equal(await runSequential([{ label: "secret" }], async () => ({ exitCode: guard.failed ? 1 : 0 }), () => {}), 1);
  }
});

test("ordinary token test names remain useful and overlong lines are withheld", () => {
  let output = "";
  const guard = createOutputGuard(safe => { output += safe; }, 80);
  guard.push("Token refresh and owner-token contract passed\n");
  assert.equal(guard.failed, false);
  assert.match(output, /contract passed/);
  guard.push("x".repeat(100)); guard.end();
  assert.equal(guard.failed, true);
  assert.equal(output.includes("x".repeat(20)), false);
});

test("private-key body lines never reach output", () => {
  let output = "";
  const guard = createOutputGuard(safe => { output += safe; });
  guard.push("-----BEGIN PRIVATE KEY-----\nsynthetic-private-body\n-----END PRIVATE KEY-----\nNormal output\n");
  guard.end();
  assert.equal(output.includes("synthetic-private-body"), false);
  assert.match(output, /Normal output/);
  assert.equal(guard.failed, true);
});

test("verification identity detects source edits and HEAD changes", () => {
  const original = { head: "commit-one", sourceHash: "content-one" };
  assert.equal(identityChanged(original, { ...original }), false);
  assert.equal(identityChanged(original, { ...original, head: "commit-two" }), true);
  assert.equal(identityChanged(original, { ...original, sourceHash: "content-two" }), true);
});
