/** Metadata credentials stay in this bounded worker and are never emitted. */
import { pathToFileURL } from 'node:url';
const endpoint = 'https://aiplatform.us.rep.googleapis.com/v1/projects/mimir-realm/locations/us/publishers/google/models/gemini-3.5-flash-lite';
export async function requestSpark(raw, transport = fetch) {
  let stage = 'local';
  const deadline = process.env.MIMIR_ONLINE_END_AT ? Date.parse(process.env.MIMIR_ONLINE_END_AT) : Date.now() + 8500;
  const remaining = deadline - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return {ok:false,stage:'local',error:'online-lease-expired'};
  const signal = AbortSignal.timeout(Math.max(1, Math.min(8500, remaining)));
  try {
    if (Buffer.byteLength(raw) > 16384) throw Error();
    const payload = JSON.parse(raw), config = payload.generationConfig;
    if (Object.keys(payload).sort().join() !== 'contents,generationConfig' || payload.contents?.length !== 1 || payload.contents[0].role !== 'user' || payload.contents[0].parts?.length !== 1 || Object.keys(payload.contents[0].parts[0]).join() !== 'text' || typeof payload.contents[0].parts[0].text !== 'string') throw Error();
    if (Object.keys(config).sort().join() !== 'candidateCount,maxOutputTokens,responseMimeType,responseSchema,thinkingConfig' || config.candidateCount !== 1 || config.maxOutputTokens !== 2048 || JSON.stringify(config.thinkingConfig) !== '{"thinkingLevel":"MINIMAL"}' || config.responseMimeType !== 'application/json') throw Error();
    const read = async response => {
      if (!response.ok) throw Object.assign(Error(), { status: response.status });
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) { bytes += chunk.length; if (bytes > 65536) { await response.body.cancel().catch(()=>{}); throw Error(); } chunks.push(chunk); }
      return JSON.parse(Buffer.concat(chunks).toString());
    };
    stage = 'credentials';
    const token = await read(await transport('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' }, redirect: 'error', signal }));
    if (typeof token.access_token !== 'string' || !token.access_token || token.token_type !== 'Bearer') throw Error();
    const post = async operation => {
      stage = operation;
      return read(await transport(endpoint + ':' + operation, { method: 'POST', headers: { authorization: 'Bearer ' + token.access_token, 'content-type': 'application/json', 'x-goog-user-project': 'mimir-realm' }, body: raw, redirect: 'error', signal }));
    };
    const counted = (await post('countTokens')).totalTokens;
    if (!Number.isSafeInteger(counted) || counted < 0 || counted > 16384) throw Error();
    return { ok: true, countedInputTokens: counted, response: await post('generateContent') };
  } catch (error) { return { ok: false, stage, ...(Number.isInteger(error.status) ? { httpStatus: error.status } : {}), error: 'bounded-provider-request-failed' }; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let raw = '', bytes = 0;
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) { bytes += Buffer.byteLength(chunk); if (bytes > 16384) { process.stdout.write(JSON.stringify({ok:false,stage:'local'})); process.exit(0); } raw += chunk; }
  process.stdout.write(JSON.stringify(await requestSpark(raw)));
}
