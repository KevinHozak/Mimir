import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { acquireWriterLock } from "./writer-lock.js";
import { bindOnlineRun, onlineRunSpec } from "./online-run.js";
import { SparkAIBudget } from "./spark-ai-budget.js";
import { createBundleInclusiveBackup, validateBackupAllocation } from "./backup-lib.js";
import { createFirstGlowServerAIConfig } from "./first-glow-ai-runtime.js";

const root = fileURLToPath(new URL("../../../.tmp/online-run-tests", import.meta.url));
mkdirSync(root, { recursive: true });
const directory = () => mkdtempSync(join(root, "run-"));
const now = Date.parse("2026-11-13T12:00:00.000Z");
const spec = () => onlineRunSpec({ MIMIR_ONLINE_RUN_ID: "pilot-test-001", MIMIR_ONLINE_END_AT: new Date(now + 86400000).toISOString(), MIMIR_SPARK_AI_ALLOCATION_ID: "allocation-test-001" })!;
test("one writer per database, clean release permits restart", () => {
  const path = join(directory(), "world.db"), release = acquireWriterLock(path);
  assert.throws(() => acquireWriterLock(path), /already has a writer/);
  release(); release();
  acquireWriterLock(path)();
});
test("online contract survives reopen, rejects extension/removal and expires exactly", () => {
  const path = join(directory(), "world.db");
  let db = new DatabaseSync(path);
  const contract = bindOnlineRun(db, spec(), now);
  assert.equal(contract.expired(now + 86399999), false);
  assert.equal(contract.expired(now + 86400000), true);
  db.close(); db = new DatabaseSync(path);
  assert.equal(bindOnlineRun(db, spec(), now + 90000000).expired(now + 90000000), true);
  assert.throws(() => bindOnlineRun(db, undefined, now), /cannot be replaced/);
  assert.throws(() => bindOnlineRun(db, { ...spec(), endsAt: "2026-11-15T12:00:00.000Z" }, now), /cannot be replaced/);
  db.close();
});
test("new lease rejects an elapsed or excessive window", () => {
  for (const duration of [0, 8 * 86400000]) {
    const db = new DatabaseSync(":memory:");
    assert.throws(() => bindOnlineRun(db, { ...spec(), deadlineMs: now + duration }, now), /within seven days/);
    db.close();
  }
  assert.throws(() => onlineRunSpec({ AI_RUNTIME_MODE: "spark-online" }), /lease is required/);
});
test("paired snapshot retains reservations and refuses an omitted or mismatched allocation", () => {
  const dir = directory(), worldPath = join(dir, "world.db"), budgetPath = join(dir, "allocation.db");
  const world = new DatabaseSync(worldPath);
  bindOnlineRun(world, spec(), now);
  world.exec("CREATE TABLE timeline_checkpoints(timeline_id TEXT,pulse INTEGER,state_json TEXT)");
  const options = { allocationId: spec().allocationId, capMicrousd: 10_000_000 };
  const budget = new SparkAIBudget(budgetPath, options);
  const id = budget.reserve("sha256-" + "1".repeat(64));
  budget.complete(id, { kind: "test" }, { inputTokens: 10 });
  world.prepare("INSERT INTO timeline_checkpoints VALUES('main',1,?)").run(JSON.stringify({ firstGlowState: { goalLoops: { goals: [{ providerReceipt: budget.receipt("sha256-" + "1".repeat(64)) }] } } }));
  const target = join(dir, "snapshot.db");
  const manifest = createBundleInclusiveBackup(worldPath, target, dir, budgetPath);
  assert.ok(manifest.aiBudget);
  validateBackupAllocation(target, target + ".ai-budget.db");
  assert.throws(() => createBundleInclusiveBackup(worldPath, join(dir, "missing.db"), dir), /requires its allocation/);
  budget.close(); world.close();
  const restored = new SparkAIBudget(target + ".ai-budget.db", options);
  assert.equal(restored.snapshot().remainingMicrousd, 9_500_000);
  restored.close();
  assert.throws(() => new SparkAIBudget(budgetPath, { ...options, allocationId: "replacement-001" }), /identity mismatch/);
  const tampered = new DatabaseSync(target + ".ai-budget.db"); tampered.exec("DELETE FROM ai_attempts"); tampered.close();
  assert.throws(() => validateBackupAllocation(target, target + ".ai-budget.db"), /receipt missing/);
});

test("disabled online restart preserves policy and stopped allocation without provider dispatch", async () => {
  const dir = directory(), worldPath = join(dir, "world.db"), budgetPath = join(dir, "allocation.db");
  const env = { AI_ENABLED: "false", AI_RUNTIME_MODE: "spark-online", DATABASE_PATH: worldPath,
    MIMIR_ONLINE_RUN_ID: "disabled-pilot-001", MIMIR_ONLINE_END_AT: new Date(Date.now() + 60000).toISOString(),
    MIMIR_SPARK_AI_ALLOCATION_ID: "disabled-allocation-001", MIMIR_SPARK_AI_BUDGET_PATH: budgetPath,
    MIMIR_SPARK_AI_BUDGET_USD: "5", MIMIR_SPARK_AI_KILL_SWITCH: "enabled" };
  let config = createFirstGlowServerAIConfig(env);
  assert.equal(config.enabled, false);
  assert.equal(config.liveSpark, true);
  assert.equal(config.budgetStatus?.().attempts, 0);
  config.stop?.();
  await config.close?.();
  const world = new DatabaseSync(worldPath); bindOnlineRun(world, onlineRunSpec(env)); world.close();
  config = createFirstGlowServerAIConfig({ ...env, AI_ENABLED: "true" });
  assert.equal(config.budgetStatus?.().stopped, true);
  assert.equal(config.budgetStatus?.().attempts, 0);
  await config.close?.();
  assert.throws(() => createFirstGlowServerAIConfig({ ...env, MIMIR_SPARK_AI_BUDGET_USD: "10" }), /identity mismatch/);
  assert.throws(() => createFirstGlowServerAIConfig({ ...env, MIMIR_SPARK_AI_BUDGET_PATH: join(dir, "missing.db") }), /exist together/);
});
