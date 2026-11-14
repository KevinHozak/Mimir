import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { allocationIdentity, ORIGINAL_SPARK_ALLOCATION_ID, ORIGINAL_SPARK_IDENTITY, RECORDED_COST_POLICY, accountingTotals } from "./spark-ai-accounting.js";

export const SPARK_AI_CAP_MICROUSD = 5_000_000;
export const SPARK_AI_RESERVATION_MICROUSD = 500_000;
const identity = ORIGINAL_SPARK_IDENTITY;

export class SparkAIBudget {
  private db: DatabaseSync;
  private readonly cap: number;
  private readonly allocationId?: string;
  constructor(path: string, options?: { allocationId: string; capMicrousd: number }) {
    if(options && (!/^[a-z0-9][a-z0-9-]{7,63}$/.test(options.allocationId)||![5_000_000,10_000_000].includes(options.capMicrousd)))throw Error("Invalid online allocation");
    this.cap=options?.capMicrousd??SPARK_AI_CAP_MICROUSD;this.allocationId=options?.allocationId;
    if (options?.allocationId === ORIGINAL_SPARK_ALLOCATION_ID && (this.cap !== SPARK_AI_CAP_MICROUSD || !existsSync(path))) throw Error("Original allocation must retain its existing ledger and USD 5 cap");
    const profileIdentity=options?allocationIdentity(options.allocationId):identity;
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000; CREATE TABLE IF NOT EXISTS budget_profile(id INTEGER PRIMARY KEY CHECK(id=1), identity TEXT NOT NULL, cap INTEGER NOT NULL, stopped INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS ai_attempts(id INTEGER PRIMARY KEY, context_hash TEXT UNIQUE NOT NULL, pid INTEGER NOT NULL, reservation INTEGER NOT NULL, status TEXT NOT NULL, proposal_json TEXT, usage_json TEXT, error_code TEXT);");
    this.db.prepare("INSERT OR IGNORE INTO budget_profile(id,identity,cap) VALUES(1,?,?)").run(profileIdentity, this.cap);
    const profile = this.db.prepare("SELECT identity,cap FROM budget_profile WHERE id=1").get() as { identity: string; cap: number };
    if (profile.identity !== profileIdentity || profile.cap !== this.cap) { this.db.close(); throw new Error("Spark AI budget identity mismatch"); }
  }
  snapshot() {
    const profile = this.db.prepare("SELECT stopped FROM budget_profile WHERE id=1").get() as { stopped: number };
    const rows = this.db.prepare("SELECT status,reservation,usage_json FROM ai_attempts ORDER BY id").all() as Array<{ status: string; reservation: number; usage_json: string | null }>;
    const policy = this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='budget_accounting_policy'").get() ? this.db.prepare("SELECT version,multiplier,contingency FROM budget_accounting_policy WHERE id=1").get() as any : undefined;
    if (policy && (policy.version !== RECORDED_COST_POLICY || policy.multiplier !== 2 || policy.contingency !== 100000)) throw Error("Unknown allocation accounting policy");
    const recorded = Boolean(policy);

    const totals = accountingTotals(rows, recorded);
    const retired = Boolean(this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='budget_retirement'").get());
    const target = this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='budget_target'").get() ? this.db.prepare("SELECT run_id,world_bound FROM budget_target WHERE id=1").get() as {run_id:string;world_bound:number}|undefined : undefined;
    const recovery = this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='budget_recoveries'").get() ? this.db.prepare("SELECT attempt_count FROM budget_recoveries ORDER BY id DESC LIMIT 1").get() as { attempt_count: number } | undefined : undefined;
    const recoveredThrough = recovery?.attempt_count ?? 0;
    if (!Number.isSafeInteger(recoveredThrough) || recoveredThrough < 0 || recoveredThrough > rows.length) throw Error("Invalid allocation recovery boundary");
    let consecutiveFailures = 0;
    for (const row of rows.slice(recoveredThrough).reverse()) { if (row.status !== "uncertain" && row.status !== "rejected") break; consecutiveFailures++; }
    return { ...(this.allocationId?{allocationId:this.allocationId}:{}), accountingPolicy: recorded ? RECORDED_COST_POLICY : "retained-reservations-v1", costBufferMultiplier: recorded ? 2 : undefined, ...totals, capMicrousd: this.cap, reservedMicrousd: totals.historicalReservedMicrousd, remainingMicrousd: Math.max(0, this.cap - totals.accountedMicrousd), reservationPerRequestMicrousd: SPARK_AI_RESERVATION_MICROUSD, attempts: rows.length, completed: rows.filter(r => r.status === "completed").length, uncertain: rows.filter(r => r.status === "uncertain").length, rejected: rows.filter(r => r.status === "rejected").length, consecutiveFailures, stopped: Boolean(profile.stopped) || retired, retired, targetRunId: target?.run_id, targetWorldBound: Boolean(target?.world_bound), reservationsAreNotFinalBills: true };

  }
  cached(contextHash: string): unknown | undefined {
    const row = this.db.prepare("SELECT status,proposal_json FROM ai_attempts WHERE context_hash=?").get(contextHash) as { status: string; proposal_json: string | null } | undefined;
    if (!row) return undefined;
    if (row.status === "completed" && row.proposal_json) return JSON.parse(row.proposal_json);
    throw new Error("prior Spark AI attempt uncertain; no retry");
  }
  receipt(contextHash: string) {
    const row = this.db.prepare("SELECT id,status,reservation,usage_json FROM ai_attempts WHERE context_hash=?").get(contextHash) as { id: number; status: string; reservation: number; usage_json: string | null } | undefined;
    return row ? { requestId: row.id, status: row.status, reservationMicrousd: row.reservation, usage: row.usage_json ? JSON.parse(row.usage_json) : undefined } : undefined;
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
  rejected(id: number, usage: { estimatedTokenCostMicrousd: number }, code: string) {
    if(!Number.isSafeInteger(usage.estimatedTokenCostMicrousd)||usage.estimatedTokenCostMicrousd<0)throw Error("Invalid known request cost");
    const status=this.snapshot().accountingPolicy===RECORDED_COST_POLICY?"rejected":"uncertain";
    this.db.prepare("UPDATE ai_attempts SET status=?,usage_json=?,error_code=? WHERE id=? AND status='reserved'").run(status,JSON.stringify(usage),code,id);
  }
  uncertain(id: number, code: string) { this.db.prepare("UPDATE ai_attempts SET status='uncertain',error_code=? WHERE id=? AND status='reserved'").run(code, id); }
  /** Explicit accounting change; historical attempts and the cap are never erased. */
  adoptRecordedCosts(authorization: string) {
    if (!authorization.trim() || authorization.length > 240) throw Error("Accounting authorization required");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (!this.snapshot().stopped || this.snapshot().retired) throw Error("Accounting change requires stopped active allocation");
      this.db.exec("CREATE TABLE IF NOT EXISTS budget_accounting_policy(id INTEGER PRIMARY KEY CHECK(id=1),version TEXT NOT NULL,multiplier INTEGER NOT NULL,contingency INTEGER NOT NULL,authorization TEXT NOT NULL)");
      const old = this.db.prepare("SELECT version,multiplier,contingency FROM budget_accounting_policy WHERE id=1").get() as any;
      if (old && (old.version !== RECORDED_COST_POLICY || old.multiplier !== 2 || old.contingency !== 100000)) throw Error("Unknown accounting policy");
      this.db.prepare("INSERT OR IGNORE INTO budget_accounting_policy VALUES(1,?,2,100000,?)").run(RECORDED_COST_POLICY, authorization);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  /** Export one stopped ledger; the original becomes permanently retired for spending. */
  exportForHandoff(destination: string, runId: string, authorization: string) {
    if (!isAbsolute(destination) || existsSync(destination) || !/^[a-z0-9][a-z0-9-]{7,63}$/.test(runId) || !authorization.trim() || authorization.length > 240) throw Error("Invalid allocation handoff");
    const status = this.snapshot();
    if (!status.stopped || status.retired || status.accountingPolicy !== RECORDED_COST_POLICY || status.uncertain || status.attempts !== status.completed) throw Error("Handoff requires stopped, reconciled recorded-cost allocation");
    mkdirSync(dirname(destination), { recursive: true });
    this.db.prepare("VACUUM INTO ?").run(destination);
    const target = new DatabaseSync(destination);
    try { target.exec("CREATE TABLE budget_target(id INTEGER PRIMARY KEY CHECK(id=1),run_id TEXT NOT NULL,world_bound INTEGER NOT NULL DEFAULT 0)"); target.prepare("INSERT INTO budget_target(id,run_id) VALUES(1,?)").run(runId); } finally { target.close(); }
    const sha256 = createHash("sha256").update(readFileSync(destination)).digest("hex");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("CREATE TABLE budget_retirement(id INTEGER PRIMARY KEY CHECK(id=1),run_id TEXT NOT NULL,export_sha256 TEXT NOT NULL,authorization TEXT NOT NULL)");
      this.db.prepare("INSERT INTO budget_retirement VALUES(1,?,?,?)").run(runId, sha256, authorization);
      this.stop(); this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
    return {runId,sha256,remainingMicrousd:status.remainingMicrousd};
  }
  markWorldBound() {
    const status=this.snapshot();
    if(status.targetRunId)this.db.prepare("UPDATE budget_target SET world_bound=1 WHERE id=1").run();
  }
  stop() { this.db.prepare("UPDATE budget_profile SET stopped=1 WHERE id=1").run(); }
  /** Explicit operator authorization only: retain all charges and refuse ambiguous requests. */
  resume(expectedRemainingMicrousd: number, authorization: string) {
    if (!Number.isSafeInteger(expectedRemainingMicrousd) || expectedRemainingMicrousd <= 0 || expectedRemainingMicrousd > this.cap || !authorization.trim() || authorization.length > 240) throw new Error("invalid Spark continuation authorization");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const status = this.snapshot();
      const unresolved = this.db.prepare("SELECT COUNT(*) AS n FROM ai_attempts WHERE status != 'completed'").get() as { n: number };
      if (status.retired || !status.stopped || unresolved.n || status.remainingMicrousd !== expectedRemainingMicrousd) throw new Error("Spark continuation requires stopped spending, exact remaining allocation and no unresolved attempts");
      this.db.exec("CREATE TABLE IF NOT EXISTS budget_resumptions(id INTEGER PRIMARY KEY, authorized_remaining INTEGER NOT NULL, reserved_before INTEGER NOT NULL, attempt_count INTEGER NOT NULL, authorization TEXT NOT NULL)");
      this.db.prepare("INSERT INTO budget_resumptions(authorized_remaining,reserved_before,attempt_count,authorization) VALUES(?,?,?,?)").run(expectedRemainingMicrousd, status.reservedMicrousd, status.attempts, authorization);
      this.db.prepare("UPDATE budget_profile SET stopped=0 WHERE id=1").run();
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  /** Explicit repaired-run continuation; retain unknown holds and prohibit retrying their contexts. */
  resumeAfterRecovery(expectedRemainingMicrousd: number, authorization: string, recovery: { runId: string; uncertainAttemptIds: number[]; evidenceSha256: string }) {
    if (!Number.isSafeInteger(expectedRemainingMicrousd) || expectedRemainingMicrousd < SPARK_AI_RESERVATION_MICROUSD || !authorization.trim() || authorization.length > 240 || !/^[a-f0-9]{64}$/.test(recovery.evidenceSha256) || !Array.isArray(recovery.uncertainAttemptIds) || !recovery.uncertainAttemptIds.length || recovery.uncertainAttemptIds.some((id,i,ids)=>!Number.isSafeInteger(id)||id<1||(i>0&&id<=ids[i-1]))) throw Error("Invalid repaired-run authorization");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const status=this.snapshot();
      const unresolved=this.db.prepare("SELECT id,status FROM ai_attempts WHERE status!='completed' ORDER BY id").all() as {id:number;status:string}[];
      if(status.retired || !status.stopped || !status.targetWorldBound || status.targetRunId!==recovery.runId || status.accountingPolicy!==RECORDED_COST_POLICY || status.remainingMicrousd!==expectedRemainingMicrousd || unresolved.some(row=>row.status!=="uncertain") || JSON.stringify(unresolved.map(row=>row.id))!==JSON.stringify(recovery.uncertainAttemptIds)) throw Error("Recovery requires stopped bound writer, exact headroom and all retained uncertain holds");
      this.db.exec("CREATE TABLE IF NOT EXISTS budget_recoveries(id INTEGER PRIMARY KEY,run_id TEXT NOT NULL,attempt_count INTEGER NOT NULL,uncertain_ids_json TEXT NOT NULL,accounted_before INTEGER NOT NULL,remaining_before INTEGER NOT NULL,evidence_sha256 TEXT NOT NULL,authorization TEXT NOT NULL)");
      this.db.prepare("INSERT INTO budget_recoveries(run_id,attempt_count,uncertain_ids_json,accounted_before,remaining_before,evidence_sha256,authorization) VALUES(?,?,?,?,?,?,?)").run(recovery.runId,status.attempts,JSON.stringify(recovery.uncertainAttemptIds),status.accountedMicrousd,status.remainingMicrousd,recovery.evidenceSha256,authorization);
      this.db.prepare("UPDATE budget_profile SET stopped=0 WHERE id=1").run();
      this.db.exec("COMMIT");
    } catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  close() { this.db.close(); }
}
