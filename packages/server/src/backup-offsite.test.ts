import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadOffsiteStatus, offsiteHealth, runOffsiteBackup, saveOffsiteStatus } from "./backup-offsite.js";

const root = resolve(".tmp", `offsite-contract-${Date.now()}`);
mkdirSync(root, { recursive: true });
try {
  const source = join(root, "source.db"), statusPath = join(root, "status.json");
  const db = new DatabaseSync(source);
  db.exec("CREATE TABLE timelines(id TEXT, status TEXT); INSERT INTO timelines VALUES('main','archived'); CREATE TABLE timeline_checkpoints(timeline_id TEXT,pulse INTEGER,state_json TEXT); INSERT INTO timeline_checkpoints VALUES('main',64,'{}'); CREATE TABLE timeline_events(id TEXT); CREATE TABLE timeline_interpretations(id TEXT); CREATE TABLE runtime_metadata(key TEXT,value TEXT);");
  db.close();
  const config = { source, directory: root, bundleRoot: root, destination: "gs://fixture/daily", statusPath, freshnessMaxAgeMs: 1000, impersonateServiceAccount: "writer@example.invalid" };
  let uploaded = false;
  const success = await runOffsiteBackup(config, async (backup, destination, runner, now, identity) => {
    assert.equal(identity, config.impersonateServiceAccount);
    assert.ok(readFileSync(`${backup}.manifest.json`).length);
    uploaded = true;
    return { objectUri: destination + "/snapshot.tar.gz", archivePath: "removed", archiveSha256: "abc", archiveBytes: 123 };
  }, async (path, uri, identity) => {
    assert.equal(identity, config.impersonateServiceAccount);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).database.latest[0].pulse, 64);
    assert.ok(uri.endsWith(".receipt.json"));
  });
  assert.ok(uploaded && success.healthy);
  assert.equal(success.database?.latest[0].pulse, 64);
  const restarted = loadOffsiteStatus(statusPath, config.destination, 1000);
  assert.equal(restarted.lastArchiveSha256, "abc");
  assert.equal(offsiteHealth(restarted, Date.parse(restarted.lastSuccessAt!) + 1001).stale, true);
  assert.equal(offsiteHealth({ ...restarted, lastSuccessAt: "invalid" }).stale, true);
  assert.equal(offsiteHealth({ ...restarted, lastSuccessAt: new Date(Date.now() + 60000).toISOString() }).stale, true);
  assert.equal(offsiteHealth({ ...restarted, lastAttemptAt: new Date(Date.parse(restarted.lastSuccessAt!) + 1).toISOString() }).healthy, false);
  assert.equal(offsiteHealth({ ...restarted, lastAttemptAt: "invalid" }).healthy, false);
  await assert.rejects(runOffsiteBackup({ ...config, minimumCheckpoint: async () => ({ timeline_id: "main", pulse: 65 }) }, async () => { throw new Error("unexpected upload"); }));
  saveOffsiteStatus(statusPath, restarted);
  await assert.rejects(runOffsiteBackup(config, async () => { throw new Error("credential-shaped child output must not be persisted"); }), /off-VM backup failed/);
  const failed = loadOffsiteStatus(statusPath, config.destination, 1000);
  assert.equal(failed.consecutiveFailures, 1);
  assert.equal(failed.lastArchiveSha256, "abc");
  assert.equal(offsiteHealth(failed).healthy, false);
  assert.ok(!readFileSync(statusPath, "utf8").includes("credential-shaped"));
  saveOffsiteStatus(statusPath, restarted);
  await assert.rejects(runOffsiteBackup(config, async () => ({ objectUri: "gs://fixture/new", archivePath: "removed", archiveSha256: "new", archiveBytes: 456 }), async () => { throw new Error("receipt upload failed"); }));
  assert.equal(loadOffsiteStatus(statusPath, config.destination, 1000).lastArchiveSha256, "abc");
  assert.equal(loadOffsiteStatus(statusPath, "gs://different", 1000).lastSuccessAt, undefined);
  writeFileSync(statusPath, "broken");
  assert.equal(offsiteHealth(loadOffsiteStatus(statusPath, config.destination, 1000)).healthy, false);
  saveOffsiteStatus(statusPath, restarted);
  const missing = new DatabaseSync(source);
  missing.exec(`UPDATE timeline_checkpoints SET state_json='{"worldDefinition":{"bundle":{"contentHash":"sha256-missing"}}}'`);
  missing.close();
  uploaded = false;
  await assert.rejects(runOffsiteBackup(config, async () => { uploaded = true; throw new Error("unexpected upload"); }));
  assert.equal(uploaded, false);
  console.log("Off-VM success, failure, freshness, restart, and missing-bundle contracts passed");
} finally { rmSync(root, { recursive: true, force: true }); }
