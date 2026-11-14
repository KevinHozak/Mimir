/** Operator-only cleanup of the one pilot-owned private US Vertex endpoint. */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function validatePrivateAiEndpoint(config) {
  if (typeof config.runId!=='string' || !/^[a-z0-9][a-z0-9-]{7,49}$/.test(config.runId) || config.name !== `projects/mimir-realm/locations/us-central1/regionalEndpoints/${config.runId}-ai-us`) throw Error('Invalid private AI endpoint contract');
  return config.name;
}
export async function removePrivateAiEndpoint(config, request, wait = ms => new Promise(resolve => setTimeout(resolve,ms))) {
  const name=validatePrivateAiEndpoint(config),url='https://networkconnectivity.googleapis.com/v1/'+name;
  const endpoint=await request(url);
  if (!endpoint) return {absent:true};
  if (endpoint.name!==name || endpoint.targetGoogleApi!=='aiplatform.us.rep.googleapis.com' || endpoint.labels?.mimir_run!==config.runId || endpoint.network?.replace('https://www.googleapis.com/compute/v1/','')!=='projects/mimir-realm/global/networks/default' || endpoint.subnetwork?.replace('https://www.googleapis.com/compute/v1/','')!=='projects/mimir-realm/regions/us-central1/subnetworks/default') throw Error('Private AI endpoint ownership changed');
  let operation=await request(url,'DELETE');
  for(let attempt=0;!operation.done&&attempt<12;attempt++) {
    if(!/^projects\/mimir-realm\/locations\/us-central1\/operations\/[a-zA-Z0-9_-]+$/.test(operation.name)) throw Error('Invalid private endpoint operation');
    await wait(1000);operation=await request('https://networkconnectivity.googleapis.com/v1/'+operation.name);
  }
  if(!operation.done||operation.error||await request(url))throw Error('Private AI endpoint deletion unverified');
  return {absent:true};
}
export async function metadataApiRequest(url, method='GET') {
  const response=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},redirect:'error',signal:AbortSignal.timeout(3000)});
  if(!response.ok)throw Error('Workload credentials unavailable');
  const token=await response.json();if(typeof token.access_token!=='string'||token.token_type!=='Bearer')throw Error('Workload credentials unavailable');
  const result=await fetch(url,{method,headers:{authorization:'Bearer '+token.access_token},redirect:'error',signal:AbortSignal.timeout(5000)});
  if(result.status===404&&method==='GET')return null;
  if(!result.ok)throw Error('Private endpoint API request failed');
  return result.json();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  Promise.resolve().then(()=>removePrivateAiEndpoint(JSON.parse(readFileSync(process.argv[2],'utf8')),metadataApiRequest)).then(()=>console.log('Private AI endpoint absent')).catch(()=>{console.error('Private AI endpoint cleanup failed');process.exitCode=1;});
}
