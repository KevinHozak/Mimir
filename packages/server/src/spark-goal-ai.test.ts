import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { buildFirstGlowGoalContext, advanceWorld, type FirstGlowInterpretationContext } from "@mimir/engine";
import { createGoalFixtureWorld } from "../../engine/dist/first-glow-goals-fixture.js";
import { createSparkLiveProvider, sparkGoalWire, SPARK_LIVE_MODEL } from "./spark-ai-live.js";
import { FirstGlowServerAIRuntime, type FirstGlowServerAIConfig } from "./first-glow-ai-runtime.js";
import { normalizeState } from "./state.js";
import { bundleHash } from "@mimir/world-data";

const root = fileURLToPath(new URL("../../../.tmp/s019-tests/", import.meta.url));
mkdirSync(root, { recursive: true });
const budgetPath = () => join(mkdtempSync(join(root, "budget-")), "budget.db");
const goalContext = () => buildFirstGlowGoalContext(createGoalFixtureWorld().firstGlowState, "spark-1")!;
function reply(body: string) {
  const wire = JSON.parse(body), context = JSON.parse(wire.contents[0].parts[0].text.split("\n").at(-1));
  const proposal = wire.generationConfig.responseSchema.properties.kind
    ? { kind: context.candidates.includes("explore-shape") ? "explore-shape" : context.candidates[0], summary: "Follow the trace and examine a pattern shard.", evidenceEventIds: context.evidenceEventIds.slice(0, 1) }
    : { alternativeId: context.supportedAlternatives[0], claim: "plausible-choice", summary: "A locally grounded choice.", evidenceEventIds: context.witnessedEvidenceEventIds.slice(0, 1) };
  return { ok: true, countedInputTokens: 100, response: { modelVersion: SPARK_LIVE_MODEL, usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 60, thoughtsTokenCount: 30, totalTokenCount: 190 }, candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(proposal) }] } }] } };
}
function config(provider: ReturnType<typeof createSparkLiveProvider>): FirstGlowServerAIConfig {
  return { requested: true, enabled: true, runtimeMode: "bounded-internal-pilot", rollout: "internal", providerId: provider.providerId, model: SPARK_LIVE_MODEL, hardCapCents: 500, reason: "synthetic-test", provider, goalProvider: timelineId => ({ providerId: provider.providerId, propose: context => provider.proposeGoal(context, timelineId) }), goalReceipt: provider.goalReceipt, budgetStatus: provider.budgetStatus, stop: provider.stop, close: provider.close };
}

test("goal wire offers real alternatives, own values and memory while excluding unrelated secrets", () => {
  const context = goalContext();
  assert.ok(context.candidates.includes("explore-mark") && context.candidates.includes("explore-shape"));
  assert.ok(context.personality?.valueTendencies.length);
  assert.ok(context.relationships?.trust.every(t => t.sourceSparkId === context.sparkId));
  const wire = sparkGoalWire({ ...context, secret: "exclude-private-server-value" } as any);
  assert.equal(wire.includes("exclude-private-server-value"), false);
  assert.equal(wire.includes("khozak"), false);
  assert.equal(JSON.parse(wire).generationConfig.maxOutputTokens, 2048);
  assert.throws(() => sparkGoalWire({ ...context, projection: undefined, memory: { ...context.memory, omittedCount: 0, memories: [{ summary: "x".repeat(17000) }] as any } }), /wire limit/);
});

test("goal receipts reuse the same durable allocation as social choices and replay after reopen without spending", async () => {
  const file = budgetPath(), context = goalContext(); let calls = 0;
  const provider = createSparkLiveProvider(file, async body => { calls++; return reply(body); });
  const first = await provider.proposeGoal(context, "world-a");
  assert.deepEqual(await provider.proposeGoal(context, "world-a"), first);
  assert.equal(calls, 1);
  await provider.proposeGoal(context, "world-b");
  const interpretation = { contextHash: "sha256-" + "a".repeat(64), supportedAlternatives: ["stay-on-trace"], event: { evidenceEventIds: ["event-1"] }, witnessedEvidenceEventIds: ["event-1"] } as unknown as FirstGlowInterpretationContext;
  await provider.interpret(interpretation);
  assert.equal(provider.budgetStatus().reservedMicrousd, 1500000);
  assert.equal(provider.goalReceipt(context, "world-a")?.status, "completed");
  assert.equal(provider.goalReceipt(context, "world-a")?.usage.inputTokens, 100);
  await provider.close();
  const reopened = createSparkLiveProvider(file, async () => assert.fail("cached selection must not dispatch"));
  assert.deepEqual(await reopened.proposeGoal(context, "world-a"), first);
  assert.equal(reopened.budgetStatus().attempts, 3);
  await reopened.close();
});

