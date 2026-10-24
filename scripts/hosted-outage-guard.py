import json,pathlib,time,subprocess,shutil,urllib.request,urllib.error,sys,os,datetime
def run_directory(value):
    root=pathlib.Path(value).resolve();allowed=pathlib.Path(__file__).resolve().parents[1]/'.tmp'
    if not root.is_relative_to(allowed) or root==allowed:raise ValueError('Private run directory must be beneath repository .tmp')
    return root
PROJECT='mimir-realm';ZONE='us-central1-a';SERVICE='mimir-observer-bridge';REGION='us-central1';ORIGINAL='mimir-observer-bridge-p5-h2b-596163'
VM=f'https://compute.googleapis.com/compute/v1/projects/{PROJECT}/zones/{ZONE}/instances/mimir-staging'
RUN=f'https://{REGION}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/{PROJECT}/services/{SERVICE}'
class Cloud:
    def __init__(self,rollback_spec=None):
        self.rollback_spec=rollback_spec
        p=subprocess.run([shutil.which('gcloud'),'auth','print-access-token','--account=khozak@gmail.com'],capture_output=True,text=True,timeout=25);assert p.returncode==0,'operator authentication failed';self.token=p.stdout.strip()
    def call(self,url,method='GET',body=None,timeout=8):
        req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json','x-goog-user-project':PROJECT})
        try:
            with urllib.request.urlopen(req,timeout=timeout) as r:return json.load(r)
        except urllib.error.HTTPError as e:raise RuntimeError('cloud HTTP '+str(e.code)) from None
    def vm(self):return self.call(VM)['status']
    def start(self):
        state=self.vm()
        if state=='TERMINATED':
            self.last_start_requested_at=time.time();self.call(VM+'/start','POST',{})
        return state
    def restore(self,timeout=8):
        service=self.call(RUN,timeout=timeout)
        traffic=service['status'].get('traffic',[])
        target=self.rollback_spec or {**service['spec'],'traffic':[{'revisionName':ORIGINAL,'percent':100}]}
        if service['spec']==target and traffic==[{'revisionName':ORIGINAL,'percent':100}]:return True
        service['spec']=target
        body={k:service[k] for k in ['apiVersion','kind','metadata','spec']}
        body['metadata']={k:v for k,v in body['metadata'].items() if k in ['name','namespace','resourceVersion','annotations','labels']}
        self.call(RUN,'PUT',body,timeout=timeout);return False
    def route(self,revision):
        service=self.call(RUN);service['spec']['traffic']=[{'revisionName':revision,'percent':100}]
        body={k:service[k] for k in ['apiVersion','kind','metadata','spec']};body['metadata']={k:v for k,v in body['metadata'].items() if k in ['name','namespace','resourceVersion','annotations','labels']};return self.call(RUN,'PUT',body)

def rollback_spec(root):
    source=json.loads((root/'rollback.json').read_text(encoding='utf8'))
    assert source['metadata']['name']==SERVICE and source['metadata']['namespace'] in [PROJECT,'487827684488']
    spec=source['spec'];assert spec['traffic']==[{'revisionName':ORIGINAL,'percent':100}]
    template=spec['template'];name=template['metadata']['name']
    assert name.startswith(SERVICE+'-') and not name.startswith(SERVICE+'-s009-')
    image=template['spec']['containers'][0]['image']
    assert image=='us-central1-docker.pkg.dev/mimir-realm/mimir/mimir-observer-bridge@sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a'
    return spec

def stream_dispositions(entries):
    opened=set();latest={};last_open={}
    for entry in sorted(entries,key=lambda e:e.get('timestamp',e.get('jsonPayload',{}).get('timestamp',''))):
        p=entry.get('jsonPayload',{});key=(p.get('revision'),p.get('processSession'))
        if not all(key):continue
        if p.get('event') in ['request-open','stream-open']:opened.add(key)
        if p.get('event')=='stream-open':last_open[key]=p.get('timestamp',entry.get('timestamp'))
        latest[key]=p
    return [{**{k:latest[key].get(k) for k in ['revision','processSession','timestamp','event','activeRequests','activeUpstreamStreams']},'lastStreamOpenedAt':last_open.get(key)} for key in sorted(opened)]

