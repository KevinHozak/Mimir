import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.env.MIMIR_AI_P17_REPORT ?? ".tmp/ai-p17-quality-review.json");
assert.equal(existsSync(path), true, `missing P17 report: ${path}`);
const report = JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(report.fixedSeeds, [2, 4, 8, 16]);
assert.equal(report.encountersPerSeed, 32);
assert.equal(report.summary.totalReviews, 128);
assert.equal(report.budgets.perSparkDailyLimit, 4);
assert.equal(report.budgets.globalDailyLimit, 16);
assert.equal(report.budgets.hardCapCents, 100);
assert.equal(report.budgets.withinCaps, true);
assert.equal(report.acceptance.safetyPassed, true);
assert.equal(report.acceptance.everyEncounterAdjudicated, true);
assert.equal(report.acceptance.fallbackCategoriesComplete, true);
assert.equal(report.acceptance.providerFreeReplay, true);
assert.equal(report.acceptance.noBroaderDeployment, true);
assert.equal(report.provider.calls, 0);
assert.equal(report.decision, "live-review-required");
assert.equal(report.reviewRecords.length, 128);
for (const review of report.reviewRecords) {
  assert.equal(review.rubric.evidenceGrounded, true);
  assert.equal(review.rubric.alternativeSupported, true);
  assert.equal(review.rubric.summaryBounded, true);
  assert.ok(["useful", "valid-no-downstream-change", "safe-deterministic-fallback", "deterministic-baseline"].includes(review.rubric.quality));
}
console.log("AI-P17 deterministic quality-review evidence checks passed");