test("runtime persists alternatives, usage and selection; rollback retry reuses receipts and reflection is shared", async () => {
  const world = createGoalFixtureWorld({ eventAdmission: true });
  const before = JSON.stringify(world);
  const file = budgetPath(); let calls = 0;
  let provider = createSparkLiveProvider(file, async body => { calls++; return reply(body); });
  let runtime = new FirstGlowServerAIRuntime(config(provider), { goals: true, rcAdmission: "event-rc-v1" });
  const selected = await runtime.evaluateGoals(world.firstGlowState, world.worldId);
  assert.equal(JSON.stringify(world), before);
  assert.equal(selected.events.length, 2);
  assert.ok(selected.state.goalLoops!.goals.every(g => g.source === "ai" && g.kind === "explore-shape" && g.providerReceipt?.status === "completed"));
  assert.ok(selected.state.history!.decisions.some(d => d.trigger === "goal-selection" && d.candidates.length >= 2 && d.usage.inputTokens === 100));
  await runtime.evaluate(selected.state, world.firstGlowState.events);
  assert.equal(calls, 2, "goal and social choices cannot spend the same reflection slot");
  await provider.close();
  provider = createSparkLiveProvider(file, async () => assert.fail("rollback must reuse durable receipt"));
  runtime = new FirstGlowServerAIRuntime(config(provider), { goals: true, rcAdmission: "event-rc-v1" });
  const retry = await runtime.evaluateGoals(world.firstGlowState, world.worldId);
  assert.deepEqual(retry, selected);
  const restored = normalizeState(JSON.parse(JSON.stringify({ ...world, firstGlowState: retry.state })));
  assert.equal((await runtime.evaluateGoals(restored.firstGlowState, world.worldId)).events.length, 0);
  const historical = await runtime.evaluateGoals(restored.firstGlowState, world.worldId, true);
  assert.equal(historical.state, restored.firstGlowState);
  let advanced = restored;
  for (let i = 0; i < 130 && advanced.firstGlowState.goalLoops!.goals.some(g => g.status === "active"); i++) advanced = advanceWorld(advanced, { eventAdmissionPolicy: "event-rc-v1" }).state;
  assert.ok(advanced.firstGlowState.goalLoops!.goals.every(g => g.status === "completed"), JSON.stringify(advanced.firstGlowState.goalLoops!.goals.map(g => ({ spark: g.sparkId, step: g.step, status: g.status, reason: g.reason }))));
  assert.equal(provider.budgetStatus().attempts, 2);
  await provider.close();
});

test("invalid/hidden goal output fails to rules; failure stop survives reopen and never retries uncertain contexts", async () => {
  const file = budgetPath(), context = goalContext(); let calls = 0;
  const broken = async (body: string) => { calls++; const response = reply(body); response.response.candidates[0].content.parts[0].text = JSON.stringify({ kind: "explore-shape", summary: "Invented future", evidenceEventIds: ["hidden-future"] }); return response; };
  let provider = createSparkLiveProvider(file, broken);
  const runtime = new FirstGlowServerAIRuntime(config(provider), { goals: true, rcAdmission: "event-rc-v1" });
  const selected = await runtime.evaluateGoals(createGoalFixtureWorld({ eventAdmission: true }).firstGlowState, "invalid-world");
  assert.ok(selected.state.goalLoops!.goals.every(g => g.source === "rules"));
  assert.equal(provider.budgetStatus().stopped, true);
  await provider.close();
  provider = createSparkLiveProvider(file, broken);
  await assert.rejects(provider.proposeGoal(context, "another-world"));
  assert.equal(calls, 2);
  await provider.close();
  const uncertainFile = budgetPath();
  provider = createSparkLiveProvider(uncertainFile, broken);
  await assert.rejects(provider.proposeGoal(context, "one"));
  const savedCalls = calls;
  await provider.close();
  provider = createSparkLiveProvider(uncertainFile, broken);
  await assert.rejects(provider.proposeGoal(context, "one"));
  assert.equal(calls, savedCalls);
  await assert.rejects(provider.proposeGoal(context, "two"));
  assert.equal(provider.budgetStatus().stopped, true, "two failures across a reopen stop spending");
  await provider.close();
});

