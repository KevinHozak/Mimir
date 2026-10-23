import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createBundleInclusiveBackup } from "../packages/server/dist/backup-lib.js";
import { databaseEvidence } from "../packages/server/dist/backup-offsite.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporary = join(root, ".tmp", `recovery-contract-${Date.now()}`);
mkdirSync(temporary, { recursive: true });
try {
  const source = join(temporary, "source.db"), backup = join(temporary, "fixture.db"), archive = join(temporary, "fixture.tar.gz");
  const db = new DatabaseSync(source);
  db.exec("CREATE TABLE timelines(id TEXT,status TEXT); INSERT INTO timelines VALUES('main','archived'); CREATE TABLE timeline_checkpoints(timeline_id TEXT,pulse INTEGER,state_json TEXT); INSERT INTO timeline_checkpoints VALUES('main',64,'{}'); CREATE TABLE timeline_events(id TEXT); INSERT INTO timeline_events VALUES('event-64'); CREATE TABLE timeline_interpretations(id TEXT); CREATE TABLE runtime_metadata(key TEXT,value TEXT);");
  db.close();
  createBundleInclusiveBackup(source, backup, temporary);
  execFileSync("tar", ["-czf", archive, "-C", temporary, "fixture.db", "fixture.db.manifest.json", "fixture.db.bundles"]);
  const receipt = { lastArchiveBytes: readFileSync(archive).length, lastArchiveSha256: createHash("sha256").update(readFileSync(archive)).digest("hex"), database: databaseEvidence(backup), bundleFiles: 0 };
  const receiptPath = join(temporary, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(receipt));
  const program = `import importlib.util,json,pathlib,sys\nspec=importlib.util.spec_from_file_location('recovery',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps(m.recover(json.loads(pathlib.Path(sys.argv[2]).read_text()),pathlib.Path(sys.argv[3]),pathlib.Path(sys.argv[4]),pathlib.Path(sys.argv[5]),sys.argv[6])))`;
  const run = target => execFileSync("python", ["-B", "-c", program, join(root, "scripts/verify-offsite-recovery.py"), receiptPath, archive, target, root, process.execPath], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  assert.equal(JSON.parse(run(join(temporary, "restored"))).verified, true);
  assert.throws(() => run(join(temporary, "restored")), /recovery directory must not exist/);
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, lastArchiveSha256: "bad" }));
  assert.throws(() => run(join(temporary, "corrupt")), /checksum or size mismatch/);
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, database: { ...receipt.database, latest: [] } }));
  assert.throws(() => run(join(temporary, "wrong-history")), /timeline\/history differs/);
  const safety = `import importlib.util,io,pathlib,tarfile,sys\nspec=importlib.util.spec_from_file_location('recovery',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nfor name,kind in [('../escape','file'),('/absolute','file'),('fixture.db','link'),('C:/escape','file')]:\n p=pathlib.Path(sys.argv[2])/'unsafe.tar.gz'\n with tarfile.open(p,'w:gz') as t:\n  member=tarfile.TarInfo(name);member.type=tarfile.SYMTYPE if kind=='link' else tarfile.REGTYPE;t.addfile(member,io.BytesIO())\n try:m.unpack(p,pathlib.Path(sys.argv[2])/'unsafe');raise AssertionError('unsafe member accepted')\n except ValueError:pass\nprint('Archive traversal, absolute path and link rejection passed')`;
  execFileSync("python", ["-B", "-c", safety, join(root, "scripts/verify-offsite-recovery.py"), temporary]);
  const receiptSafety = `import importlib.util,sys\nfrom datetime import datetime,timezone,timedelta\nspec=importlib.util.spec_from_file_location('recovery',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nnow=datetime.now(timezone.utc);stamp=now.isoformat();receipt={'lastSuccessAt':stamp,'lastAttemptAt':stamp,'freshnessMaxAgeMs':1000,'lastObjectUri':'gs://fixture/daily/snapshot.tar.gz','consecutiveFailures':0}\nassert m.validate_receipt(receipt,now)==receipt['lastObjectUri']\nbad=[{'lastObjectUri':'gs://fixture/a&echo'}, {'lastObjectUri':'gs://fixture/a%NAME%'}, {'lastObjectUri':'https://fixture/archive'}, {'lastSuccessAt':'invalid'}, {'lastSuccessAt':(now+timedelta(seconds=1)).isoformat()}, {'lastSuccessAt':(now-timedelta(days=3)).isoformat()}, {'lastAttemptAt':(now+timedelta(seconds=1)).isoformat()}, {'freshnessMaxAgeMs':float('nan')}, {'consecutiveFailures':1}]\nfor change in bad:\n try:m.validate_receipt(receipt|change,now);raise AssertionError('unsafe receipt accepted')\n except ValueError:pass\nprint('Recovery receipt freshness and Windows wrapper input checks passed')`;
  execFileSync("python", ["-B", "-c", receiptSafety, join(root, "scripts/verify-offsite-recovery.py")]);
  console.log("Automated isolated restore, history comparison, corruption and unsafe-archive checks passed");
} finally { rmSync(temporary, { recursive: true, force: true }); }
