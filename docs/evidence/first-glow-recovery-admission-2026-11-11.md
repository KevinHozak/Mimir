# Recovery waiting and admission — local verification, 2026-11-11

Implemented locally; no commit, push, deployment, live-history upgrade or provider calls. [Structured results](first-glow-recovery-admission-2026-11-11.json). This follows the [ordering/admission diagnosis](first-glow-preparation-ordering-diagnosis-2026-11-10.md).

## Implemented behavior

Fresh callers can explicitly enable `{ recoveryAdmission: true }`, persisted as `recovery-admission-v1` in `firstGlowState.recoveryAdmission`. Default creation/server startup/reset remain unchanged. Initialization refuses recorded histories; missing policy retains the previous transition behavior. Unknown versions and malformed queue records reject during validation/normalization.

Recovery consumers share one admission rule, including ordinary charge/rest consumers and pattern readers. At most one waiting request exists per Spark. Requests retain waiting pulse while the recovery activity remains the same; stable Spark ID breaks ties. Admission removes the request, so a returning consumer joins anew. Canceled or changed activities remove obsolete requests. Valid traveler reservations and partial movement are retained.

Admission runs before movement. It checks actual free contacts/routes, recomputes preparation against preceding admissions, and installs the immediate reservation and route together. It can choose a different feasible free first contact instead of losing a previously selected contact at dispatch. Contacts released later in that pulse can be admitted next pulse. No later contact, future release time or source stock is promised.

With preparation enabled, busy recovery contacts are omitted only from a conditional resource-feasibility forecast. Actual occupancy remains authoritative for admission. Real source stock, route costs, arrival budgets, bounded draw/rest search, the 64-action bound and immediate charge/rest ordering remain intact. A feasible occupied stop waits with its goal and unspent use/retry. Infeasibility and stale patterns still defer preparation; they do not deny independent ordinary recovery. Cache departure retains its actual funded-dispatch gate and once-only retry authorization.

## Verification

- Full four-package build passed. Vite reports its existing large-chunk advisory.
- Root world-data/engine suite: **161 tests, zero failures**, including 14 new admission checks.
- Focused checks cover stable ties, returning-consumer fairness under sustained contention, one owner per contact, no early charge, valid traveler preservation, cancellation, malformed/unknown policy, refill after empty source, conditional future recovery, ordinary-consumer access, alternate-contact replanning, actual draw/rest followed by funded probe, one retry, stale navigation, bounded preparation and total charge accounting.
- Server normalization/SQLite suite: **7 checks passed**, including queue age/ownership persistence and queued preparation with an unspent retry. Controlled direct and restarted transitions remain equal.
- **34 absent-policy checkpoints** matched the captured pre-change engine byte-for-byte over five further pulses each. This includes ordinary histories from previous policy stages and the four controlled route-pattern histories. No checkpoint was opted into the new policy.
- All **six final ordinary states** passed SQLite serialization/normalization and five further equal continuation pulses. Final reservations have valid traveling/interacting owners and no duplicate contacts.
- Isolated HTTP server partial-travel restart, WAL snapshot backup, bundle-inclusive restore/corruption rejection and hash-qualified asset serving passed. Initial sandbox attempts could not fetch loopback (`connect EACCES`); the first backup attempt also hit a Windows database cleanup lock. Server startup was reproduced independently, then the affected isolated HTTP checks passed outside the sandbox. These initial harness failures are not counted as application assertions.

Logs and harnesses: `.tmp/recovery-admission/`. Compatibility baseline is a captured pre-change compiled engine; its dependencies and world bundles were unchanged. All mutable test databases are isolated under `.tmp/` or in-memory SQLite. No live database was used.

## Ordinary fresh histories

Final source was run on the same current/review immutable bundles, seed 2, populations 1/8/12, 360 pulses, with route patterns, completion, retry, preparation, sharing continuation and recovery admission enabled from creation. No actor resources, spawns or decisions were patched. Network fetch was blocked. Raw final histories: `.tmp/route-patterns-admission-ordinary-gvYVwb/`. A preliminary six-run pass has identical final state hashes.

Current bundle: `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`.

Review bundle: `sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca`.

| Bundle / population | Draw events | Wait events | Queued at cutoff | Cache decisions | Patterns / guided uses |
| --- | ---: | ---: | ---: | ---: | --- |
| Current / 1 | 15 | 0 | 0 | 1 | 0 / 0 |
| Current / 8 | 146 | 273 | 3 | 8 | 0 / 0 |
| Current / 12 | 173 | 1,586 | 4 | 7 | 0 / 0 |
| Review / 1 | 15 | 0 | 0 | 1 | 0 / 0 |
| Review / 8 | 139 | 378 | 4 | 8 | 0 / 0 |
| Review / 12 | 170 | 1,428 | 1 | 9 | 0 / 0 |

Every recorded cache decision in these runs conserves. No patterns means no natural encounters, preparation goals, guided uses or retries by pulse 360. No stranded or duplicate final reservations were found. Wait-event counts include all recorded waits, not solely queue events or unique waiting Sparks.

This is a changed fresh-history trajectory, not proof that the previous five goals completed. Admission applies to recovery throughout the history, so the earlier pattern-creating journey does not recur. The controlled fixture demonstrates the mechanism and preserves real resource/retry gates; these ordinary histories do not exercise natural pattern preparation. They therefore do not establish natural useful reuse or human sustained-interest acceptance.

## Remaining boundary

Keep S001 open. The next useful investigation is natural cache-to-pattern formation under ordinary recovery admission: all observed cache decisions conserved before any pattern could be shared. Do not weaken resource gates or tune these seeds to manufacture a pattern. The previously diagnosed rest-first restriction remains unchanged and can be reconsidered when a real preparation history exercises it. Queuing cannot guarantee future access, sufficient stock or a bounded feasible trip.

## Source

- `packages/engine/src/first-glow-recovery-admission.ts`: fresh policy, queue validation, conditional forecast and atomic admission.
- `packages/engine/src/first-glow-pattern-preparation.ts`: conditional itinerary search and available-first contact preference under the new policy.
- `packages/engine/src/structured.ts` and `first-glow-actions.ts`: cloned persistence, cancellation, admission before physical movement, and ordinary recovery selection.
- `packages/engine/src/index.ts`: explicit fresh constructor option and exports.
- Engine admission tests and server state tests: contention, accounting, limits and restart regressions.
