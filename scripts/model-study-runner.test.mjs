import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createStudyProvider, requestCostBound, verifyStudyManifest } from "./model-study-runner.mjs";
import { SYNTHETIC_PRICES } from "./model-study-v4.mjs";
import { executeStudy } from "./model-study-execute.mjs";
import { makeContexts } from "./first-glow-lives-p5-study.mjs";

const root = resolve(".tmp/model-study-integration");
globalThis.fetch = () => { throw new Error("provider network forbidden in offline integration"); };
mkdirSync(root, { recursive: true });
const directory = () => mkdtempSync(join(root, "run-"));
// Injected event used only to exercise adapter failure paths, never a study fixture.
const context = makeContexts(2, "dependable-supply")[0].context;
const response = overrides => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ alternativeId: context.supportedAlternatives[0], claim: "plausible-choice", summary: "Synthetic", evidenceEventIds: context.witnessedEvidenceEventIds.slice(0, 1) }) }] } }], modelVersion: "gemini-3.5-flash-lite", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 10, totalTokenCount: 130 }, ...overrides });

test("actual Vertex serialization reaches synthetic worker only after durable reservation", async () => {
  const path = directory();
  const provider = createStudyProvider({ directory: path, synthetic: { onWorker: () => {
    const ledger = JSON.parse(readFileSync(join(path, "ledger.json")));
    assert.equal(ledger.attempts[0].outcome, "reserved");
    assert.ok(ledger.attempts[0].reserveMicrousd > 0);
  } } });
  try {
    const proposal = await provider.interpretForSeed(2, context);
    assert.ok(context.supportedAlternatives.includes(proposal.alternativeId));
    assert.equal(provider.snapshot().attempts[0].outcome, "completed");
    assert.equal(provider.snapshot().attempts[0].inputTokens, 100);
    assert.equal(provider.snapshot().attempts[0].outputTokens, 30);
    assert.ok(provider.snapshot().attempts[0].latencyMs >= 0);
    assert.equal(provider.snapshot().attempts[0].settledCostMicrousd, null);
    const ledger = readFileSync(join(path, "ledger.json"), "utf8");
    assert.equal(ledger.includes("synthetic-credential"), false);
    assert.equal(ledger.includes(context.personalityProfile.description), false);
    assert.throws(() => createStudyProvider({ directory: path }), /EEXIST/);
  } finally { await provider.close(); }
});

test("wire-size, unknown cost and live admission fail before network dispatch", async () => {
  assert.throws(() => requestCostBound({}), /unknown pricing/);
  assert.throws(() => requestCostBound({}), /unknown pricing bound/);
  assert.throws(() => createStudyProvider({ directory: directory(), mode: "live" }), /not approved/);
  assert.throws(() => createStudyProvider({ directory: resolve("data/local") }), /isolated/);
  let workers = 0;
  const provider = createStudyProvider({ directory: directory(), synthetic: { onWorker: () => workers++ } });
  try {
    const big = structuredClone(context);
    big.event.message = "界".repeat(17000);
    await assert.rejects(provider.interpretForSeed(2, big));
    assert.equal(workers, 0);
    assert.equal(provider.snapshot().attempts.length, 0);
  } finally { await provider.close(); }
});

test("malformed proposals retain charges and stop after two failures", async () => {
  const hidden = JSON.parse(response());
  const proposal = JSON.parse(hidden.candidates[0].content.parts[0].text);
  proposal.evidenceEventIds = ["hidden-event"];
  hidden.candidates[0].content.parts[0].text = JSON.stringify(proposal);
  const empty = structuredClone(hidden);
  empty.candidates[0].content.parts[0].text = JSON.stringify({ ...proposal, evidenceEventIds: [] });
  for (const body of [JSON.stringify(empty), "not-json"]) {
    const provider = createStudyProvider({ directory: directory(), synthetic: { response: body } });
    try {
      for (let i = 0; i < 2; i++) await assert.rejects(provider.interpretForSeed(2, context));
      assert.equal(provider.snapshot().stopped, true);
      assert.equal(provider.snapshot().attempts.length, 2);
      assert.ok(provider.snapshot().attempts.every(item => item.outcome === "uncertain"));
      await assert.rejects(provider.interpretForSeed(2, context));
      assert.equal(provider.snapshot().attempts.length, 2);
    } finally { await provider.close(); }
  }
});

