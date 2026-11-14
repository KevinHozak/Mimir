type PollTimer = ReturnType<typeof setTimeout> | number;
/** Serial, visible-tab polling. Visibility changes never bypass the interval. */
export function startObserverPolling(options: {
  poll: (signal: AbortSignal) => Promise<void>;
  onError: () => void;
  intervalMs: number;
  deadlineMs?: number;
  onEnded?: () => void;
  visible: () => boolean;
  subscribeVisibility: (changed: () => void) => () => void;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => PollTimer;
  cancel?: (timer: PollTimer) => void;
}) {
  if (!Number.isSafeInteger(options.intervalMs) || options.intervalMs < 1 || (options.deadlineMs !== undefined && !Number.isFinite(options.deadlineMs))) throw new Error("Invalid polling interval or deadline");
  const now = options.now ?? Date.now, schedule = options.schedule ?? setTimeout, cancel = options.cancel ?? clearTimeout;
  let stopped = false, busy = false, nextAt = 0;
  let timer: PollTimer | undefined, controller: AbortController | undefined;
  const clear = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  const expired = () => {
    if (options.deadlineMs === undefined || now() < options.deadlineMs) return false;
    if (!stopped) { stopped = true; clear(); controller?.abort(); options.onEnded?.(); }
    return true;
  };
  const queue = () => {
    clear();
    if (!stopped && !expired() && !busy && options.visible()) timer = schedule(() => { timer = undefined; void run(); }, Math.max(0, Math.min(nextAt, options.deadlineMs ?? Infinity) - now()));
  };
  const run = async () => {
    if (stopped || expired() || busy || !options.visible()) return;
    busy = true;
    controller = new AbortController();
    try { await options.poll(controller.signal); }
    catch { if (!stopped && !controller.signal.aborted) options.onError(); }
    finally { busy = false; controller = undefined; nextAt = now() + options.intervalMs; queue(); }
  };
  const unsubscribe = options.subscribeVisibility(() => { if (!options.visible()) { clear(); controller?.abort(); } else queue(); });
  queue();
  return { stop() { stopped = true; clear(); controller?.abort(); unsubscribe(); } };
}
