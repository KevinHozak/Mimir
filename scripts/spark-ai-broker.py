"""One bounded count+generation request, existing selected SDK identity, no tokens in output."""
import contextlib, io, json, os, pathlib, sys, time

started = time.monotonic()
sdk = pathlib.Path(os.environ['LOCALAPPDATA']) / 'Google/Cloud SDK/google-cloud-sdk'
sys.path[:0] = [str(sdk/'lib'), str(sdk/'lib/third_party')]
os.environ.update({'CLOUDSDK_CORE_DISABLE_PROMPTS':'1','CLOUDSDK_CORE_CHECK_GCE_METADATA':'false','CLOUDSDK_CORE_DISABLE_USAGE_REPORTING':'true'})
stage = 'local'
try:
    raw = sys.stdin.buffer.read(16385)
    if len(raw) > 16384: raise ValueError('wire too large')
    payload = json.loads(raw)
    config = payload['generationConfig']
    if set(payload) != {'contents','generationConfig'} or len(payload['contents']) != 1 or payload['contents'][0]['role'] != 'user' or len(payload['contents'][0]['parts']) != 1 or set(payload['contents'][0]['parts'][0]) != {'text'}: raise ValueError('text-only request required')
    if config['candidateCount'] != 1 or config['maxOutputTokens'] != 2048 or config['thinkingConfig'] != {'thinkingLevel':'MINIMAL'} or config['responseMimeType'] != 'application/json' or set(config) != {'candidateCount','maxOutputTokens','thinkingConfig','responseMimeType','responseSchema'}: raise ValueError('wire settings rejected')
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        from googlecloudsdk.core.credentials import store
        from google.auth.transport.requests import AuthorizedSession
        credentials = store.LoadFreshCredential(account='khozak@gmail.com')
        if getattr(credentials, 'quota_project_id', None): credentials = credentials.with_quota_project('mimir-realm')
        session = AuthorizedSession(credentials, max_refresh_attempts=0)
        session.headers['x-goog-user-project'] = 'mimir-realm'
    endpoint = 'https://aiplatform.us.rep.googleapis.com/v1/projects/mimir-realm/locations/us/publishers/google/models/gemini-3.5-flash-lite'
    def post(operation):
        global stage
        stage = operation
        remaining = 8.5 - (time.monotonic() - started)
        if remaining <= 0: raise TimeoutError()
        response = session.post(endpoint+':'+operation, json=payload, timeout=remaining, allow_redirects=False)
        if response.status_code != 200:
            print(json.dumps({'ok':False,'stage':stage,'httpStatus':response.status_code}));sys.exit(0)
        if len(response.content) > 65536: raise ValueError('response too large')
        return response.json()
    counted = post('countTokens')['totalTokens']
    if not isinstance(counted,int) or isinstance(counted,bool) or not 0 <= counted <= 16384: raise ValueError('input count rejected')
    response = post('generateContent')
    session.close()
    print(json.dumps({'ok':True,'countedInputTokens':counted,'response':response}))
except Exception:
    print(json.dumps({'ok':False,'stage':stage,'error':'bounded-provider-request-failed'}))
