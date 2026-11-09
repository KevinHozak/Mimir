import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

let worker, timer, finished = false;
function stop(reason) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  if (worker && worker.exitCode === null && worker.signalCode === null) {
    worker.once("exit", () => finish(reason));
    worker.kill("SIGKILL");
  } else finish(reason);
}
function finish(reason) {
  if (process.connected) process.send({ type: "closed", reason }, () => process.disconnect());
}
process.on("disconnect", () => stop("parent-loss"));
process.on("message", message => {
  if (message.type === "stop") { stop("operator-stop"); return; }
  if (message.type !== "start" || worker || finished) return;
  if (!(message.timeoutMs > 0 && message.timeoutMs <= 10000)) { stop("invalid-deadline"); return; }
  const remaining = message.deadlineAt - Date.now();
  if (!(remaining > 0 && remaining <= 10000)) { stop("deadline"); return; }
  timer = setTimeout(() => stop("deadline"), remaining);
  worker = fork(fileURLToPath(new URL("./model-study-transport-worker.mjs", import.meta.url)), [], {
    stdio: ["ignore", "ignore", "ignore", "ipc"], env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot }
  });
  worker.on("error", () => stop("worker-error"));
  worker.on("message", result => {
    if (result.type === "started") { if (process.connected) process.send({ type: "started", pid: worker.pid }); return; }
    if (!finished && process.connected) process.send(result);
    stop("completed");
  });
  worker.on("exit", () => { if (!finished) stop("worker-exit"); });
  if (process.connected) process.send({ type: "worker", pid: worker.pid });
  worker.send({ ...message.request, deadlineAt: message.deadlineAt });
});
