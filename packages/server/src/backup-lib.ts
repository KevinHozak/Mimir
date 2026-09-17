import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, cpSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, isAbsolute } from "node:path";

export type BackupManifest = { databaseSha256: string; databaseBytes: number; bundleHashes: string[]; bundleFiles: { hash: string; path: string; sha256: string }[]; databaseVersion: 1 };

const hashFile = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
function listFiles(root: string, current = root): string[] {
  return readdirSync(current, { withFileTypes: true }).flatMap(entry => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? listFiles(root, path) : entry.isFile() ? [path] : [];
  }).sort();
}

export function createBundleInclusiveBackup(source: string, destination: string, bundleRoot: string): BackupManifest {
  if (!existsSync(source)) throw new Error(`Source database does not exist: ${source}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing backup: ${destination}`);
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
  const rows = (hasTimelineTable ? sourceDatabase.prepare("SELECT state_json FROM timeline_checkpoints").all() : hasCheckpointTable ? sourceDatabase.prepare("SELECT state_json FROM checkpoints").all() : []) as { state_json: string }[];
  sourceDatabase.close();
  for (const row of rows) {
    try {
      const state = JSON.parse(row.state_json) as { worldDefinition?: { bundle?: { contentHash?: string } }; structuredState?: { settlements?: { bundle?: { bundle?: { contentHash?: string } } }[] }; firstGlowState?: { settlements?: { bundle?: { bundle?: { contentHash?: string } } }[] } };
      const hashes = [state.worldDefinition?.bundle?.contentHash, ...(state.structuredState?.settlements ?? []).map(settlement => settlement.bundle?.bundle?.contentHash), ...(state.firstGlowState?.settlements ?? []).map(settlement => settlement.bundle?.bundle?.contentHash)];
      for (const hash of hashes) if (hash && existsSync(join(bundleRoot, hash, "world.json"))) copiedBundles.add(hash);
    } catch { /* retain legacy snapshots even if they do not contain a bundle reference */ }
  }
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
  writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}