test("privacy-boundary rejection stops before a second dispatch and retains usage/reservation", async () => {
  const body = JSON.parse(response());
  const proposal = JSON.parse(body.candidates[0].content.parts[0].text);
  proposal.evidenceEventIds = ["hidden-event"];
  body.candidates[0].content.parts[0].text = JSON.stringify(proposal);
  const provider = createStudyProvider({ directory: directory(), synthetic: { response: JSON.stringify(body) } });
  try {
    await assert.rejects(provider.interpretForSeed(2, context));
    assert.equal(provider.snapshot().stopped, true);
    await assert.rejects(provider.interpretForSeed(2, context));
    assert.equal(provider.snapshot().attempts.length, 1);
    assert.equal(provider.snapshot().attempts[0].inputTokens, 100);
    assert.equal(provider.snapshot().attempts[0].outcome, "uncertain");
  } finally { await provider.close(); }
});

test("invalid reasoning/identity/total receipts stop immediately and retain the full reservation", async () => {
  for (const mutate of [p => delete p.usageMetadata.thoughtsTokenCount, p => p.usageMetadata.totalTokenCount++, p => p.usageMetadata.toolUsePromptTokenCount = 1, p => p.modelVersion = "wrong-model", p => p.candidates.push(p.candidates[0]), p => p.candidates[0].content.parts[0].thought = true]) {
    const bad = JSON.parse(response()); mutate(bad);
    const provider = createStudyProvider({ directory: directory(), synthetic: { response: JSON.stringify(bad) } });
    try {
      await assert.rejects(provider.interpretForSeed(2, context));
      assert.equal(provider.snapshot().stopped, true);
      await assert.rejects(provider.interpretForSeed(2, context));
      assert.equal(provider.snapshot().attempts.length, 1);
      assert.equal(provider.snapshot().attempts[0].reserveMicrousd, 185983);
      assert.equal(provider.snapshot().attempts[0].outcome, "uncertain");
    } finally { await provider.close(); }
  }
});

test("live admission rejects old identities, unknown bounds, missing evidence and unaffordable minimum sample before credentials", () => {
  const now = Date.now(), path = directory();
  const approval = { approvedFor: "S004", protocolHash: verifyStudyManifest({ fixturesOnly: true }).hash, runDirectory: path, validFrom: now - 1000, validUntil: now + 60000, ownerApproved: true, s001Accepted: true, privacyTermsVerified: true, pricingVerified: true, retentionApproved: true, accountVerified: true, tokenBoundsVerified: true, feeBoundsVerified: true, reviewerPresentationApproved: true, model: "gemini-3.5-flash-lite", location: "us", projectId: "synthetic-study", accountId: "synthetic-account", prices: { ...SYNTHETIC_PRICES }, priorAllocationMicrousd: 0, overheadReserveMicrousd: 100000, tokenBoundEvidenceHash: "a".repeat(64), feeBoundEvidenceHash: "b".repeat(64), accountEvidenceHash: "c".repeat(64) };
  // Deliberately never supply a credential or invoke interpret in this test.
  const changes = [ [{ model: "gemini-2.5-flash-lite" }, /identity/], [{ location: "us-central1" }, /identity/], [{ priorAllocationMicrousd: null }, /prior allocation/], [{ priorAllocationMicrousd: 342052 }, /minimum three-seed/], [{ tokenBoundsVerified: false }, /incomplete/], [{ tokenBoundEvidenceHash: null }, /evidence/], [{ overheadReserveMicrousd: 99999 }, /overhead/], [{ prices: { ...SYNTHETIC_PRICES, reasoningTokenUpperBound: undefined } }, /pricing bound/] ];
  for (const [change, expected] of changes) assert.throws(() => createStudyProvider({ directory: path, mode: "live", approval: { ...approval, ...change } }), expected);
  assert.throws(() => verifyStudyManifest(), /protocol source drift/);
  assert.throws(() => createStudyProvider({ directory: path, mode: "live", approval }), /protocol source drift/);
});

test("worker crash or blocked event loop leaves one reservation without retry", async () => {
  for (const behavior of ["crash", "hang"]) {
    const provider = createStudyProvider({ directory: directory(), timeoutMs: 300, synthetic: { behavior } });
    try {
      await assert.rejects(provider.interpretForSeed(2, context));
      assert.equal(provider.snapshot().attempts.length, 1);
      assert.equal(provider.snapshot().attempts[0].outcome, "uncertain");
    } finally { await provider.close(); }
  }
});

