import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { STUDY_MODEL, SYNTHETIC_PRICES, serializeStudyRequest, validateStudyWire, validateStudyUsage, requestCostBound, studyBudgetPlan } from "./model-study-v4.mjs";
import { makeContexts } from "./first-glow-lives-p5-study.mjs";
import { openStudyGuard } from "./model-study-guard.mjs";
import { studyTransport } from "./model-study-transport.mjs";

const context = makeContexts(2, "dependable-supply")[0].context;
const receipt = () => ({ modelVersion: STUDY_MODEL, usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30, thoughtsTokenCount: 20, totalTokenCount: 150 } });
const base = resolve(".tmp/model-study-v4-tests");
mkdirSync(base, { recursive: true });

test("v4 serialization pins multi-region identity and explicitly bounds one minimal-thinking candidate", () => {
  const wire = serializeStudyRequest("synthetic-study", { ...context, privateUnrelatedMaterial: "must-not-serialize" });
  validateStudyWire(wire.endpoint, wire.body, "synthetic-study");
  assert.match(wire.endpoint, /^https:\/\/aiplatform\.us\.rep\.googleapis\.com\/v1\/projects\/synthetic-study\/locations\/us\/publishers\/google\/models\/gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(wire.body.includes("must-not-serialize"), false);
  const config = JSON.parse(wire.body).generationConfig;
  assert.deepEqual(config.thinkingConfig, { thinkingLevel: "MINIMAL" });
  assert.equal(config.candidateCount, 1);
  for (const key of ["temperature", "topP", "topK", "presencePenalty", "frequencyPenalty"]) assert.equal(key in config, false);
  for (const endpoint of [wire.endpoint.replace("aiplatform.us.rep.googleapis.com", "us-aiplatform.googleapis.com"), wire.endpoint.replace("3.5", "2.5"), wire.endpoint + "?key=invalid", wire.endpoint.replace("synthetic-study", "other-project")]) assert.throws(() => validateStudyWire(endpoint, wire.body, "synthetic-study"));
  for (const mutate of [p => p.tools = [], p => p.continuationToken = "x", p => p.generationConfig.temperature = 0, p => p.generationConfig.candidateCount = 2, p => p.generationConfig.thinkingConfig.thinkingBudget = 0, p => p.contents[0].parts.push({ fileData: {} })]) {
    const payload = JSON.parse(wire.body); mutate(payload);
    assert.throws(() => validateStudyWire(wire.endpoint, JSON.stringify(payload), "synthetic-study"));
  }
});

test("cost includes reasoning, rounds upward and protects three-seed affordability and overhead", () => {
  assert.equal(requestCostBound(SYNTHETIC_PRICES), 185983);
  assert.deepEqual(studyBudgetPlan(SYNTHETIC_PRICES, 0, 100000), { reserveMicrousd: 185983, fundedAttempts: 4, overheadReserveMicrousd: 100000, priorAllocationMicrousd: 0 });
  assert.equal(studyBudgetPlan(SYNTHETIC_PRICES, 342051, 100000).fundedAttempts, 3);
  assert.equal(studyBudgetPlan(SYNTHETIC_PRICES, 342052, 100000).fundedAttempts, 2);
  assert.equal(studyBudgetPlan({ ...SYNTHETIC_PRICES, inputTokenUpperBound: 1048576 }, 0, 100000).fundedAttempts, 1);
  for (const change of [{ reasoningTokenUpperBound: undefined }, { inputTokenUpperBound: 16383 }, { billableOutputTokenUpperBound: 128 }, { inputMicrousdPerMillion: 329999 }, { outputMicrousdPerMillion: Number.MAX_SAFE_INTEGER }]) assert.throws(() => requestCostBound({ ...SYNTHETIC_PRICES, ...change }));
  for (const prior of [undefined, null, -1, 0.1, 1000001]) assert.throws(() => studyBudgetPlan(SYNTHETIC_PRICES, prior, 100000));
  assert.throws(() => studyBudgetPlan(SYNTHETIC_PRICES, 0, 99999));
});

test("reasoning and cache receipts reconcile without discounting or silently accepting unknown charges", () => {
  const valid = receipt(); valid.usageMetadata.cachedContentTokenCount = 60;
  valid.usageMetadata.promptTokensDetails = [{ modality: "TEXT", tokenCount: 100 }];
  const checked = validateStudyUsage(valid, SYNTHETIC_PRICES);
  assert.equal(checked.inputTokens, 100);
  assert.equal(checked.billableOutputTokens, 50);
  assert.equal(checked.reasoningTokens, 20);
  for (const mutate of [p => delete p.usageMetadata.thoughtsTokenCount, p => p.usageMetadata.totalTokenCount = 149, p => p.usageMetadata.thoughtsTokenCount = 65537, p => p.usageMetadata.promptTokenCount = 16385, p => p.usageMetadata.candidatesTokenCount = 129, p => p.usageMetadata.totalTokenCount = 1.5, p => p.usageMetadata.toolUsePromptTokenCount = 1, p => p.usageMetadata.cachedContentTokenCount = 101, p => p.usageMetadata.promptTokensDetails = [{ modality: "IMAGE", tokenCount: 100 }], p => p.usageMetadata.trafficType = "PROVISIONED_THROUGHPUT", p => p.modelVersion = "gemini-2.5-flash-lite", p => delete p.modelVersion]) {
    const invalid = receipt(); mutate(invalid); assert.throws(() => validateStudyUsage(invalid, SYNTHETIC_PRICES));
  }
});

test("durable funded allowance reserves later seeds and never refunds low reported usage", async () => {
  const plan = studyBudgetPlan(SYNTHETIC_PRICES, 0, 100000);
  const guard = openStudyGuard(mkdtempSync(join(base, "guard-")), "b".repeat(64), { overheadReserveMicrousd: 100000, fundedAttempts: 4, fixedReserveMicrousd: plan.reserveMicrousd, minimumSeeds: [2, 4, 8] });
  const attempt = seed => guard.attempt({ seed, input: "fixture", reserveMicrousd: plan.reserveMicrousd }, async ({ recordUsage }) => recordUsage(validateStudyUsage(receipt(), SYNTHETIC_PRICES)));
  try {
    await attempt(2); await attempt(2);
    await assert.rejects(attempt(2), /budget cap/);
    await attempt(4); await attempt(8);
    await assert.rejects(attempt(8), /budget cap/);
    assert.equal(guard.snapshot().attempts.length, 4);
    assert.equal(guard.snapshot().attempts.reduce((n, a) => n + a.reserveMicrousd, guard.snapshot().overheadReserveMicrousd), 843932);
    assert.ok(guard.snapshot().attempts.every(a => a.settledCostMicrousd === null));
  } finally { guard.close(); }
});

test("worker rejects wrong host/model before its network branch", async () => {
  const wire = serializeStudyRequest("synthetic-study", context);
  // Both requests are intentionally inadmissible; no valid live request is exercised.
  for (const endpoint of [wire.endpoint.replace("aiplatform.us.rep.googleapis.com", "127.0.0.1:1"), wire.endpoint.replace("3.5", "2.5")]) {
    await assert.rejects(studyTransport({ mode: "live", admitted: true, endpoint, projectId: "synthetic-study", body: wire.body, authorization: "invalid-test-only" }));
  }
});
