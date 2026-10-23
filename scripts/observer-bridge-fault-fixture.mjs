// Child-process fixture only. The production CLI retains genuine Firebase auth.
import { createObserverBridgeServer } from "./observer-bridge.mjs";

if (!process.send) throw new Error("fault fixture requires a parent IPC channel");
const [port, upstreamOrigin, hostedOrigin] = process.argv.slice(2);
for (const origin of [upstreamOrigin, hostedOrigin]) {
  if (new URL(origin).hostname !== "127.0.0.1") throw new Error("fixture is loopback only");
}
const server = createObserverBridgeServer({
  upstreamOrigin, hostedOrigin, streamMaxMs: 30000,
  verifyObserverToken: async value => value === "Bearer outage-fixture",
  onStreamTelemetry: record => process.send?.(record),
});
server.listen(Number(port), "127.0.0.1", () => process.send({ event: "ready", ...server.observerStreamSnapshot() }));
