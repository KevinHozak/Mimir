# Final bounded-pilot recovery — 2026-11-15

This is a sanitized summary of the stopped-disk recovery. Private databases, raw operator logs and fictional provider payloads remain outside Git. The pilot was not restarted; no continuation, new allocation or deployment is authorized by this evidence.

## Final state and outcomes

The persisted journal records a clean writer shutdown at **2026-11-15 05:19:00.923 UTC**, before the original **05:24 UTC** hard deadline. Final checkpoint: **pulse 293**, **12 Sparks**, **294 checkpoints**, **2,390 events**, **44 goals**: 35 completed, six active and three interrupted. The later VM stop-transition timestamp did not mean that simulation or inference continued.

- Spark 11 and Spark 4 did **not** physically meet; their trace-304 rendezvous remained preparing at shutdown
- Spark 9 and Spark 10 physically met at pulse 287, recorded in objective event `event-287-spark-10-meet-spark-9`. Spark 9's explore–meet–mark goal completed exploration and meeting, but not marking
- Spark 10 explored trace 204; its later solo marking remained active
- Spark 12's meeting with Spark 6 at trace 304 remained preparing
- Sparks 7 and 8 each completed a third rules-selected exploration goal at pulse 292
- Spark 2 completed shaping and made one additional AI explore–mark choice at trace 304 at pulse 292. Request 41 completed with a USD 0.001402 token-cost estimate

Meeting intents, rules-mediated acceptance and physical meeting events are distinct evidence. These outcomes show actual cooperation and some site variety, not broad autonomy, universally varied menus or completed newcomer AI goal chains.

## Cost and recovery bounds

The original ledger contains **41 attempts: 39 completed and two uncertain**. Uncertain IDs **11 and 12** and their **USD 1 total holds** remain. Final recorded token-cost estimate: **USD 0.040698**; conservative accounting: **USD 1.181396 / USD 5**, including doubled known costs and USD 0.10 contingency.

The final hosting guard remained **USD 1.923414 / USD 2**. Recovery added a **USD 0.04 conservative reserve**, for **USD 1.963414 / USD 2** combined conservative accounting and **USD 0.036586** headroom. This is a reserve/estimate, not settled billing. A temporary e2-micro reader with no service account or public IP read a cloned disk mounted `ro,noload`. Both temporary reader and clone were deleted after successful download verification. The original VM stayed terminated and its disk stayed untouched. Publishing this source fix performs no additional cloud operation or paid request.

## Missing final backup and recovered integrity

The latest completed offsite archive contained pulse 290. At the early cutoff, endpoint-cleanup retries delayed its final-backup queue. A second cutoff path started final backup at **05:19:42 UTC**, but its caller waited only **70 seconds** although the backup unit allowed **180 seconds**. The caller initiated shutdown; systemd terminated the still-running final backup at **05:21:23 UTC**. A regular backup timer also failed its live-health check against the stopped writer. This was a coordination failure, not proof of data corruption.

The downloaded recovery archive was **42,705,018 bytes**, SHA-256 `3ede315ea7b6d65ad656eaca23d364a4c76b548fbcf313053f45fcd0565f047d`. All copied source-file size/hash checks passed. World and ledger SQLite integrity checks passed; current state normalization and First Glow validation passed. All **291 previously recovered checkpoints through pulse 290** matched byte-for-byte in the final disk history. This closes the final outcome and recorded-ledger gap; the interrupted final offsite snapshot was never reported as successful.

## Repair and remaining gates

The [shutdown coordination fix and local qualification](final-backup-shutdown-local-2026-11-15.md) give one cutoff unit ownership of regular-backup quiescence, writer stop, final-backup waiting and shutdown. A real local paired archive/restore of pulse 293 preserved all 294 checkpoints, eight bundle files, all 41 attempt rows and both uncertain holds. Service control and object storage were mocked; no cloud or systemd deployment was qualified.

[MIM-S021](../../issues/MIM-S021.md) remains in progress for genuine hosted auth/return behavior, final invoice attribution and any separately authorized future deployment/operating qualification. The expired pilot remains stopped. Human review remains deferred in S023, and no comparative model-benefit result is claimed.
