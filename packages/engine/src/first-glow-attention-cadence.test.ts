import assert from "node:assert/strict";
import test from "node:test";
import {
  createFirstGlowAttentionBudget,
  createFirstGlowDecisionCadence,
  decisionBudgetFromAgeDays,
  decisionBudgetFromReadinessTier,
  requestFirstGlowAttention
} from "./first-glow-attention.js";
import type { StructuredEvent } from "./structured.js";

const event = (id: string, tick: number, actorId = "spark-1"): StructuredEvent => ({ id, tick, kind: "explore", actorId, message: "A new route glows." });

test("budget determinants use the bounded powers-of-two ladder", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(decisionBudgetFromReadinessTier), [2, 4, 8, 16, 16]);
  assert.deepEqual([0, 1, 2, 4, 8, 12].map(decisionBudgetFromAgeDays), [2, 2, 4, 8, 16, 16]);
});

test("cadence spaces opportunities and records the scheduled window", () => {
  const cadence = createFirstGlowDecisionCadence("spark-1", 4, 64);
  const budget = createFirstGlowAttentionBudget({ sparkDailyLimits: { "spark-1": 4 }, ticksPerDay: 64, repeatedEventCooldownTicks: 0 });
  const first = requestFirstGlowAttention(event("first", cadence.phaseOffset), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true });
  const early = requestFirstGlowAttention(event("early", cadence.phaseOffset + 1), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true });
  const second = requestFirstGlowAttention(event("second", cadence.phaseOffset + cadence.intervalTicks), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true });
  assert.equal(first.created, true);
  assert.equal(first.cadenceIntervalTicks, 16);
  assert.equal(first.cadencePhaseOffset, cadence.phaseOffset);
  assert.equal(first.cadenceWindowIndex, 0);
  assert.equal(early.reason, "cadence-window-not-ready");
  assert.equal(early.created, false);
  assert.equal(second.created, true);
  assert.equal(second.cadenceWindowIndex, 1);
  assert.equal(budget.perSparkUsed["spark-1"], 2);
});

test("cadence resets deterministically at day rollover without debt", () => {
  const cadence = createFirstGlowDecisionCadence("spark-1", 2, 64);
  const budget = createFirstGlowAttentionBudget({ sparkDailyLimits: { "spark-1": 2 }, ticksPerDay: 64, repeatedEventCooldownTicks: 0 });
  const first = requestFirstGlowAttention(event("day-zero", cadence.phaseOffset), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true });
  const rollover = requestFirstGlowAttention(event("day-one", 64 + cadence.phaseOffset), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true });
  assert.equal(first.created, true);
  assert.equal(rollover.created, true);
  assert.equal(rollover.simulatedDay, 1);
  assert.equal(rollover.cadenceWindowIndex, 0);
  assert.equal(budget.perSparkUsed["spark-1"], 1);
});

test("global contention suppresses a ready cadence window without creating debt", () => {
  const cadence = createFirstGlowDecisionCadence("spark-1", 2, 64);
  const budget = createFirstGlowAttentionBudget({ sparkDailyLimits: { "spark-1": 2, "spark-2": 2 }, globalDailyLimit: 1, ticksPerDay: 64, repeatedEventCooldownTicks: 0 });
  assert.equal(requestFirstGlowAttention(event("one", cadence.phaseOffset, "spark-1"), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true }).created, true);
  const other = createFirstGlowDecisionCadence("spark-2", 2, 64);
  const suppressed = requestFirstGlowAttention(event("two", other.phaseOffset, "spark-2"), budget, { ticksPerDay: 64, repeatedEventCooldownTicks: 0, spaceOpportunities: true });
  assert.equal(suppressed.reason, "global-budget-exhausted");
  assert.equal(budget.perSparkUsed["spark-2"] ?? 0, 0);
});