def recovery_stream_accounted(root,rows,restarted_at):
    if not (root/'stop-requested').exists():return True
    controller=json.loads((root/'controller.json').read_text()) if (root/'controller.json').exists() else {}
    if any(e.get('event')=='aborted' for e in controller.get('events',[])):return True
    if restarted_at is None:return False
    samples=json.loads((root/'clock-samples.json').read_text())
    upper=min(sample['cloudMinusLocalUpper'] for sample in samples)
    return any(p.get('revision')==ORIGINAL and p.get('lastStreamOpenedAt') and datetime.datetime.fromisoformat(p['lastStreamOpenedAt'].replace('Z','+00:00')).timestamp()>restarted_at+upper for p in rows)

def all_zero(rows):
    return bool(rows) and all(p.get('activeRequests')==0 and p.get('activeUpstreamStreams')==0 for p in rows)

def telemetry(cloud,start,timeout=2):
    stamp=datetime.datetime.fromtimestamp(start,datetime.timezone.utc).isoformat()
    result=cloud.call('https://logging.googleapis.com/v2/entries:list','POST',{'resourceNames':['projects/'+PROJECT],'filter':f'resource.type="cloud_run_revision" AND resource.labels.service_name="{SERVICE}" AND jsonPayload.kind="observer-stream" AND timestamp>="{stamp}"','orderBy':'timestamp asc','pageSize':1000},timeout=timeout)
    if result.get('nextPageToken'):raise RuntimeError('Stream evidence exceeds bounded page')
    return stream_dispositions(result.get('entries',[]))

def wake_original():
    # No credential or private data is sent. The request keeps the serving
    # process scheduled long enough to finish an already requested cancellation.
    url='https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app/api/world'
    try:
        with urllib.request.urlopen(url,timeout=2) as response:status=response.status
    except urllib.error.HTTPError as error:status=error.code
    if status!=401:raise RuntimeError('Anonymous original-process wake was not denied')

def remove_owned_candidate(root,cloud):
    candidate=json.loads((root/'candidate.json').read_text())['name']
    assert candidate.startswith(SERVICE+'-s009-') and candidate!=ORIGINAL
    assert cloud.restore(timeout=2),'Full rollback must precede deletion'
    url=f'https://{REGION}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/{PROJECT}/revisions/{candidate}'
    try:cloud.call(url,'DELETE',timeout=2)
    except RuntimeError as error:
        if str(error)!='cloud HTTP 404':raise
    try:cloud.call(url,timeout=2)
    except RuntimeError as error:
        if str(error)=='cloud HTTP 404':return True
        raise
    return False
def write(path,value):
    temp=path.with_name(path.name+'.'+str(time.time_ns())+'.next');temp.write_text(json.dumps(value))
    for attempt in range(20):
        try:temp.replace(path);return
        except PermissionError:time.sleep(.025)
    raise RuntimeError('private status handoff unavailable')
def recovery_due(lease,now):
    return lease.get('abort',False) or lease.get('replayComplete',False) or now>=lease['start']+108 or now-lease['heartbeat']>10 or (lease.get('stopRequested') is not None and now>=lease['stopRequested']+78) or (lease.get('terminatedAt') is not None and now>=lease['terminatedAt']+8)

def prepare(root,role,timeout=120):
    write(root/(role+'-ready.json'),{'authenticated':True,'pid':os.getpid(),'at':time.time()})
    end=time.monotonic()+timeout
    while not (root/'lease.json').exists():
        if time.monotonic()>=end:raise TimeoutError('No browser lease; no disruption started')
        time.sleep(.1)
