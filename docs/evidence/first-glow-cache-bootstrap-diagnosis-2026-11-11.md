# Initial cache-trip preparation diagnosis — 2026-11-11

Investigation and recommendation only. No gameplay implementation, provider calls, live database access, commits or publication. S001 remains open. Follows the [recovery admission review](first-glow-recovery-admission-2026-11-11.md). [Structured measurements](first-glow-cache-bootstrap-diagnosis-2026-11-11.json).

## Finding

The resource planner is downstream of the discovery it could help enable. Ordinary first-cache selection tests reachability after current-need priorities; it does not test projected probe resources or retain a preparation goal. `selectPatternPreparation` is called only when `knownRoutePattern` returns an encountered public pattern. Before the first public pattern exists, no Spark can enter that preparation path.

This is a bootstrap gap, not proof that patterns can never emerge: previous trajectories did create one. Under these six recovery-admission trajectories every cache visit conserves. The probe resolver also requires an available route fact; sufficient resources alone do not guarantee a probe.

All six exact pulse-360 state-hash comparisons passed. Of **34 arrivals**, **30 fail at least one resource gate** (28 charge/deficit failures; 17 readiness failures, overlapping). Four pass the resource gates but lack the route fact required by the resolver. These are first choices, not spent retries.

| Bundle / population | Arrivals | Resource failures | Funded conservations without a route fact |
| --- | ---: | ---: | ---: |
| Current / 1 | 1 | 1 | 0 |
| Current / 8 | 8 | 7 | 1 |
| Current / 12 | 7 | 7 | 0 |
| Review / 1 | 1 | 1 | 0 |
| Review / 8 | 8 | 6 | 2 |
| Review / 12 | 9 | 8 | 1 |

The other funded conservations are review/8 Spark 5 at 160 (5/0/79), review/8 Spark 7 at 224 (11/0/79), and review/12 Spark 10 at 164 (5/0/79). Post-pulse shard candidates are unavailable in three cases; review/12's contact becomes available later in its arrival pulse. The detailed reservation diagnostics establish the contact-occupancy mechanism; the resolver's predicate establishes the missing-fact gate in each funded first choice. End-of-pulse availability must not be substituted for availability at an earlier actor's choice.

## Measured single-Spark chain

Both bundles have the same first journey:

| Pulse | Actual decision or outcome | Charge / deficit / readiness |
| --- | --- | --- |
| 5 | First pool arrival draws 8; the accumulated deficit clears | 8 / 0 / 95 |
| 6 | Same-cell exploration completes and incurs its real activity cost | 7 / 0 / 94 |
| 7 | First cache departure, before that pulse's movement cost | 7 / 0 / 94 |
| 39 | At cache choice, before arrival movement accounting | 0 / 25 / 62 |
| 39 | After conservation and arrival movement accounting | 0 / 26 / 61 |
| 71 | Return pool arrival draws 8 | 8 / 49 / 29 |
| 78 | Repeated ordinary draws finally clear the return-trip deficit | 64 / 0 / 29 |
| 96 | Ordinary shelter recovery reaches 76 readiness | 51 / 0 / 76 |
| 97 | Selects mark-trace, rather than revisiting the conserved cache | 50 / 0 / 75 after movement |

The first cache leg costs 66 navigation units: 33 travel pulses with 32 prior moving pulses. The existing arrival check therefore requires at least **35 departure charge and 107 departure readiness**, with zero deficit. The readiness cap is 100; simply drawing more at that starting point cannot fund the direct leg. A shelter stop is necessary. Stock at departure was 40, so this was not an empty-source refusal. Ordinary selection stops seeking charge once carried charge is nonzero and deficit is zero; it resumes discretionary activity without budgeting that activity's journey. Its readiness threshold is generally 70 (or 90 under the social care preference), rather than the route-dependent 75-plus-travel requirement.

Recovery admission changes who gets an immediate recovery contact. It does not change those ordinary need thresholds, insert an expedition budget, or create a first-cache preparation goal. Changing pattern preparation's first-phase ordering alone cannot help a Spark with no known pattern: that function is never called for it.

## Separate route-fact gate

Current/8 Spark 8 reaches the cache at pulse 179 with **13 charge, zero deficit, 78 readiness** before the choice: all resource gates pass. It nevertheless conserves. Spark 7 holds the shard's sole `examine` contact on `tiled-104` both before and after the pulse and actually moves toward it. No shard candidate is available. In a diagnostic query that ignores reservations, the same cache position has a route to that contact costing 16 navigation units. This query changes no actual reservation and is not executable history.

