// Bound both the retry loop and a single stalled response.
export async function waitForFixture(url, children, timeoutMs = 90000) {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const exited = children.find(child => child.exitCode !== null || child.signalCode !== null);
    if (exited) throw Error(`fixture process exited (code ${exited.exitCode}, signal ${exited.signalCode}) while waiting for ${url}`);
    const remaining = Math.max(1, Math.ceil(deadline - performance.now()));
    try { if ((await fetch(url, { signal: AbortSignal.timeout(remaining) })).ok) return; } catch {}
    const pause = Math.min(100, Math.max(0, deadline - performance.now()));
    if (pause) await new Promise(resolve => setTimeout(resolve, pause));
  }
  throw Error(`fixture unavailable after ${timeoutMs} milliseconds: ${url}`);
}
