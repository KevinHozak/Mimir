# Observer restart and backend-outage regression — 2026-10-23

Local MIM-S009 evidence. No hosted disruption, deployment, traffic change, credential setup or live outage acceptance was performed.

`packages/web/src/observer-outage.test.ts` creates an isolated archived First Glow database at pulses 0/1/2, a real backend process, a child process using the production observer bridge, a Vite browser host and an independent protected archive fixture server. Synthetic authentication is confined to a loopback-only IPC child fixture and browser module replacement; the production Firebase verifier is unchanged.

The browser observes a SIGKILL of the bridge process, reconnects to a new process on the same port, and retains its rendered outcomes and selected zoom without duplicate event IDs. The backend process is then stopped. The bridge returns its fixed 502 unavailable response to approved reads and fixed 401 rejection without credentials. Cold, uncached archive pages render and step through verified checkpoints on desktop/mobile with zero simulation API requests; missing authentication and corrupt chunk bytes fail closed. The original live page reconnects after restarting the backend against the same database, with identical persisted state and the scheduler still paused. Final bridge counters return to zero; telemetry is checked for sensitive fixture fields and a two-stream ceiling.

The first outage run exposed two `/api/reflection` requests from the explanation panel during archive rendering. The shared panel fetched current live reflection data even in historical views. It now renders recorded explanations only; the live observer renders its existing authenticated reflection projection separately and only in live mode. The targeted outage regression passed after this repair. The full local verifier includes this regression through the hosted-auth-boundary script.

Commands: `npm run test:hosted-auth-boundary --workspace @mimir/web`, `npm run verify:local`.

These synthetic tests do not prove genuine Firebase authorization, Cloud Run in-flight container death, VM stop/start latency or deployed archive availability. The [live rehearsal proposal](../hosted-outage-rehearsal-plan.md) preserves those distinctions, the two-observer/180-second boundary and an approval gate before any disruption.
