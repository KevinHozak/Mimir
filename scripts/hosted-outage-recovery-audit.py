"""Bounded read-only recovery attestation; no credentials or raw CLI output."""
import json,pathlib,sys,time,subprocess,shutil,shlex,os,importlib.util

spec=importlib.util.spec_from_file_location('guard',pathlib.Path(__file__).with_name('hosted-outage-guard.py'))
guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)

REMOTE=r'''
import sqlite3,json,hashlib,subprocess,urllib.request,urllib.error,pathlib,os,time
end=time.monotonic()+25
while True:
 try:
  health=json.load(urllib.request.urlopen('http://127.0.0.1:8888/health',timeout=2));assert health['pulse']==64 and health['schedulerPaused'];break
 except (urllib.error.URLError,TimeoutError):
  if time.monotonic()>=end:raise
  time.sleep(.5)
db=sqlite3.connect('file:/var/lib/mimir/mimir.db?mode=ro',uri=True)
assert db.execute('pragma integrity_check').fetchone()[0]=='ok'
hashes={}
for table in ['timelines','timeline_checkpoints','timeline_events','timeline_interpretations']:
 rows=db.execute('select * from '+table+' order by 1,2').fetchall();hashes[table]=hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest()
pid=int(subprocess.check_output(['systemctl','show','mimir-staging','--property=MainPID','--value'],text=True).strip())
writers=[]
for proc in pathlib.Path('/proc').iterdir():
 if not proc.name.isdigit():continue
 try:
  args=(proc/'cmdline').read_bytes().split(b'\0')
  if args and args[0].split(b'/')[-1] in [b'node',b'nodejs'] and any(a.endswith(b'packages/server/dist/index.js') for a in args):writers.append(int(proc.name))
 except OSError:pass
assert writers==[pid]
for fd in pathlib.Path('/proc/'+str(pid)+'/fd').iterdir():
 try:
  link=os.readlink(fd);assert not ('mimir.db' in link and '(deleted)' in link)
 except OSError:pass
health=json.load(urllib.request.urlopen('http://127.0.0.1:8888/health',timeout=3));assert health['pulse']==64 and health['schedulerPaused']
for unit in ['mimir-offsite-backup.timer','mimir-offsite-backup-health.timer']:
 assert subprocess.check_output(['systemctl','is-active',unit],text=True).strip()=='active'
end=time.monotonic()+5
while True:
 status=json.loads(pathlib.Path('/var/lib/mimir/offsite/status.json').read_text())
 if status['consecutiveFailures']==0 and status['lastAttemptAt']<=status['lastSuccessAt']:break
 if time.monotonic()>=end:raise RuntimeError('Backup health not ready')
 time.sleep(.5)
print(json.dumps({'integrity':True,'singleWriter':True,'noOrphanedJournals':True,'backupsHealthy':True,'pid':pid,'pulse':64,'paused':True,'tableHashes':hashes}))
'''

def verify(report,baseline):
    return (all(report.get(key) is True for key in ['integrity','singleWriter','noOrphanedJournals','backupsHealthy','paused'])
            and report.get('pulse')==64 and report.get('tableHashes')==baseline['tableHashes'])

def execute(root):
    lease=json.loads((root/'lease.json').read_text());end=lease['start']+155
    flags={'--project':guard.PROJECT,'--zone':guard.ZONE,'--account':'khozak@gmail.com','--tunnel-through-iap':True,'--quiet':True,'--command':'sudo python3 -c '+shlex.quote(REMOTE)}
    path=root/'recovery-audit-flags.json';path.write_text(json.dumps(flags),encoding='utf8')
    while True:
        timeout=min(35,end-time.time())
        if timeout<=0:raise TimeoutError('Recovery audit window expired')
        child=subprocess.Popen([shutil.which('gcloud'),'compute','ssh','mimir-staging','--flags-file='+str(path)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
        try:
            output,_=child.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            if os.name=='nt':subprocess.run(['taskkill','/PID',str(child.pid),'/T','/F'],capture_output=True)
            else:child.kill()
            child.communicate(timeout=5)
            if time.time()>=end:raise TimeoutError('Recovery audit timed out') from None
            continue
        if child.returncode==0:break
        if time.time()+1>=end:raise RuntimeError('Read-only recovery attestation failed')
        time.sleep(1)
    report=json.loads(output);baseline=json.loads((root/'baseline-audit.json').read_text())
    passed=verify(report,baseline) and time.time()<=lease['start']+160
    guard.write(root/'recovery-audit.json',{'passed':passed,'at':time.time(),'elapsed':time.time()-lease['start'],'report':report})

if __name__=='__main__':
    root=guard.run_directory(sys.argv[1])
    try:execute(root)
    except Exception as error:guard.write(root/'recovery-audit.json',{'passed':False,'errorClass':type(error).__name__,'at':time.time()})
