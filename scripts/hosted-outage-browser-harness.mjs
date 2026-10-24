/** Same-origin diagnostic wrapper; never reads or exports authentication state. */
export function browserHarnessDocument(origin) {
  const url = new URL(origin);
  if (url.origin !== origin || !['https:', 'http:'].includes(url.protocol)) throw new Error('Expected an exact web origin');
  return `<!doctype html><meta charset="utf-8"><title>MIM-S009 bounded browser harness</title>
<style>body{background:#080d18;color:#dceeff;font:14px sans-serif;margin:8px}iframe{width:49%;height:88vh;border:1px solid #536b85}</style>
<h1>MIM-S009 diagnostic harness</h1><output id="status">Unarmed — no observers</output><main></main>
<script>(${installHarness.toString()})(${JSON.stringify(origin)})</script>`;
}

/** Install only in a task-owned diagnostic tab, before opening either child. */
export function browserHarnessInstallExpression(origin) {
  return `window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})); window.stop();
{ const last=setTimeout(()=>{},0); for(let id=1;id<=last;id++){clearTimeout(id);clearInterval(id);} }
document.open(); document.write(${JSON.stringify(browserHarnessDocument(origin))}); document.close();
({title:document.title,ready:typeof window.rehearsal})`;
}

function installHarness(origin) {
  let deadline = 0, closed = false;
  const frames = new Map(), events = [];
  const status = document.querySelector('#status');
  const record = event => { events.push({ event, at: Date.now() }); status.textContent = JSON.stringify({ deadline, closed, observers: frames.size, events }); };
  const close = () => {
    if (closed) return;
    closed = true;
    for (const frame of frames.values()) {
      // Stop the owned stream before removing its child document. WebView frame
      // teardown alone does not reliably deliver pagehide to the live session.
      try { frame.contentWindow.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); } catch { /* navigating child already detached */ }
      frame.src = 'about:blank'; frame.remove();
    }
    frames.clear();
    record('deadline-closed');
  };
  const check = () => { if (deadline && Date.now() >= deadline) close(); };
  // This document survives child navigation. Its wall-clock check also catches
  // a delayed timer when a backgrounded browser resumes execution.
  setInterval(check, 100);
  window.rehearsal = {
    arm(absoluteDeadline) {
      if (deadline || closed || !Number.isFinite(absoluteDeadline) || absoluteDeadline <= Date.now() || absoluteDeadline > Date.now() + 180000) throw new Error('Invalid or repeated rehearsal deadline');
      deadline = absoluteDeadline;
      setTimeout(close, Math.max(0, deadline - Date.now()));
      record('armed');
    },
    open(name, path) {
      check();
      if (closed || !deadline || !['live', 'archive'].includes(name) || frames.has(name) || frames.size >= 2) throw new Error('Observer limit or lease violation');
      const url = new URL(path, origin);
      if (url.origin !== origin) throw new Error('Observer origin mismatch');
      const frame = document.createElement('iframe');
      frame.title = name + ' observer'; frame.dataset.observer = name;
      frames.set(name, frame); document.querySelector('main').append(frame);
      frame.src = url.href;
      record('opened-' + name);
    },
    close,
    state() { check(); return { deadline, closed, observers: frames.size, events: [...events] }; },
  };
  record('ready');
}
