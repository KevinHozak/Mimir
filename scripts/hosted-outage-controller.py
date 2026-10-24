import pathlib,json,time,sys,threading,importlib.util,datetime,urllib.request,urllib.error,urllib.parse
spec=importlib.util.spec_from_file_location('outage_guard',pathlib.Path(__file__).with_name('hosted-outage-guard.py'))
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
Cloud,VM,RUN,ORIGINAL,write=guard.Cloud,guard.VM,guard.RUN,guard.ORIGINAL,guard.write
def acceptable(status,phase):
    return status==200 or (phase=='outage' and status==502)
def validate_limits(sessions,seconds):
    if not isinstance(sessions,int) or sessions<1 or sessions>2 or seconds<=0 or seconds>180:raise ValueError('outside approved limits')

def recovery_action(state,elapsed,restart_observed=False):
    if state not in ['STOPPING','TERMINATED','STARTING','PROVISIONING','STAGING','RUNNING']:raise ValueError('unexpected VM transition')
    if state in ['STARTING','PROVISIONING','STAGING'] or (state=='RUNNING' and restart_observed):return 'observed'
    if elapsed<110:return None
    if state=='TERMINATED' and elapsed>=110:return 'start'
    return None

def watchdog_status(root,elapsed):
    path=root/'watchdog.json'
    if path.exists():return json.loads(path.read_text())
    if elapsed>10:raise RuntimeError('Independent watchdog did not arm')
    return None
def browser_gate(root,start,now):
    evidence=json.loads((root/'replacement-browser-ok.json').read_text())
    heartbeats=list(root.glob('guard-hb-*'))
    guard_alive=bool(heartbeats) and 0<=now-max(float(p.name[9:])/1e9 for p in heartbeats)<5
    return guard_alive and evidence.get('reconnected') is True and evidence.get('retainedState') is True and evidence.get('archiveReady') is True and evidence.get('candidateProcessVerified') is True and abs(evidence.get('deadline',0)-(start+165))<.002 and now<start+30 and start<=evidence.get('at',0)<=now

def confirm_route(cloud,root,candidate,start):
    nonce=str(round(start*1000));url='https://mimir-observer-bridge-mah4b2udkq-uc.a.run.app/api/world?rehearsal-route='+nonce
    try:
        with urllib.request.urlopen(url,timeout=2) as response:status=response.status
    except urllib.error.HTTPError as error:status=error.code
    except (TimeoutError,urllib.error.URLError):return False
    if status!=401:raise RuntimeError('Anonymous route probe was not denied')
    stamp=datetime.datetime.fromtimestamp(start,datetime.timezone.utc).isoformat()
    endpoint='https://logging.googleapis.com/v2/entries:list?fields='+urllib.parse.quote('entries(resource,timestamp,httpRequest/status)',safe='(),')
    try:result=cloud.call(endpoint,'POST',{'resourceNames':['projects/mimir-realm'],'filter':f'resource.type="cloud_run_revision" AND resource.labels.revision_name="{candidate}" AND httpRequest.status=401 AND httpRequest.requestUrl:"rehearsal-route={nonce}" AND timestamp>="{stamp}"','orderBy':'timestamp desc','pageSize':10},timeout=2)
    except (TimeoutError,urllib.error.URLError):return False
    records=[entry for entry in result.get('entries',[]) if entry.get('resource',{}).get('labels',{}).get('revision_name')==candidate and entry.get('httpRequest',{}).get('status')==401]
    if not records:return False
    write(root/'candidate-route-ready.json',{'revision':candidate,'at':time.time(),'anonymousDenied':True,'requestRevisionVerified':True})
    return True

def confirm_candidate(cloud,root,candidate,start):
    stamp=datetime.datetime.fromtimestamp(start,datetime.timezone.utc).isoformat()
    try:result=cloud.call('https://logging.googleapis.com/v2/entries:list','POST',{'resourceNames':['projects/mimir-realm'],'filter':f'resource.type="cloud_run_revision" AND resource.labels.service_name="mimir-observer-bridge" AND jsonPayload.kind="observer-stream" AND timestamp>="{stamp}"','orderBy':'timestamp asc','pageSize':1000},timeout=2)
    except (TimeoutError,urllib.error.URLError):return False
    if result.get('nextPageToken'):return False
    original=guard.stream_dispositions([e for e in result.get('entries',[]) if e.get('jsonPayload',{}).get('revision')==ORIGINAL])
    if not guard.all_zero(original):return False
    records=[e['jsonPayload'] for e in result.get('entries',[]) if e.get('jsonPayload',{}).get('revision')==candidate and e['jsonPayload'].get('event')=='stream-open' and e['jsonPayload'].get('activeUpstreamStreams')==1 and e['jsonPayload'].get('activeRequests',99)<=2]
    if not records:return False
    safe={k:records[0].get(k) for k in ['revision','processSession','timestamp','activeRequests','activeUpstreamStreams']}
    write(root/'candidate-process.json',safe)
    write(root/'original-final-zero.json',{'at':time.time(),'processes':original})
    evidence=json.loads((root/'replacement-browser-ok.json').read_text());evidence['candidateProcessVerified']=True;write(root/'replacement-browser-ok.json',evidence)
    return True

