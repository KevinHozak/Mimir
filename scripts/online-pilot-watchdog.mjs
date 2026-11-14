/** Operator-only VM watchdog. No credentials or response bodies enter diagnostics. */
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const BRIDGE_CUTOFF_MICROUSD=900000;
export function bridgeCostMicrousd(seconds,bytes){
 if(!Number.isFinite(seconds)||seconds<0||!Number.isSafeInteger(bytes)||bytes<0)throw Error('invalid usage');
 // Two vCPUs (includes startup boost), 512 MiB, plus $1/GB egress contingency.
 return Math.ceil(seconds*49.25+bytes/1000);
}
export function validatePilot(config){
 const start=Date.parse(config.startsAt),end=Date.parse(config.endsAt);
 if(!/^[a-z0-9][a-z0-9-]{7,63}$/.test(config.runId)||!/^mimir-observer-bridge-[a-z0-9-]+$/.test(config.revision)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>86400000)throw Error('invalid pilot contract');
 return {start,end,fingerprint:createHash('sha256').update(JSON.stringify({runId:config.runId,revision:config.revision,startsAt:config.startsAt,endsAt:config.endsAt})).digest('hex')};
}
export function assessPilot(config,previous={},usage,now=Date.now()){
 const contract=validatePilot(config);
 if(previous.fingerprint&&previous.fingerprint!==contract.fingerprint)throw Error('pilot contract changed');
 const seconds=Math.max(previous.seconds??0,usage.seconds),bytes=Math.max(previous.bytes??0,usage.bytes);
 const costMicrousd=bridgeCostMicrousd(seconds,bytes);
 return {runId:config.runId,fingerprint:contract.fingerprint,seconds,bytes,costMicrousd,cutoffMicrousd:BRIDGE_CUTOFF_MICROUSD,failures:0,stop:Boolean(previous.stop)||now>=contract.end||costMicrousd>=BRIDGE_CUTOFF_MICROUSD,reason:now>=contract.end?'deadline':costMicrousd>=BRIDGE_CUTOFF_MICROUSD?'hosting-reserve-cutoff':previous.reason??'within-limits',observedAt:new Date(now).toISOString()};
}
export async function collectUsage(config,request){
 validatePilot(config);
 const result={seconds:0,bytes:0};
 for(const [key,metric,valueType] of [['seconds','container/billable_instance_time','DOUBLE'],['bytes','container/network/sent_bytes_count','INT64']]){
  let page='';let pages=0;
  do{
   if(++pages>10)throw Error('usage pagination limit');
   const query=new URLSearchParams({filter:`metric.type = "run.googleapis.com/${metric}" AND resource.type = "cloud_run_revision" AND resource.labels.service_name = "mimir-observer-bridge" AND resource.labels.revision_name = "${config.revision}" AND resource.labels.location = "us-central1"`,'interval.startTime':config.startsAt,'interval.endTime':new Date().toISOString(),view:'FULL',pageSize:'10000',...(page?{pageToken:page}:{})});
   const data=await request('https://monitoring.googleapis.com/v3/projects/mimir-realm/timeSeries?'+query);
   for(const series of data.timeSeries??[]){
    if(series.metricKind!=='DELTA'||series.valueType!==valueType)throw Error('unexpected usage type');
    for(const point of series.points??[]){const value=Number(valueType==='DOUBLE'?point.value.doubleValue:point.value.int64Value);if(!Number.isFinite(value)||value<0)throw Error('invalid usage point');result[key]+=value;}
   }
   page=data.nextPageToken??'';
  }while(page);
 }
 bridgeCostMicrousd(result.seconds,result.bytes);return result;
}
async function workloadRequest(url,body){
 const metadata=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!metadata.ok)throw Error('workload credentials unavailable');const token=(await metadata.json()).access_token;if(typeof token!=='string')throw Error('workload credentials unavailable');
 const response=await fetch(url,{method:body?'PATCH':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('operator API request failed');return response.json();
}
export async function closeOwnedBridge(config,request){
 const name='projects/mimir-realm/locations/us-central1/services/mimir-observer-bridge',url='https://run.googleapis.com/v2/'+name;
 const service=await request(url);
 const traffic=service.trafficStatuses??[];
 if(traffic.length!==1||traffic[0].percent!==100||!(traffic[0].revision===config.revision||traffic[0].revision?.endsWith('/'+config.revision)))throw Error('bridge ownership changed');
 if(service.ingress!=='INGRESS_TRAFFIC_INTERNAL_ONLY'){
  let operation=await request(url+'?updateMask=ingress',{name,etag:service.etag,ingress:'INGRESS_TRAFFIC_INTERNAL_ONLY'});
  for(let attempt=0;!operation.done&&attempt<10;attempt++){await new Promise(r=>setTimeout(r,1000));operation=await request('https://run.googleapis.com/v2/'+operation.name);}
  if(!operation.done||operation.error)throw Error('bridge cutoff unverified');
 }
 if((await request(url)).ingress!=='INGRESS_TRAFFIC_INTERNAL_ONLY')throw Error('bridge cutoff unverified');
}
async function main(){
 const config=JSON.parse(readFileSync(process.argv[2],'utf8'));validatePilot(config);
 let previous={};try{previous=JSON.parse(readFileSync(config.statusPath,'utf8'));}catch(error){if(error.code!=='ENOENT'&&process.argv[3]!=='--stop')throw Error('watchdog state unreadable');}
 let state;
 try{state=process.argv[3]==='--stop'?{...previous,stop:true,reason:'operator-or-deadline-cutoff'}:assessPilot(config,previous,await collectUsage(config,workloadRequest));}
 catch{state={...previous,failures:(previous.failures??0)+1,reason:'usage-unavailable'};state.stop=Boolean(previous.stop)||state.failures>=3||Date.now()>=Date.parse(config.endsAt);}
 const save=()=>{const temp=config.statusPath+'.tmp';writeFileSync(temp,JSON.stringify(state,null,2),{mode:0o600});renameSync(temp,config.statusPath);};save();
 if(state.stop){
  execFileSync('/usr/bin/systemctl',['stop','mimir-online.service'],{stdio:'ignore',timeout:30000});
  try{execFileSync('/usr/bin/systemctl',['start','mimir-online-final-backup.service'],{stdio:'ignore',timeout:70000});state.finalBackup=true;}catch{state.finalBackup=false;}save();
  try{await closeOwnedBridge(config,workloadRequest);state.ingressClosed=true;}catch{state.ingressClosed=false;state.reason='cutoff-with-ingress-unverified';}save();
  execFileSync('/usr/sbin/shutdown',['-h','now'],{stdio:'ignore',timeout:10000});
 }
 console.log(JSON.stringify({runId:config.runId,stop:state.stop,reason:state.reason,costMicrousd:state.costMicrousd,failures:state.failures}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Pilot watchdog failed; inspect private status');process.exitCode=1;});
