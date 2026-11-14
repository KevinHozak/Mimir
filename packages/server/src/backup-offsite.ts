import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { createBundleInclusiveBackup } from "./backup-lib.js";
import { replicateBackup, uploadVerifiedFile, type BackupReplicationStatus } from "./backup-replication.js";

export function databaseEvidence(path: string) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    if (integrity.integrity_check !== "ok") throw new Error("backup database integrity check failed");
    const tables: Record<string, { count: number; sha256: string }> = {};
    for (const name of ["timelines", "timeline_checkpoints", "timeline_events", "timeline_interpretations", "runtime_metadata"]) {
      if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)) throw new Error(`missing recovery table: ${name}`);
      tables[name] = tableEvidence(db,name);
    }
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='online_run_contract'").get()) tables.online_run_contract = tableEvidence(db,"online_run_contract");

    const latest = db.prepare("SELECT timeline_id, MAX(pulse) AS pulse, COUNT(*) AS checkpoints FROM timeline_checkpoints GROUP BY timeline_id ORDER BY timeline_id").all();
    return { integrity: "ok", latest, tables };
  } finally { db.close(); }
}

/** Sort small primary-key prefixes exactly as the historical full JSON-row hash. */
function tableEvidence(db: DatabaseSync, name: string) {
  const quote = (value:string) => `"${value.replaceAll('"','""')}"`;
  const columns = db.prepare(`PRAGMA table_info(${quote(name)})`).all() as Array<{name:string;pk:number}>;
  const keys = columns.filter(column=>column.pk>0).map(column=>column.name);
  if (!keys.length || !keys.every((key,index)=>columns[index].name===key)) {
    const rows=db.prepare(`SELECT * FROM ${quote(name)}`).all().map(row=>JSON.stringify(row)).sort();
    return {count:rows.length,sha256:createHash("sha256").update(rows.join("\n")).digest("hex")};
  }
  const index = db.prepare(`SELECT ${keys.map(quote).join(",")} FROM ${quote(name)}`).all().map(row=>({values:Object.values(row),prefix:JSON.stringify(row).slice(0,-1)+(keys.length<columns.length?",":"}")}));
  index.sort((a,b)=>a.prefix<b.prefix?-1:a.prefix>b.prefix?1:0);
  if (index.some((entry,n)=>entry.values.some(value=>value===null)||(n>0&&entry.prefix===index[n-1].prefix))) throw Error("Invalid recovery primary key");
  const select=db.prepare(`SELECT * FROM ${quote(name)} WHERE ${keys.map(key=>`${quote(key)} IS ?`).join(" AND ")}`);
  const hash=createHash("sha256");let count=0;
  for(const entry of index){if(count++)hash.update("\n");hash.update(JSON.stringify(select.get(...entry.values)));}
  return {count,sha256:hash.digest("hex")};
}

export type OffsiteStatus = BackupReplicationStatus & { database?: ReturnType<typeof databaseEvidence>; bundleFiles?: number; lastReceiptObjectUri?: string };
export function loadOffsiteStatus(path: string, destination: string, freshnessMaxAgeMs: number): OffsiteStatus {
  const initial = { enabled: true, destination, freshnessMaxAgeMs, consecutiveFailures: 0 };
  if (!existsSync(path)) return initial;
  try {
    const saved = JSON.parse(readFileSync(path, "utf8")) as OffsiteStatus;
    if (saved.destination !== destination) return initial;
    if (!Number.isSafeInteger(saved.consecutiveFailures) || saved.consecutiveFailures < 0) throw new Error("invalid failure count");
    return { ...saved, ...initial, consecutiveFailures: saved.consecutiveFailures };
  } catch { return { ...initial, lastError: "saved backup status is unreadable", consecutiveFailures: 1 }; }
}
export function offsiteHealth(status: OffsiteStatus, now = Date.now()) {
  const last = Date.parse(status.lastSuccessAt ?? "");
  const stale = !Number.isFinite(last) || last > now || now - last > status.freshnessMaxAgeMs;
  const attempt = Date.parse(status.lastAttemptAt ?? "");
  const incomplete = !Number.isFinite(attempt) || !Number.isFinite(last) || attempt > last;
  return { ...status, stale, incomplete, healthy: !stale && !incomplete && status.consecutiveFailures === 0 && !status.lastError };
}
export function saveOffsiteStatus(path: string, status: OffsiteStatus) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(status, null, 2) + "\n", { mode: 0o600 });
  renameSync(temporary, path);
}

