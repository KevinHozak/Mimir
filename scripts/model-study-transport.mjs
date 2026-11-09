import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

export async function studyTransport(request, { signal, timeoutMs = 10000, onWorker = () => {}, onWorkerReady = () => {} } = {}) {
  if (signal?.aborted) throw new Error("transport cancelled");
  if (!(timeoutMs > 0 && timeoutMs <= 10000)) throw new Error("invalid deadline");
  const deadlineAt = Date.now() + timeoutMs;
  const watchdog = fork(fileURLToPath(new URL("./model-study-watchdog.mjs", import.meta.url)), [], {
    stdio: ["ignore", "ignore", "ignore", "ipc"], env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot }
  });
  let result, failed = false;
  const stop = () => { if (watchdog.connected) watchdog.send({ type: "stop" }); };
  signal?.addEventListener("abort", stop, { once: true });
  try {
    return await new Promise((resolve, reject) => {
      watchdog.on("error", () => reject(new Error("watchdog failed")));
      watchdog.on("message", message => {
        if (message.type === "worker") onWorker(message.pid);
        if (message.type === "started") onWorkerReady(message.pid);
        if (message.type === "result") result = message;
        if (message.type === "failure") failed = true;
      });
      // Wait for watchdog exit, which follows the owned worker's verified exit.
      watchdog.on("exit", () => {
        if (!failed && result && !signal?.aborted) resolve(result);
        else reject(new Error("transport stopped or failed"));
      });
      watchdog.send({ type: "start", timeoutMs, deadlineAt, request });
    });
  } finally { signal?.removeEventListener("abort", stop); }
}
