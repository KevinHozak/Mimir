"""Independent exact rollback for owned S010 temporary collector revisions. Never controls the VM."""
import pathlib,json,time,sys,importlib.util
spec=importlib.util.spec_from_file_location('guard',pathlib.Path(__file__).with_name('hosted-outage-guard.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)

def due(created, lease, now, closed=False, lease_seconds=600):
    if lease_seconds not in [270,600]:raise ValueError("Unsupported repair lease")
    return closed or now>=created+(540 if lease_seconds==600 else 240) or (lease is not None and now>=lease+150)

def cleanup(root,cloud):
    candidate=json.loads((root/'candidate.json').read_text())['name']
    if not candidate.startswith(g.SERVICE+'-s010-') or candidate==g.ORIGINAL:raise ValueError('Owned candidate required')
    if not cloud.restore(timeout=3):return False
    url=f'https://{g.REGION}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/{g.PROJECT}/revisions/{candidate}'
    try:cloud.call(url,'DELETE',timeout=3)
    except RuntimeError as error:
        if str(error)!='cloud HTTP 404':raise
    try:cloud.call(url,timeout=3)
    except RuntimeError as error:
        if str(error)=='cloud HTTP 404':return True
        raise
    return False

def run(root):
    original=json.loads((root/'rollback.json').read_text());candidate=json.loads((root/'candidate.json').read_text());created=candidate['createdAt'];lease_seconds=candidate.get('leaseSeconds',600)
    cloud=g.Cloud(original['spec']);refreshes=0;g.write(root/'watchdog-ready.json',{'ready':True,'at':time.time()})
    while True:
        lease=json.loads((root/'run-lease.json').read_text())['start'] if (root/'run-lease.json').exists() else None
        if due(created,lease,time.time(),(root/'clients-closed.json').exists() or ((root/'abort').exists() and lease is None),lease_seconds):
            try:
                if cleanup(root,cloud):g.write(root/'cloud-cleanup.json',{'at':time.time(),'fullSpecRestored':True,'candidateAbsent':True});return
            except Exception as error:
                code=int(str(error).split()[-1]) if str(error).startswith('cloud HTTP ') else None
                g.write(root/'cleanup-error.json',{'errorClass':type(error).__name__,'httpStatus':code,'at':time.time()})
                if code==401 and refreshes<1:
                    cloud=g.Cloud(original['spec']);refreshes+=1
                    g.write(root/'operator-refresh.json',{'refreshed':True,'at':time.time()})
        time.sleep(1)

if __name__=='__main__':run(g.run_directory(sys.argv[1]))
