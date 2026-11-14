# Preparation ordering and recovery admission diagnosis — 2026-11-10

Investigation only. No gameplay implementation, policy activation, provider calls, or publication. [Machine-readable comparisons](first-glow-preparation-ordering-diagnosis-2026-11-10.json).

## Finding

Preparation ordering alone does not unblock the five deferred goals in the recorded ordinary history. Recovery-contact contention is the immediate cutoff constraint, and separate planning and dispatch allow multiple goals to select the same contact. There is also a latent ordering limitation, demonstrated only after optimistically removing reservations in a copy.

## Recorded history and method

Used the current-bundle, seed-2, population-12, 360-pulse history from the [sharing-continuation rerun](first-glow-sharing-continuation-2026-11-10.md), with all five opt-in policies enabled. Bundle: `sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e`. A full unmodified replay matched the recorded final state byte-for-byte under JSON serialization. Offline fetch guard remained enabled.

Compared the planner with its actual immediate charge/rest requirement against the planner allowed to consider both orders. Cleared memo signatures on diagnostic copies so comparisons recompute. Retained actual resources and reservations unless explicitly labeled free-contact copy. Earlier comparisons sample first and last three recorded deferral events per final deferred reader, filtered to actual eligible decision frames, producing 19 samples. These are not exhaustive comparisons at every pulse.

## Cutoff constraints

At pulse 360 all five readers are waiting without a destination or active intention. Source stock is 776. Each sees zero free charge contacts and two free shelter contacts.

| Spark | Carried charge | Deficit | Readiness | Required first phase | Actual contacts, either order |
| --- | ---: | ---: | ---: | --- | --- |
| 9 | 2 | 84 | 9 | charge | deferred |
| 2 | 17 | 0 | 49 | rest | deferred |
| 5 | 18 | 73 | 9 | charge | deferred |
| 6 | 15 | 56 | 52 | charge | deferred |
| 7 | 8 | 135 | 0 | charge | deferred |

The four charge contacts belong to valid travelers: Sparks 1/12/3/10 at draw-west/far/east/south, with 2/6/11/25 route cells remaining respectively. These are not the stranded choosing/reservation states fixed previously. Removing their reservations from a diagnostic copy is not a valid repair.

With contacts optimistically freed, current ordering permits charge preparation for 9/5/6/7 but still defers Spark 2. Allowing both orders in that same optimistic copy permits charge preparation for all five. Thus Spark 2 has a latent rest-first limitation: charge→rest→cache can be forecast feasible while rest-first cannot. Actual access must still be acquired and resources revalidated; this copy proves neither successful travel nor a safe future release time.

## Earlier decision evidence

Across 19 sampled actual decision frames, relaxing ordering changes zero selected actions. Some frames have both recovery types available yet neither ordering yields a feasible full bounded itinerary. There are genuine budget constraints as well as contact constraints.

At pulse 355, diagnostic calls with actual reservations select `tiled-101/draw-south` for all four of Sparks 9/5/6/7, under both ordering modes. Actual events then report “selected preparation or cache contact is no longer available” for all four; Spark 10 records charge preparation. The source selects activities before physical dispatch, pins a contact per goal, then dispatches actors in stable ID order and filters to the pinned contact. This explains a planning-to-dispatch conflict: independent forecasts are not exclusive admissions. It does not prove that every deferral is caused by this conflict or that removing it guarantees a cache probe.

Across eligible decisions, charge access is sometimes free (27/98 for Spark 9, 19/55 for 2, 18/60 for 5, 15/51 for 6, 7/19 for 7). A draw also occurs later in some pulses whose initial planning snapshot has no free charge slot. Temporary occupancy and pulse ordering therefore matter; source depletion does not explain the cutoff.

## Focused recommendation: versioned recovery admission

Implement deterministic waiting and atomic admission for immediate recovery contacts before changing preparation order:

- Persist one bounded recovery request per Spark, with stable waiting age and Spark-ID tie-breaking. Apply arbitration consistently to competing recovery consumers; pattern knowledge should not itself confer priority.
- Preserve legitimate travelers and reservations. Admit at most one owner per free contact, using the actual selected path and rechecked resource budget. Prevent separate goals from independently pinning the same available contact.
- Represent temporary contact unavailability as waiting for access, distinct from a geometrically or financially infeasible itinerary. Future occupied stops must not be treated as a guarantee of access or assigned invented release times. Reserve only the immediate admitted contact.
- Preserve the goal, real recovery-action limits, and unspent pattern use/retry while queued. Revalidate before departure and every subsequent preparation leg. Keep source transfers, arrival gates, thresholds, and movement accounting unchanged.
- Use an explicit fresh-history policy version; absent-policy histories retain current behavior. Reject unknown versions and validate persisted requests, cancellation, and reservation ownership.

Verify deterministic competing admission, sustained contention and eventual service when contacts release, no double ownership, interrupted/cancelled request cleanup, unchanged charge accounting, retry preservation, and SQLite restart equivalence. Then rerun the same six ordinary histories and compare waits, actual preparation actions, funded departures and arrival outcomes. This proposal does not promise progress where no bounded feasible itinerary exists.

After that rerun, address the demonstrated rest-first limitation only if still relevant: treat immediate need as a preference and allow the alternative first phase only when a complete bounded itinerary passes existing arrival budgets. Do not simply weaken recovery thresholds or clear reservations.

## Source pointers

- `packages/engine/src/first-glow-pattern-preparation.ts`: immediate-phase filter, bounded itinerary search and contact pinning.
- `packages/engine/src/first-glow-actions.ts`: planning before structured advancement and current-needs priority.
- `packages/engine/src/structured.ts`: ordered dispatch, pinned-contact revalidation and deferral.

Local reproducibility inputs/scripts are under `.tmp/preparation-ordering-investigation/`; durable comparison values are included in the companion JSON. No simulation test suite was needed for this evidence-only update; JSON parsing, comparison assertions, replay equality and whitespace checks were performed.
