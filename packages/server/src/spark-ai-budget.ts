import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const SPARK_AI_CAP_MICROUSD = 5_000_000;
export const SPARK_AI_RESERVATION_MICROUSD = 500_000;
const identity = "2026-11-08/khozak@gmail.com/mimir-realm/gemini-3.5-flash-lite/us";

export class SparkAIBudget {
  private db: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000; CREATE TABLE IF NOT EXISTS budget_profile(id INTEGER PRIMARY KEY CHECK(id=1), identity TEXT NOT NULL, cap INTEGER NOT NULL, stopped INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS ai_attempts(id INTEGER PRIMARY KEY, context_hash TEXT UNIQUE NOT NULL, pid INTEGER NOT NULL, reservation INTEGER NOT NULL, status TEXT NOT NULL, proposal_json TEXT, usage_json TEXT, error_code TEXT);");
    this.db.prepare("INSERT OR IGNORE INTO budget_profile(id,identity,cap) VALUES(1,?,?)").run(identity, SPARK_AI_CAP_MICROUSD);
    const profile = this.db.prepare("SELECT identity,cap FROM budget_profile WHERE id=1").get() as { identity: string; cap: number };
    if (profile.identity !== identity || profile.cap !== SPARK_AI_CAP_MICROUSD) { this.db.close(); throw new Error("Spark AI budget identity mismatch"); }
  }
  snapshot() {
    const profile = this.db.prepare("SELECT stopped FROM budget_profile WHERE id=1").get() as { stopped: number };
    const rows = this.db.prepare("SELECT status,reservation,usage_json FROM ai_attempts").all() as Array<{ status: string; reservation: number; usage_json: string | null }>;
    const reservedMicrousd = rows.reduce((sum, r) => sum + r.reservation, 0);
    return { capMicrousd: SPARK_AI_CAP_MICROUSD, reservedMicrousd, remainingMicrousd: SPARK_AI_CAP_MICROUSD - reservedMicrousd, reservationPerRequestMicrousd: SPARK_AI_RESERVATION_MICROUSD, attempts: rows.length, completed: rows.filter(r => r.status === "completed").length, uncertain: rows.filter(r => r.status === "uncertain").length, stopped: Boolean(profile.stopped), estimatedTokenCostMicrousd: rows.reduce((sum, r) => sum + (r.usage_json ? JSON.parse(r.usage_json).estimatedTokenCostMicrousd : 0), 0), reservationsAreNotFinalBills: true };
  }
  cached(contextHash: string): unknown | undefined {
    const row = this.db.prepare("SELECT status,proposal_json FROM ai_attempts WHERE context_hash=?").get(contextHash) as { status: string; proposal_json: string | null } | undefined;
    if (!row) return undefined;
    if (row.status === "completed" && row.proposal_json) return JSON.parse(row.proposal_json);
    throw new Error("prior Spark AI attempt uncertain; no retry");
  }
  reserve(contextHash: string): number {
    if (!/^sha256-[a-f0-9]{64}$/.test(contextHash)) throw new Error("invalid context identity");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of this.db.prepare("SELECT id,pid FROM ai_attempts WHERE status='reserved'").all() as Array<{ id: number; pid: number }>) {
        let alive = true;
        try { process.kill(row.pid, 0); } catch (e) { alive = (e as NodeJS.ErrnoException).code !== "ESRCH"; }
        if (alive) throw new Error("Spark AI request already in flight");
        this.db.prepare("UPDATE ai_attempts SET status='uncertain',error_code='prior-process-ended' WHERE id=?").run(row.id);
      }
      const status = this.snapshot();
      if (status.stopped || status.remainingMicrousd < SPARK_AI_RESERVATION_MICROUSD) throw new Error("Spark AI budget stopped or exhausted");
      const insert = this.db.prepare("INSERT INTO ai_attempts(context_hash,pid,reservation,status) VALUES(?,?,?,'reserved')").run(contextHash, process.pid, SPARK_AI_RESERVATION_MICROUSD);
      this.db.exec("COMMIT");
      return Number(insert.lastInsertRowid);
    } catch (e) { this.db.exec("ROLLBACK"); throw e; }
  }
  complete(id: number, proposal: unknown, usage: unknown) { this.db.prepare("UPDATE ai_attempts SET status='completed',proposal_json=?,usage_json=? WHERE id=? AND status='reserved'").run(JSON.stringify(proposal), JSON.stringify(usage), id); }
  uncertain(id: number, code: string) { this.db.prepare("UPDATE ai_attempts SET status='uncertain',error_code=? WHERE id=? AND status='reserved'").run(code, id); }
  stop() { this.db.prepare("UPDATE budget_profile SET stopped=1 WHERE id=1").run(); }
  close() { this.db.close(); }
}
