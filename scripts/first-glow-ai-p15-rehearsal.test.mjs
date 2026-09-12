import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), process.env.MIMIR_AI_P15_REPORT ?? ".tmp/ai-p15-private-hosted-rehearsal.json");
assert.equal(existsSync(path), true, `missing P15 report: ${path}`);
const report = JSON.parse(readFileSync(path, "utf8"));
assert.equal(report.fixedSeed, 20260912);
assert.equal(report.encounters, 32);
assert.equal(report.budgets.perSparkDailyLimit, 4);
assert.equal(report.budgets.globalDailyLimit, 16);
assert.equal(report.budgets.hardCapCents, 100);
assert.equal(report.budgets.withinCaps, true);
assert.equal(report.acceptance.privateHostedOnly, true);
assert.equal(report.acceptance.deterministicAuthority, true);
assert.equal(report.acceptance.capsAdhered, true);
assert.equal(report.acceptance.replayProviderFree, true);
assert.equal(report.acceptance.noBroaderDeployment, true);
assert.equal(report.replay.providerCalls, 0);
assert.equal(report.replay.budgetUnitsUsed, 0);
assert.equal(report.outcomes.changedChoices > 0, true);
assert.equal(report.outcomes.changedDownstream > 0, true);
assert.equal(report.decision, "live-rehearsal-required");
console.log("AI-P15 rehearsal evidence checks passed");

