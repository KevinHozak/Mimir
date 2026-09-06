import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

const mode = process.argv[2];
const projectRoot = resolve(process.cwd(), "..", "..");
const resolveProjectPath = (value: string) => isAbsolute(value) ? value : resolve(projectRoot, value);
const source = resolveProjectPath(process.env.DATABASE_PATH ?? "mimir.db");
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
  console.log(JSON.stringify({ mode, source, destination, bytes: statSync(destination).size }));
} else {
  const backup = resolveProjectPath(destinationArg);
  const destination = resolveProjectPath(process.argv[4] ?? `${source}.restored`);
  if (!existsSync(backup)) throw new Error(`Backup does not exist: ${backup}`);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite restore target: ${destination}`);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(backup, destination);
  const database = new DatabaseSync(destination);
  const hasTimelineTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'timeline_checkpoints'").get();
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${hasTimelineTable ? "timeline_checkpoints" : "checkpoints"}`).get() as { count: number };
  database.close();
  console.log(JSON.stringify({ mode, backup, destination, checkpoints: row.count, bytes: statSync(destination).size }));
}
