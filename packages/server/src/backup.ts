import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve, join } from "node:path";

const mode = process.argv[2];
const projectRoot = resolve(process.cwd(), "..", "..");
const resolveProjectPath = (value: string) => isAbsolute(value) ? value : resolve(projectRoot, value);
const source = resolveProjectPath(process.env.DATABASE_PATH ?? "mimir.db");
const bundleRoot = resolveProjectPath(process.env.WORLD_BUNDLE_ROOT ?? "assets/world/generated");
const destinationArg = process.argv[3];
if (!destinationArg || !["backup", "restore"].includes(mode)) {
  console.error("Usage: npm run backup --workspace @mimir/server -- backup <destination> | restore <backup> <destination>");
  process.exit(2);
}
if (mode === "backup") {
  if (!existsSync(source)) throw new Error(`Source database does not exist: ${source}`);
  const destination = resolveProjectPath(destinationArg);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite existing backup: ${destination}`);
  const database = new DatabaseSync(source);
  database.exec("PRAGMA wal_checkpoint(FULL);");
  database.close();
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  const copiedBundles = new Set<string>(); const sourceDatabase = new DatabaseSync(destination);
  const hasTimelineTable = sourceDatabase.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'timeline_checkpoints'").get();
  const hasCheckpointTable = sourceDatabase.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'checkpoints'").get();
  const rows = (hasTimelineTable ? sourceDatabase.prepare("SELECT state_json FROM timeline_checkpoints").all() : hasCheckpointTable ? sourceDatabase.prepare("SELECT state_json FROM checkpoints").all() : []) as { state_json: string }[]; sourceDatabase.close();
  for (const row of rows) { try { const state = JSON.parse(row.state_json) as { worldDefinition?: { bundle?: { contentHash?: string } } }; const hash = state.worldDefinition?.bundle?.contentHash; if (hash && existsSync(join(bundleRoot, hash, "world.json"))) copiedBundles.add(hash); } catch { /* legacy state is retained without a structured bundle */ } }
  const manifest = { databaseSha256: createHash("sha256").update(readFileSync(destination)).digest("hex"), databaseBytes: statSync(destination).size, bundleHashes: [...copiedBundles].sort(), databaseVersion: 1 };
  writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify({ mode, source, destination, manifest: `${destination}.manifest.json`, ...manifest }));
} else {
  const backup = resolveProjectPath(destinationArg);
  const destination = resolveProjectPath(process.argv[4] ?? `${source}.restored`);
  if (!existsSync(backup)) throw new Error(`Backup does not exist: ${backup}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite restore target: ${destination}`);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(backup, destination);
  const manifestPath = `${backup}.manifest.json`; if (existsSync(manifestPath)) { const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { databaseSha256?: string }; const actual = createHash("sha256").update(readFileSync(destination)).digest("hex"); if (manifest.databaseSha256 !== actual) throw new Error(`backup checksum mismatch for ${backup}`); }
  const database = new DatabaseSync(destination);
  const hasTimelineTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'timeline_checkpoints'").get();
  const hasCheckpointTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'checkpoints'").get();
  const row = (hasTimelineTable ? database.prepare("SELECT COUNT(*) AS count FROM timeline_checkpoints").get() : hasCheckpointTable ? database.prepare("SELECT COUNT(*) AS count FROM checkpoints").get() : { count: 0 }) as { count: number };
  database.close();
  console.log(JSON.stringify({ mode, backup, destination, checkpoints: row.count, bytes: statSync(destination).size }));
}
