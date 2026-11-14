import { DatabaseSync } from "node:sqlite";

export interface OnlineRunSpec {
  id: string;
  endsAt: string;
  deadlineMs: number;
  allocationId: string;
}
const validId = (value: string) => /^[a-z0-9][a-z0-9-]{7,63}$/.test(value);
export function onlineRunSpec(env: NodeJS.ProcessEnv): OnlineRunSpec | undefined {
  if (!env.MIMIR_ONLINE_RUN_ID) {
    if (env.AI_RUNTIME_MODE === "spark-online") throw Error("Online run lease is required");
    return;
  }
  const id = env.MIMIR_ONLINE_RUN_ID;
  const allocationId = env.MIMIR_SPARK_AI_ALLOCATION_ID ?? "rules-only";
  const deadlineMs = Date.parse(env.MIMIR_ONLINE_END_AT ?? "");
  if (!validId(id) || !validId(allocationId) || !Number.isFinite(deadlineMs) || new Date(deadlineMs).toISOString() !== env.MIMIR_ONLINE_END_AT) throw Error("Invalid bounded online run contract");
  return { id, endsAt: env.MIMIR_ONLINE_END_AT!, deadlineMs, allocationId };
}
export function bindOnlineRun(db: DatabaseSync, spec: OnlineRunSpec | undefined, now = Date.now()) {
  db.exec("CREATE TABLE IF NOT EXISTS online_run_contract(id INTEGER PRIMARY KEY CHECK(id=1),run_id TEXT NOT NULL,ends_at TEXT NOT NULL,allocation_id TEXT NOT NULL,started_at INTEGER NOT NULL)");
  const old = db.prepare("SELECT * FROM online_run_contract WHERE id=1").get() as { run_id: string; ends_at: string; allocation_id: string; started_at: number } | undefined;
  if (old) {
    if (!spec || old.run_id !== spec.id || old.ends_at !== spec.endsAt || old.allocation_id !== spec.allocationId) throw Error("Persisted online contract cannot be replaced or extended");
  } else if (spec) {
    if (spec.deadlineMs <= now || spec.deadlineMs - now > 7 * 86400000) throw Error("New online lease must end within seven days");
    db.prepare("INSERT INTO online_run_contract VALUES(1,?,?,?,?)").run(spec.id, spec.endsAt, spec.allocationId, now);
  }
  return {
    expired: (at = Date.now()) => Boolean(spec && at >= spec.deadlineMs),
    status: (at = Date.now()) => spec ? { runId: spec.id, endsAt: spec.endsAt, allocationId: spec.allocationId, expired: at >= spec.deadlineMs } : undefined
  };
}
