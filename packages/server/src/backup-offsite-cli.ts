import { resolve } from "node:path";
import { loadOffsiteStatus, offsiteHealth, runOffsiteBackup } from "./backup-offsite.js";

const destination = process.env.BACKUP_GCS_URI?.trim();
if (!destination) throw new Error("BACKUP_GCS_URI is required");
const directory = resolve(process.env.BACKUP_DIR ?? "data/backups");
const statusPath = resolve(process.env.BACKUP_STATUS_PATH ?? `${directory}/offsite-status.json`);
const freshnessMaxAgeMs = Number(process.env.BACKUP_FRESHNESS_MAX_AGE_MS ?? 172800000);
if (!Number.isFinite(freshnessMaxAgeMs) || freshnessMaxAgeMs <= 0) throw new Error("invalid backup freshness interval");
const mode = process.argv[2];
const healthUrl = process.env.BACKUP_HEALTH_URL;
const minimumCheckpoint = healthUrl ? async () => {
  const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("live writer health unavailable");
  const health = await response.json() as { pulse?: number; timeline?: { id?: string } };
  if (!Number.isSafeInteger(health.pulse) || typeof health.timeline?.id !== "string") throw new Error("live writer checkpoint unavailable");
  return { timeline_id: health.timeline.id, pulse: health.pulse! };
} : undefined;
if (mode === "status") {
  const status = offsiteHealth(loadOffsiteStatus(statusPath, destination, freshnessMaxAgeMs));
  console.log(JSON.stringify(status));
  if (!status.healthy) process.exitCode = 1;
} else if (mode === "backup") {
  if (!process.env.DATABASE_PATH || !process.env.WORLD_BUNDLE_ROOT) throw new Error("explicit DATABASE_PATH and WORLD_BUNDLE_ROOT are required");
  console.log(JSON.stringify(await runOffsiteBackup({ source: resolve(process.env.DATABASE_PATH), directory, bundleRoot: resolve(process.env.WORLD_BUNDLE_ROOT), destination, statusPath, freshnessMaxAgeMs, impersonateServiceAccount: process.env.BACKUP_IMPERSONATE_SERVICE_ACCOUNT, minimumCheckpoint })));
} else throw new Error("Usage: backup-offsite-cli.js backup|status");
