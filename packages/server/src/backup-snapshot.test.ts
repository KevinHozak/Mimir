import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBundleInclusiveBackup } from "./backup-lib.js";

test("backup includes committed WAL rows while an older reader pins the checkpoint", () => {
  const temporaryRoot = fileURLToPath(new URL("../../../.tmp/", import.meta.url));
  mkdirSync(temporaryRoot, { recursive: true });
  const directory = mkdtempSync(join(temporaryRoot, "backup-wal-"));
  const source = join(directory, "source.db"), destination = join(directory, "backup.db");
  const writer = new DatabaseSync(source);
  let reader: DatabaseSync | undefined;
  try {
    writer.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE timeline_checkpoints (pulse INTEGER PRIMARY KEY, state_json TEXT NOT NULL)");
    const insert = writer.prepare("INSERT INTO timeline_checkpoints VALUES (?, ?)");
    insert.run(0, JSON.stringify({ pulse: 0 }));
    reader = new DatabaseSync(source, { readOnly: true });
    reader.exec("BEGIN");
    assert.equal(reader.prepare("SELECT MAX(pulse) AS pulse FROM timeline_checkpoints").get()?.pulse, 0);
    insert.run(1, JSON.stringify({ pulse: 1 }));
    insert.run(2, JSON.stringify({ pulse: 2 }));
    const checkpoint = writer.prepare("PRAGMA wal_checkpoint(PASSIVE)").get() as { log: number; checkpointed: number };
    assert.ok(checkpoint.log > checkpoint.checkpointed, "reader must leave committed rows in WAL");

    createBundleInclusiveBackup(source, destination, join(directory, "unused-bundles"));
    insert.run(3, JSON.stringify({ pulse: 3 }));
    const backup = new DatabaseSync(destination, { readOnly: true });
    try {
      assert.deepEqual(backup.prepare("SELECT pulse FROM timeline_checkpoints ORDER BY pulse").all().map(row => row.pulse), [0, 1, 2]);
      assert.equal(backup.prepare("PRAGMA integrity_check").get()?.integrity_check, "ok");
    } finally { backup.close(); }
    assert.equal(reader.prepare("SELECT MAX(pulse) AS pulse FROM timeline_checkpoints").get()?.pulse, 0, "backup must not disturb the reader snapshot");
  } finally {
    reader?.close(); writer.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
