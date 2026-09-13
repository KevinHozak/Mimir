import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.env.MIMIR_AI_P18_REPORT ?? ".tmp/ai-p18-cadence-review.json");
assert.equal(existsSync(path), true, `missing P18 report: ${path}`);
const report = JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(report.fixedSeeds, [2, 4, 8, 16]);
assert.equal(report.encountersPerSeed, 32);
assert.deepEqual(report.budgetLadder, [2, 4, 8, 16]);
assert.equal(report.ticksPerDay, 64);
assert.equal(report.acceptance.everyBasisTested, true);
assert.equal(report.acceptance.everySeedTested, true);
assert.equal(report.acceptance.cadenceRecorded, true);
assert.equal(report.acceptance.safetyPassed, true);
assert.equal(report.acceptance.providerFreeReplay, true);
assert.equal(report.acceptance.noBroaderDeployment, true);
assert.equal(report.decision, "live-quality-rerun-required");
for (const basis of report.basisResults) {
  assert.deepEqual(Object.values(basis.sparkDailyLimits), [2, 4, 8, 16]);
  assert.equal(basis.seeds.length, 4);
  assert.equal(basis.safety.noBurst, true);
  assert.equal(basis.safety.replayProviderFree, true);
}
console.log("AI-P18 cadence-review evidence checks passed");
