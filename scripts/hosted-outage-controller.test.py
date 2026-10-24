import pathlib,sys,subprocess,tempfile,time,json,unittest,importlib.util
root=pathlib.Path(__file__).parent
spec=importlib.util.spec_from_file_location('guard',root/'hosted-outage-guard.py');g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
spec=importlib.util.spec_from_file_location('controller',root/'hosted-outage-controller.py');controller=importlib.util.module_from_spec(spec);spec.loader.exec_module(controller)
acceptable,validate_limits=controller.acceptable,controller.validate_limits
temporary=root.parent/'.tmp';temporary.mkdir(exist_ok=True)
class Tests(unittest.TestCase):
    def test_windows_status_retry(self):
        from unittest.mock import patch
        original=pathlib.Path.replace; attempts=[]
        def replace(path,target):
            attempts.append(1)
            if len(attempts)<3:raise PermissionError('synthetic sharing violation')
            return original(path,target)
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            target=pathlib.Path(directory)/'status.json'
            with patch.object(pathlib.Path,'replace',replace):g.write(target,{'safe':True})
            self.assertEqual(json.loads(target.read_text()),{'safe':True});self.assertEqual(len(attempts),3)
    def test_fault_phase_and_limits(self):
        for phase in ['baseline','outage','recovery']:
            self.assertFalse(acceptable(401,phase));self.assertFalse(acceptable(403,phase));self.assertFalse(acceptable(503,phase));self.assertTrue(acceptable(200,phase))
        self.assertTrue(acceptable(502,'outage'));self.assertFalse(acceptable(502,'recovery'))
        validate_limits(2,180)
        for sessions,seconds in [(3,180),(0,180),(2,181)]:
            with self.assertRaises(ValueError):validate_limits(sessions,seconds)

    def test_deadlines_and_stale_controller(self):
        lease={'start':100.,'heartbeat':205.}
        self.assertFalse(g.recovery_due(lease,207.));self.assertTrue(g.recovery_due(lease,208.))
        self.assertTrue(g.recovery_due({'start':100.,'heartbeat':100.},111.))
        self.assertTrue(g.recovery_due({'start':100.,'heartbeat':227.,'stopRequested':150.},228.))
        self.assertTrue(g.recovery_due({'start':100.,'heartbeat':100.,'abort':True},100.))
    def test_approved_replay_and_operation_bounds(self):
        self.assertFalse(g.recovery_due({'start':100,'heartbeat':199,'stopRequested':125},202))
        self.assertTrue(g.recovery_due({'start':100,'heartbeat':202,'stopRequested':125},203))
        self.assertTrue(g.recovery_due({'start':100,'heartbeat':180,'terminatedAt':170},180))
        self.assertTrue(g.recovery_due({'start':100,'heartbeat':170,'replayComplete':True},170))
    def test_survives_controller_death(self):
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);now=time.time();g.write(r/'lease.json',{'start':now-110,'heartbeat':now})
            controller=subprocess.Popen([sys.executable,'-c','import time;time.sleep(30)']);controller.kill();controller.wait()
            watchdog=subprocess.Popen([sys.executable,str(root/'hosted-outage-guard.py'),'--fake',str(r)])
            try:watchdog.wait(timeout=5);self.assertEqual(watchdog.returncode,0);self.assertTrue((r/'start-called').exists());self.assertTrue((r/'restore-called').exists());self.assertTrue(json.loads((r/'watchdog.json').read_text())['complete'])
            finally:
                if watchdog.poll() is None:watchdog.kill();watchdog.wait()
    def test_gate_is_explicit_fresh_and_deadline_bound(self):
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);e={'reconnected':True,'retainedState':True,'archiveReady':True,'candidateProcessVerified':True,'deadline':265,'at':120}
            g.write(r/'replacement-browser-ok.json',e);self.assertFalse(controller.browser_gate(r,100,125))
            (r/'guard-hb-124000000000').touch();self.assertTrue(controller.browser_gate(r,100,125))
            self.assertFalse(controller.browser_gate(r,100,130))
            for key in ['reconnected','retainedState','archiveReady','candidateProcessVerified']:
                g.write(r/'replacement-browser-ok.json',{**e,key:False});self.assertFalse(controller.browser_gate(r,100,125))
            g.write(r/'replacement-browser-ok.json',{**e,'deadline':280});self.assertFalse(controller.browser_gate(r,100,125))
    def test_log_timeout_is_unverified_and_auth_failure_still_aborts(self):
        from unittest.mock import patch
        class SlowCloud:
            failure=TimeoutError()
            def call(self,*args,**kwargs):
                self.timeout=kwargs.get('timeout');raise self.failure
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);cloud=SlowCloud()
            self.assertFalse(controller.confirm_candidate(cloud,r,'candidate',100));self.assertEqual(cloud.timeout,2)
            self.assertFalse((r/'candidate-process.json').exists())
            cloud.failure=RuntimeError('cloud HTTP 403')
            with self.assertRaises(RuntimeError):controller.confirm_candidate(cloud,r,'candidate',100)
            denial=controller.urllib.error.HTTPError('https://fixture',401,'denied',{},None)
            cloud.failure=TimeoutError()
            with patch.object(controller.urllib.request,'urlopen',side_effect=denial):self.assertFalse(controller.confirm_route(cloud,r,'candidate',100))
            self.assertFalse((r/'candidate-route-ready.json').exists())
    def test_running_after_stop_is_not_restart_evidence(self):
        for elapsed,state in [(30,'RUNNING'),(31,'RUNNING'),(40,'STOPPING'),(80,'TERMINATED')]:
            self.assertIsNone(controller.recovery_action(state,elapsed))
        self.assertIsNone(controller.recovery_action('RUNNING',110))
        self.assertEqual(controller.recovery_action('RUNNING',130,True),'observed')
        self.assertEqual(controller.recovery_action('STAGING',100),'observed')
    def test_private_path_boundary(self):
        with self.assertRaises(ValueError):g.run_directory(root.parent/'data')
    def test_preparation_cannot_start_without_browser_lease(self):
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory)
            with self.assertRaises(TimeoutError):g.prepare(r,'fixture',timeout=0)
            self.assertTrue(json.loads((r/'fixture-ready.json').read_text())['authenticated'])
            g.write(r/'lease.json',{'start':100});g.prepare(r,'fixture',timeout=0)
    def test_watchdog_starts_before_controller_fallback(self):
        self.assertIsNone(controller.recovery_action('TERMINATED',109))
        self.assertEqual(controller.recovery_action('STARTING',110),'observed')
        self.assertEqual(controller.recovery_action('PROVISIONING',110),'observed')
        self.assertEqual(controller.recovery_action('STAGING',110),'observed')
        self.assertEqual(controller.recovery_action('RUNNING',110,True),'observed')
        self.assertEqual(controller.recovery_action('TERMINATED',110),'start')
        self.assertIsNone(controller.recovery_action('STOPPING',110))
        with self.assertRaises(ValueError):controller.recovery_action('SUSPENDED',110)
    def test_prepared_process_startup_race_waits_for_watchdog(self):
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);self.assertIsNone(controller.watchdog_status(r,.1))
            with self.assertRaises(RuntimeError):controller.watchdog_status(r,10.1)
            g.write(r/'watchdog.json',{'armed':True});self.assertTrue(controller.watchdog_status(r,.2)['armed'])
    def test_candidate_gate_needs_positive_process_evidence(self):
        class FakeCloud:
            records=[]
            def call(self,*args,**kwargs):return {'entries':self.records}
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);cloud=FakeCloud();g.write(r/'replacement-browser-ok.json',{'candidateProcessVerified':False})
            self.assertFalse(controller.confirm_candidate(cloud,r,'candidate',100))
            cloud.records=[{'jsonPayload':{'revision':'wrong','activeRequests':1,'activeUpstreamStreams':1}}]
            self.assertFalse(controller.confirm_candidate(cloud,r,'candidate',100))
            cloud.records=[{'jsonPayload':{'revision':controller.ORIGINAL,'processSession':'original','event':'stream-open','timestamp':'1','activeRequests':1,'activeUpstreamStreams':1}},{'jsonPayload':{'revision':controller.ORIGINAL,'processSession':'original','event':'request-close','timestamp':'2','activeRequests':0,'activeUpstreamStreams':0}},{'jsonPayload':{'revision':'candidate','processSession':'fixture','event':'stream-open','activeRequests':1,'activeUpstreamStreams':1}}]
            self.assertTrue(controller.confirm_candidate(cloud,r,'candidate',100));self.assertTrue(json.loads((r/'replacement-browser-ok.json').read_text())['candidateProcessVerified'])
    def test_route_gate_needs_real_candidate_request_not_traffic_configuration(self):
        from unittest.mock import patch
        class FakeCloud:
            records=[]
            def call(self,*args,**kwargs):return {'entries':self.records}
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);cloud=FakeCloud()
            denial=controller.urllib.error.HTTPError('https://fixture',401,'denied',{},None)
            with patch.object(controller.urllib.request,'urlopen',side_effect=denial):
                self.assertFalse(controller.confirm_route(cloud,r,'candidate',100))
                cloud.records=[{'resource':{'labels':{'revision_name':'old'}},'httpRequest':{'status':401}}]
                self.assertFalse(controller.confirm_route(cloud,r,'candidate',100))
                cloud.records=[{'resource':{'labels':{'revision_name':'candidate'}},'httpRequest':{'status':401}}]
                self.assertTrue(controller.confirm_route(cloud,r,'candidate',100))
            self.assertTrue(json.loads((r/'candidate-route-ready.json').read_text())['requestRevisionVerified'])
    def test_full_spec_restore_not_just_traffic(self):
        from unittest.mock import Mock
        target={'template':{'metadata':{'name':g.ORIGINAL},'spec':{'pinned':True}},'traffic':[{'revisionName':g.ORIGINAL,'percent':100}]}
        cloud=g.Cloud.__new__(g.Cloud);cloud.rollback_spec=target
        service={'apiVersion':'v1','kind':'Service','metadata':{'name':g.SERVICE,'resourceVersion':'1'},'spec':{**target,'template':{'metadata':{'name':'candidate'}}},'status':{'traffic':target['traffic']}}
        cloud.call=Mock(return_value=service);self.assertFalse(cloud.restore());self.assertEqual(cloud.call.call_args.args[2]['spec'],target)
        cloud.call=Mock(return_value={**service,'spec':target});self.assertTrue(cloud.restore())
    def test_missing_or_stale_zero_cannot_pass_disposition(self):
        def entry(event,count,stamp):return {'jsonPayload':{'revision':g.ORIGINAL,'processSession':'p','event':event,'activeRequests':count,'activeUpstreamStreams':count,'timestamp':stamp}}
        self.assertFalse(g.all_zero(g.stream_dispositions([entry('sample',0,'1')])))
        self.assertFalse(g.all_zero(g.stream_dispositions([entry('stream-open',1,'1')])))
        self.assertTrue(g.all_zero(g.stream_dispositions([entry('request-close',0,'2'),entry('stream-open',1,'1')])))
        self.assertFalse(g.all_zero(g.stream_dispositions([entry('stream-open',1,'1'),entry('request-close',0,'2'),entry('stream-open',1,'3')])))
    def test_owned_deletion_refuses_original_and_requires_full_rollback(self):
        from unittest.mock import Mock
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);g.write(r/'candidate.json',{'name':g.ORIGINAL});cloud=Mock()
            with self.assertRaises(AssertionError):g.remove_owned_candidate(r,cloud)
            cloud.call.assert_not_called()
            g.write(r/'candidate.json',{'name':g.SERVICE+'-s009-fixture'});cloud.restore.return_value=False
            with self.assertRaises(AssertionError):g.remove_owned_candidate(r,cloud)
            cloud.call.assert_not_called()
            cloud.restore.return_value=True;cloud.call.side_effect=RuntimeError('cloud HTTP 404');self.assertTrue(g.remove_owned_candidate(r,cloud))
    def test_recovery_audit_requires_exact_history_and_all_checks(self):
        spec=importlib.util.spec_from_file_location('audit',root/'hosted-outage-recovery-audit.py');audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
        report={k:True for k in ['integrity','singleWriter','noOrphanedJournals','backupsHealthy','paused']};report.update(pulse=64,tableHashes={'fixture':'same'});baseline={'tableHashes':{'fixture':'same'}}
        self.assertTrue(audit.verify(report,baseline))
        for key in ['integrity','singleWriter','noOrphanedJournals','backupsHealthy','paused']:self.assertFalse(audit.verify({**report,key:False},baseline))
        self.assertFalse(audit.verify({**report,'tableHashes':{'fixture':'different'}},baseline))
        self.assertNotIn("'systemctl','start'",audit.REMOTE);self.assertIn('mode=ro',audit.REMOTE)
    def test_independent_worker_finishes_cleanup_without_controller(self):
        from unittest.mock import patch,Mock
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);g.write(r/'lease.json',{'start':850,'heartbeat':1000});g.write(r/'browser-closed.json',{'observers':0})
            class Cloud:
                def start(self):return 'RUNNING'
                def restore(self):return True
            def audited(*args,**kwargs):g.write(r/'recovery-audit.json',{'passed':True});return Mock(pid=123)
            rows=[{'revision':'original','processSession':'p','activeRequests':0,'activeUpstreamStreams':0}]
            with patch.object(g.time,'time',return_value=1000),patch.object(g.time,'sleep'),patch.object(g.subprocess,'Popen',side_effect=audited),patch.object(g,'wake_original') as wake,patch.object(g,'telemetry',return_value=rows),patch.object(g,'remove_owned_candidate',return_value=True) as remove:
                g.watch(r,Cloud());wake.assert_called_once();remove.assert_called_once()
            result=json.loads((r/'resource-cleanup.json').read_text());self.assertTrue(result['gatePassed']);self.assertEqual(result['elapsed'],150)
    def test_deadline_forces_safe_deletion_without_inventing_cleanup_proof(self):
        from unittest.mock import patch,Mock
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);g.write(r/'lease.json',{'start':827,'heartbeat':1000})
            class Cloud:
                def start(self):return 'RUNNING'
                def restore(self):return True
            with patch.object(g.time,'time',return_value=1000),patch.object(g.time,'sleep'),patch.object(g.subprocess,'Popen',return_value=Mock(pid=123)),patch.object(g,'telemetry') as telemetry,patch.object(g,'remove_owned_candidate',return_value=True):
                g.watch(r,Cloud());telemetry.assert_not_called()
            result=json.loads((r/'resource-cleanup.json').read_text());self.assertTrue(result['candidateAbsent']);self.assertFalse(result['gatePassed']);self.assertFalse(result['allProcessesFinalZero'])
    def test_cleanup_requires_a_calibrated_post_restart_original_stream(self):
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);(r/'stop-requested').touch();g.write(r/'clock-samples.json',[{'cloudMinusLocalUpper':12}])
            stamp=lambda value:g.datetime.datetime.fromtimestamp(value,g.datetime.timezone.utc).isoformat()
            self.assertFalse(g.recovery_stream_accounted(r,[{'revision':g.ORIGINAL,'lastStreamOpenedAt':stamp(1010)}],1000))
            self.assertTrue(g.recovery_stream_accounted(r,[{'revision':g.ORIGINAL,'lastStreamOpenedAt':stamp(1013)}],1000))
            self.assertFalse(g.recovery_stream_accounted(r,[{'revision':'candidate','lastStreamOpenedAt':stamp(1013)}],1000))
            self.assertFalse(g.recovery_stream_accounted(r,[],None))
    def test_rollback_preserves_existing_nonserving_template_with_pinned_image(self):
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);source={'metadata':{'name':g.SERVICE,'namespace':'487827684488'},'spec':{'traffic':[{'revisionName':g.ORIGINAL,'percent':100}],'template':{'metadata':{'name':g.SERVICE+'-s007-restore'},'spec':{'containers':[{'image':'us-central1-docker.pkg.dev/mimir-realm/mimir/mimir-observer-bridge@sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a'}]}}}}
            g.write(r/'rollback.json',source);self.assertEqual(g.rollback_spec(r),source['spec'])
            source['spec']['template']['metadata']['name']=g.SERVICE+'-s009-owned';g.write(r/'rollback.json',source)
            with self.assertRaises(AssertionError):g.rollback_spec(r)
    def test_failed_live_request_is_still_accounted_until_closed(self):
        opened={'jsonPayload':{'revision':g.ORIGINAL,'processSession':'failed','event':'request-open','timestamp':'1','activeRequests':1,'activeUpstreamStreams':0}}
        closed={'jsonPayload':{'revision':g.ORIGINAL,'processSession':'failed','event':'request-close','timestamp':'2','activeRequests':0,'activeUpstreamStreams':0}}
        self.assertFalse(g.all_zero(g.stream_dispositions([opened])))
        self.assertTrue(g.all_zero(g.stream_dispositions([opened,closed])))
    def test_audit_overlaps_boot_instead_of_waiting_for_vm_running(self):
        from unittest.mock import patch,Mock
        with tempfile.TemporaryDirectory(dir=temporary) as directory:
            r=pathlib.Path(directory);g.write(r/'lease.json',{'start':850,'heartbeat':1000});g.write(r/'browser-closed.json',{'observers':0});calls=[]
            class Cloud:
                last_start_requested_at=990
                count=0
                def start(self):
                    self.count+=1;state='STAGING' if self.count==1 else 'RUNNING';calls.append(state);return state
                def restore(self):return True
            def audited(*args,**kwargs):calls.append('audit');g.write(r/'recovery-audit.json',{'passed':True});return Mock(pid=123)
            rows=[{'revision':'original','processSession':'p','activeRequests':0,'activeUpstreamStreams':0}]
            with patch.object(g.time,'time',return_value=1000),patch.object(g.time,'sleep'),patch.object(g.subprocess,'Popen',side_effect=audited) as spawn,patch.object(g,'wake_original'),patch.object(g,'telemetry',return_value=rows),patch.object(g,'remove_owned_candidate',return_value=True):
                g.watch(r,Cloud());self.assertEqual(calls[:3],['STAGING','audit','RUNNING']);self.assertEqual(spawn.call_count,1)
if __name__=='__main__':unittest.main()
