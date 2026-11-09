// This worker owns exactly one request. It never retries or follows redirects.
import { validateStudyWire } from "./model-study-v4.mjs";
process.once("message", async message => {
  try {
    if (!(message.deadlineAt > Date.now())) throw new Error("expired request");
    if (message.mode === "synthetic") {
      globalThis.fetch = () => { throw new Error("network forbidden in synthetic worker"); };
      if (message.behavior === "hang") {
        await new Promise(() => process.send({ type: "started" }, () => { while (true) {} }));
      }
      if (message.behavior === "crash") process.exit(19);
      if (message.behavior === "error") throw new Error("synthetic failure");
      process.send({ type: "result", status: 200, body: message.response });
    } else if (message.mode === "live" && message.admitted === true) {
      validateStudyWire(message.endpoint, message.body, message.projectId);
      const response = await fetch(message.endpoint, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(Math.max(1, Math.ceil(message.deadlineAt - Date.now()))),
        headers: { "content-type": "application/json", authorization: message.authorization },
        body: message.body
      });
      if (!response.ok) throw new Error("provider rejection");
      const reader = response.body.getReader();
      const chunks = []; let length = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 65536) { await reader.cancel(); throw new Error("oversized response"); }
        chunks.push(Buffer.from(value));
      }
      process.send({ type: "result", status: response.status, body: Buffer.concat(chunks).toString("utf8") });
    } else throw new Error("mode denied");
  } catch { process.send?.({ type: "failure" }); }
  finally { process.disconnect?.(); }
});
process.on("disconnect", () => process.exit(0));
