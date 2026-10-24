/** Runs only in the owned, same-origin browser harness. No credentials are read. */
export function capacityBrowserStartExpression() {
  return `(${startCapacityBrowser.toString()})()`;
}
function startCapacityBrowser() {
  document.title = "MIM-S010 bounded capacity rehearsal";
  document.querySelector("h1").textContent = "MIM-S010 bounded capacity rehearsal";
  const start = Date.now(), snapshots = [];
  window.capacityState = { start, deadline: start + 120000, snapshots, closed: false, errors: [] };
  rehearsal.arm(start + 120000);
  rehearsal.open("live", "/?sparkId=spark-6&follow=1&presentation=explanatory&rehearsal=capacity-a");
  rehearsal.open("archive", "/?sparkId=spark-6&follow=1&presentation=explanatory&rehearsal=capacity-b");
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    if (rehearsal.state().closed) {
      window.capacityState.closed = true; window.capacityState.closedAt = Date.now();
      clearInterval(timer); return;
    }
    const clients = [...document.querySelectorAll("iframe")].map(frame => {
      try {
        const d = frame.contentDocument;
        return { scene: !!d.querySelector("canvas"), pulse64: d.body?.innerText.includes("PULSE 64"),
          selection: d.querySelector('select[aria-label="Selected entity"]')?.value,
          error: d.querySelector('[data-testid="first-glow-refresh-error"],[role="alert"]')?.textContent ?? "" };
      } catch { return { scene: false }; }
    });
    snapshots.push({ elapsed, clients });
    if (clients.some(c => c.error)) { window.capacityState.errors.push("observer-error"); rehearsal.close(); }
  }, 1000);
  return { start, deadline: start + 120000, observers: 2 };
}


/** Host-side abort watcher; callbacks stay in the Browser Use runtime. */
export async function watchCapacityBrowser({ readAbort, state, close, save, pause, phaseMs = 30000 }) {
  const phaseEnd = Date.now() + phaseMs;
  while (true) {
    const current = await state();
    if (await readAbort() || current.closed || Date.now() >= current.deadline) {
      await close(); const final = await state(); await save(final); return final;
    }
    if (Date.now() >= phaseEnd) return { pending: true, elapsed: Date.now() - current.start };
    await pause(500);
  }
}
