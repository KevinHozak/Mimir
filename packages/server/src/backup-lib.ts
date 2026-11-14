import { accountingTotals, allocationIdentity, RECORDED_COST_POLICY, ORIGINAL_SPARK_ALLOCATION_ID } from "./spark-ai-accounting.js";
import { isDeepStrictEqual } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, cpSync, readdirSync } from "node:fs";
import { fileDigest } from "./backup-file-hash.js";
import { dirname, join, relative, isAbsolute } from "node:path";

export type BackupManifest = { databaseSha256: string; databaseBytes: number; bundleHashes: string[]; bundleFiles: { hash: string; path: string; sha256: string }[]; databaseVersion: 1; aiBudget?: { sha256: string; bytes: number } };

const hashFile = fileDigest;
function listFiles(root: string, current = root): string[] {
  return readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : entry.isFile() ? [path] : [];
  }).sort();
}

export function createBundleInclusiveBackup(source: string, destination: string, bundleRoot: string, aiBudgetPath?: string): BackupManifest {
  if (!existsSync(source)) throw new Error(`Source database does not exist: ${source}`);
  if ([destination, `${destination}.bundles`, `${destination}.manifest.json`, `${destination}.ai-budget.db`].some(existsSync)) throw new Error(`Refusing to overwrite existing backup: ${destination}`);
  mkdirSync(dirname(destination), { recursive: true });
  const database = new DatabaseSync(source);
  try {
    database.prepare("VACUUM INTO ?").run(destination);
  } finally {
    database.close();
  }
  const copiedBundles = new Set<string>();
  const sourceDatabase = new DatabaseSync(destination);
  const hasTimelineTable = sourceDatabase.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'timeline_checkpoints'").get();
  const hasCheckpointTable = sourceDatabase.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'checkpoints'").get();
  const rows = (hasTimelineTable ? sourceDatabase.prepare("SELECT state_json FROM timeline_checkpoints").iterate() : hasCheckpointTable ? sourceDatabase.prepare("SELECT state_json FROM checkpoints").iterate() : []) as Iterable<{ state_json: string }>;
  try { for (const row of rows) {
    let state: { worldDefinition?: { bundle?: { contentHash?: string } }; structuredState?: { settlements?: { bundle?: { bundle?: { contentHash?: string } } }[] }; firstGlowState?: { settlements?: { bundle?: { bundle?: { contentHash?: string } } }[] } };
    try { state = JSON.parse(row.state_json); } catch { continue; }
    const hashes = [state.worldDefinition?.bundle?.contentHash, ...(state.structuredState?.settlements ?? []).map(settlement => settlement.bundle?.bundle?.contentHash), ...(state.firstGlowState?.settlements ?? []).map(settlement => settlement.bundle?.bundle?.contentHash)];
    for (const hash of hashes) if (hash) {
      if (!/^sha256-[a-f0-9]{64}$/.test(hash) || !existsSync(join(bundleRoot,hash,"world.json"))) throw Error("Backup is missing a referenced world bundle");
      copiedBundles.add(hash);
    }
  }
  } finally { sourceDatabase.close(); }
  const bundleDestination = `${destination}.bundles`;
  mkdirSync(bundleDestination, { recursive: true });
  const bundleFiles: BackupManifest["bundleFiles"] = [];
  for (const hash of [...copiedBundles].sort()) {
    const sourceBundle = join(bundleRoot, hash);
    const targetBundle = join(bundleDestination, hash);
    cpSync(sourceBundle, targetBundle, { recursive: true, force: false, errorOnExist: true });
    const worldPath = join(sourceBundle, "world.json");
    const world = JSON.parse(readFileSync(worldPath, "utf8")) as { assets?: { path: string }[] };
    for (const asset of world.assets ?? []) {
      const assetPath = join(sourceBundle, asset.path);
      const contained = relative(sourceBundle, assetPath);
      if (contained.startsWith("..") || isAbsolute(contained) || !existsSync(assetPath) || !statSync(assetPath).isFile()) throw new Error(`missing referenced bundle asset: ${hash}/${asset.path}`);
    }
    for (const file of listFiles(sourceBundle)) bundleFiles.push({ hash, path: `${hash}/${relative(sourceBundle, file).replaceAll("\\", "/")}`, sha256: hashFile(file) });
  }
  const manifest: BackupManifest = { databaseSha256: hashFile(destination), databaseBytes: statSync(destination).size, bundleHashes: [...copiedBundles].sort(), bundleFiles, databaseVersion: 1 };
  const contractDb = new DatabaseSync(destination, { readOnly: true });
  let onlineAllocation = false;
  try {
    const table = contractDb.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='online_run_contract'").get();
    onlineAllocation = Boolean(table && contractDb.prepare("SELECT 1 FROM online_run_contract WHERE allocation_id != 'rules-only'").get());
  } finally { contractDb.close(); }
  if (onlineAllocation && !aiBudgetPath) throw Error("Online world backup requires its allocation ledger");
  if (aiBudgetPath) {
    const budget = new DatabaseSync(aiBudgetPath, { readOnly: true });
    try { budget.prepare("VACUUM INTO ?").run(`${destination}.ai-budget.db`); } finally { budget.close(); }
    manifest.aiBudget = { sha256: hashFile(`${destination}.ai-budget.db`), bytes: statSync(`${destination}.ai-budget.db`).size };
    validateBackupAllocation(destination, `${destination}.ai-budget.db`);
  }
  writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

/** The ledger snapshot follows the world snapshot, conservatively retaining later reservations. */
export function validateBackupAllocation(worldPath: string, budgetPath: string) {
  const world = new DatabaseSync(worldPath, { readOnly: true });
  const budget = new DatabaseSync(budgetPath, { readOnly: true });
  try {
    if ((budget.prepare("PRAGMA integrity_check").get() as any).integrity_check !== "ok") throw Error("Allocation integrity check failed");
    const contract = world.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='online_run_contract'").get();
    if (contract) {
      const row = world.prepare("SELECT allocation_id,run_id FROM online_run_contract WHERE id=1").get() as { allocation_id: string; run_id:string } | undefined;
      const profile = budget.prepare("SELECT identity, cap FROM budget_profile WHERE id=1").get() as { identity:string; cap:number };
      if (row && profile.identity !== allocationIdentity(row.allocation_id)) throw Error("Backup allocation identity mismatch");
      if (row?.allocation_id === ORIGINAL_SPARK_ALLOCATION_ID) {
        const binding = budget.prepare("SELECT run_id FROM budget_target WHERE id=1").get() as {run_id:string}|undefined;
        if (binding?.run_id !== row.run_id || profile.cap !== 5000000 || budget.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='budget_retirement'").get()) throw Error("Original allocation backup is not the active bound writer");
      }
      const recorded = Boolean(budget.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='budget_accounting_policy'").get() && budget.prepare("SELECT 1 FROM budget_accounting_policy WHERE id=1 AND version=?").get(RECORDED_COST_POLICY));
      const used = accountingTotals(budget.prepare("SELECT status,reservation,usage_json FROM ai_attempts").all() as any, recorded);
      if (used.accountedMicrousd > profile.cap) throw Error("Backup allocation exceeded its cap");
    }
    const table = world.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='timeline_checkpoints'").get();
    if (table) for (const row of world.prepare("SELECT state_json FROM timeline_checkpoints").iterate() as Iterable<{state_json:string}>) {
      const state = JSON.parse(row.state_json);
      for (const decision of state.firstGlowState?.history?.decisions ?? []) {
        if (decision.source !== "ai" || decision.trigger === "goal-selection") continue;
        if (!budget.prepare("SELECT 1 FROM ai_attempts WHERE context_hash=? AND status='completed'").get(decision.contextHash)) throw Error("Backup AI decision missing from allocation ledger");
      }
      for (const goal of state.firstGlowState?.goalLoops?.goals ?? []) {
        const receipt = goal.providerReceipt;
        if (!receipt) continue;
        const attempt = budget.prepare("SELECT status,reservation,usage_json FROM ai_attempts WHERE id=?").get(receipt.requestId) as any;
        if (!attempt || attempt.status !== receipt.status || attempt.reservation !== receipt.reservationMicrousd || (receipt.usage && !isDeepStrictEqual(JSON.parse(attempt.usage_json), receipt.usage))) throw Error("Backup goal receipt missing from allocation ledger");
      }
    }
  } finally { budget.close(); world.close(); }
}
