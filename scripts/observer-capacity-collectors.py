"""Read-only VM sampling over one pre-established IAP connection; no credentials emitted."""
VM_COLLECTOR = r'''
import json,time,pathlib,subprocess,urllib.request,sqlite3,hashlib,os,sys,select
MIM_S010_VM_COLLECTOR=1
STOP_PATH=""
started=time.monotonic();previous=None;sequence=0
while time.monotonic()-started<600:
 now=time.monotonic();sequence+=1
 cpu=list(map(int,pathlib.Path('/proc/stat').read_text().splitlines()[0].split()[1:]))
 total=sum(cpu[:8]);idle=cpu[3]+cpu[4]
 memory={line.split(':')[0]:int(line.split()[1]) for line in pathlib.Path('/proc/meminfo').read_text().splitlines() if line.startswith(('MemTotal:','MemAvailable:'))}
 sockets=subprocess.check_output(['ss','-Hnt','state','established','(','sport','=','8888',')'],text=True)
 row={'at':time.time(),'monotonic':now,'memoryFraction':1-memory['MemAvailable']/memory['MemTotal'],'upstreamSockets':len([l for l in sockets.splitlines() if l.strip()])}
 if previous and total>previous[0]:row['cpuFraction']=1-(idle-previous[1])/(total-previous[0])
 if previous is None or sequence%5==0:
  db=sqlite3.connect('file:/var/lib/mimir/mimir.db?mode=ro',uri=True)
  hashes={}
  for table in ['timelines','timeline_checkpoints','timeline_events','timeline_interpretations']:
   rows=db.execute('select * from '+table+' order by 1,2').fetchall();hashes[table]=hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest()
  health=json.load(urllib.request.urlopen('http://127.0.0.1:8888/health',timeout=2))
  pid=int(subprocess.check_output(['systemctl','show','mimir-staging','--property=MainPID','--value'],text=True))
  writers=[]
  for proc in pathlib.Path('/proc').iterdir():
   if not proc.name.isdigit():continue
   try:
    args=(proc/'cmdline').read_bytes().split(b'\0')
    if args and args[0].split(b'/')[-1] in [b'node',b'nodejs'] and any(a.endswith(b'packages/server/dist/index.js') for a in args):writers.append(int(proc.name))
   except OSError:pass
  backup=json.loads(pathlib.Path('/var/lib/mimir/offsite/status.json').read_text())
  row['baseline']={'integrity':db.execute('pragma integrity_check').fetchone()[0]=='ok','tableHashes':hashes,'singleWriter':writers==[pid],'pulse':health['pulse'],'paused':health['schedulerPaused'],'backupsHealthy':backup['consecutiveFailures']==0 and backup['lastAttemptAt']<=backup['lastSuccessAt']}

  db.close()
 row['networkBytes']=sum(int(line.split()[1])+int(line.split()[9]) for line in pathlib.Path('/proc/net/dev').read_text().splitlines()[2:])
 previous=(total,idle);print(json.dumps(row),flush=True)
 if STOP_PATH and pathlib.Path(STOP_PATH).exists():break
 time.sleep(1)
if STOP_PATH:pathlib.Path(STOP_PATH).unlink(missing_ok=True)
print(json.dumps({"stopped":True,"at":time.time()}),flush=True)

'''

def fresh_rows(rows, now, max_age=3):
    if not rows or now-rows[-1]['at']<0 or now-rows[-1]['at']>max_age:raise ValueError('Fresh VM collector required')
    return rows[-1]

def bridge_rows(entries, cloud_now, revision, max_age=5, clock_uncertainty=0):
    import datetime
    rows={}
    for entry in entries:
        p=entry.get('jsonPayload',{})
        if p.get('revision')!=revision or p.get('kind')!='observer-capacity':continue
        if p.get('unavailable'):raise ValueError('Bridge resource sampling unavailable')
        key=p.get('processSession')
        if not key or not isinstance(p.get('sequence'),int):raise ValueError('Missing process identity')
        if key not in rows or p['sequence']>rows[key]['sequence']:rows[key]=p
    if not rows:raise ValueError('No direct bridge samples')
    for p in rows.values():
        age=cloud_now-datetime.datetime.fromisoformat(p['timestamp'].replace('Z','+00:00')).timestamp()
        if age < -clock_uncertainty or age > max_age:raise ValueError('Bridge sample age outside bounds: '+str(round(age,3)))
        if any(type(p.get(k)) is not int or p[k]<0 for k in ['activeRequests','activeUpstreamStreams']):raise ValueError('Invalid direct counters')
    return list(rows.values())


def clock_offset_bounds(server_epoch, request_started, response_received):
    if response_received<request_started or response_received-request_started>2:raise ValueError('Clock calibration too uncertain')
    # HTTP Date has whole-second precision. The upper bound prevents fresh
    # telemetry being classified as future data by a rounded-down clock.
    return {'lower':server_epoch-response_received,'upper':server_epoch+1-request_started}


def bridge_response_rows(entries, revision, received_at, clock_upper, max_age=5):
    # The response may contain records emitted after the query began. Compare
    # with response receipt, never the earlier request/filter timestamp.
    if max_age+2>15:raise ValueError("Freshness plus clock uncertainty exceeds approved gap")
    return bridge_rows(entries, received_at+clock_upper, revision, max_age, clock_uncertainty=2)


def record_capacity_sample(directory, sequence, row):
    """Immutable per-sample files avoid replacing a snapshot held open by Windows readers."""
    import pathlib,json
    root=pathlib.Path(directory).resolve()
    allowed=pathlib.Path(__file__).resolve().parents[1]/'.tmp'
    if not root.is_relative_to(allowed) or root==allowed:raise ValueError('Private journal beneath .tmp required')
    if type(sequence) is not int or sequence<1 or not isinstance(row,dict):raise ValueError('Invalid capacity sample')
    root.mkdir(parents=True,exist_ok=True)
    target=root/(str(sequence).zfill(6)+'.json')
    with target.open('x',encoding='utf-8',newline='\n') as output:
        json.dump(row,output,separators=(',',':'));output.write('\n')
    return target
