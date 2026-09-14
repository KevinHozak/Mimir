import assert from "node:assert/strict";
import test from "node:test";
import { createFirstGlowAttentionBudget, requestFirstGlowAttention } from "./first-glow-attention.js";
import type { StructuredEvent } from "./structured.js";

const event = (id: string, pulse: number, kind: StructuredEvent["kind"], actorId = "spark-1", message = kind): StructuredEvent => ({ id, pulse, kind, actorId, message });

test("attention trigger classification keeps routine events rules-only and records the reason", () => {
  const budget = createFirstGlowAttentionBudget();
  const decision = requestFirstGlowAttention(event("move-1", 1, "movement"), budget);
  assert.equal(decision.created, false);
  assert.equal(decision.reason, "ordinary-rules-only");
  assert.equal(budget.decisions.length, 1);
});

test("novelty gets one opportunity per event and repeated routine failure is cooled down", () => {
  const budget = createFirstGlowAttentionBudget({ perSparkDailyLimit: 4, globalDailyLimit: 10, repeatedEventCooldownPulses: 4 });
  const novelty = requestFirstGlowAttention(event("explore-1", 1, "explore"), budget);
  assert.equal(novelty.reason, "triggered");
  assert.equal(requestFirstGlowAttention(event("explore-1", 1, "explore"), budget).reason, "duplicate-event");
  const waits = [event("wait-1", 2, "wait"), event("wait-2", 3, "wait"), event("wait-3", 4, "wait")];
  waits.forEach((item, index) => assert.equal(requestFirstGlowAttention(item, budget, {}, waits.slice(0, index)).reason, index === 2 ? "triggered" : "ordinary-rules-only"));
  assert.equal(requestFirstGlowAttention(event("wait-4", 5, "wait"), budget, {}, waits).reason, "repeated-event-cooldown");
});

test("per-Spark and global caps are independent and replenish on the next simulated day", () => {
  const budget = createFirstGlowAttentionBudget({ perSparkDailyLimit: 2, globalDailyLimit: 3, repeatedEventCooldownPulses: 0 });
  assert.equal(requestFirstGlowAttention(event("a", 0, "explore", "spark-1"), budget).created, true);
  assert.equal(requestFirstGlowAttention(event("b", 0, "explore", "spark-2"), budget).created, true);
  assert.equal(requestFirstGlowAttention(event("c", 0, "explore", "spark-3"), budget).created, true);
  assert.equal(requestFirstGlowAttention(event("d", 0, "explore", "spark-1"), budget).reason, "global-budget-exhausted");
  assert.equal(requestFirstGlowAttention(event("e", 0, "explore", "spark-2"), budget).reason, "global-budget-exhausted");
  assert.equal(requestFirstGlowAttention(event("f", 4, "explore", "spark-1"), budget).created, true);
  assert.equal(budget.perSparkUsed["spark-1"], 1);
});

test("historical playback records a suppressed decision without spending a budget", () => {
  const budget = createFirstGlowAttentionBudget();
  const decision = requestFirstGlowAttention(event("history-1", 1, "meet"), budget, { historicalPlayback: true });
  assert.equal(decision.reason, "historical-playback");
  assert.equal(decision.created, false);
  assert.equal(budget.globalUsed, 0);
});