test("integrated operator stop drains the worker and prior allocation blocks dispatch", async () => {
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const provider = createStudyProvider({ directory: directory(), synthetic: { behavior: "hang", onWorkerReady: started } });
  const pending = provider.interpretForSeed(2, context);
  const rejected = assert.rejects(pending);
  await ready;
  provider.stop();
  await rejected;
  await provider.close();
  assert.equal(provider.snapshot().stopped, true);
  assert.equal(provider.snapshot().attempts.length, 1);
  let dispatched = false;
  const exhausted = createStudyProvider({ directory: directory(), synthetic: { priorAllocationMicrousd: 999999, onWorker: () => { dispatched = true; } } });
  try {
    await assert.rejects(exhausted.interpretForSeed(2, context));
    assert.equal(dispatched, false);
    assert.equal(exhausted.snapshot().attempts.length, 0);
  } finally { await exhausted.close(); }
});

test("parent-process death triggers independent watchdog cleanup of hung worker", async () => {
  const path = directory();
  const marker = join(path, "pid.json");
  const runner = new URL("./model-study-runner.mjs", import.meta.url).href;
  const ledgerDirectory = join(path, "ledger");
  const script = join(path, "parent.mjs");
  writeFileSync(script, `import { createStudyProvider } from ${JSON.stringify(runner)}; import { writeFileSync } from 'node:fs'; const provider=createStudyProvider({directory:${JSON.stringify(ledgerDirectory)},synthetic:{behavior:'hang',onWorkerReady:pid=>writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid}))}}); await provider.interpretForSeed(2,${JSON.stringify(context)});`);
  const parent = spawn(process.execPath, [script], { stdio: "ignore" });
  const exited = once(parent, "exit");
  let pid;
  try {
    const end = Date.now() + 5000;
    while (!pid && Date.now() < end) {
      try { pid = JSON.parse(readFileSync(marker)).pid; } catch {}
      if (!pid) await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(pid, "owned worker did not start");
    parent.kill("SIGKILL"); await exited;
    let alive = true;
    const cleanupEnd = Date.now() + 5000;
    while (alive && Date.now() < cleanupEnd) {
      try { process.kill(pid, 0); } catch { alive = false; }
      if (alive) await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(alive, false, "owned worker survived parent loss");
    const ledger = JSON.parse(readFileSync(join(ledgerDirectory, "ledger.json")));
    assert.equal(ledger.attempts.length, 1);
    assert.equal(ledger.attempts[0].outcome, "reserved");
    assert.throws(() => createStudyProvider({ directory: ledgerDirectory }), /EEXIST/);
  } finally { if (parent.exitCode === null && parent.signalCode === null) parent.kill("SIGKILL"); }
});

test("ordinary-play paired runner uses matched openings/staging and labels synthetic results", async () => {
  const path = directory();
  const report = await executeStudy({ directory: path });
  assert.equal(report.status, "complete");
  assert.equal(report.runs.length, 6);
  assert.equal(report.mode, "synthetic");
  assert.equal(report.providerBenefit, "unmeasured");
  assert.ok(report.accounting.attempts.length >= 3 && report.accounting.attempts.length <= 24);
  for (const seed of [2, 4, 8]) assert.ok(report.accounting.attempts.some(item => item.seed === seed && item.sparkId === "spark-6"));
  for (const seed of [2, 4, 8]) assert.equal(report.runs.filter(run => run.seed === seed).length, 2);
  for (const run of report.runs) {
    assert.equal(run.lastPulse, 80);
    assert.equal(run.status, "complete");
    assert.ok(run.admissions.some(item => item.created && item.sparkId === "spark-6"));
    const byDay = new Map();
    for (const item of run.admissions.filter(item => item.created)) {
      const key = `${item.sparkId}:${item.simulatedDay}`;
      assert.equal(byDay.has(key), false, "RC1 must not dispatch twice for a Spark/day");
      byDay.set(key, true);
    }
    const outcomes = readFileSync(join(path, `${run.seed}-${run.arm}-outcomes.jsonl`), "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.equal(outcomes.length, 80);
    assert.ok(outcomes.every(item => Array.isArray(item.transitions) && Array.isArray(item.interpretations)));
    if (run.arm === "rules") assert.ok(outcomes.every(item => item.interpretations.every(record => record.source === "rules")));
    for (const row of outcomes.filter(item => item.rcSuppressions.length)) {
      for (const denial of row.rcSuppressions) {
        const interpretation = row.interpretations.find(item => item.eventId === denial.eventId);
        assert.equal(interpretation?.source, "rules");
        assert.equal(interpretation?.fallbackReason, undefined, "RC denial is not a provider failure");
      }
    }
  }
  console.log(`Completed v4 study fixture: ${path}`);
});