def watch(root,cloud,fake=False):
    leasepath=root/'lease.json'; resultpath=root/'watchdog.json';write(resultpath,{'armed':True,'pid':os.getpid()})
    recovering=False;events=[];recovered=False;audit_process=None;wake_sent=False;last_probe=0;rows=[]
    while True:
        (root/('guard-hb-'+str(time.time_ns()))).touch()
        lease=json.loads(leasepath.read_text());now=time.time()
        beats=list(root.glob('hb-*'))
        if beats:lease['heartbeat']=max(float(f.name[3:])/1e9 for f in beats)
        if (root/'abort').exists():lease['abort']=True
        if (root/'stop-requested').exists():lease['stopRequested']=(root/'stop-requested').stat().st_mtime
        if (root/'outage-replay-browser.json').exists():lease['replayComplete']=True
        if (root/'vm-terminated').exists():lease['terminatedAt']=(root/'vm-terminated').stat().st_mtime
        if recovery_due(lease,now):recovering=True
        if recovered:
            closed=root/'browser-closed.json'
            clients_closed=closed.exists() and json.loads(closed.read_text()).get('observers')==0
            if clients_closed or now>=lease['start']+165:
                try:
                    late=now>=lease['start']+173
                    if not wake_sent and not late:wake_original();wake_sent=True
                    if not late and now-last_probe>=1:
                        last_probe=now
                        try:
                            rows=telemetry(cloud,lease['start']);write(root/'stream-disposition.json',{'at':time.time(),'rows':rows,'allZero':all_zero(rows)})
                        except (TimeoutError,urllib.error.URLError):pass
                    audit=json.loads((root/'recovery-audit.json').read_text()) if (root/'recovery-audit.json').exists() else {}
                    accounted=recovery_stream_accounted(root,rows,getattr(cloud,'last_start_requested_at',None)) if not late else False
                    if (all_zero(rows) and audit.get('passed') and accounted) or late:
                        if remove_owned_candidate(root,cloud):
                            write(root/'resource-cleanup.json',{'at':time.time(),'elapsed':time.time()-lease['start'],'fullSpecRestored':True,'candidateAbsent':True,'allProcessesFinalZero':all_zero(rows),'auditPassed':audit.get('passed',False),'recoveryStreamAccounted':accounted,'clientsClosed':clients_closed,'withinOverallLimit':time.time()<=lease['start']+180,'gatePassed':clients_closed and accounted and all_zero(rows) and audit.get('passed',False) and time.time()<=lease['start']+180})
                            return
                except Exception as error:
                    write(root/'cleanup-error.json',{'errorClass':type(error).__name__,'at':time.time()})
            time.sleep(1);continue
        if recovering:
            try:
                vm=cloud.start()
                if not fake and audit_process is None and getattr(cloud,'last_start_requested_at',None) is not None:
                    audit_process=launch_audit(root)
                restored=cloud.restore();events.append({'event':'recover','vm':vm,'trafficRestored':restored,'at':time.time()})
                write(resultpath,{'armed':True,'recovering':True,'events':events[-20:],'startRequestedAt':getattr(cloud,'last_start_requested_at',None),'complete':vm=='RUNNING' and restored,'at':now})
                if vm=='RUNNING' and restored:
                    if fake:return
                    recovered=True
                    write(root/'vm-recovered.json',{'at':time.time(),'fullSpecRestored':True})
                    if audit_process is None:audit_process=launch_audit(root)
            except Exception as e:
                events.append({'event':'recovery-error','class':type(e).__name__});write(resultpath,{'armed':True,'recovering':True,'events':events[-20:],'at':now})
        time.sleep(.02 if fake else 1)

def launch_audit(root):
    process=subprocess.Popen([sys.executable,'-B',str(pathlib.Path(__file__).with_name('hosted-outage-recovery-audit.py')),str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    write(root/'audit-process.json',{'pid':process.pid,'at':time.time()})
    return process
class Fake:
    def __init__(self,root):self.root=root
    def start(self):
        (self.root/'start-called').write_text('yes');return 'RUNNING'
    def restore(self):(self.root/'restore-called').write_text('yes');return True
if __name__=='__main__':
    if '--fake' in sys.argv:
        root=run_directory(sys.argv[-1]);watch(root,Fake(root),True)
    else:
        if len(sys.argv) not in [2,3]:raise ValueError('Usage: hosted-outage-guard.py [--prepare] <private-run-directory>')
        root=run_directory(sys.argv[-1]);cloud=Cloud(rollback_spec(root))
        if len(sys.argv)==3:
            if sys.argv[1]!='--prepare':raise ValueError('Unknown preparation mode')
            prepare(root,'watchdog')
        watch(root,cloud)
