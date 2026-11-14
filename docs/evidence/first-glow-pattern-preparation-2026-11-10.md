# Versioned pattern-trip preparation - local verification, 2026-11-10

## Implemented policy and compatibility

Fresh engine creation explicitly passes patternPreparation:true and persists firstGlowState.patternPreparation.version = pattern-resource-preparation-v1. Retry/routes initialize if needed; completion opt-in remains separate. Existing/default creation, server startup/reset and saved histories are not upgraded. Missing preparation policy retains its previous transitions/accounting; unknown versions fail validation/normalization. Initialization rejects progressed/recorded histories.

A persisted per-Spark goal references the physically encountered pattern. It can charge, rest, become ready, defer, or record committed use. The planner uses shared deterministic candidates and projects exact movement-event pulses under the existing two-unit movement budget, including slow edges with non-moving pulses, deficits, readiness strain and arrival/probe effects. It admits guided departure only with projected pre-probe charge >=3, zero deficit, readiness >=75 and a currently reachable shard route. Arrival requirements remain authoritative if conditions later change.

Planning considers direct travel and bounded one/two-stop charge/rest itineraries using current stock and contacts, at most 32 charge draws or 11 rests per stop. Actual draw/rest effects are executed by the original authoritative engine; no resources or readiness are assigned by the planner. The eleventh rest covers arrival strain when preparing from zero readiness to the cap. A goal is bounded to 64 recorded recovery actions per Spark/pattern; affordable direct departure can still be admitted if resources later qualify. Deferral can be reconsidered when resources, navigation, reservations or source stock change; an unchanged deferred situation is memoized. No future gifts/refills or readiness above 100 are assumed.

Preparation pins only the immediate recovery or cache contact, never holds a cache slot while charging/resting, and rechecks availability and actual route resources at dispatch. Selection is provisional: use and one-retry consumption occur per actor only after the actual contact/path and funding pass, before physical movement (including same-pulse arrival). A changed budget/contact or substituted action leaves the retry unspent. Stale/unavailable patterns defer the goal. Objective preparation records retain encounter, actual recovery and committed use references across WorldEvent/SQLite serialization.

## Verification

- Full four-package build passed, with the existing Vite chunk warning.
- Root npm test: 139 reported world-data/engine tests, zero failures. Eleven preparation checks cover funded actual arrival/probe, repeated real draws/rests, immutable inputs, unspent retry during preparation, exact/one-short thresholds, unknown policies/retrofit/malformed evidence, serialization, same-cell and slow-edge forecasts versus real debits, unavailable recovery contacts, readiness-cap impossibility, the 64-action bound, resource/contact changes before commitment, navigation changes, and the eleventh-rest boundary. Some checks exercise multiple cases in one test.
- Four server state checks passed, including real preparation progress and an unspent allowance through an in-memory SQLite checkpoint, normalization, continued recovery and later committed probe. Unknown preparation versions reject. Chronicle event persistence checks passed.
- Twenty-two saved older checkpoints (ordinary, controlled-route, completion-policy and retry-policy cases) continued byte-for-byte identically to a preserved pre-preparation engine for five pulses each. This is sampled continuation evidence, not exhaustive equivalence. Existing recordings were not rewritten.
- All six final ordinary pulse-360 checkpoints passed current validation and in-memory SQLite normalization/restart continuation equality for five further pulses.

Logs, controlled fixtures and disposable outputs are under .tmp/preparation-fix/. The small preparation test world is a declared unit fixture with its own recomputed bundle identity; no authored or generated production bundle was edited.

## Ordinary fresh histories

Same six unmodified fresh starts: fixed seed 2, 360 pulses, 1/8/12 Sparks across the server-default and earlier review bundles, route patterns + completion + retry + preparation explicitly enabled. Fetch is blocked, no provider calls. These are bounded deterministic scenarios, not independent random samples.

| Bundle | Sparks | Patterns | Goals | Preparation actions | Uses | Retries committed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 1 | 0 | 0 | 0 | 0 | 0 |
| current | 8 | 0 | 0 | 0 | 0 | 0 |
| current | 12 | 1 | 3 | 9 | 0 | 0 |
| review | 1 | 0 | 0 | 0 | 0 | 0 |
| review | 8 | 0 | 0 | 0 | 0 | 0 |
| review | 12 | 0 | 0 | 0 | 0 | 0 |

Only current/12 creates a pattern (Spark 1, pulse 122), as before. Its three readers now retain preparation goals and unspent allowances instead of undertaking the three underfunded journeys seen with retry policy alone. Spark 6 records five charging actions, Spark 9 three, and Spark 2 one. All nine are actual charge-draw actions; no shelter recovery occurs within those goal-action records. At pulse 360 all three goals are deferred: Spark 6 has no currently feasible charge/rest itinerary; Spark 9 and Spark 2 have no feasible itinerary with their direct route exceeding the readiness cap. Thirty-five objective preparation records expose progress and changing deferral reasons. No uses or retries are committed, and no guided arrival/probe is claimed.

Current refers to bundle sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e; review refers to sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca. Current recovery-slot access and itinerary feasibility remain practical constraints. The controlled fixture proves that an affordable preparation sequence can lead to a real probe; the ordinary matrix does not establish natural successful reuse or sustained human interest. S001 stays open; no new human acceptance is inferred.

Reproduce after building: node scripts/first-glow-route-patterns-ordinary-review.mjs --preparation. Final raw data: .tmp/route-patterns-preparation-ordinary-CNZKa0. [Machine-readable goals/events, recovery totals, source hashes, restart and compatibility results](first-glow-pattern-preparation-2026-11-10.json). No provider calls, commit, push, PR or deployment.
