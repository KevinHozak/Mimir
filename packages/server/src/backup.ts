import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, statSync, readFileSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve, join } from "node:path";
import { bundleHash, validateWorldBundle, type WorldBundle } from "@mimir/world-data";
import { createBundleInclusiveBackup } from "./backup-lib.js";

const mode = process.argv[2];
const projectRoot = resolve(process.cwd(), "..", "..");
const resolveProjectPath = (value: string) => isAbsolute(value) ? value : resolve(projectRoot, value);
const source = resolveProjectPath(process.env.DATABASE_PATH ?? "data/local/mimir.db");
const bundleRoot = resolveProjectPath(process.env.WORLD_BUNDLE_ROOT ?? "assets/world/generated");
const hashFile = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const destinationArg = process.argv[3];
if (!destinationArg || !["backup", "restore"].includes(mode)) {
  console.error("Usage: npm run backup --workspace @mimir/server -- backup <destination> | restore <backup> <destination>");
  process.exit(2);
}
if (mode === "backup") {
  const destination = resolveProjectPath(destinationArg);
  const manifest = createBundleInclusiveBackup(source, destination, bundleRoot);
  console.log(JSON.stringify({ mode, source, destination, manifest: `${destination}.manifest.json`, ...manifest }));
} else {
  const backup = resolveProjectPath(destinationArg);
  const destination = resolveProjectPath(process.argv[4] ?? `${source}.restored`);
  if (!existsSync(backup)) throw new Error(`Backup does not exist: ${backup}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite restore target: ${destination}`);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(backup, destination);
  const manifestPath = `${backup}.manifest.json`; if (existsSync(manifestPath)) { const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { databaseSha256?: string; bundleFiles?: { hash: string; path: string; sha256: string }[] }; const actual = hashFile(destination); if (manifest.databaseSha256 !== actual) throw new Error(`backup checksum mismatch for ${backup}`); const restoredBundles = `${destination}.bundles`; mkdirSync(restoredBundles, { recursive: true }); for (const bundle of manifest.bundleFiles ?? []) { const sourceBundle = join(`${backup}.bundles`, bundle.hash); const worldPath = join(sourceBundle, "world.json"); if (!existsSync(worldPath) || hashFile(worldPath) !== bundle.sha256) throw new Error(`backup bundle checksum mismatch for ${bundle.hash}`); const parsed = JSON.parse(readFileSync(worldPath, "utf8")) as WorldBundle; validateWorldBundle(parsed); if (bundleHash(parsed) !== bundle.hash) throw new Error(`backup bundle content hash mismatch for ${bundle.hash}`); cpSync(sourceBundle, join(restoredBundles, bundle.hash), { recursive: true, force: false, errorOnExist: true }); } }
  const database = new DatabaseSync(destination);
  const hasTimelineTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'timeline_checkpoints'").get();
  const hasCheckpointTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'checkpoints'").get();
  const row = (hasTimelineTable ? database.prepare("SELECT COUNT(*) AS count FROM timeline_checkpoints").get() : hasCheckpointTable ? database.prepare("SELECT COUNT(*) AS count FROM checkpoints").get() : { count: 0 }) as { count: number };
  database.close();
  console.log(JSON.stringify({ mode, backup, destination, checkpoints: row.count, bytes: statSync(destination).size }));
}
