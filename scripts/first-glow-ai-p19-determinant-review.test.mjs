import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.env.MIMIR_AI_P19_REPORT ?? ".tmp/ai-p19-determinant-review.json");
assert.equal(existsSync(path), true, `missing P19 report: ${path}`);
const report = JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(report.fixedSeeds, [2, 4, 8, 16]);
assert.equal(report.encountersPerSeed, 32);
assert.deepEqual(report.budgetLadder, [2, 4, 8, 16]);
assert.equal(report.acceptance.bothDeterminantsTested, true);
assert.equal(report.acceptance.matchedSeeds, true);
assert.equal(report.acceptance.cadenceMeasured, true);
assert.equal(report.acceptance.qualityMeasured, true);
assert.equal(report.acceptance.fairnessMeasured, true);
assert.equal(report.acceptance.safetyPassed, true);
assert.equal(report.acceptance.providerFreeReplay, true);
assert.equal(report.acceptance.withinHardCap, true);
assert.equal(report.acceptance.noBroaderDeployment, true);
assert.equal(report.basisResults.length, 2);
for (const basis of report.basisResults) {
  assert.deepEqual(Object.values(basis.sparkDailyLimits), [2, 4, 8, 16]);
  assert.equal(basis.seeds.length, 4);
  assert.equal(basis.safety.noBurst, true);
  assert.equal(basis.safety.replayProviderFree, true);
  assert.equal(typeof basis.fairness.universallyDominant, "boolean");
}
assert.equal(report.decision, "live-quality-rerun-required");
console.log("AI-P19 determinant-review evidence checks passed");
