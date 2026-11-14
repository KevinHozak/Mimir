import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { testPort, stopTestProcesses } from "../../../scripts/test-runtime.mjs";

test("real server commits opted-in goal selection even with no social interpretation and replays it on restart", async () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  mkdirSync(join(root, ".tmp"), { recursive: true });
  const folder = mkdtempSync(join(root, ".tmp/s019-server-")), port = await testPort();
  let database = join(folder, "world.db");
  const origin = `http://127.0.0.1:${port}`, owner = "isolated-goal-owner";
  const logs: string[] = [];
  let child: ChildProcess | undefined;
  async function start(goals = true) {
    child = spawn(process.execPath, [join(root, "packages/server/dist/index.js")], { cwd: root, windowsHide: true, env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), DATABASE_PATH: database, AI_ENABLED: "false", AUTO_PULSE: "false", PULSE_INTERVAL_MS: "0", MIMIR_SPARK_GOALS: String(goals), OWNER_TOKEN: owner, WORLD_BUNDLE_ROOT: join(root, "assets/world/generated"), BACKUP_INTERVAL_MS: "0" }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", c => logs.push(String(c))); child.stderr!.on("data", c => logs.push(String(c)));
    for (let i = 0; i < 300; i++) { if (child.exitCode !== null) throw Error(`server exited: ${logs.join("")}`); try { if ((await fetch(origin + "/health")).ok) return; } catch {} await new Promise(r => setTimeout(r, 100)); }
    throw Error(`isolated goal server startup timed out: ${logs.slice(-10).join("")}`);
  }
  async function post(path: string, body?: unknown) {
    const response = await fetch(origin + path, { method: "POST", headers: { "x-owner-token": owner, "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    assert.equal(response.status, 200, await response.clone().text()); return response.json();
  }
  try {
    await start();
    const reset = await post("/api/owner/reset-v3", { bundleHash: "sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e", seed: 2, sparkCount: 2 }) as any;
    let current: any;
    for (let i = 0; i < 80; i++) current = await post("/api/pulse");
    const before = await (await fetch(origin + "/api/goals")).json() as any;
    assert.ok(before.goals.length > 0);
    assert.ok(before.goals.every((g: any) => g.source === "rules"));
    assert.equal(before.runtime.calls, 0);
    assert.equal(before.pulse, 80);
    assert.ok(current.state.firstGlowState.goalLoops.goals.every((g: any) => g.context.personality && g.context.candidates.length >= 1));
    const history = await fetch(`${origin}/api/history?timelineId=${reset.timeline.id}&pulse=80`);
    assert.equal(history.status, 200);
    await history.json();
    assert.deepEqual(await (await fetch(origin + "/api/goals")).json(), before);
    await stopTestProcesses([child]); child = undefined;
    const db = new DatabaseSync(database, { readOnly: true });
    const scope = (db.prepare("SELECT value FROM runtime_metadata WHERE key='spark_goal_world_id'").get() as { value: string }).value;
    const selectionEvents = db.prepare("SELECT event_json FROM timeline_events WHERE timeline_id=?").all(reset.timeline.id).filter((r: any) => JSON.parse(r.event_json).structuredKind === "goal");
    assert.ok(selectionEvents.length > 0); db.close();
    await start();
    assert.deepEqual(await (await fetch(origin + "/api/goals")).json(), before);
    const reopened = new DatabaseSync(database, { readOnly: true });
    assert.equal((reopened.prepare("SELECT value FROM runtime_metadata WHERE key='spark_goal_world_id'").get() as { value: string }).value, scope);
    reopened.close();
    await post("/api/pulse");
    await stopTestProcesses([child]); child = undefined;
    database = join(folder, "legacy.db");
    await start(false);
    await stopTestProcesses([child]); child = undefined;
    const legacy = new DatabaseSync(database, { readOnly: true });
    const original = legacy.prepare("SELECT state_json FROM timeline_checkpoints").get(); legacy.close();
    await assert.rejects(start(true), /fresh goal-enabled database/);
    const refused = new DatabaseSync(database, { readOnly: true });
    assert.deepEqual(refused.prepare("SELECT state_json FROM timeline_checkpoints").get(), original);
    assert.equal(refused.prepare("SELECT value FROM runtime_metadata WHERE key='spark_goal_world_id'").get(), undefined);
    refused.close();
  } finally { await stopTestProcesses([child]); }
});
