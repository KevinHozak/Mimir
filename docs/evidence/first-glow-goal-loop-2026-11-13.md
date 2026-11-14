# First complete Spark goal loop — local foundation, 2026-11-13

**Result:** two controlled Sparks retained an explore/meet/mark goal, traveled independently to a contact site, met, and completed their marks at pulse **6**. Their encounter produced one retained two-turn conversation and a communicated memory. All steps reference physical events. This is an offline fake-provider result, not a running online world or evidence of model benefit.

[Structured result and source fingerprints](first-glow-goal-loop-2026-11-13.json). [Delivery story](../../issues/MIM-S018.md). [Online-world epic](../../issues/MIM-E003.md).

## Observed loop

| Pulse | Result |
| --- | --- |
| 1 | Each Spark selected the social goal from a bounded local context using `deterministic-goal-fixture`. |
| 2 | Each completed real exploration; step one advanced. |
| 3–4 | Sparks moved from distinct cells to independently owned contacts. Waiting did not count as a meeting. |
| 5 | `event-5-spark-1-meet-spark-2` recorded their physical encounter. Both participants paid activity costs once. Conversation/memory persisted. |
| 6 | `event-6-spark-1-mark-trace` and `event-6-spark-2-mark-trace` completed their respective goals. |

Raw checkpoints, events, ledgers and summaries are retained under `.tmp/goal-loop-review-kz2yPW/`. Reproduce with `npm run review:goal-loop`; it generates a new isolated directory and blocks network fetches. Goal summaries omit private proposal contexts and distinguish goal progress from completed outcomes.

## Implemented boundaries

- Fresh-only `spark-goal-loop-v1`; default startup and absent-policy histories remain unchanged. Existing cache-preparation controllers cannot be combined with it.
- Persist selected goal, source/provider, local context/hash, cited evidence, progress and terminal reason. Provider proposals cannot supply hidden evidence; asynchronous source changes reject stale results.
- Reflection admission and deterministic fallback precede goal execution. Continuation makes no provider calls. Adapter attempt counters are candidate-state metadata, not a durable spending ledger or a paid authorization.
- Actual charge need, urgent rest below 70, care rest below 90 and funded discretionary travel retain priority. Goals never grant resources, teleport, steal another contact or invent a companion.
- At most 64 goal records, 64 dispatches per goal and a 128-pulse lifetime. A missing partner expires as interrupted and releases only the owner's plan. An active goal cannot be replaced by a separate single-activity intention.
- Normal server state normalization accepts and validates opted-in goal checkpoints. Closed/reopened SQLite and bundle-inclusive backup/restore preserve progress and twelve equal continuation pulses through completion, with no additional adapter calls.

## Verification on this local implementation

- Full four-package build passed; the existing Vite chunk-size advisory remains.
- Root world-data/engine suite: **227 passed**, including eight new goal checks.
- Focused goal run: **9 passed** (eight engine checks plus the server persistence/backup/restore check).
- Existing server state/AI runtime regressions: **16 passed**.
- Existing isolated server partial-travel restart equivalence passed with AI disabled.
- Issue relationships validate without unresolved references. Tracked diff and newly authored-file whitespace/link checks passed.

Logs remain under `.tmp/goal-loop-{build,root-tests,focused-tests,server-regressions}.log`; individual persistence fixtures retain their own isolated databases and restoration evidence. No browser/UI acceptance or full `verify:local` publication gate is claimed. No commit, push, deployment, audience expansion or paid-provider call occurred.

## Limits and next work

The controlled bundle derives from the retained `sha256-8e3425f460b2a53518e114b01a77a4937712cbd5028ab93427da34f6c3755601` bundle, adding a second same-cell contact to exercise the existing meeting semantics. It uses 100 initial charge per Spark, nearby starting cells and a one-pulse test reflection cadence. Its generated identity is `sha256-3d3e5cce3732762cb7bcb90e4eeb62ff3544bfd24b40646d8a532bce085a600c`. No tracked immutable bundle or authored map was edited.

The server-default bundle (`sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`) has only one light-mark contact, as does the fixture's original bundle. The context builder does not offer the social goal where the geometry lacks two contacts. This run therefore does **not** establish ordinary-world rendezvous or useful natural reuse. World authoring must provide meaningful opportunities under [S020](../../issues/MIM-S020.md), not merely enlarge the canvas.

[S019](../../issues/MIM-S019.md) still owns live server goal admission and integration with durable paid receipts, allocation, timeouts and stop controls. [S021](../../issues/MIM-S021.md) owns hosted qualification. [S022](../../issues/MIM-S022.md) owns summaries of ordinary online histories. Human finalization is deferred to [S023](../../issues/MIM-S023.md); guided comprehension is not independent usability or sustained-interest acceptance.
