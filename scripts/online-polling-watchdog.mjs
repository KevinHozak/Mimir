/** Cost-bounded polling observer; preserves cumulative usage across revisions. */
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {collectUsage,bridgeCostMicrousd,closeOwnedBridge} from './online-pilot-watchdog.mjs';
export function assessPollingHosting(config,previous,bridge,usage,now=Date.now()){
 const end=Date.parse(config.endsAt),cleanup=Date.parse(config.cleanupAt),start=Date.parse(config.startsAt);
 if(!/^[a-z0-9][a-z0-9-]{7,49}$/.test(config.runId)||!Number.isFinite(start)||!Number.isFinite(end)||end-start>86400000||end<=start||cleanup!==end-300000||config.capMicrousd!==2000000||config.otherReserveMicrousd!==950000||config.closeAtMicrousd!==1000000||config.bridgeHardCapMicrousd!==1050000||!Number.isSafeInteger(config.legacyFloorMicrousd)||config.legacyFloorMicrousd<963233||!/^sha256:[a-f0-9]{64}$/.test(config.pollingImage?.split('@')[1]??'')||!Array.isArray(config.revisions)||config.revisions.length!==2||new Set(config.revisions).size!==2||config.revisions.some(r=>!/^mimir-observer-bridge-[a-z0-9-]+$/.test(r)))throw Error('invalid polling hosting contract');
 const fingerprint=createHash('sha256').update(JSON.stringify(config)).digest('hex');if(previous.fingerprint&&previous.fingerprint!==fingerprint)throw Error('polling hosting contract changed');
 const prefix='projects/mimir-realm/locations/us-central1/services/mimir-observer-bridge/revisions/';const short=r=>r?.replace(prefix,'');
 const traffic=bridge.trafficStatuses;if(!Array.isArray(traffic)||traffic.length!==1||traffic[0].percent!==100||!config.revisions.includes(short(traffic[0].revision))||!config.revisions.includes(short(bridge.latestReadyRevision))||(bridge.scaling?.minInstanceCount??0)!==0||bridge.scaling?.maxInstanceCount!==1||(bridge.template?.scaling?.minInstanceCount??0)!==0||bridge.template?.scaling?.maxInstanceCount!==1)throw Error('polling bridge ownership/scaling changed');
 const internal=bridge.ingress==='INGRESS_TRAFFIC_INTERNAL_ONLY';
 if(!internal){
  const container=bridge.template?.containers?.[0];const env=Object.fromEntries((container?.env??[]).map(e=>[e.name,e.value]));
  if(bridge.ingress!=='INGRESS_TRAFFIC_ALL'||short(traffic[0].revision)!==config.revisions[1]||container.image!==config.pollingImage||env.OBSERVER_POLLING_ONLY!=='1'||env.OBSERVER_GZIP!=='1'||env.OBSERVER_ENDS_AT!==config.endsAt||env.OBSERVER_MAX_WIRE_RESPONSE_BYTES!=='524288'||env.OBSERVER_BYTES_PER_MINUTE!=='524288'||env.OBSERVER_REQUESTS_PER_MINUTE!=='24'||env.OBSERVER_READ_TIMEOUT_MS!=='5000')throw Error('polling bridge bounds changed');
 }
 const rows={};for(const revision of config.revisions){const current=usage[revision];if(!current)throw Error('missing revision usage');bridgeCostMicrousd(current.seconds,current.bytes);const old=previous.revisions?.[revision]??{};rows[revision]={seconds:Math.max(old.seconds??0,current.seconds),bytes:Math.max(old.bytes??0,current.bytes)};}
 const legacy=Math.max(config.legacyFloorMicrousd,bridgeCostMicrousd(rows[config.revisions[0]].seconds,rows[config.revisions[0]].bytes));
 const total=Math.max(previous.bridgeCostMicrousd??0,legacy+bridgeCostMicrousd(rows[config.revisions[1]].seconds,rows[config.revisions[1]].bytes));
 return {runId:config.runId,fingerprint,mode:'polling',revisions:rows,bridgeCostMicrousd:total,reservesMicrousd:config.otherReserveMicrousd,conservativeAccountedMicrousd:total+config.otherReserveMicrousd,capMicrousd:config.capMicrousd,closeObserver:Boolean(previous.closeObserver)||total>=config.closeAtMicrousd||now>=cleanup,stop:Boolean(previous.stop)||total>=config.bridgeHardCapMicrousd||now>=cleanup,observerIngress:bridge.ingress,failures:0,healthy:true,observedAt:new Date(now).toISOString()};
}
async function request(url,body){
 const m=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},redirect:'error',signal:AbortSignal.timeout(3000)});if(!m.ok)throw Error('workload credentials unavailable');const token=(await m.json()).access_token;if(typeof token!=='string')throw Error('workload credentials unavailable');
 const r=await fetch(url,{method:body?'PATCH':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('operator observation failed');return r.json();
}
async function main(){
 const config=JSON.parse(readFileSync(process.argv[2],'utf8'));let previous={};try{previous=JSON.parse(readFileSync(config.statusPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 let state,bridge;try{bridge=await request('https://run.googleapis.com/v2/projects/mimir-realm/locations/us-central1/services/mimir-observer-bridge');const usage={};for(const revision of config.revisions)usage[revision]=await collectUsage({...config,revision},request);state=assessPollingHosting(config,previous,bridge,usage);}
 catch{state={...previous,runId:config.runId,healthy:false,failures:(previous.failures??0)+1,closeObserver:true,stop:Boolean(previous.stop)||(previous.failures??0)>=2||Date.now()>=Date.parse(config.cleanupAt),observedAt:new Date().toISOString()};}
 const save=()=>{const p=config.statusPath+'.tmp';writeFileSync(p,JSON.stringify(state,null,2),{mode:0o600});renameSync(p,config.statusPath);};save();
 if(state.closeObserver){const prefix='projects/mimir-realm/locations/us-central1/services/mimir-observer-bridge/revisions/';const revision=bridge?.trafficStatuses?.[0]?.revision?.replace(prefix,'');if(!config.revisions.includes(revision))throw Error('cannot close changed bridge');await closeOwnedBridge({...config,revision},request);state.observerIngress='INGRESS_TRAFFIC_INTERNAL_ONLY';save();}
 console.log(JSON.stringify(state));if(state.stop)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Polling hosting guard failed');process.exitCode=1;});
