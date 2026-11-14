# First cache expedition preparation — local, 2026-11-11

Implemented and verified locally; uncommitted and unpublished. No provider calls, live database access, history upgrades or deployment. [Structured measurements](first-glow-initial-cache-preparation-2026-11-11.json). Follows the [bootstrap diagnosis](first-glow-cache-bootstrap-diagnosis-2026-11-11.md). S001 remains open.

## Implemented boundary

Fresh engine callers can explicitly enable `{ initialCachePreparation: true }`, persisted as `initial-cache-preparation-v1`. Missing policy retains old transitions; unknown versions, malformed goals and orphan initial pins reject during validation/SQLite normalization. Initialization refuses recorded histories. Server defaults, startup and reset do not enable it. The initializer supplies validated completion, initial cache choice and recovery admission if absent; it does not require any public pattern or fabricate a pattern encounter, route fact, use or retry.

After exploration, a Spark can retain one reachable first-cache target and prepare through actual charge draws and shelter rests. Its separate goal binds exploration evidence, navigation revision, recovery actions, departure and outcome. It shares the deterministic resource search with pattern preparation: at most 32 draws or 11 rests per stop, with initial itineraries additionally restricted to the remaining allowance of **64 actual preparation actions**. Funded direct departure can still qualify without another recovery action. The existing immediate charge/rest preference for pattern readers is unchanged.

Immediate recovery contacts use the shared waiting-age/ID queue and atomic admission. Occupied future recovery stops are only conditional forecasts. Admission replans against preceding admissions; no legitimate traveler is evicted and no source stock or later contact is promised. Search reuses geometry only within one synchronous forecast, without caching resources, access or decisions across admissions/pulses. An unavailable cache/shard gate defers immediately rather than searching recovery sequences that cannot satisfy it. Independent current-need recovery remains possible when the expedition defers.

Actual first departure rechecks the selected pin/contact, navigation and projected arrival budget. It records one committed initial expedition, not successful arrival. Actual probe gates remain **at least 3 carried charge, zero deficit, at least 75 readiness and an available shard route fact**. Changed resources or shard occupancy can still cause conservation. Interruption spends the initial commitment without authorizing another initial departure; a separately learned public pattern retains its existing eligibility rules. A conservation retry still requires the existing later encounter and once-only pattern authorization. Real sharing pauses preserve valid initial travel and partial movement. No accounting thresholds or immutable bundles changed.

## Verification

- Full four-package build passed; Vite retains its existing large-chunk advisory.
- **172 root world-data/engine tests passed**, zero failures, including 11 new initial-preparation checks. Coverage includes an unmodified single-Spark constructor, real draws/rests, exact forecast/arrival resources, total charge accounting, changed departure resources/navigation/contacts, changed arrival resources/shard access, finite remaining action allowance, empty/refilled source, queue ownership/age, no early recovery, sharing continuation, interrupted/consumed initial commitment, later genuine pattern eligibility, malformed provenance/pins/policy and JSON continuation.
- **Eight server state/SQLite checks passed**, including real initial recovery and pending/finished departure snapshots at pulses 8/24/30/46, deterministic continuation and rejection of unknown/malformed policy. JSON-normalized semantic state is compared; property insertion order after serialization is not treated as a simulation difference.
- **40 absent-policy checkpoints** match the captured pre-change compiled engine byte-for-byte over five further pulses each. This includes the six recovery-admission final histories and 34 earlier policy-stage/control histories. None was opted into the new policy.
- All six final ordinary states passed SQLite normalization and five equal continuation pulses. Final contact ownership contains zero duplicate contacts or stranded non-traveling owners. Every initial goal remains within its actual-action bound.
- Supplied backup CLI created a **WAL snapshot and bundle-inclusive restore** containing charging, traveling and completed initial-expedition checkpoints at 8/30/46. All three restored checkpoints continued equally for five pulses; the manifest retains the current bundle and eight bundle files. These are isolated SQLite checkpoint/CLI checks, not a claim of a new HTTP or live deployment test.
- `git diff --check`, new-file whitespace, JSON/result consistency and documentation link checks passed.

Harnesses, logs, captured baseline and disposable databases are under `.tmp/initial-cache-preparation/` and `.tmp/initial-cache-backup-*`. Early test iterations exposed fixture setup/assertion problems (event collection, reflection assignments, serialization key order, and emergency sharing preempting the controlled reader); those were corrected before the final passing suite. Intermediate ordinary runs were stopped while eliminating redundant geometry work and adding interruption/pattern interaction coverage. Only the final six-run directory below is reported as final evidence.

