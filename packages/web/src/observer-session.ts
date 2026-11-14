type TokenProvider = (forceRefresh?: boolean) => Promise<string | undefined> | undefined;

export function createObserverFetch(getToken: TokenProvider, request: typeof fetch = fetch) {
  let refreshing: Promise<string | undefined> | undefined;
  return async (url: string, init: RequestInit = {}, initial = getToken()): Promise<Response> => {
    const send = async (token: string | undefined) => {
      init.signal?.throwIfAborted();
      const headers = new Headers(init.headers);
      if (token) headers.set("authorization", `Bearer ${token}`);
      return request(url, { ...init, headers });
    };
    const response = await send(await initial);
    if (response.status !== 401 || !["GET", "HEAD"].includes((init.method ?? "GET").toUpperCase())) return response;
    await response.body?.cancel();
    init.signal?.throwIfAborted();
    refreshing ??= Promise.resolve().then(() => getToken(true)).finally(() => { refreshing = undefined; });
    return send(await refreshing);
  };
}

/** Owns one stream at a time; every exit (including clean EOF) reconnects. */
export function startObserverStream(options: {
  url: string;
  request: ReturnType<typeof createObserverFetch>;
  onMessage: (data: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  retryMs?: number;
}) {
  let stopped = false;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rotate = false;
  let connecting = false;
  const scheduleReconnect = (drain = false) => {
    clearTimeout(timer);
    if (stopped) return;
    // Abort/cancel resolves before the peer necessarily observes socket closure.
    // Rotation uses the same drain interval as reconnect instead of a zero-delay race.
    timer = setTimeout(() => { timer = undefined; void connect(); }, Math.max(drain ? 100 : 0, options.retryMs ?? 3000));
  };
  const connect = async () => {
    if (stopped || connecting) return;
    connecting = true;
    const current = new AbortController();
    controller = current;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await options.request(options.url, { signal: current.signal });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error(`Observer stream rejected (${response.status})`);
      }
      reader = response.body.getReader();
      current.signal.throwIfAborted();
      options.onConnected?.();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!current.signal.aborted) {
        const next = await reader.read();
        if (next.done) break;
        current.signal.throwIfAborted();
        buffer += decoder.decode(next.value, { stream: true });
        const messages = buffer.split(/\r?\n\r?\n/);
        buffer = messages.pop() ?? "";
        for (const message of messages) {
          current.signal.throwIfAborted();
          const data = message.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).replace(/^ /, "")).join("\n");
          if (data) options.onMessage(data);
        }
      }
    } catch {
      // Network, refresh and decoding failures share a bounded retry path.
    } finally {
      await reader?.cancel().catch(() => undefined);
      reader?.releaseLock();
      controller = undefined;
      connecting = false;
      if (!stopped) {
        if (!rotate) options.onDisconnected?.();
        const drain = Boolean(reader) || rotate;
        rotate = false;
        scheduleReconnect(drain);
      }
    }
  };
  void connect();
  const stop = () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  return {
    stop,
    refresh() {
      if (stopped) return;
      if (controller) { rotate = true; controller.abort(); }
      else scheduleReconnect(true);
    },
  };
}