`firstGlowCandidates` filters other Sparks' reservations before returning the route fact; `resolveWildCacheChoice` requires that fact. The generic conservation message attributes the choice to charge/readiness even in this case. Preserve this distinction in the diagnosis: initial resource preparation does not by itself guarantee shard availability at arrival, a completed pattern, or useful natural reuse.

Review/12 pulse 164 also confirms decision ordering: Spark 11 holds the sole contact at pulse start. Spark 10's funded conservation is recorded before Spark 11 completes shape-pattern and releases it later that same pulse. The post-pulse candidate is therefore available even though the resolver correctly saw no available contact when Spark 10 chose. This is ordinary sequential contact ownership, not a reason to evict the traveler or treat future availability as promised.

## Conditional preparation feasibility

A pure forecast from the actual current/1 pulse-6 state finds a bounded itinerary using only the 40 source charge already present:

- Four actual draws at `tiled-101` / `draw-south` (32 source charge).
- Travel to `tiled-102` / `rest-south` and rest twice. Projected shelter departure: 25 charge, zero deficit, 99 readiness.
- Travel to the cache in 21 pulses, with 20 prior moving pulses. Projected choice resources: **5 charge, zero deficit, 79 readiness**; after probe plus arrival movement: 3 charge, zero deficit, 76 readiness.

The forecast takes 40 pulses and six recovery actions, within the current preparation bounds. It follows actual moving-pulse accounting, including draw-arrival exemption from sustenance and rest-arrival movement strain. A separate call to the existing planner in a copied snapshot, with explicitly synthetic pattern/encounter metadata, selects charge preparation. Neither diagnostic copy was continued as a real history or used to claim natural success. Access and shard availability later in the journey are conditional; no future contact is reserved. The forecast establishes a feasible resource budget, not an implemented initial-trip planner or a completed probe.

## One focused recommendation

Add **fresh-versioned, bounded preparation for the first cache expedition, independent of public-pattern knowledge**. Persist the already selected exploration/cache target as an initial-expedition goal; use real charge/rest recovery and existing atomic admission to fund the actual cache route before committing departure. Recheck at dispatch and arrival. Defer unavailable or intrinsically infeasible itineraries. Preserve the current probe thresholds, source accounting, readiness cap, finite preparation actions, shard availability check, single initial choice and separate pattern-authorized retry rules. Do not invent a route fact, encounter or public pattern to enter the planner, and do not grant ordinary conserved trips a new retry.

Acceptance should include the deterministic unmodified single-Spark constructor, an actual funded initial probe and subsequent shard completion if available, contention and unavailable-shard deferral, absent-policy compatibility, and the same six ordinary 360-pulse histories. A larger population need not produce a pattern in every run. Natural later use that changes another Spark's journey and human sustained-interest review remain separate S001 gates. This recommendation has not been implemented.

## Verification and limits

The local offline harness replays unmodified fresh constructors with all six existing opt-ins, seed 2, current/review immutable bundles and populations 1/8/12. It checks exact JSON-state SHA-256 equality against the previously recorded pulse-360 states. The single-Spark cases additionally continue unchanged to pulse 720. No provider or network calls are permitted by the harness.

Waiting longer is not a substitute for initial preparation: both single-Spark continuations still have zero patterns/goals at 720 and retain their sole conserved choice. A conserved Spark cannot simply try again after recovering: the chooser excludes a prior cache choice, and the only authorized retry requires a later pattern encounter. Larger populations still include Sparks without a completed cache choice at 360, so these measurements do not establish that they can never create a pattern later. No all-population 720-pulse claim is made.

Disposable harness/results: `.tmp/cache-bootstrap-diagnosis.mjs`, `.tmp/cache-bootstrap-diagnosis.json`, `.tmp/cache-bootstrap-feasibility.json`, `.tmp/cache-bootstrap-shard.json`, `.tmp/cache-bootstrap-shard-release.json`. Raw prior histories: `.tmp/route-patterns-admission-ordinary-gvYVwb/`. No implementation changed, so this investigation uses replay, arithmetic/source inspection and documentation checks rather than claiming a fresh application test-suite run. JSON parsing, six replay assertions, summary totals, local document links, new-file whitespace and `git diff --check` passed.

Owning sources: `first-glow-actions.ts` autonomous priorities and preparation guard; `first-glow-pattern-preparation.ts` exact resource projection and bounds; `structured.ts` contact-filtered route candidates and arrival effects; `first-glow-cache-choice.ts` probe gates; `first-glow-route-patterns.ts` probe-plus-shard creation and later local encounters; `first-glow-recovery-admission.ts` actual contact admission.
