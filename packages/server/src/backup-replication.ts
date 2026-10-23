import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const execFileAsync = promisify(execFile);

export type BackupReplicationStatus = {
  enabled: boolean;
  destination?: string;
  freshnessMaxAgeMs: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastObjectUri?: string;
  lastArchiveSha256?: string;
  lastArchiveBytes?: number;
  lastError?: string;
  consecutiveFailures: number;
};

type CommandRunner = (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

const defaultCommandRunner: CommandRunner = async (command, args) => {
  const result = await execFileAsync(command, args, { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 120000 });
  return { stdout: result.stdout, stderr: result.stderr };
};

const sha256File = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const md5Base64File = (path: string) => createHash("md5").update(readFileSync(path)).digest("base64");

function parseJsonObject(output: string): Record<string, unknown> {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("gcloud did not return object metadata JSON");
  return JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
}

function normalizeDestination(destination: string): string {
  const value = destination.trim().replace(/\/+$/, "");
  if (!/^gs:\/\/[^/]+(?:\/.*)?$/.test(value)) throw new Error("BACKUP_GCS_URI must be a gs:// bucket destination");
  return value;
}

export async function uploadVerifiedFile(path: string, objectUri: string, impersonateServiceAccount?: string, commandRunner: CommandRunner = defaultCommandRunner) {
  const identity = impersonateServiceAccount ? [`--impersonate-service-account=${impersonateServiceAccount}`] : [];
  await commandRunner("gcloud", ["storage", "cp", path, objectUri, "--quiet", ...identity]);
  const metadata = parseJsonObject((await commandRunner("gcloud", ["storage", "objects", "describe", objectUri, "--format=json", ...identity])).stdout);
  if (Number(metadata.size) !== statSync(path).size) throw new Error("remote backup size mismatch");
  const remoteMd5 = metadata.md5_hash ?? metadata.md5Hash;
  if (typeof remoteMd5 !== "string" || remoteMd5 !== md5Base64File(path)) throw new Error("remote backup MD5 missing or mismatched");
}

export async function replicateBackup(
  backupPath: string,
  destination: string,
  commandRunner: CommandRunner = defaultCommandRunner,
  now = new Date(),
  impersonateServiceAccount?: string,
): Promise<{ objectUri: string; archivePath: string; archiveSha256: string; archiveBytes: number }> {
  const normalizedDestination = normalizeDestination(destination);
  const manifestPath = `${backupPath}.manifest.json`;
  const bundlePath = `${backupPath}.bundles`;
  if (!existsSync(backupPath) || !existsSync(manifestPath) || !existsSync(bundlePath)) throw new Error("bundle-inclusive backup unit is incomplete");

  const archiveName = `${basename(backupPath)}.${now.toISOString().replaceAll(":", "-")}.tar.gz`;
  const archivePath = join(dirname(backupPath), archiveName);
  const backupName = basename(backupPath);
  try {
    await commandRunner("tar", ["-czf", archivePath, "-C", dirname(backupPath), backupName, `${backupName}.manifest.json`, `${backupName}.bundles`]);
    if (!existsSync(archivePath)) throw new Error("tar did not create the backup archive");
    const archiveSha256 = sha256File(archivePath);
    const archiveBytes = statSync(archivePath).size;
    const objectUri = `${normalizedDestination}/${archiveName}`;
    await uploadVerifiedFile(archivePath, objectUri, impersonateServiceAccount, commandRunner);
    return { objectUri, archivePath, archiveSha256, archiveBytes };
  } finally {
    if (existsSync(archivePath)) rmSync(archivePath, { force: true });
  }
}
