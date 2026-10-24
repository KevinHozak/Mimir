"""Owned S010 measurement controller. Requires a prepared, approved private run directory.
No VM lifecycle, IAM or writer operations. Samples are immutable to tolerate Windows readers.
"""
import pathlib,sys,importlib.util,json,time,datetime,urllib.request,email.utils,subprocess,shutil,os
s=importlib.util.spec_from_file_location('g',pathlib.Path(__file__).with_name('hosted-outage-guard.py'));g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
s=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('observer-capacity-collectors.py'));v=importlib.util.module_from_spec(s);s.loader.exec_module(v)

def failure_detail(error):
    allowed={'VM transfer allocation exceeded','Observer cap exceeded','Final zero deadline','private status handoff unavailable','VM collector stale','Cached or unordered probe','Unexpected process replacement','Malformed direct probe','Cost quantity bound exceeded','Browser closure missing','Final recovery invariants changed'}
    return str(error) if str(error) in allowed else type(error).__name__

def run(directory):
    r=g.run_directory(directory);c=g.Cloud()
    candidate=json.loads((r/'candidate.json').read_text())['name'];samples=[]
    requested=time.time()
    with urllib.request.urlopen(urllib.request.Request(g.RUN,headers={'Authorization':'Bearer '+c.token,'x-goog-user-project':g.PROJECT}),timeout=5) as response:
     server_epoch=email.utils.parsedate_to_datetime(response.headers['Date']).timestamp();response.read()
    bounds=v.clock_offset_bounds(server_epoch,requested,time.time());offset=bounds['upper']
    g.write(r/'clock-bounds.json',bounds)

    revision=c.call(f'https://{g.REGION}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/{g.PROJECT}/revisions/'+candidate)
    key=next(e['value'] for e in revision['spec']['containers'][0]['env'] if e['name']=='MIMIR_CAPACITY_KEY')
    primary=c.call(g.RUN)['status']['url'];tag=json.loads((r/'candidate-url.json').read_text())['url'];seen_process=None;last_sequence=0

    def logs():
     nonlocal seen_process,last_sequence
     url=(primary if (r/'run-lease.json').exists() else tag)+'/__capacity'
     before=time.monotonic()
     request=urllib.request.Request(url,headers={'x-mimir-capacity-key':key,'Cache-Control':'no-cache'})
     with urllib.request.urlopen(request,timeout=3) as response:
      assert response.status==200 and response.headers.get('Cache-Control')=='no-store'
      row=json.load(response)
     latency=time.monotonic()-before
     assert latency<3 and row.get('kind')=='observer-capacity' and row.get('revision')==candidate
     assert type(row.get('sequence')) is int and row['sequence']>last_sequence,'Cached or unordered probe'
     last_sequence=row['sequence']
     process=row.get('processSession');assert process and (seen_process is None or process==seen_process),'Unexpected process replacement'
     seen_process=process
     for field in ['activeRequests','activeUpstreamStreams','cpuUsageUsec','memoryBytes','responseBytes','totalHttpRequests']:
      assert type(row.get(field)) is int and row[field]>=0,'Malformed direct probe'
     assert row['responseBytes']<=24*2**20 and row['totalHttpRequests']<=1000,'Cost quantity bound exceeded'
     row['probeLatencyMs']=latency*1000
     return [row]

    def vmrows():
     p=r/'vm-samples.jsonl'
     rows=[]
     if p.exists():
      for line in p.read_text().splitlines():
       try:rows.append(json.loads(line))
       except json.JSONDecodeError:pass
     samples=[row for row in rows if 'memoryFraction'in row]
     assert samples and 0<=time.time()-samples[-1]['receivedAt']<3,'VM collector stale'
     return samples

    created=json.loads((r/'candidate.json').read_text())['createdAt'];end=created+80;stable_since=None;successes=0
    vm_network_start=None
    while True:
     try:
      rows=logs();vm=vmrows();assert all(p['activeRequests']==0 and p['activeUpstreamStreams']==0 for p in rows);assert vm[-1]['upstreamSockets']==0
      assert all('cpuUsageUsec'in p and 'memoryBytes'in p for p in rows)
      baseline=next(p['baseline'] for p in reversed(vm) if 'baseline'in p);assert baseline['integrity'] and baseline['paused'] and baseline['pulse']==64 and baseline['singleWriter'] and baseline['backupsHealthy']
      if stable_since is None:stable_since=time.time()
      successes+=1
      if time.time()-stable_since<15:time.sleep(1);continue
      g.write(r/'collector-ready.json',{'passed':True,'at':time.time(),'clockOffsetSeconds':offset,'processes':len(rows),'vmSampleAgeSeconds':time.time()-vm[-1]['receivedAt'],'baseline':baseline});break
     except Exception as error:
      stable_since=None;successes=0
      if time.time()>=end:g.write(r/'abort',{'reason':'collector-preflight','errorClass':type(error).__name__});raise RuntimeError('Collector preflight failed; no load') from None
      time.sleep(1)
    print(json.dumps({'collectorsReady':True,'freshProcessAndVmSamples':True}),flush=True)
    while not (r/'run-lease.json').exists():
     if time.time()>created+90 or (r/'cloud-cleanup.json').exists():raise RuntimeError('No timely approved browser lease')
     time.sleep(.1)
    lease=json.loads((r/'run-lease.json').read_text());start=lease['start'];deadline=start+180
    assert start<=created+90,'Preparation consumed the repair allocation'
    vm_network_start=vmrows()[0]['networkBytes']
    try:
     while time.time()<start+145:
      row={'elapsed':time.time()-start,'at':time.time(),'processes':logs(),'vm':vmrows()[-1]};samples.append(row);v.record_capacity_sample(r/'samples',len(samples),row)
      if row['vm']['networkBytes']-vm_network_start>32*2**20:raise RuntimeError('VM transfer allocation exceeded')
      if any(p['activeRequests']>2 or p['activeUpstreamStreams']>2 for p in row['processes']):raise RuntimeError('Observer cap exceeded')
      if (r/'browser-closed.json').exists() and all(p['activeRequests']==0 and p['activeUpstreamStreams']==0 for p in row['processes']) and row['vm']['upstreamSockets']==0:
       closed=json.loads((r/'browser-closed.json').read_text())['at'];fresh=[p for p in vmrows() if p.get('baseline') and p['receivedAt']>=closed]
       if fresh:
        final=fresh[-1]['baseline'];baseline=json.loads((r/'collector-ready.json').read_text())['baseline'];assert final==baseline,'Final recovery invariants changed';g.write(r/'final-recovery.json',{'passed':True,'at':time.time(),'elapsed':time.time()-start,'baselineUnchanged':True,'report':final});break
      time.sleep(1)
     else:raise RuntimeError('Final zero deadline')
     assert (r/'browser-closed.json').exists(),'Browser closure missing'
     g.write(r/'clients-closed.json',{'at':time.time(),'allObservedZero':True,'upstreamSockets':0})
    except Exception as error:
     g.write(r/'abort',{'reason':'measurement-failed','errorClass':type(error).__name__,'detail':failure_detail(error),'at':time.time()})
     end=min(start+145,time.time()+20)
     while time.time()<end:
      try:
       zero=logs();vm=vmrows()[-1]
       if (r/'browser-closed.json').exists() and all(p['activeRequests']==0 and p['activeUpstreamStreams']==0 for p in zero) and vm['upstreamSockets']==0:
        g.write(r/'clients-closed.json',{'at':time.time(),'allObservedZero':True,'upstreamSockets':0});break
      except Exception:pass
      time.sleep(.5)
    finally:
     path=json.loads((r/'vm-stop-path.json').read_text())['path'];assert path.startswith('/tmp/mimir-s010-') and path.endswith('.stop')
     flags={'--project':g.PROJECT,'--zone':g.ZONE,'--account':'khozak@gmail.com','--tunnel-through-iap':True,'--quiet':True,'--command':'sudo touch -- '+path}
     file=r/'stop-vm-collector-flags.json';file.write_text(json.dumps(flags))
     child=subprocess.run([shutil.which('gcloud'),'compute','ssh','mimir-staging','--flags-file='+str(file)],capture_output=True,timeout=35)
     g.write(r/'stop-vm-collector.json',{'commandSucceeded':child.returncode==0,'at':time.time()})
     while time.time()<deadline and not ((r/'cloud-cleanup.json').exists() and (r/'vm-worker-exit.json').exists()):time.sleep(.5)
     status={'at':time.time(),'elapsed':time.time()-start,'cloudCleanup':(r/'cloud-cleanup.json').exists(),'vmCollectorExited':(r/'vm-worker-exit.json').exists(),'withinOverall':time.time()<=deadline,'aborted':(r/'abort').exists()}
     g.write(r/'final-status.json',status);g.write(r/'observations-final.json',samples);print(json.dumps(status),flush=True)

if __name__=='__main__':run(sys.argv[1])
