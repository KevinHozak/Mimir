# Validated activity completion - local verification, 2026-11-10

## Implementation and compatibility

Explicit fresh creation option activityCompletion:true sets firstGlowState.activityCompletionVersion to validated-activity-completion-v1. Initialization rejects progressed/recorded histories. Unknown versions fail validation, advance and server normalization; absent versions preserve the pre-fix behavior. Default creation/server startup/reset are unchanged and do not opt in. Serialization preserves the marker.

The structured transition emits exploration, mark-trace and shape-pattern completion only after successful arrival validation, including choosing-to-interacting-to-choosing in one pulse. Each completion records its event, learned evidence and arrival ledger item once. The new-policy wrapper consumes those events for once-per-pulse activity strain/sustenance and records final movement resource effects. It does not infer success from a status change. Invalid arrivals receive no completion or activity debit. The old status-based completion and accounting path remains for absent-policy histories.

## Verification

- Full four-package build passed; usual Vite chunk-size warning.
- Root npm test passed: 116 reported world-data/engine tests, zero failures. Seven targeted completion checks passed, including same-cell explore/mark/shard, traveled arrival, invalid arrival, single debit, immutable input, legacy/unknown-policy handling and serialized restart. The final targeted run additionally checks choosing-state same-cell object arrivals.
- Server state checks passed, including in-memory SQLite checkpoint normalization/continuation with the marker, no legacy retrofit, and rejection of unknown markers. Chronicle event persistence checks passed.
- Partial-travel server restart integration passed with local socket access. The initial sandbox attempt could not start its test server; rerun outside that socket restriction passed.
- Ten unversioned saved histories (six ordinary final checkpoints and four controlled route histories) continued byte-for-byte identically to a preserved pre-fix compiled engine for five further pulses each. This is sampled continuation evidence, not exhaustive equivalence. No old recording was rewritten.
- Ordinary runs used the previous matrix: unmodified spawn/resources, fixed seed 2, two bundles, 1/8/12 Sparks, 360 pulses, routePatterns:true plus activityCompletion:true, no providers. Final states passed validation.

Logs and legacy comparison are in .tmp/completion-fix/. [Machine-readable results/source hashes](first-glow-completion-2026-11-10.json).

## Ordinary fresh histories after the fix

| Bundle | Sparks | Explore completions | Probes | Patterns | Encounters | Uses |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| current | 1 | 1 | 0 | 0 | 0 | 0 |
| current | 8 | 7 | 1 | 0 | 0 | 0 |
| current | 12 | 12 | 1 | 1 | 3 | 0 |
| review | 1 | 1 | 0 | 0 | 0 | 0 |
| review | 8 | 7 | 1 | 0 | 0 | 0 |
| review | 12 | 12 | 0 | 0 | 0 | 0 |

Current means the server-default authored bundle; review means the earlier controlled-review bundle. These six bounded deterministic scenarios are not independent random samples. Both single-Spark runs complete exploration at pulse 6 and proceed to cache travel, removing the observed exploration loop. Three probes now occur across the matrix, versus zero before.

In current/12, Spark 1 surveys at pulse 114 and creates route-pattern-spark-1-122 at pulse 122. Spark 6 encounters it at 178 and declines at 179; Spark 2 encounters at 254 and declines at 255; Spark 9 encounters at 301 and declines at 302. All decline reasons are already considered the Wild Cache. The route remains known. There are no natural uses in this matrix. Current/8 and review/8 each survey once but create no artifact by 360; a survey alone does not guarantee later shard completion.

The fix enables ordinary creation/encounters in one tested setting, not ordinary successful reuse or sustained-interest acceptance. S001 stays open. A next investigation may examine eligibility after prior cache consideration, but no such rule change or resource rebalance is included. No provider calls, commit, push, PR or deployment.

All six corrected pulse-360 checkpoints also matched five further pulses after server normalization/JSON restart. SQLite serialization itself is covered by the dedicated server test. Reproduce the ordinary matrix after building with `node scripts/first-glow-route-patterns-ordinary-review.mjs --completion`; omitting the flag retains the original-policy comparison. New-file whitespace, relative evidence links, script syntax and git diff whitespace checks passed.
