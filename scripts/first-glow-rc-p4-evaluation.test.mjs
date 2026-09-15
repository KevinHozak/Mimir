import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "./rc-p4-telemetry.test.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const report = JSON.parse(readFileSync(resolve(root, "docs/evidence/rc-p4-matched-evaluation-2026-09-13.json"), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const expectedArms = ["rc2-all", "rc4-hero", "diagnostic-rc2", "diagnostic-rc4", "diagnostic-rc8", "diagnostic-rc16"];

assert(report.schemaVersion === 1, "RC-P4 report schema must be version 1");
assert(report.execution === "deterministic-control", "checked evidence must be the deterministic control run");
assert(JSON.stringify(report.fixedSeeds) === JSON.stringify([2, 4, 8, 16]), "matched seed matrix changed");
assert(report.days >= 4 && report.pulsesPerDay === 4, "evaluation must cover several complete days");
assert(JSON.stringify(report.arms.map(arm => arm.id)) === JSON.stringify(expectedArms), "RC diagnostic arms are incomplete");
assert(JSON.stringify(report.memoryConditions) === JSON.stringify(["young-hero", "experienced-ordinary"]), "memory comparison conditions are incomplete");
assert(report.results.length === 48, "expected 4 seeds x 6 arms x 2 memory conditions");
assert(report.acceptance.matchedInputs && report.acceptance.rc2VsRotatingRc4Hero, "matched RC comparison acceptance failed");
assert(report.acceptance.memoryCrossedIndependently && report.acceptance.encounterLedgerProvided, "memory or ledger acceptance failed");
assert(report.acceptance.replayProviderFree && report.acceptance.safetyPassed, "replay or safety acceptance failed");
assert(report.acceptance.withinHardCap && report.acceptance.noBroaderDeployment, "budget or deployment boundary failed");
for (const result of report.results) {
  assert(result.encounters === report.encountersPerSeed, `ledger length mismatch for ${result.seed}/${result.arm}/${result.memoryCondition}`);
  assert(result.ledger.every(row => row.explanationEvidenceEventIds && row.causalEventIds), "ledger provenance is incomplete");
}
console.log(`RC-P4 evidence verified: ${report.results.length} matched runs, ${report.acceptance.costCents} cents.`);
