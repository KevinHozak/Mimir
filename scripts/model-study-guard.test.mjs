import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { openStudyGuard } from "./model-study-guard.mjs";
import { mkdirSync } from "node:fs";

const root = resolve(".tmp/model-study-tests");
mkdirSync(root, { recursive: true });
const identity = "a".repeat(64);
const fixture = options => {
  const directory = mkdtempSync(join(root, "run-"));
  return { directory, guard: openStudyGuard(directory, identity, options) };
};
const request = (seed = 2, reserveMicrousd = 1) => ({ seed, input: "synthetic", reserveMicrousd });

test("reservation is durable before dispatch; failed calls retain full allowance", async () => {
  const { guard, directory } = fixture();
  try {
    await assert.rejects(guard.attempt(request(2, 600_000), async () => {
      assert.equal(JSON.parse(readFileSync(join(directory, "ledger.json"))).attempts[0].reserveMicrousd, 600_000);
      throw new Error("ambiguous transport failure");
    }));
    await assert.rejects(guard.attempt(request(4, 400_001), () => assert.fail("must not dispatch")), /budget cap/);
    assert.equal(guard.snapshot().attempts[0].outcome, "uncertain");
    assert.throws(() => openStudyGuard(directory, identity), /EEXIST/);
  } finally { guard.close(); }
});

test("per-seed and cumulative attempts survive successes and cannot be reset", async () => {
  const { guard } = fixture();
  try {
    for (const seed of [2, 4, 8]) {
      for (let i = 0; i < 8; i++) await guard.attempt(request(seed), async ({ maxOutputTokens }) => assert.equal(maxOutputTokens, 128));
      await assert.rejects(guard.attempt(request(seed), () => assert.fail("cap bypass")), /attempt cap/);
    }
    assert.equal(guard.snapshot().attempts.length, 24);
  } finally { guard.close(); }
});

test("unknown bounds, oversized UTF-8 payloads and parallel calls fail before dispatch", async () => {
  const { guard } = fixture();
  try {
    for (const reserveMicrousd of [0, -1, NaN, Infinity, 0.1]) await assert.rejects(guard.attempt(request(2, reserveMicrousd), () => assert.fail()));
    await assert.rejects(guard.attempt({ ...request(), input: "✨".repeat(6000) }, () => assert.fail()), /invalid input/);
    let release;
    const pending = guard.attempt(request(), () => new Promise(resolve => { release = resolve; }));
    await Promise.resolve();
    await assert.rejects(guard.attempt(request(), () => assert.fail()), /busy/);
    release(); await pending;
  } finally { guard.close(); }
});

test("timeout aborts cooperative transport and permanently stops new dispatch", async () => {
  const { guard } = fixture({ timeoutMs: 15 });
  let cancelled = false;
  try {
    await assert.rejects(guard.attempt(request(), ({ signal }) => new Promise(resolve => signal.addEventListener("abort", () => { cancelled = true; resolve(); }))));
    assert.equal(cancelled, true);
    await assert.rejects(guard.attempt(request(), () => assert.fail()), /stopped/);
  } finally { guard.close(); }
});

test("operator stop, window expiry and two consecutive failures block dispatch", async () => {
  for (const mode of ["operator", "window", "failures"]) {
    const { guard } = fixture(mode === "window" ? { windowMs: 15 } : {});
    try {
      if (mode === "failures") {
        for (let i = 0; i < 2; i++) await assert.rejects(guard.attempt(request(), async () => { throw new Error("failure"); }));
      } else {
        const pending = guard.attempt(request(), ({ signal }) => new Promise(resolve => signal.addEventListener("abort", resolve)));
        await Promise.resolve();
        if (mode === "operator") guard.stop();
        await assert.rejects(pending);
      }
      await assert.rejects(guard.attempt(request(), () => assert.fail()), /stopped/);
    } finally { guard.close(); }
  }
});
