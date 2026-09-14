import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const [archiveRootArg, bucketUri, ...flags] = process.argv.slice(2);
if (!archiveRootArg || !bucketUri) throw new Error("usage: node scripts/publish-public-archive.mjs <archive-directory> <gs://bucket/prefix> [--dry-run] [--quarantine <archive-id>] [--retention-days <days>]");
if (!bucketUri.startsWith("gs://")) throw new Error("destination must be a gs:// URI");
const archiveRoot = resolve(archiveRootArg);
const dryRun = flags.includes("--dry-run");
const quarantineIndex = flags.indexOf("--quarantine");
const quarantineId = quarantineIndex >= 0 ? flags[quarantineIndex + 1] : undefined;
const retentionIndex = flags.indexOf("--retention-days");
const retentionDays = retentionIndex >= 0 ? Number(flags[retentionIndex + 1]) : 395;
if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error("retention days must be a positive integer");

const catalogPath = join(archiveRoot, "catalog.json");
if (!existsSync(catalogPath)) throw new Error("catalog.json is required");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
if (catalog.schemaVersion !== 1 || catalog.simulationVersion !== "mimir-sim-v3-first-glow" || !Array.isArray(catalog.archives)) throw new Error("catalog schema or simulation version is invalid");
if (quarantineId && !catalog.archives.some(item => item.archiveId === quarantineId)) throw new Error(`archive is not in catalog: ${quarantineId}`);

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const checkedFiles = [];
for (const item of catalog.archives) {
  if (item.archiveId === quarantineId) continue;
  const root = join(archiveRoot, item.archiveId);
  const manifestPath = join(root, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`archive manifest missing: ${item.archiveId}`);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  if (manifest.archiveId !== item.archiveId || manifest.schemaVersion !== 1 || manifest.simulationVersion !== catalog.simulationVersion || !Array.isArray(manifest.chunks) || manifest.chunks.length !== item.chunkCount || manifest.chunks.length < 3 || manifest.chunks[0]?.pulse !== 0 || manifest.chunks.some((chunk, index) => !Number.isInteger(chunk.pulse) || (index > 0 && chunk.pulse <= manifest.chunks[index - 1].pulse))) throw new Error(`archive manifest checkpoint contract failed: ${item.archiveId}`);
  if (item.manifestSha256 && sha256(manifestBytes) !== item.manifestSha256) throw new Error(`catalog manifest checksum mismatch: ${item.archiveId}`);
  for (const chunk of manifest.chunks) {
    const path = join(root, "chunks", chunk.name);
    if (!existsSync(path)) throw new Error(`archive chunk missing: ${item.archiveId}/${chunk.name}`);
    const bytes = readFileSync(path);
    const payload = readJson(path);
    if (bytes.length !== chunk.bytes || sha256(bytes) !== chunk.sha256 || payload.schemaVersion !== 1 || payload.world?.simulationVersion !== catalog.simulationVersion || payload.world?.spatialModel !== "structured-v2") throw new Error(`archive chunk integrity check failed: ${item.archiveId}/${chunk.name}`);
    checkedFiles.push({ path, remote: `${bucketUri.replace(/\/$/, "")}/archives/${item.archiveId}/chunks/${chunk.name}` });
  }
  checkedFiles.push({ path: manifestPath, remote: `${bucketUri.replace(/\/$/, "")}/archives/${item.archiveId}/manifest.json` });
}
const publishedCatalog = { ...catalog, archives: catalog.archives.filter(item => item.archiveId !== quarantineId) };
const tempRoot = resolve(archiveRoot, ".publication-tmp");
mkdirSync(tempRoot, { recursive: true });
const publishedCatalogPath = join(tempRoot, "catalog.json");
// The catalog is written only after every selected archive has passed validation.
const catalogBytes = Buffer.from(JSON.stringify(publishedCatalog, null, 2) + "\n");
writeFileSync(publishedCatalogPath, catalogBytes);
const runId = `run-${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
const publicationRecord = {
  schemaVersion: 1,
  runId,
  publishedAt: new Date().toISOString(),
  source: publishedCatalog.archives.map(item => ({ backup: item.source?.backup ?? "unspecified", timelineId: item.source?.timelineId ?? item.timeline.id, checkpoints: item.checkpoints ?? [] })),
  archives: publishedCatalog.archives.map(item => ({ archiveId: item.archiveId, chunks: item.chunkCount, checkpoints: item.checkpoints ?? [] })),
  retentionDays,
  chunkPolicy: "one complete JSON checkpoint per content-addressed chunk",
  republish: "safe to rerun; canonical SQLite history is read-only and the catalog commit is atomic",
  quarantine: quarantineId ? { archiveId: quarantineId, reason: "operator-selected quarantine" } : null,
  rollback: "restore the previous catalog.json; immutable archive objects remain available for recovery",
};
const publicationRecordPath = join(tempRoot, "publication-record.json");
writeFileSync(publicationRecordPath, JSON.stringify(publicationRecord, null, 2) + "\n");
const stagingUri = `${bucketUri.replace(/\/$/, "")}/archives/.staging/${runId}`;
function gcloud(args) {
  if (dryRun) return;
  const executable = process.platform === "win32" ? "gcloud.cmd" : "gcloud";
  const result = spawnSync(executable, ["storage", ...args], { encoding: "utf8", shell: process.platform === "win32" });
  if (result.error || result.status !== 0) throw new Error(`gcloud storage failed: ${result.error?.message || result.stderr || result.stdout || "unknown error"}`);
}
for (const file of checkedFiles) {
  const relativePath = file.remote.split("/archives/")[1];
  gcloud(["cp", file.path, `${stagingUri}/${relativePath}`]);
}
gcloud(["cp", publishedCatalogPath, `${stagingUri}/catalog.json`]);
gcloud(["cp", publicationRecordPath, `${stagingUri}/publications/${runId}.json`]);
for (const file of checkedFiles) {
  const relativePath = file.remote.split("/archives/")[1];
  gcloud(["cp", `${stagingUri}/${relativePath}`, file.remote]);
}
gcloud(["cp", `${stagingUri}/publications/${runId}.json`, `${bucketUri.replace(/\/$/, "")}/archives/publications/${runId}.json`]);
// Catalog publication is the commit point: incomplete archives are not advertised.
gcloud(["cp", `${stagingUri}/catalog.json`, `${bucketUri.replace(/\/$/, "")}/archives/catalog.json`]);
if (!dryRun) rmSync(tempRoot, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, dryRun, runId, publishedArchives: publishedCatalog.archives.map(item => item.archiveId), quarantinedArchive: quarantineId ?? null, retentionDays, publicationRecord: `${bucketUri.replace(/\/$/, "")}/archives/publications/${runId}.json`, catalogCommit: `${bucketUri.replace(/\/$/, "")}/archives/catalog.json` }, null, 2));

