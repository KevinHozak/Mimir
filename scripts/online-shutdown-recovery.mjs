/** Explicit local qualification of shutdown using a stopped, recovered pair. Never calls cloud tools. */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {copyFileSync,existsSync,mkdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {basename,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {fileDigest} from '../packages/server/dist/backup-file-hash.js';
import {runOffsiteBackup,databaseEvidence} from '../packages/server/dist/backup-offsite.js';
import {replicateBackup,uploadVerifiedFile} from '../packages/server/dist/backup-replication.js';
import {acquireWriterLock} from '../packages/server/dist/writer-lock.js';
import {normalizeState} from '../packages/server/dist/state.js';
import {validateFirstGlowState} from '../packages/engine/dist/index.js';
import {finalSnapshot} from './online-final-backup.mjs';
import {shutdownPilot,FINAL_BACKUP_WAIT_MS} from './online-shutdown.mjs';

export async function qualifyRecoveredShutdown(sourceDirectory,bundleRoot,outputDirectory){
 const source=resolve(sourceDirectory),output=resolve(outputDirectory),root=fileURLToPath(new URL('..',import.meta.url));
 const contains=(parent,child)=>{const path=relative(parent,child);return path===''||(!isAbsolute(path)&&path!=='..'&&!path.startsWith('..'+sep));};
 if(existsSync(output)||contains(source,output)||contains(output,source))throw Error('Use a new output directory outside the recovered source');
 const inputs=['world.db','ai-budget.db'].map(name=>join(source,name));
 for(const path of inputs)if(!existsSync(path)||existsSync(path+'-wal')&&statSync(path+'-wal').size>0)throw Error('A checkpointed stopped database pair is required');
 const hashes=inputs.map(path=>fileDigest(path));mkdirSync(output,{recursive:true});
 const working=join(output,'working');mkdirSync(working);for(const path of inputs)copyFileSync(path,join(working,basename(path)));
 const worldPath=join(working,'world.db'),budgetPath=join(working,'ai-budget.db');
 const database=new DatabaseSync(worldPath,{readOnly:true});
 const contract=database.prepare('SELECT * FROM online_run_contract WHERE id=1').get();
 const before=database.prepare('SELECT pulse,state_json FROM timeline_checkpoints ORDER BY pulse DESC LIMIT 1').get();database.close();
 const state=normalizeState(JSON.parse(before.state_json));validateFirstGlowState(state.firstGlowState);
 const ledger=new DatabaseSync(budgetPath,{readOnly:true});
 const attempts=ledger.prepare('SELECT * FROM ai_attempts ORDER BY id').all();
 const profile=ledger.prepare('SELECT * FROM budget_profile WHERE id=1').get();ledger.close();
 const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Network is forbidden in local shutdown qualification');};
 const objects=join(output,'local-object-store');mkdirSync(objects);let archive,backupPath,receipt;
 const objectPath=uri=>{if(!uri.startsWith('gs://mimir-local-shutdown-fixture/'))throw Error('Unexpected local object URI');return join(objects,createHash('sha256').update(uri).digest('hex'));};
 const localStorage=async(command,args)=>{
  if(command==='tar'){execFileSync('tar',args,{stdio:'ignore',timeout:180000});return {stdout:'',stderr:''};}
  if(command!=='gcloud'||args[0]!=='storage')throw Error('Unexpected local command');
  if(args[1]==='cp'){copyFileSync(args[2],objectPath(args[3]));return {stdout:'',stderr:''};}
  if(args[1]==='objects'&&args[2]==='describe'){
   const path=objectPath(args[3]);return {stdout:JSON.stringify({size:statSync(path).size,md5Hash:fileDigest(path,'md5','base64')}),stderr:''};
  }
  throw Error('Cloud execution is forbidden');
 };
 const config={source:worldPath,aiBudgetPath:budgetPath,bundleRoot:resolve(bundleRoot),directory:join(output,'snapshots'),destination:'gs://mimir-local-shutdown-fixture/'+contract.run_id,statusPath:join(output,'backup-status.json'),freshnessMaxAgeMs:3600000};
 let virtualTime=Date.parse(contract.ends_at)-300000;const commands=[],saved=[];const shutdownState={};const began=performance.now();let stage='writer-lock-check';
 try{
  const release=acquireWriterLock(worldPath);
  try{await assert.rejects(finalSnapshot(config,async()=>{throw Error('Must not reach backup while writer lock is held');}),/already has a writer/);}finally{release();}
  stage='coordinated-backup';await shutdownPilot({endsAt:contract.ends_at},shutdownState,{
   now:()=>virtualTime,save:s=>saved.push(structuredClone(s)),closeIngress:async()=>commands.push('mock-ingress-close'),
   run:async(command,args,options)=>{
    commands.push({command,args,timeout:options.timeout});
    if(command==='/usr/sbin/shutdown'){assert.equal(shutdownState.finalBackup,true);assert.ok(receipt?.lastReceiptObjectUri);return;}
    assert.equal(command,'/usr/bin/systemctl');
    if(args[0]==='stop')return;
    assert.deepEqual(args,['start','mimir-online-final-backup.service']);assert.equal(options.timeout,FINAL_BACKUP_WAIT_MS);
    await finalSnapshot(config,c=>runOffsiteBackup(c,async(path,destination)=>{
     backupPath=path;const uploaded=await replicateBackup(path,destination,localStorage);archive=objectPath(uploaded.objectUri);return uploaded;
    },(path,uri)=>uploadVerifiedFile(path,uri,undefined,localStorage)));
    receipt=JSON.parse(readFileSync(config.statusPath,'utf8'));assert.equal(receipt.consecutiveFailures,0);
    assert.ok(existsSync(objectPath(receipt.lastReceiptObjectUri)));
    // Reproduce >70-second completion with virtual time, not a long sleep or a new lease.
    virtualTime+=101000;
   }
  });
  stage='archive-extraction';const unpacked=join(output,'downloaded-archive');mkdirSync(unpacked);
  execFileSync('tar',['-xzf',archive,'-C',unpacked],{stdio:'ignore',timeout:180000});
  stage='paired-restore';const restorePath=join(output,'restored.db');
  execFileSync(process.execPath,[join(root,'packages/server/dist/backup.js'),'restore',join(unpacked,basename(backupPath)),restorePath],{cwd:root,stdio:'ignore',timeout:180000});
  stage='restored-evidence';assert.deepEqual(JSON.parse(JSON.stringify(databaseEvidence(restorePath))),receipt.database);
  const restored=new DatabaseSync(restorePath,{readOnly:true});const head=restored.prepare('SELECT pulse,state_json FROM timeline_checkpoints ORDER BY pulse DESC LIMIT 1').get();restored.close();
  assert.equal(head.pulse,before.pulse);assert.equal(head.state_json,before.state_json);validateFirstGlowState(normalizeState(JSON.parse(head.state_json)).firstGlowState);
  const restoredLedger=new DatabaseSync(restorePath+'.ai-budget.db',{readOnly:true});
  assert.deepEqual(restoredLedger.prepare('SELECT * FROM ai_attempts ORDER BY id').all(),attempts);
  assert.deepEqual(restoredLedger.prepare('SELECT * FROM budget_profile WHERE id=1').get(),profile);restoredLedger.close();
  stage='source-preservation';assert.deepEqual(inputs.map(path=>fileDigest(path)),hashes);
  const result={passed:true,sourcePulse:before.pulse,restoredPulse:head.pulse,sparks:state.firstGlowState.settlements.flatMap(s=>s.sparks).length,checkpoints:receipt.database.tables.timeline_checkpoints.count,bundleFiles:receipt.bundleFiles,attempts:attempts.length,uncertainRequestIds:attempts.filter(a=>a.status==='uncertain').map(a=>a.id),capMicrousd:profile.cap,sourceHashes:hashes,sourceUnchanged:true,fullHistoryAndLedgerRestored:true,writerLockRejected:true,backupWaitMs:FINAL_BACKUP_WAIT_MS,virtualBackupDurationMs:101000,localQualificationElapsedMs:Math.round(performance.now()-began),archiveSha256:fileDigest(archive),archiveBytes:statSync(archive).size,commands,saved,cloudCalls:0,providerCalls:0,simulationAdvances:0,realShutdownCommands:0,scope:'Real paired backup/archive/checksum/receipt/restore with filesystem-backed fake object storage and virtual service control; no systemd or cloud qualification'};
  writeFileSync(join(output,'result.json'),JSON.stringify(result,null,2));return result;
 }catch(error){writeFileSync(join(output,'failure.json'),JSON.stringify({stage,name:error.name,code:error.code}));throw error;}
 finally{globalThis.fetch=originalFetch;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {values}=parseArgs({options:{'source-directory':{type:'string'},'bundle-root':{type:'string'},'output-directory':{type:'string'}}});
 if(!values['source-directory']||!values['bundle-root']||!values['output-directory'])throw Error('Explicit source-directory, bundle-root and new output-directory are required');
 qualifyRecoveredShutdown(values['source-directory'],values['bundle-root'],values['output-directory']).then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('Local recovered shutdown qualification failed; inspect only its disposable directory');process.exitCode=1;});
}
