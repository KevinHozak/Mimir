# S021 lower-cost private continuation — 2026-11-14

**Historical evidence:** This records observations on November 14. The pilot subsequently stopped at pulse 293; allocations were not renewed and S021 was closed as a bounded pilot. Hosted qualification and final billing remain separate.

## Scope and implementation

The owner authorized reducing costs and resuming inside the original USD 2 hosting ceiling, USD 5 AI allocation and fixed 2026-11-15 05:24 UTC cutoff. This continuation changes operational configuration; the application remains merged commit `6d5bf941007d21ec3d0b124032d3f1e183a96f1f`. Hosting and the bridge image were not redeployed.

The bridge remains internal-only, with the original revision/traffic, max-one/min-zero service scaling. A separately audited run-specific controller retains cumulative usage and the original stopped receipt, observes private ingress and unchanged serving configuration, and fails closed on its limits/deadline. Local guard verification passed twelve boundary assertions. The actual VM guard reported healthy, zero observation failures and flat bridge usage after restart.

The original four-minute clock resumed at 19:19:34 UTC from the same pulse-157 checkpoint after count-only connectivity and a fresh paired backup passed. Initial temporary preparation controls held the legacy cutoff during installation; the original cutoff handler was restored afterward. The independent hard deadline was retained. The temporary 20-minute preparation stop was removed only after guarded resume. Startup metadata was removed, and the writer remains disabled for automatic boot activation.

## Real AI goal selections

By pulse 159, three new requests completed on the existing pinned US `gemini-3.5-flash-lite` route. Each selected among four feasible local candidates.

| Spark | Pulse | Selected goal | Receipt | Recorded estimate USD |
| --- | --- | --- | --- | --- |
| Spark 5 | 158 | explore-shape | 13 | 0.001103 |
| Spark 1 | 159 | explore-meet-mark | 14 | 0.001147 |
| Spark 4 | 159 | explore-mark | 15 | 0.001132 |

New recorded token estimate: USD 0.003382. Total including ten historical successful calls: USD 0.012226. Two original uncertain requests remain, retaining USD 1 in holds; there are no new uncertain or rejected calls at pulse 159. The 2x estimate buffer and USD 0.10 reserve leave USD 3.875548 guarded headroom. Goal selection is verified; these three plans were still active at that observation, so completed actions and benefit are not claimed.

## Hosting accounting

Recorded cumulative bridge usage is 8,498.782314 billable instance seconds and 544,667,878 sent bytes. The existing conservative formula values it at USD 0.963233. It remains unchanged after closing ingress. The revised guard retains a USD 1.05 cumulative bridge ceiling plus USD 0.95 reserves: VM/disk 0.25, deployment 0.25, storage/backup 0.10, private networking 0.15, delayed/other 0.20. Accounted usage plus reserves is USD 1.913233 under the original USD 2 cap. These values are conservative accounting, not final invoices or another allocation. Cleanup begins at 05:19 UTC and the original hard deadline remains 05:24 UTC.

## Recovery and limits

The first independent AI-bearing restore verified pulse 158, 159 checkpoints, 1,144 events, 530 interpretations and eight bundle files. Receipt 13 matched the saved goal's scoped context identity, proposal, evidence IDs and token usage. The exact twelve prior attempt rows and original USD 5 cap were preserved. Archive SHA-256: `64513d8c70614b6c3503eae994ab9136bc4eb083d95d43cb5c3c71bd8d8df531`.

A second independently downloaded paired snapshot cold-restored pulse 159, 160 checkpoints, 1,153 events, 533 interpretations and eight bundle files. All three goals matched receipts 13–15, including scoped identities, proposal fields, normalized evidence IDs and usage. The original twelve attempts, USD 5 cap and fixed run contract remained intact. Final archive SHA-256: `dea9498c2dd165a26665ac49ffc39ab8b55c6642f1d958d74a277c7a75156467`. Actual timer readback confirmed active 05:19 UTC cleanup and 05:24 UTC hard shutdown; the temporary preparation timer was inactive. At that time, sustained model-led outcomes, genuine Firebase SDK refresh, final billing and the then-current S021 acceptance remained open. Private operational controllers, audit/readback logs and exact decision details are retained under the ignored local pilot directory; they are not public runtime artifacts or a general deployment tool.

The conservative valuation retains the existing bridge formula rather than claiming final invoice attribution. Current official references: [Cloud Run pricing](https://cloud.google.com/run/pricing) and [private network pricing](https://cloud.google.com/vpc/network-pricing).


Final read-only check at 19:34:37 UTC: pulse 160, scheduler running, AI spender enabled, independent backup healthy, hosting guard healthy and unchanged at USD 1.913233 including reserves. The three goals remained active. Spark 1 completed its exploration step at pulse 160 (`event-160-spark-1-explore`) and advanced to seeking a real companion; the other two goals had no completed step yet. This newer action was observed live after the pulse-159 cold snapshot and is not claimed as independently restored. AI costs/headroom were unchanged from pulse 159.
