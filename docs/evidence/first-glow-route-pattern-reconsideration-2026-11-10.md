# Prior cache consideration blocks route-pattern use - 2026-11-10

Investigation and proposal only. Source: corrected ordinary current/12 history, seed 2, 360 pulses, validated-activity-completion-v1 and persistent-route-pattern-v1. No gameplay implementation changes, provider calls or recording mutations. [Recorded reader evidence](first-glow-route-pattern-reconsideration-2026-11-10.json).

| Reader | Earlier cache decision | Encounter | Decline |
| --- | --- | ---: | ---: |
| Spark 6 | conserve at 72 | 178 | 179 |
| Spark 2 | conserve at 38 | 254 | 255 |
| Spark 9 | conserve at 207 | 301 | 302 |

All earlier decisions target tiled-106. None of these readers surveyed it. The public route pattern is learned later and remains known, but does not reopen consideration.

## Mechanism

1. first-glow-actions.ts chooseAutonomousActivities tests the truthiness of spark.wildCacheChoice before stale-navigation or target-reachability checks. Any prior choice produces already considered the Wild Cache. It does not distinguish probe/conserve, cache identity, or new information. The ordinary cache-selection branch also requires no prior choice.
2. first-glow-cache-choice.ts resolveWildCacheChoice requires !spark.wildCacheChoice before probing, in addition to resource/readiness/route gates. Removing only the chooser guard would permit travel but still force conservation at arrival.
3. wildCacheChoice is one latest-choice field, not an immutable attempt list. Simply clearing it to bypass the guards discards state-held provenance; simply replacing it can lose a previous survey fact. Recorded events should remain immutable too.
4. knownRoutePattern already permits a declined reader to reconsider later, since it excludes uses but not declines. The permanent cache-choice guard makes this ineffective for these readers. Existing per-reader/per-artifact use bounds prevent repeat use of one pattern, but do not bound retries across multiple patterns pointing to the same cache.

The observed reason wins before stale/reachability checks and is reported even when another activity would win under needs. Therefore the recorded three declines establish this guard, not otherwise-ready readers, nor that removing it guarantees use/probe or better outcomes.

## Focused recommendation: one new-information retry after conservation

Add a separate fresh-history versioned opt-in for one pattern-guided reconsideration per reader and cache. Keep the current policy behavior for existing histories. A retry is eligible only when the prior decision for this same cache was conserve, the later physical encounter occurs strictly after that decision, the pattern is current/reachable, and the reader has not already committed such a retry for that cache. Previously surveyed caches and unresolved/unknown cache identities do not qualify automatically. An encounter with no matching prior choice continues through the existing first-visit path.

Update both chooser and arrival resolver to recognize the same recorded retry authorization. Bind authorization to reader/cache/pattern/encounter/use evidence, consuming the one retry at route-use commitment, including if travel is interrupted. This bounds repeated invitations from multiple artifacts without consuming the allowance merely for charge/shelter deferral. At arrival, revalidate eligibility and existing probe requirements: at least three charge, no charge deficit, at least 75 readiness, reachable shard route. A second conservation or interruption is a valid outcome; do not force a probe or add free resources.

Preserve the original WildCacheChoice as an immutable prior-attempt record when assigning a newer current choice, retaining all event/route facts. Store at most one authorized retry/reader/cache and link original conservation -> later encounter -> retry decision -> arrival/conservation/interruption. Validate these references on load and retain them across restart. Avoid a general unlimited revisit system or changing thresholds in this fix.

Verify a conserved reader with a later encounter and sufficient resources can commit one retry and probe on real arrival; charge/shelter deferral retains knowledge and allowance; insufficient arrival resources conserve; prior probe, encounter preceding last decision, stale/unreachable target, missing target identity and duplicate/multiple-artifact retries reject. Verify interruption consumes the committed attempt, both attempts survive SQLite restart, and legacy continuation remains identical. Then rerun the unchanged ordinary fresh-history matrix with the new policy explicitly enabled; zero use remains a valid measured result.

S001 remains open. This proposal makes later information capable of reopening a previously conserved opportunity; it does not establish sustained interest or ensure natural reuse.