## Ordinary fresh histories

Unmodified constructors, rules-only/offline, seed 2, populations 1/8/12, **360 pulses**, all seven existing/new opt-ins enabled from creation. No spawn, resource, actor decision or history was patched. Network fetch is forbidden by the harness.

Raw histories and summary: `.tmp/route-patterns-initial-preparation-ordinary-s8wAMU/`.

Current bundle: `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`.

Review bundle: `sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca`.

| Bundle / population | Cache probes / conservations | Public patterns | Later encounters | Guided uses / retries | Initial recovery actions |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current / 1 | 1 / 0 | 1 | 0 | 0 / 0 | 6 |
| Current / 8 | 5 / 1 | 5 | 15 | 0 / 0 | 39 |
| Current / 12 | 3 / 1 | 1 | 0 | 0 / 0 | 96 |
| Review / 1 | 1 / 0 | 1 | 0 | 0 / 0 | 6 |
| Review / 8 | 4 / 3 | 3 | 12 | 2 / 2 | 43 |
| Review / 12 | 2 / 1 | 0 | 0 | 0 / 0 | 120 |

Probes include one completed guided retry in review/8. Initial action totals are summed across Sparks, not per-Spark limits. There are **11 public patterns, 27 later encounters and two committed guided uses** across the six runs. One guided journey has a completed successful probe by 360; the other is still traveling. This replaces the preceding admission-only result of zero patterns and 34 conserved arrivals; it does not imply that every Spark or population now succeeds, or that earlier deferred goals were resumed/upgraded.

Both single-Spark runs perform four additional real draws and two rests, commit funded first departure at **26**, probe at **46**, and create their first public pattern through actual shard completion at **54**. No second Spark exists to encounter those patterns. Initial preparation no longer depends on first having learned one.

## Natural reuse with a completed outcome

In review/8, Spark 1 creates `route-pattern-spark-1-218`. Spark 4 previously conserved at the cache at **101**, physically encounters Spark 1's public pattern at **243**, then records **11 actual pattern-preparation actions** (five draws and six rests). Its funded once-only retry commits at **324**, and reaches the cache and **probes at 344**. The use explicitly references the later encounter and original conservation; its outcome references the actual survey. Recorded post-probe/arrival resources are 3 charge, zero deficit and 73 readiness, after paying probe and movement strain; the existing pre-probe gate still passes.

Spark 7 previously conserves at **193**, encounters the same artifact at **294**, performs five real recovery actions and commits its authorized retry at **348**. It is still traveling at the **360** cutoff. No arrival, probe or benefit is inferred for that pending journey.

This is an ordinary fresh-history example of another Spark's persistent artifact enabling a later journey and successful probe after prior conservation. It establishes a natural instance of the mechanism; it does not establish saved travel, social benefit, broad reliability or sustained human interest.

## Remaining S001 boundary

Current/8 has encounters but no guided use: the conserved reader's pattern preparation defers for no currently feasible itinerary. Review/8 also retains a deferred third pattern reader because the recorded target is unavailable at cutoff. Review/12 has two initial probes but **no completed public pattern**, and seven initial goals are deferred; readiness/itinerary constraints remain real. Current/12 likewise retains seven deferred initial goals. None exhausted the per-Spark 64-action allowance in these runs.

Keep S001 open for uneven natural completion/reuse across populations and the independent human sustained-interest review. Initial formation and one completed natural reuse are now observed locally. No further gameplay fix is selected or implemented by this evidence.

## Owning sources

- `packages/engine/src/first-glow-initial-cache-preparation.ts`: fresh policy, goal provenance, finite preparation, commitment, outcome and validation.
- `first-glow-pattern-preparation.ts`: shared unchanged resource math, remaining initial budget and per-forecast geometry reuse.
- `first-glow-actions.ts`, `structured.ts`, `first-glow-recovery-admission.ts`: autonomous selection, cloned state, atomic recovery admission, authoritative funded dispatch and objective event references.
- `packages/engine/src/index.ts`: fresh constructor option and WorldEvent evidence preservation.
- New engine checks and `packages/server/src/state.test.ts`: accounting, interaction and persistence regressions.
- `scripts/first-glow-route-patterns-ordinary-review.mjs --initial-cache-preparation`: the seven-opt-in ordinary run, leaving previous modes unchanged.
