# MIM-S008 harness preparation and read-only readiness — 2026-10-24

## Local implementation

The standalone TypeScript harness imports the production read-only observer transport. Admission requires explicit approval, fixed Mimir Hosting origin, fresh evidence, deployed-code/telemetry/recovery gates, at most one existing observer, and an all-in additional upper bound that fits the retained USD 0.1469663581 allocation under USD 0.15. Negative/nonfinite costs, a changed ceiling, released prior reserves or a third observer fail closed.

Preparation captures the initial credential only in memory and cannot send observer requests. It expires within 75 minutes. The real Firebase adapter creates a separate named app with in-memory persistence using supported SDK methods, observes token changes, and disposes only its own app. No SDK sign-in or genuine token acquisition was performed in this task. Constructor/SDK wiring is typechecked; genuine popup/domain behavior is a live prerequisite, not synthetic proof.

Forced and automatic cases are separately labeled. Forced mode requires actual expiry plus verifier allowance, sends the captured token once, checks the bridge's exact fixed denial body, then uses the real transport's one forced-refresh retry. Automatic mode observes SDK notifications and rotates one owned stream. Reports expose only fixed counters/statuses/booleans; no token, claims, world payloads or arbitrary exceptions. Harness transport observations never set hosted UI or direct process cleanup verified.

The independent Node watchdog owns a newly launched task browser, shortens its preparation lease to at most 120 seconds before observer work, and cannot rearm it. It survives child-page navigation and terminates the owned browser on IPC parent loss or timeout. The caller must await `armObserverWindow()` acknowledgement before the first protected request and always use the supervisor; the browser module alone is not driver-death protection. No diagnostic endpoint or authentication backdoor was added to the hosted app.

Eight local harness tests and two supervisor tests passed, plus web TypeScript. The Chromium fixture uses a blank local page, same-origin proxy and synthetic credentials; no Firebase or hosted observer requests are made by these tests. It proved real stream cancellation through the guard, rotation with no forced refresh, and zero fixture streams after navigation. This does not prove deployed UI state continuity, duplicate-event behavior against live history, real SDK expiry timing, or real Firebase acceptance. Existing local observer tests cover state retention separately.

Initial development runs exposed a timer binding error, a missing abort linkage and test-page/loopback setup problems. They were repaired and the targeted suites rerun; no failed development result is presented as passing. The new suites are included in the full local verifier. Its final result is reported separately rather than asserted here before execution.

## Fresh read-only hosted checks

At 19:11 UTC the public static index referenced JavaScript `/assets/index-n99ipfKB.js`, SHA-256 `432f7f5ba27b270280373a3bd745dff1b1d3a591965795c541475ecd8150a3dd`, 1,830,475 bytes. Current local output references a different JS asset; exact frontend parity is not verified. CSS `/assets/index-Dkj6arcL.css` matched local bytes. The check retrieved only the index and two static assets and never executed the app or opened a stream.

Operator GETs at 19:11 UTC found the private VM RUNNING without an external address, original bridge revision `mimir-observer-bridge-p5-h2b-596163` at 100% traffic, and pinned image digest `sha256:9b50923271ad57435d45ccbcab850b7d1bcb250519a3a3636209c94e19124d2a`. Configuration metadata is not fresh per-process zero telemetry, paused-world attestation or backup health. No SSH/application probes, clients, Firebase sign-ins, IAM changes, revision changes, deployment, pulses or provider calls occurred.

Readiness is **BLOCKED**, with no run submitted. Billing attribution remains unresolved, so USD 0.0030336419 is unreleased headroom, not a new allowance. No defensible all-in cost bound was established for token-aging preparation plus both trials and cleanup. Static/metadata reads are the only hosted checks in this task; their marginal charges are not asserted zero and must be included in the unresolved allocation before any live admission. See [approval packet](../hosted-token-refresh-approval-packet.md) and [structured record](hosted-refresh-preparation-2026-10-24.json).
