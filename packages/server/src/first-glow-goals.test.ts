import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { advanceWorld, type WorldState } from "@mimir/engine";
import { startGoalFixture } from "../../engine/dist/first-glow-goals-fixture.js";
import { normalizeState } from "./state.js";
import { createBundleInclusiveBackup } from "./backup-lib.js";

test("goal checkpoint closes/reopens and bundle-inclusive restoration continues identically without a provider", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const temp = mkdtempSync(join(root, ".tmp", "goal-loop-persistence-"));
  const source = join(temp, "observer.db"), backup = join(temp, "backup.db"), restored = join(temp, "restored.db");
  let world = await startGoalFixture();
  world = advanceWorld(world).state; // exploration complete; rendezvous still ahead
  assert.equal(world.firstGlowState.goalLoops!.goals[0].step, 1);
  const bundles = join(temp, "bundles");
  const bundle = world.firstGlowState.settlements[0].bundle;
  const hash = bundle.bundle.contentHash;
  cpSync(join(root, "assets/world/generated/sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601"), join(bundles, hash), { recursive: true });
  writeFileSync(join(bundles, hash, "world.json"), JSON.stringify(bundle));
  writeFileSync(join(bundles, hash, "manifest.json"), JSON.stringify({ fixture: true, contentHash: hash }));
  let db = new DatabaseSync(source);
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE checkpoints (pulse INTEGER PRIMARY KEY, state_json TEXT NOT NULL)");
  db.prepare("INSERT INTO checkpoints VALUES (?, ?)").run(world.pulse, JSON.stringify(world));
  db.close();
  db = new DatabaseSync(source, { readOnly: true });
  let restarted = normalizeState(JSON.parse((db.prepare("SELECT state_json FROM checkpoints").get() as { state_json: string }).state_json));
  db.close();
  const manifest = createBundleInclusiveBackup(source, backup, bundles);
  assert.deepEqual(manifest.bundleHashes, [hash]);
  assert.ok(manifest.bundleFiles.length > 2);
  execFileSync(process.execPath, [join(root, "packages/server/dist/backup.js"), "restore", backup, restored], { cwd: root, env: { ...process.env, WORLD_BUNDLE_ROOT: bundles }, stdio: "pipe" });
  const restoredDb = new DatabaseSync(restored, { readOnly: true });
  let restoredWorld = normalizeState(JSON.parse((restoredDb.prepare("SELECT state_json FROM checkpoints").get() as { state_json: string }).state_json));
  restoredDb.close();
  assert.deepEqual(JSON.parse(readFileSync(join(`${restored}.bundles`, hash, "world.json"), "utf8")), bundle);
  for (let i = 0; i < 12; i++) {
    world = advanceWorld(world).state;
    restarted = advanceWorld(restarted).state;
    restoredWorld = advanceWorld(restoredWorld).state;
    assert.deepEqual(JSON.parse(JSON.stringify(restarted)), JSON.parse(JSON.stringify(world)));
    assert.deepEqual(JSON.parse(JSON.stringify(restoredWorld)), JSON.parse(JSON.stringify(world)));
  }
  assert.ok(world.firstGlowState.goalLoops!.goals.every(g => g.status === "completed"));
  assert.equal(world.firstGlowState.goalLoops!.providerAttempts, 2);
  const corrupted = JSON.parse(JSON.stringify(world)) as WorldState;
  corrupted.firstGlowState.goalLoops!.goals[0].context.readiness = 0;
  assert.throws(() => normalizeState(corrupted), /goal checkpoint/);
  // Isolated artifacts retained for inspection, never removed by broad cleanup.
  mkdirSync(join(temp, "evidence"));
  writeFileSync(join(temp, "evidence/result.json"), JSON.stringify({ restoredEquivalent: true, continuedPulses: 12, bundleFiles: manifest.bundleFiles.length, realProviderCalls: 0 }, null, 2));
});
