# Route patterns in ordinary fresh histories - 2026-11-10

Six offline rules-only runs used unmodified fresh spawn/resource/knowledge/activity state, with only the explicit routePatterns policy enabled. No fixture, prepositioning, resource boost, forced activity, external provider, or live database was used. Each ran 360 pulses at seed 2, with 1, 8 or 12 Sparks. The two bundles are the server default (sha256-5922379b678514580bbe050a66efdef48677e090e871e6342177bbdaec6a781e) and the earlier controlled-review bundle (sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca). These are bounded deterministic scenarios, not independent random samples. Seed affects social choices; it does not randomize initial spawn/resource state.

| Bundle | Sparks | Cache choices | Probes | Patterns |
| --- | ---: | ---: | ---: | ---: |
| Server default | 1 | 0 | 0 | 0 |
| Server default | 8 | 4 | 0 | 0 |
| Server default | 12 | 8 | 0 | 0 |
| Controlled-review bundle | 1 | 0 | 0 | 0 |
| Controlled-review bundle | 8 | 4 | 0 | 0 |
| Controlled-review bundle | 12 | 7 | 0 | 0 |

All 23 recorded cache choices conserved; no survey route facts, public artifacts, encounters or uses arose. Pattern-shaping completion alone was insufficient. Creation requires a successful cache survey and subsequent completion at that surveyed shard, with the return target reachable. The previous controlled chain remains evidence of capability, not ordinary emergence.

Both single-Spark runs drew charge, then remained in exploration through pulse 360 with no exploration-completion event. Source inspection identifies a likely contributing gap: exploration can select the current trace cell and complete within one transition, while the completion-event wrapper requires the prior status to be traveling or interacting. The final single-Spark checkpoint is choosing/explore at (3,5), with eight charge and no learned evidence. This is a code-supported diagnosis to investigate, not a repaired defect or proof it explains all multi-Spark results.

Ordinary emergence remains an S001 gap. Next proposed investigation: trace resource/readiness at cache arrival and the same-cell exploration completion path before choosing a focused correction. Do not weaken need priorities or award free resources merely to force the demonstration. No gameplay changes, provider calls, publication or deployment were performed. Existing observer recordings were not accessed by this harness.

Reproduce after building: node scripts/first-glow-route-patterns-ordinary-review.mjs. Fetch is blocked. All six final states passed validateFirstGlowState. Script syntax and git diff whitespace checks passed. [Machine-readable results and source hashes](first-glow-route-patterns-ordinary-2026-11-10.json). Raw states/events are retained in .tmp/route-patterns-ordinary-EXB1z8. The default creation path still has no route-pattern opt-in; these runs explicitly enabled it for investigation.
