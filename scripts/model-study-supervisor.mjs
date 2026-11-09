import { fork } from "node:child_process";

// Only use a newly created, task-owned worker. No application/server process is targeted.
export function superviseStudyWorker(worker, { deadlineMs = 1_800_000 } = {}) {
  if (!(deadlineMs > 0 && deadlineMs <= 1_800_000)) throw new Error("invalid supervisor deadline");
  const child = fork(worker, [], { stdio: ["ignore", "ignore", "ignore", "ipc"], env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot } });
  let reason = "worker-exit";
  const stop = (why = "operator-stop") => {
    reason = why;
    child.kill("SIGKILL");
  };
  const timer = setTimeout(() => stop("deadline"), deadlineMs);
  const exited = new Promise((resolve, reject) => {
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", (code, signal) => { clearTimeout(timer); resolve({ code, signal, reason }); });
  });
  return { child, stop, exited };
}