def run(ROOT,cloud=None):
    validate_limits(2,180);c=cloud or Cloud();candidate=json.loads((ROOT/'candidate.json').read_text())['name'];lease=json.loads((ROOT/'lease.json').read_text());start=lease['start'];events=[];routed=False;stopped=False;started=False;candidate_verified=False;last_probe=0;route_verified=False;last_route_probe=0
    assert candidate.startswith('mimir-observer-bridge-s009-') and candidate!=ORIGINAL
    assert abs(lease['deadline']-(start+165))<.002 and 0<=time.time()-start<30,'invalid or stale browser lease'
    def event(name,**fields):
        events.append({'event':name,'elapsed':round(time.time()-start,3),**fields});write(ROOT/'controller.json',{'events':events,'phase':name})
    def heartbeat():
        (ROOT/('hb-'+str(time.time_ns()))).touch()
        if lease.get('abort'):(ROOT/'abort').touch()
    stop_heartbeat=threading.Event()
    def heartbeat_loop():
        while not stop_heartbeat.wait(1):heartbeat()
    heartbeat_thread=threading.Thread(target=heartbeat_loop,daemon=True);heartbeat_thread.start()
    event('baseline')
    try:
        while time.time()<start+160:
            heartbeat();elapsed=time.time()-start;watch=watchdog_status(ROOT,elapsed)
            if watch is None:time.sleep(.05);continue
            if (ROOT/'observations.json').exists():
                for observation in json.loads((ROOT/'observations.json').read_text()):
                    phase=observation['phase'];assert phase in ['baseline','outage','recovery']
                    assert acceptable(observation['status'],phase),'unexpected observer status'
            if (ROOT/'unexpected-browser-status').exists():raise RuntimeError('unexpected browser status')
            if (ROOT/'abort').exists():raise RuntimeError('observer abort')
            if not routed:
                assert (ROOT/'original-client-stopped.json').exists(),'Original stream cancellation was not issued'
                guard.wake_original()
                c.route(candidate);routed=True;event('replacement-routing')
            if routed and not route_verified and elapsed-last_route_probe>=1:
                last_route_probe=elapsed;route_verified=confirm_route(c,ROOT,candidate,start)
                if route_verified:event('replacement-route-verified')
            if routed and not candidate_verified and (ROOT/'replacement-browser-ok.json').exists() and elapsed-last_probe>=1:
                last_probe=elapsed;candidate_verified=confirm_candidate(c,ROOT,candidate,start)
                if candidate_verified:event('replacement-stream-verified')
            if not stopped and route_verified and candidate_verified:
                assert route_verified and candidate_verified,'replacement route/process not verified'
                service=c.call(RUN);assert any(t.get('revisionName')==candidate and t.get('percent')==100 for t in service['status']['traffic'])
                assert not watch.get('recovering'),'watchdog already requested recovery'
                assert browser_gate(ROOT,start,time.time()),'fresh replacement/browser/archive gates not recorded'
                assert time.time()<start+30,'readiness exceeded approved stop deadline'
                lease['stopRequested']=time.time();(ROOT/'stop-requested').touch();heartbeat();event('stop-requested');c.call(VM+'/stop','POST',{});stopped=True
            if not stopped and time.time()>=start+30:raise RuntimeError('Readiness deadline; VM untouched')
            if stopped and not started:
                state_requested_at=time.time()
                state=c.vm()
                write(ROOT/'vm-observation.json',{'state':state,'requestedAt':state_requested_at,'at':time.time()})
                if state=='TERMINATED' and not any(x['event']=='vm-terminated' for x in events):
                    (ROOT/'vm-terminated').touch();event('vm-terminated')
                action=recovery_action(state,elapsed,watch.get('startRequestedAt') is not None)
                if action=='start':c.call(VM+'/start','POST',{});started=True;event('start-requested')
                elif action=='observed':started=True;event('watchdog-start-observed')
            if started and c.vm()=='RUNNING':event('vm-running')
            if started:
                service=c.call(RUN)
                if c.vm()=='RUNNING' and service['status']['traffic']==[{'revisionName':ORIGINAL,'percent':100}]:event('recovered-traffic');break
            time.sleep(.1 if not stopped else 1)
    except Exception as e:
        lease['abort']=True;heartbeat();event('aborted',errorClass=type(e).__name__)
    finally:
        lease['abort']=True;heartbeat()
        for _ in range(45):
            try:
                state=c.start();restored=c.restore()
                if state=='RUNNING' and restored:stop_heartbeat.set();event('recovery-confirmed');return
            except Exception:pass
            time.sleep(1)
        event('recovery-pending');sys.exit(1)
if __name__=='__main__':
    if len(sys.argv) not in [2,3]:raise ValueError('Usage: hosted-outage-controller.py [--prepare] <private-run-directory>')
    root=guard.run_directory(sys.argv[-1]);cloud=Cloud(guard.rollback_spec(root))
    if len(sys.argv)==3:
        if sys.argv[1]!='--prepare':raise ValueError('Unknown preparation mode')
        guard.prepare(root,'controller')
    run(root,cloud)
