import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const report = JSON.parse(readFileSync(resolve(process.cwd(), "docs/evidence/ai-p9-hybrid-pilot-2026-09-12.json"), "utf8"));
assert.equal(report.budgetRehearsal.providerCalls, 16);
assert.equal(report.budgetRehearsal.providerOpportunities, 16);
assert.equal(report.budgetRehearsal.providerCalls + report.budgetRehearsal.fallbackOutcomes, 16);
assert.equal(report.budgetRehearsal.perSparkMaximumUsed, 4);
assert.equal(report.budgetRehearsal.globalMaximumUsed, 16);
assert.equal(report.staging.accepted, 16);
assert.equal(report.staging.runtimeAuthorityChanges, 0);
assert.equal(report.replay.historicalReplayProviderCalls, 0);
assert.equal(report.cost.newCostCents, 0);
assert.equal(report.acceptance.completeStateDiffsRecorded, true);
console.log("First Glow hybrid pilot evidence tests passed");

