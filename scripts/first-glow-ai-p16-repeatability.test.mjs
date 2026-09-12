import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.env.MIMIR_AI_P16_REPORT ?? ".tmp/ai-p16-repeatability.json");
assert.equal(existsSync(path), true, `missing P16 report: ${path}`);
const report = JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(report.fixedSeeds, [2, 4, 8, 16]);
assert.equal(report.encountersPerSeed, 32);
assert.equal(report.seeds.length, 4);
assert.equal(report.budgets.perSparkDailyLimit, 4);
assert.equal(report.budgets.globalDailyLimit, 16);
assert.equal(report.budgets.hardCapCents, 100);
assert.equal(report.budgets.withinCaps, true);
assert.equal(report.acceptance.safetyPassed, true);
assert.equal(report.acceptance.providerFreeReplay, true);
assert.equal(report.acceptance.noBroaderDeployment, true);
assert.equal(report.provider.calls, 0);
assert.equal(report.decision, "live-rehearsal-required");
assert.equal(report.summary.usefulSeeds, 4);
for (const seed of report.seeds) {
  assert.equal(seed.encounters, 32);
  assert.equal(seed.safety.proposalValidity, true);
  assert.equal(seed.safety.replayProviderFree, true);
  assert.equal(seed.useful, true);
}
console.log("AI-P16 repeatability evidence checks passed");

