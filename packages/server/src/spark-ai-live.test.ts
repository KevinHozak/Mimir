import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import type { FirstGlowInterpretationContext } from "@mimir/engine";
import { SparkAIBudget } from "./spark-ai-budget.js";
import { DatabaseSync } from "node:sqlite";
import { createSparkLiveProvider, sparkWire, SPARK_LIVE_MODEL } from "./spark-ai-live.js";

const root = resolve("../../.tmp/spark-ai-tests"); mkdirSync(root, { recursive: true });
const path = () => join(mkdtempSync(join(root, "run-")), "budget.db");
const hash = (n: number) => "sha256-" + n.toString(16).padStart(64, "0");
const context = (n = 1) => ({ schemaVersion: 2, personalityProfileVersion: "test", encounterId: "encounter-" + n, contextHash: hash(n), pulse: 52, actorSparkId: "spark-6", event: { id: "event-1", kind: "wild-cache-discovered", actorId: "spark-6", participants: ["spark-6"], message: "A fictional cache", evidenceEventIds: ["event-1"] }, supportedAlternatives: ["enter-wild-cache", "stay-on-trace"], witnessedEvidenceEventIds: ["event-1"] } as unknown as FirstGlowInterpretationContext);
const proposal = { alternativeId: "stay-on-trace", claim: "plausible-choice", summary: "The Spark prefers the known route.", evidenceEventIds: ["event-1"] };
const response = () => ({ ok: true, countedInputTokens: 100, response: { modelVersion: SPARK_LIVE_MODEL, usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 60, thoughtsTokenCount: 30, totalTokenCount: 190 }, candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(proposal) }] } }] } });

test("provider failure diagnostics retain only bounded stage/status codes and unknown holds",async()=>{
 for(const [receipt,code] of [
  [{ok:false,stage:"countTokens",httpStatus:403,error:"private token and provider response"},"provider-countTokens-http-403"],
  [{ok:false,stage:"countTokens",failureKind:"request-deadline"},"provider-countTokens-request-deadline"],
  [{ok:false,stage:"private secret",failureKind:"private secret"},"provider-request-failed"]
 ] as const) {
  const file=path(),provider=createSparkLiveProvider(file,async()=>receipt);
  await assert.rejects(provider.interpret(context()));assert.equal(provider.budgetStatus().uncertain,1);assert.equal(provider.budgetStatus().unsettledMicrousd,500000);await provider.close();
  const db=new DatabaseSync(file,{readOnly:true});assert.equal((db.prepare("SELECT error_code FROM ai_attempts").get() as any).error_code,code);db.close();
 }
});

test("USD 5 cumulative reservations survive reopen, duplicate contexts and exhaustion", () => {
  const file = path(); let budget = new SparkAIBudget(file);
  for (let i = 1; i <= 10; i++) { const id = budget.reserve(hash(i)); budget.complete(id, proposal, { estimatedTokenCostMicrousd: 300 }); }
  assert.equal(budget.snapshot().reservedMicrousd, 5000000);
  assert.throws(() => budget.reserve(hash(11)), /exhausted/);
  budget.close(); budget = new SparkAIBudget(file);
  assert.equal(budget.snapshot().remainingMicrousd, 0);
  assert.deepEqual(budget.cached(hash(1)), proposal);
  assert.throws(() => budget.reserve(hash(11)), /exhausted/);
  budget.close();
});

test("in-flight requests exclude another writer; uncertain charges never refund or retry", () => {
  const file = path(), first = new SparkAIBudget(file), second = new SparkAIBudget(file);
  const id = first.reserve(hash(1));
  assert.throws(() => second.reserve(hash(2)), /in flight/);
  first.uncertain(id, "test-cancellation");
  assert.throws(() => second.cached(hash(1)), /uncertain/);
  assert.equal(second.snapshot().reservedMicrousd, 500000);
  second.stop(); first.close(); second.close();
  const reopened = new SparkAIBudget(file); assert.equal(reopened.snapshot().stopped, true); assert.throws(() => reopened.reserve(hash(2)), /stopped/); reopened.close();
});

test("live wire is bounded fictional context with one minimal-thinking JSON candidate", () => {
  const body = sparkWire({ ...context(), unrelatedSecret: "excluded" } as any), payload = JSON.parse(body);
  assert.equal(body.includes("excluded"), false); assert.equal(body.includes("khozak"), false);
  assert.equal(payload.generationConfig.maxOutputTokens, 2048); assert.equal(payload.generationConfig.candidateCount, 1);
  assert.deepEqual(payload.generationConfig.thinkingConfig, { thinkingLevel: "MINIMAL" });
  assert.equal(payload.generationConfig.temperature, undefined);
  assert.throws(() => sparkWire({ ...context(), event: { ...context().event, message: "x".repeat(17000) } }), /wire limit/);
});

