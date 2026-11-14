import test from "node:test";import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";import {createHash} from "node:crypto";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from "node:fs";import {join} from "node:path";import {fileURLToPath} from "node:url";
import {databaseEvidence,runOffsiteBackup} from "./backup-offsite.js";import {fileDigest} from "./backup-file-hash.js";
const base=fileURLToPath(new URL("../../../.tmp/bounded-backup-tests",import.meta.url));mkdirSync(base,{recursive:true});const directory=()=>mkdtempSync(join(base,"case-"));
test("bounded file digests match existing SHA-256 and MD5 across buffer boundaries",()=>{
 const file=join(directory(),"bytes.bin"),data=Buffer.alloc(4*1024*1024+13);for(let i=0;i<data.length;i++)data[i]=i%251;writeFileSync(file,data);
 assert.equal(fileDigest(file),createHash("sha256").update(data).digest("hex"));assert.equal(fileDigest(file,"md5","base64"),createHash("md5").update(data).digest("base64"));
});
test("streamed recovery hashes exactly preserve legacy JSON sorting, including numeric prefixes and Unicode",()=>{
 const file=join(directory(),"world.db"),db=new DatabaseSync(file);
 db.exec("CREATE TABLE timelines(id TEXT PRIMARY KEY,status TEXT);CREATE TABLE timeline_checkpoints(timeline_id TEXT,pulse INTEGER,state_json TEXT,PRIMARY KEY(timeline_id,pulse));CREATE TABLE timeline_events(timeline_id TEXT,id TEXT,event_json TEXT,PRIMARY KEY(timeline_id,id));CREATE TABLE timeline_interpretations(timeline_id TEXT,id TEXT,interpretation_json TEXT,PRIMARY KEY(timeline_id,id));CREATE TABLE runtime_metadata(key TEXT PRIMARY KEY,value TEXT)");
 for(const id of ["main","a","aa","a\n","😀","\uE000"]){db.prepare("INSERT INTO timelines VALUES(?,'active')").run(id);for(const pulse of [1,10,100,2])db.prepare("INSERT INTO timeline_checkpoints VALUES(?,?,?)").run(id,pulse,JSON.stringify({text:'✨"\\\n'.repeat(10000)}));db.prepare("INSERT INTO runtime_metadata VALUES(?,?)").run(id,null);}
 const expected:Record<string,{count:number;sha256:string}>={};for(const name of ["timelines","timeline_checkpoints","timeline_events","timeline_interpretations","runtime_metadata"]){const rows=db.prepare(`SELECT * FROM ${name}`).all().map(row=>JSON.stringify(row)).sort();expected[name]={count:rows.length,sha256:createHash("sha256").update(rows.join("\n")).digest("hex")};}db.close();
 assert.deepEqual(databaseEvidence(file).tables,expected);
});
test("only a fully verified new snapshot cache is removed; earlier files and failed uploads survive",async()=>{
 const root=directory(),source=join(root,"world.db"),db=new DatabaseSync(source);db.exec("CREATE TABLE timelines(id TEXT,status TEXT);INSERT INTO timelines VALUES('main','active');CREATE TABLE timeline_checkpoints(timeline_id TEXT,pulse INTEGER,state_json TEXT);INSERT INTO timeline_checkpoints VALUES('main',1,'{}');CREATE TABLE timeline_events(id TEXT);CREATE TABLE timeline_interpretations(id TEXT);CREATE TABLE runtime_metadata(key TEXT,value TEXT)");db.close();
 const old=join(root,"retained-old.db");writeFileSync(old,"preserve");const config={source,directory:root,bundleRoot:root,destination:"gs://fixture/daily",statusPath:join(root,"status.json"),freshnessMaxAgeMs:3600000,retainLocalSnapshots:false};
 let created="";const upload=async(path:string)=>{created=path;return{objectUri:"gs://fixture/daily/snapshot.tar.gz",archivePath:"removed",archiveSha256:"fixture",archiveBytes:1};};
 await runOffsiteBackup(config,upload,async()=>{});assert.equal(existsSync(created),false);assert.equal(existsSync(created+".bundles"),false);assert.equal(readFileSync(old,"utf8"),"preserve");
 await assert.rejects(runOffsiteBackup(config,upload,async()=>{throw Error("receipt upload unavailable");}));assert.equal(existsSync(created),true);assert.equal(readFileSync(old,"utf8"),"preserve");
});
