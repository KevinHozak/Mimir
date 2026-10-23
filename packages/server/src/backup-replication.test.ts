import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { replicateBackup } from "./backup-replication.js";

const execFileAsync = promisify(execFile);

const root = join(process.cwd(), ".tmp", `backup-replication-${Date.now()}`);
const backup = join(root, "mimir-test.db");
const commands: { command: string; args: string[] }[] = [];
let archiveEntries = "";
try {
  mkdirSync(`${backup}.bundles`, { recursive: true });
  writeFileSync(backup, "sqlite fixture\n");
  writeFileSync(`${backup}.manifest.json`, JSON.stringify({ databaseSha256: "fixture", bundleHashes: [], bundleFiles: [] }));
  writeFileSync(`${backup}.bundles/README.txt`, "bundle fixture\n");
  const result = await replicateBackup(backup, "gs://mimir-test-bucket/daily", async (command, args) => {
    commands.push({ command, args });
    if (command === "tar") { await execFileAsync(command, args); archiveEntries = (await execFileAsync(command, ["-tzf", args[1]])).stdout; }
    if (command === "gcloud" && args[0] === "storage" && args[1] === "objects") {
      return { stdout: JSON.stringify({ size: readFileSync(resultArchive(commands)).length, md5_hash: createHash("md5").update(readFileSync(resultArchive(commands))).digest("base64") }), stderr: "" };
    }
    return { stdout: "", stderr: "" };
  });
  assert.equal(result.objectUri.startsWith("gs://mimir-test-bucket/daily/mimir-test.db."), true);
  assert.match(archiveEntries, /mimir-test\.db/);
  assert.match(archiveEntries, /mimir-test\.db\.manifest\.json/);
  assert.match(archiveEntries, /mimir-test\.db\.bundles\//);
  assert.equal(commands.filter(command => command.command === "gcloud").length, 2);
  assert.equal(commands.some(command => command.args.includes("storage") && command.args.includes("cp")), true);
  assert.equal(commands.some(command => command.args.includes("objects") && command.args.includes("describe")), true);
  await assert.rejects(
    replicateBackup(backup, "gs://mimir-test-bucket/daily", async (command, args) => {
      if (command === "tar") await execFileAsync(command, args);
      if (command === "gcloud") throw new Error("simulated upload failure");
      return { stdout: "", stderr: "" };
    }),
    /simulated upload failure/,
  );
  assert.equal(commands.some(command => command.command === "gcloud" && command.args.includes("--quiet")), true);
  for (const metadata of [{ size: 0 }, { size: "actual", md5_hash: "wrong" }, { size: "actual" }]) {
    let archive = "";
    await assert.rejects(replicateBackup(backup, "gs://mimir-test-bucket/daily", async (command, args) => {
      if (command === "tar") { archive = args[1]; await execFileAsync(command, args); }
      if (command === "gcloud") assert.ok(args.includes("--impersonate-service-account=writer@example.invalid"));
      if (args.includes("describe")) return { stdout: JSON.stringify({ ...metadata, size: metadata.size === "actual" ? readFileSync(archive).length : metadata.size }), stderr: "" };
      return { stdout: "", stderr: "" };
    }, new Date(), "writer@example.invalid"), /remote backup/);
  }
  console.log("Backup replication contract passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}

function resultArchive(recorded: { command: string; args: string[] }[]): string {
  const tar = recorded.find(command => command.command === "tar");
  if (!tar) throw new Error("tar command was not recorded");
  return tar.args[1];
}