test("timeout retains the reservation, stops spending and ignores a late response", async () => {
  let release!: (value: unknown) => void;
  const context = goalContext();
  const provider = createSparkLiveProvider(budgetPath(), () => new Promise(resolve => { release = resolve; }), { timeoutMs: 5 });
  await assert.rejects(provider.proposeGoal(context, "timeout-world"));
  assert.equal(provider.budgetStatus().uncertain, 1);
  assert.equal(provider.budgetStatus().stopped, true);
  release(reply(sparkGoalWire(context)));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(provider.budgetStatus().completed, 0);
  assert.equal(provider.budgetStatus().reservedMicrousd, 500000);
  await provider.close();
});

test("shared exhaustion and owner stop admit no new broker calls; rules fallback remains available", async () => {
  const context = goalContext(); let calls = 0;
  const provider = createSparkLiveProvider(budgetPath(), async body => { calls++; return reply(body); });
  for (let i = 0; i < 10; i++) await provider.proposeGoal(context, `world-${i}`);
  await assert.rejects(provider.proposeGoal(context, "exhausted"));
  assert.equal(calls, 10);
  assert.equal(provider.budgetStatus().remainingMicrousd, 0);
  const runtime = new FirstGlowServerAIRuntime(config(provider), { goals: true, rcAdmission: "event-rc-v1" });
  const result = await runtime.evaluateGoals(createGoalFixtureWorld({ eventAdmission: true }).firstGlowState, "fallback-world");
  assert.ok(result.state.goalLoops!.goals.every(g => g.source === "rules"));
  provider.stop();
  const stopped = await runtime.evaluateGoals(createGoalFixtureWorld({ eventAdmission: true }).firstGlowState, "stopped-world");
  assert.ok(stopped.state.goalLoops!.goals.every(g => g.fallbackReason === "provider-stopped"));
  assert.equal(calls, 10);
  await provider.close();
});

test("one feasible alternative selects rules without spending a request", async () => {
  const world = createGoalFixtureWorld({ eventAdmission: true });
  const settlement = world.firstGlowState.settlements[0];
  const mark = settlement.bundle.objects.find(o => settlement.bundle.objectDefinitions[o.definitionId].capabilities.includes("light-mark"))!;
  // Controlled geometry with no mark site leaves only the shard goal.
  settlement.bundle = structuredClone(settlement.bundle);
  settlement.bundle.objects = settlement.bundle.objects.filter(o => o.id !== mark.id);
  settlement.bundle.bundle.contentHash = bundleHash(settlement.bundle);
  const provider = createSparkLiveProvider(budgetPath(), async () => assert.fail("one alternative must not dispatch"));
  const runtime = new FirstGlowServerAIRuntime(config(provider), { goals: true, rcAdmission: "event-rc-v1" });
  const result = await runtime.evaluateGoals(world.firstGlowState, "one-choice");
  assert.equal(result.events.length, 2);
  assert.ok(result.state.goalLoops!.goals.every(g => g.kind === "explore-shape" && g.source === "rules" && g.fallbackReason === "no-consequential-alternative"));
  assert.equal(provider.budgetStatus().attempts, 0);
  await provider.close();
});

 test("local goal rejection records no paid attempt", async () => {
  let calls = 0;
  const provider = createSparkLiveProvider(budgetPath(), async () => { calls++; throw Error("unexpected"); });
  const context = goalContext();
  await assert.rejects(provider.proposeGoal({ ...context, projection: undefined, personality: { oversized: "x".repeat(20000) } as any }, "local-rejection"), /wire limit/);
  assert.equal(calls, 0);
  assert.equal(provider.budgetStatus().attempts, 0);
  assert.equal(provider.budgetStatus().reservedMicrousd, 0);
  assert.deepEqual(provider.telemetry, [{ purpose: "goal", outcome: "rejected-locally", reason: "goal-context-too-large", reservedMicrousd: 0 }]);
  await provider.close();
});
