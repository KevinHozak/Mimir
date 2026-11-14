import {runOffsiteBackup} from '../packages/server/dist/backup-offsite.js';
import {acquireWriterLock} from '../packages/server/dist/writer-lock.js';
import {pathToFileURL} from 'node:url';
/** Final snapshot only after the authoritative writer has stopped. */
export async function finalSnapshot(config,run=runOffsiteBackup){
 const release=acquireWriterLock(config.source);
 try{return await run(config);}finally{release();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const e=process.env;
 if(!e.DATABASE_PATH||!e.WORLD_BUNDLE_ROOT||!e.BACKUP_DIR||!e.BACKUP_STATUS_PATH||!e.BACKUP_GCS_URI)throw Error('Explicit final backup configuration required');
 finalSnapshot({source:e.DATABASE_PATH,retainLocalSnapshots:e.BACKUP_RETAIN_LOCAL_SNAPSHOTS!=="false",aiBudgetPath:e.MIMIR_SPARK_AI_BUDGET_PATH,bundleRoot:e.WORLD_BUNDLE_ROOT,directory:e.BACKUP_DIR,statusPath:e.BACKUP_STATUS_PATH,destination:e.BACKUP_GCS_URI,freshnessMaxAgeMs:Number(e.BACKUP_FRESHNESS_MAX_AGE_MS??3600000),impersonateServiceAccount:e.BACKUP_IMPERSONATE_SERVICE_ACCOUNT}).then(()=>console.log('Final paired offsite snapshot verified')).catch(()=>{console.error('Final paired backup failed; preserve the persistent disk');process.exitCode=1;});
}
