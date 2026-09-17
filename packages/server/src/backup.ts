import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, statSync, readFileSync, cpSync, rmSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, resolve, join, relative } from "node:path";
import { bundleHash, validateWorldBundle, type WorldBundle } from "@mimir/world-data";
import { createBundleInclusiveBackup } from "./backup-lib.js";

const mode = process.argv[2];
const projectRoot = resolve(process.cwd(), "..", "..");
const resolveProjectPath = (value: string) => isAbsolute(value) ? value : resolve(projectRoot, value);
const source = resolveProjectPath(process.env.DATABASE_PATH ?? "data/local/mimir.db");
const bundleRoot = resolveProjectPath(process.env.WORLD_BUNDLE_ROOT ?? "assets/world/generated");
const hashFile = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const listFiles = (root: string, current = root): string[] => readdirSync(current, { withFileTypes: true }).flatMap(entry => { const path = join(current, entry.name); return entry.isDirectory() ? listFiles(root, path) : entry.isFile() ? [path] : []; }).sort();
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
  try {
    copyFileSync(backup, destination);
    const manifestPath = `${backup}.manifest.json`;
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { databaseSha256?: string; bundleFiles?: { hash: string; path: string; sha256: string }[] };
      const actual = hashFile(destination);
      if (manifest.databaseSha256 !== actual) throw new Error(`backup checksum mismatch for ${backup}`);
      const filesByBundle = new Map<string, { path: string; sha256: string }[]>();
      for (const bundle of manifest.bundleFiles ?? []) filesByBundle.set(bundle.hash, [...(filesByBundle.get(bundle.hash) ?? []), { path: bundle.path, sha256: bundle.sha256 }]);
      const restoredBundles = `${destination}.bundles`;
      mkdirSync(restoredBundles, { recursive: true });
      for (const [hash, files] of filesByBundle) {
        const sourceBundle = join(`${backup}.bundles`, hash);
        const worldPath = join(sourceBundle, "world.json");
        if (!existsSync(worldPath)) throw new Error(`backup bundle missing world file: ${hash}`);
        const parsed = JSON.parse(readFileSync(worldPath, "utf8")) as WorldBundle;
        validateWorldBundle(parsed);
        if (bundleHash(parsed) !== hash) throw new Error(`backup bundle content hash mismatch for ${hash}`);
        for (const file of files) {
          const relativeFile = file.path.slice(`${hash}/`.length);
          const sourceFile = resolve(sourceBundle, relativeFile);
          const contained = relative(sourceBundle, sourceFile);
          if (contained.startsWith("..") || isAbsolute(contained) || !existsSync(sourceFile) || !statSync(sourceFile).isFile()) throw new Error(`backup bundle file missing: ${file.path}`);
          if (hashFile(sourceFile) !== file.sha256) throw new Error(`backup bundle checksum mismatch for ${file.path}`);
        }
        const listedFiles = new Set(files.map(file => file.path.slice(`${hash}/`.length)));
        const actualFiles = new Set(listFiles(sourceBundle).map(file => relative(sourceBundle, file).replaceAll("\\", "/")));
        if (actualFiles.size !== listedFiles.size || [...actualFiles].some(file => !listedFiles.has(file))) throw new Error(`backup bundle manifest does not cover every file for ${hash}`);
        cpSync(sourceBundle, join(restoredBundles, hash), { recursive: true, force: false, errorOnExist: true });
      }
    }
    const database = new DatabaseSync(destination);
    const hasTimelineTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'timeline_checkpoints'").get();
    const hasCheckpointTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'checkpoints'").get();
    const row = (hasTimelineTable ? database.prepare("SELECT COUNT(*) AS count FROM timeline_checkpoints").get() : hasCheckpointTable ? database.prepare("SELECT COUNT(*) AS count FROM checkpoints").get() : { count: 0 }) as { count: number };
    database.close();
    console.log(JSON.stringify({ mode, backup, destination, checkpoints: row.count, bytes: statSync(destination).size }));
  } catch (error) {
    for (const path of [destination, `${destination}-wal`, `${destination}-shm`, `${destination}.bundles`]) if (existsSync(path)) rmSync(path, { recursive: true, force: true });
    throw error;
  }
}