export async function runOffsiteBackup(config: { source: string; retainLocalSnapshots?: boolean; aiBudgetPath?: string; directory: string; bundleRoot: string; destination: string; statusPath: string; freshnessMaxAgeMs: number; impersonateServiceAccount?: string; minimumCheckpoint?: () => Promise<{ timeline_id: string; pulse: number }> },
  upload: typeof replicateBackup = replicateBackup, uploadReceipt: typeof uploadVerifiedFile = uploadVerifiedFile) {
  const status = loadOffsiteStatus(config.statusPath, config.destination, config.freshnessMaxAgeMs);
  status.lastAttemptAt = new Date().toISOString();
  saveOffsiteStatus(config.statusPath, status);
  let stage = "live checkpoint check";
  try {
    const minimum = await config.minimumCheckpoint?.();
    stage = "consistent snapshot and bundle validation";
    const backup = join(config.directory, `offsite-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.db`);
    const manifest = createBundleInclusiveBackup(config.source, backup, config.bundleRoot, config.aiBudgetPath);
    const evidence = databaseEvidence(backup);
    if (minimum && !evidence.latest.some(row => row.timeline_id === minimum.timeline_id && Number(row.pulse) >= minimum.pulse)) throw new Error("external snapshot is behind the live writer");
    // Missing assets must fail before an incomplete unit can be reported as recoverable.
    const db = new DatabaseSync(backup, { readOnly: true });
    try {
      for (const row of db.prepare("SELECT state_json FROM timeline_checkpoints").iterate() as Iterable<{ state_json: string }>) {
        const state = JSON.parse(row.state_json);
        const hashes = [state.worldDefinition?.bundle?.contentHash, ...(state.firstGlowState?.settlements ?? state.structuredState?.settlements ?? []).map((s: { bundle?: { bundle?: { contentHash?: string } } }) => s.bundle?.bundle?.contentHash)].filter(Boolean);
        if (hashes.some(hash => !manifest.bundleHashes.includes(hash))) throw new Error("backup is missing a referenced world bundle");
      }
    } finally { db.close(); }
    stage = "archive upload and checksum verification";
    const result = await upload(backup, config.destination, undefined, new Date(), config.impersonateServiceAccount);
    const completed = { ...status, lastSuccessAt: new Date().toISOString(), lastObjectUri: result.objectUri, lastReceiptObjectUri: `${result.objectUri}.receipt.json`, lastArchiveSha256: result.archiveSha256, lastArchiveBytes: result.archiveBytes, database: evidence, bundleFiles: manifest.bundleFiles.length, lastError: undefined, consecutiveFailures: 0 };
    const receiptPath = `${backup}.receipt.json`;
    saveOffsiteStatus(receiptPath, completed);
    stage = "recovery receipt upload and checksum verification";
    await uploadReceipt(receiptPath, completed.lastReceiptObjectUri, config.impersonateServiceAccount);
    Object.assign(status, completed);
    saveOffsiteStatus(config.statusPath, status);
    if (config.retainLocalSnapshots === false) {
      stage = "verified snapshot cache cleanup";
      const root=resolve(config.directory);
      for(const owned of [backup,`${backup}.manifest.json`,`${backup}.bundles`,`${backup}.ai-budget.db`,receiptPath]) {
        const target=resolve(owned),inside=relative(root,target);
        if(dirname(target)!==root||inside.startsWith("..")||isAbsolute(inside))throw Error("Unsafe snapshot cache target");
        if(existsSync(target))rmSync(target,{recursive:true,force:true});
      }
    }
    return offsiteHealth(status);
  } catch {
    // Child-process errors can include command output. Persist only a safe fixed message.
    status.lastError = `off-VM backup failed during ${stage}; inspect the service exit status and private operator diagnostics`;
    status.consecutiveFailures += 1;
    saveOffsiteStatus(config.statusPath, status);
    throw new Error(status.lastError);
  }
}
