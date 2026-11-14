# Sharing-safe route continuation - local verification, 2026-11-10

## Implementation and compatibility

Fresh engine callers explicitly pass sharingRouteContinuation:true, persisting firstGlowState.sharingRouteContinuationVersion = sharing-route-continuation-v1. Missing marker keeps the earlier sharing/status behavior, including the historical stuck-route case; unknown versions reject, and initialization refuses progressed/recorded histories. Default creation, server startup/reset and earlier recordings are not upgraded. The policy is independent of the pattern/preparation flags; the ordinary harness enables the existing feature stack plus this new flag.

Sharing snapshots participant activities before the pause. After all transfers, each paused participant is restored once: a valid retained route is traveling, a valid reached contact is interacting with arrival effects still pending, and no retained plan returns to choosing. Validation checks object capability, exact owned reservation/slot, contact/start walkability, route endpoint/edges and pending movement cost. Same-revision routes preserve their cells and remaining cost. Navigation changes follow the existing authoritative replanning rule.

Canceled/invalid plans clear their destination, slot/cell, remaining route/cost and only their own reservations together. Other actors' legitimate reservations remain. Restoration also runs for zero-amount and aborted sharing attempts. It does not create a transfer or run an arrival action. Existing transfer, sustenance, readiness and retry/preparation accounting remain intact. A subsequent real sharing pause can still delay travel for that pulse; the route no longer becomes permanently non-executable afterward. New objective sharing-continuation events preserve actual share evidence when present, without inventing a transfer for aborted attempts.

## Verification

- Full four-package build passed with the usual Vite chunk warning.
- Root npm test: 147 reported world-data/engine tests, zero failures. Eight targeted checks cover actual route resumption/shelter release, unchanged untagged behavior, unknown/retrofit rejection, exact transfer/sustenance conservation, interacting-recipient arrival gating, partial edge progress, invalid/canceled/missing-reservation/bad-route cleanup, preservation of other owners' reservations, cell plans, navigation changes, aborted sharing and zero-amount deficit accounting. Several checks contain multiple cases.
- Five server state checks passed, including SQLite pause/restart continuation equality, release at the actual next shelter arrival, unknown-policy rejection, preservation of untagged state, and WorldEvent/SQLite share-evidence retention. Chronicle persistence checks passed.
- Twenty-eight older saved checkpoints across ordinary, controlled-route, completion, retry and preparation histories continued byte-for-byte identically to a preserved pre-continuation engine for five pulses each. This is sampled compatibility evidence, not exhaustive equivalence. No recording was rewritten.
- All six final ordinary pulse-360 states passed validation and in-memory SQLite normalization/restart continuation equality for five further pulses.

## Ordinary fresh-history rerun

Same six unmodified fresh starts, fixed seed 2, 360 pulses each, populations 1/8/12, server-default and earlier review bundles; existing pattern/completion/retry/preparation policies plus sharing-route continuation enabled. Fetch is blocked and no provider calls occur. These are bounded deterministic scenarios, not independent random samples.

Stuck reservations below mean an actor remains choosing with a retained object destination and unfinished route: the precise diagnosed sharing failure.

| Bundle | Sparks | Patterns | Encounters | Uses | Stuck reservations at 360 |
| --- | ---: | ---: | ---: | ---: | ---: |
| current | 1 | 0 | 0 | 0 | 0 |
| current | 8 | 0 | 0 | 0 | 0 |
| current | 12 | 1 | 6 | 0 | 0 |
| review | 1 | 0 | 0 | 0 | 0 |
| review | 8 | 0 | 0 | 0 | 0 |
| review | 12 | 0 | 0 | 0 | 0 |

In current/12, Spark 1 surveys at pulse 114 and completes the public pattern at 159 (formerly 122 in the earlier preparation-only recording). Readers encounter at 182/234/263/282/316/354: Sparks 9/5/2/6/7/10. All six retain unused pattern opportunities. There are no guided uses or committed retries by 360. Five preparation goals are deferred and Spark 10 is still charging. These are newly simulated histories; the earlier creation/encounter records were not relabeled.

The diagnosed stranded choosing/reservation state is absent at the final checkpoint in all six scenarios. Current/12 records 34 sharing-continuation events, and formerly frozen routes can finish and release their contacts. Increased encounters (six versus three in the prior bounded recording) do not establish net benefit, successful reuse or sustained human interest. Recovery itinerary feasibility and preparation ordering remain separate constraints; the preparation planner source hash matches the prior verified implementation exactly. No ordering change, new shelter, resource grant or relaxed probe requirement is included. S001 stays open.

Current bundle: sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e. Review bundle: sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca.

Reproduce after building: node scripts/first-glow-route-patterns-ordinary-review.mjs --sharing-continuation. [Machine-readable events, goals, source hashes, restart and compatibility results](first-glow-sharing-continuation-2026-11-10.json). Final raw data: .tmp/route-patterns-sharing-ordinary-h84pJh; logs and disposable verification artifacts: .tmp/sharing-continuation/. No provider calls, commit, push, PR or deployment.
