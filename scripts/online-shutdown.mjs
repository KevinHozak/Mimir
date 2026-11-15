/** One cutoff service owns backup completion and shutdown. No simulation/provider work. */
import {execFileSync} from 'node:child_process';

export const FINAL_BACKUP_SERVICE_MS=180000;
export const FINAL_BACKUP_WAIT_MS=FINAL_BACKUP_SERVICE_MS+5000;
export const CUTOFF_SERVICE_SECONDS=300;
const systemctl='/usr/bin/systemctl';
const regularUnits=['mimir-offsite-backup.timer','mimir-offsite-backup-health.timer','mimir-offsite-backup.service','mimir-offsite-backup-health.service'];

export function queuePilotShutdown(run=execFileSync){
 return run(systemctl,['--no-block','start','mimir-online-cutoff.service'],{stdio:'ignore',timeout:10000});
}

export async function shutdownPilot(config,state,{run=execFileSync,now=Date.now,save=()=>{},closeIngress=async()=>{throw Error('Ingress closer is required');}}={}){
 const deadline=Date.parse(config.endsAt);
 if(!Number.isFinite(deadline))throw Error('Invalid shutdown deadline');
 const persist=()=>save(state);
 const command=(args,limit)=>run(systemctl,args,{stdio:'ignore',timeout:Math.max(1,Math.min(limit,deadline-now()))});
 state.stop=true;state.finalBackup=false;state.finalBackupStartedAt=undefined;state.finalBackupCompletedAt=undefined;
 state.finalBackupSkippedReason=undefined;state.shutdownStartedAt=new Date(now()).toISOString();persist();
 let regularStopped=false,writerStopped=false;
 try{await command(['stop',...regularUnits],20000);regularStopped=true;}catch{state.finalBackupSkippedReason='regular-backups-not-stopped';}
 try{await command(['stop','mimir-online.service'],20000);writerStopped=true;}catch{state.finalBackupSkippedReason='writer-stop-unverified';}
 // Reserve time for closing observer ingress and shutdown; never move the hard deadline.
 const wait=Math.min(FINAL_BACKUP_WAIT_MS,deadline-now()-45000);
 if(regularStopped&&writerStopped&&wait>0){
  state.finalBackupStartedAt=new Date(now()).toISOString();persist();
  try{
   await run(systemctl,['start','mimir-online-final-backup.service'],{stdio:'ignore',timeout:wait});
   state.finalBackup=true;state.finalBackupCompletedAt=new Date(now()).toISOString();
  }catch{state.finalBackupSkippedReason=wait<FINAL_BACKUP_WAIT_MS?'hard-deadline-backup-incomplete':'final-backup-failed';}
 }else if(!state.finalBackupSkippedReason){state.finalBackupSkippedReason='hard-deadline-backup-not-started';}
 persist();
 try{await closeIngress();state.ingressClosed=true;}catch{state.ingressClosed=false;state.reason='cutoff-with-ingress-unverified';}persist();
 await run('/usr/sbin/shutdown',['-h','now'],{stdio:'ignore',timeout:10000});
 return state;
}
