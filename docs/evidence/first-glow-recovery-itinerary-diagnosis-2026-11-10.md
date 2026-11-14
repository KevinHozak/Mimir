# Recovery itinerary diagnosis - 2026-11-10

Investigation only. Read the final preparation-policy current/12 recording, replayed its unmodified fresh start through pulse 178, inspected selection/transfer/navigation code, and ran a declared unit sharing reproduction. All alternative-availability/order probes used in-memory copies; no live/saved reservation was removed. No gameplay code changes or provider calls. [Machine-readable evidence](first-glow-recovery-itinerary-diagnosis-2026-11-10.json); raw scripts/results: .tmp/recovery-itinerary-investigation.

## Confirmed reservation-lifecycle defect

At pulse 360 all five shelter contacts are reserved. Four owners are choosing with an unfinished route and retained destination/reservation, at cell (25,5), with one or two cells remaining. Their last movement was at pulses 106, 134, 147 and 177. A fifth shelter owner is actually traveling and must retain its valid reservation. A charge contact has the same stuck-owner defect.

Replay captures these exact transitions immediately after the owner receives shared charge: traveling -> choosing, same position, same unfinished destination/route, same reservation.

| Recipient | Freeze pulse | Retained contact | Remaining cells |
| --- | ---: | --- | ---: |
| spark-7 | 107 | tiled-102 / rest-south | 1 |
| spark-5 | 135 | tiled-102 / rest-far | 2 |
| spark-12 | 143 | tiled-101 / draw-east | 22 |
| spark-10 | 148 | tiled-102 / rest-east | 2 |
| spark-11 | 178 | tiled-107 / rest | 2 |

The transfer wrapper temporarily pauses recipients, restores their activity afterward, but unconditionally sets their status to choosing. Autonomous selection skips actors that already have a destinationObjectId. The structured transition only chooses a new route when no destination is held, and moves an existing route only when status is traveling. Consequently the retained route cannot advance or reach the action that would release its reservation. This is a confirmed state-machine gap, not merely an old reservation presumed invalid by age.

A controlled three-pulse reproduction starts a traveler one cell from shelter. Receiving charge leaves it choosing on each following pulse with its route/reservation intact and no movement or shelter arrival. Repeated sharing can pause travel temporarily by the existing action rules, but the current status reset makes the pause persistent after further sharing ends too.

## Consequences for the three goals

In a diagnostic copy, removing only reservations owned by these five stuck actors, while retaining the genuinely traveling owners, changes Spark 9 and Spark 2 from deferred to a planned shelter recovery. These are forecasts in an optimistic availability snapshot, not actual repaired-history outcomes. Shelter-to-cache routes require 94-96 starting readiness and 22-24 charge: possible within the 100 readiness cap if properly prepared. The direct-from-current-position cap reason therefore does not establish that all recovery itineraries are intrinsically impossible.

Spark 6 remains deferred under the same copied availability state. It has 29 charge and zero readiness; traveling to the available shelters spends 25-26 charge, leaving 3-4. The later cache leg needs 22-23 charge and 94-95 readiness. Rest-first cannot fund that leg; going to charge afterward can lose the readiness needed for the longer last leg. The planner's immediate-rest parameter excludes all charge-first itineraries when readiness is low. In the same diagnostic copy, permitting both existing preparation orders selects charge -> rest -> cache as a feasible forecast. No charge, rest or probe outcome was injected or claimed.

Thus there are two distinct constraints: the sharing status bug strands recovery contacts; Spark 6 also exposes an overly restrictive first-preparation-step filter at the final snapshot. Repairing sharing from a fresh start changes the earlier history, so the snapshot comparison does not prove the ordering restriction will remain the next ordinary-play blocker.

## Recommended focused next fix: sharing-safe route continuation

Introduce an explicit fresh-history compatibility policy for restoring execution after a sharing pause. Preserve a recipient's validated destination, reservation, remaining route/cost and activity, then restore the appropriate traveling/interacting state after the transfer. A recipient without a retained plan can return to choosing. If the plan has actually become invalid or canceled, clear the destination, route and reservation together through the authoritative cancellation path. Apply cleanup/restoration consistently to successful, zero-amount and aborted sharing. Keep co-presence, transfer accounting, movement costs, arrival gates, preparation budgeting and retry consumption unchanged.

Do not clear every reservation by age or release legitimate travelers' contacts. Do not retrofit the recorded histories. Verify a traveling recipient resumes when it is no longer paused for another real share, eventually reaches shelter and releases its slot; interacting recipients remain arrival-gated; canceled/invalid plans release coherently; sharing costs occur once; SQLite restart preserves the restored plan; older-policy continuation remains identical. Include the real freeze sites and the controlled one-cell reproduction in regression coverage, then rerun the unchanged ordinary matrix.

After that rerun, if the ordering restriction still blocks feasible recovery, make a separate narrow adjustment: retain immediate need safety and block unfunded cache departure, while allowing the planner to evaluate both bounded charge/rest orders for preparation. Compare the full projected itinerary rather than imposing rest as the only possible first stop. Keep all existing arrival thresholds and paid resource effects. No new shelters or economy rebalance is justified solely by these results.

S001 remains open. This investigation identifies technical causes and a focused next repair; it does not establish successful ordinary reuse or human sustained interest. No implementation, provider calls, commit or publication.