test("synthetic broker exercises real validation, retained budget, recorded replay and two-failure stop", async () => {
  const file = path(); let calls = 0;
  const provider = createSparkLiveProvider(file, async () => { calls++; return response(); });
  assert.deepEqual(await provider.interpret(context()), proposal);
  assert.deepEqual(await provider.interpret(context()), proposal);
  assert.equal(calls, 1); assert.equal(provider.budgetStatus().reservedMicrousd, 500000);
  await provider.close();
  const restored = createSparkLiveProvider(file, async () => assert.fail("replay must not call broker"));
  assert.deepEqual(await restored.interpret(context()), proposal); await restored.close();
  const broken = createSparkLiveProvider(path(), async () => ({ ok: false, stage: "generateContent", httpStatus: 503 }));
  await assert.rejects(broken.interpret(context(2))); await assert.rejects(broken.interpret(context(3)));
  assert.equal(broken.budgetStatus().stopped, true); assert.equal(broken.budgetStatus().reservedMicrousd, 1000000);
  await assert.rejects(broken.interpret(context(4))); await broken.close();
});

test("bad model, excess thinking, hidden evidence and truncated output fail to rules with retained reservations", async () => {
  for (const mutate of [(r: any) => r.response.modelVersion = "wrong", (r: any) => r.response.usageMetadata.thoughtsTokenCount = 65537, (r: any) => r.response.candidates[0].content.parts[0].text = JSON.stringify({ ...proposal, evidenceEventIds: ["hidden"] }), (r: any) => r.response.candidates[0].finishReason = "MAX_TOKENS", (r: any) => r.countedInputTokens = 16385]) {
    const provider = createSparkLiveProvider(path(), async () => { const r = response(); mutate(r); return r; });
    await assert.rejects(provider.interpret(context()));
    assert.equal(provider.budgetStatus().uncertain, 1); assert.equal(provider.budgetStatus().reservedMicrousd, 500000); await provider.close();
  }
});

test("explicit continuation preserves the cap and receipts, checks exact headroom and leaves an audit record", () => {
  const file = path(); let budget = new SparkAIBudget(file);
  for (let i = 1; i <= 2; i++) { const id = budget.reserve(hash(i)); budget.complete(id, proposal, { estimatedTokenCostMicrousd: 300 }); }
  budget.stop();
  assert.throws(() => budget.resume(3500000, "owner authorization"), /exact remaining/);
  assert.equal(budget.snapshot().stopped, true);
  budget.resume(4000000, "Owner authorized continuation with remaining USD 4.00");
  assert.equal(budget.snapshot().reservedMicrousd, 1000000);
  assert.equal(budget.snapshot().capMicrousd, 5000000);
  assert.equal(budget.snapshot().attempts, 2);
  assert.deepEqual(budget.cached(hash(1)), proposal);
  assert.throws(() => budget.resume(4000000, "duplicate authorization"), /stopped spending/);
  budget.close(); budget = new SparkAIBudget(file);
  assert.equal(budget.snapshot().stopped, false);
  const audit = new DatabaseSync(file, { readOnly: true });
  assert.deepEqual({ ...audit.prepare("SELECT authorized_remaining,reserved_before,attempt_count FROM budget_resumptions").get() }, { authorized_remaining: 4000000, reserved_before: 1000000, attempt_count: 2 });
  audit.close();
  for (let i = 3; i <= 10; i++) { const id = budget.reserve(hash(i)); budget.complete(id, proposal, { estimatedTokenCostMicrousd: 300 }); }
  budget.stop();
  assert.throws(() => budget.resume(0, "no money remaining"), /invalid/);
  assert.throws(() => budget.reserve(hash(11)), /stopped or exhausted/);
  budget.close();
});

test("continuation cannot release unresolved or uncertain attempts", () => {
  const budget = new SparkAIBudget(path());
  const id = budget.reserve(hash(1)); budget.stop();
  assert.throws(() => budget.resume(4500000, "owner authorization"), /no unresolved/);
  budget.uncertain(id, "unknown completion");
  assert.throws(() => budget.resume(4500000, "owner authorization"), /no unresolved/);
  assert.equal(budget.snapshot().stopped, true);
  assert.equal(budget.snapshot().reservedMicrousd, 500000);
  budget.close();
});

test("a rejected completion with verified usage settles buffered cost without reusing the proposal", async () => {
  const file=path(),budget=new SparkAIBudget(file);budget.stop();budget.adoptRecordedCosts("Owner approved recorded-cost accounting");budget.resume(4900000,"Owner approved qualification");budget.close();
  let calls=0;
  const provider=createSparkLiveProvider(file,async()=>{calls++;const result=response();result.response.candidates[0].finishReason="MAX_TOKENS";return result;});
  await assert.rejects(provider.interpret(context()));
  assert.equal(provider.budgetStatus().rejected,1);assert.equal(provider.budgetStatus().uncertain,0);
  assert.equal(provider.budgetStatus().estimatedTokenCostMicrousd,281);assert.equal(provider.budgetStatus().accountedMicrousd,100562);
  await assert.rejects(provider.interpret(context()),/prior/);assert.equal(calls,1);await provider.close();
});
