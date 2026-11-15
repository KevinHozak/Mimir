import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shutdownPilot,queuePilotShutdown,FINAL_BACKUP_WAIT_MS,FINAL_BACKUP_SERVICE_MS,CUTOFF_SERVICE_SECONDS} from './online-shutdown.mjs';

function fixture(remaining=300000,fail){
 let time=Date.parse('2026-11-15T05:19:00Z');
 const config={endsAt:new Date(time+remaining).toISOString()},events=[],saved=[];
 const state={};
 const effects={now:()=>time,save:s=>saved.push(structuredClone(s)),closeIngress:async()=>events.push('ingress'),run:async(file,args,options)=>{
  events.push({file,args,timeout:options.timeout});
  if(fail?.(args))throw Error('simulated command failure');
  if(args[0]==='start'&&args[1]==='mimir-online-final-backup.service'){
   assert.equal(state.finalBackup,false);time+=101000;
  }
 }};
 return {config,state,events,saved,effects};
}

test('shutdown waits beyond the former 70-second limit and quiesces regular backup writers first',async()=>{
 const f=fixture();await shutdownPilot(f.config,f.state,f.effects);
 assert.ok(f.events[0].args.includes('mimir-offsite-backup.timer'));
 assert.ok(f.events[0].args.includes('mimir-offsite-backup-health.timer'));
 assert.ok(f.events[0].args.includes('mimir-offsite-backup.service'));
 assert.ok(f.events[0].args.includes('mimir-offsite-backup-health.service'));
 assert.deepEqual(f.events[1].args,['stop','mimir-online.service']);
 assert.equal(f.events[2].timeout,FINAL_BACKUP_WAIT_MS);
 assert.equal(f.state.finalBackup,true);
 assert.equal(Date.parse(f.state.finalBackupCompletedAt)-Date.parse(f.state.finalBackupStartedAt),101000);
 assert.equal(f.events[3],'ingress');assert.equal(f.events[4].file,'/usr/sbin/shutdown');
 assert.ok(f.saved.some(s=>s.finalBackup===false&&s.finalBackupStartedAt));
});

test('backup failure is recorded honestly and never prevents ingress closure and shutdown',async()=>{
 const f=fixture(300000,args=>args[0]==='start');await shutdownPilot(f.config,f.state,f.effects);
 assert.equal(f.state.finalBackup,false);assert.equal(f.state.finalBackupSkippedReason,'final-backup-failed');
 assert.equal(f.state.finalBackupCompletedAt,undefined);assert.equal(f.events.at(-1).file,'/usr/sbin/shutdown');
 assert.equal(f.state.ingressClosed,true);
});

test('cannot snapshot until both the writer and regular backup jobs are stopped',async()=>{
 for(const failed of ['mimir-offsite-backup.timer','mimir-online.service']){
  const f=fixture(300000,args=>args.includes(failed));await shutdownPilot(f.config,f.state,f.effects);
  assert.equal(f.state.finalBackup,false);assert.ok(f.events.some(e=>e.args?.includes('mimir-online.service')));
  assert.equal(f.events.some(e=>e.args?.[0]==='start'),false);assert.equal(f.events.at(-1).file,'/usr/sbin/shutdown');
 }
});

test('near or past the original deadline the backup never extends the lease',async()=>{
 for(const remaining of [90000,30000,-1000]){
  const f=fixture(remaining);const original=f.config.endsAt;
  f.effects.run=async(file,args,options)=>{f.events.push({file,args,timeout:options.timeout});if(args[0]==='start')throw Error('deadline timeout');};
  await shutdownPilot(f.config,f.state,f.effects);
  const backup=f.events.find(e=>e.args?.[0]==='start');
  if(remaining===90000){assert.equal(backup.timeout,45000);assert.equal(f.state.finalBackupSkippedReason,'hard-deadline-backup-incomplete');}
  else{assert.equal(backup,undefined);assert.equal(f.state.finalBackupSkippedReason,'hard-deadline-backup-not-started');}
  assert.equal(f.config.endsAt,original);assert.equal(f.events.at(-1).file,'/usr/sbin/shutdown');
 }
});

test('endpoint cleanup queues the single coordinator before deletion; units honor its full wait',()=>{
 let calls=0;queuePilotShutdown((file,args)=>{calls++;assert.equal(file,'/usr/bin/systemctl');assert.deepEqual(args,['--no-block','start','mimir-online-cutoff.service']);});assert.equal(calls,1);
 const unit=name=>readFileSync(new URL('./ops/'+name,import.meta.url),'utf8');
 const cleanup=unit('mimir-online-network-cleanup.service');
 assert.ok(cleanup.indexOf('--no-block start mimir-online-cutoff.service')<cleanup.indexOf('ExecStart=/'));
 assert.doesNotMatch(cleanup,/ExecStartPost=.*final-backup/);
 assert.match(unit('mimir-online-final-backup.service'),new RegExp('TimeoutStartSec='+FINAL_BACKUP_SERVICE_MS/1000+'\\b'));
 assert.match(unit('mimir-online-cutoff.service'),new RegExp('TimeoutStartSec='+CUTOFF_SERVICE_SECONDS+'\\b'));
 assert.ok(CUTOFF_SERVICE_SECONDS*1000>FINAL_BACKUP_WAIT_MS+40000+45000);
 assert.match(unit('mimir-online-hard-stop.service'),/ExecStart=\/usr\/sbin\/shutdown -h now/);
});
