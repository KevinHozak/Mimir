# Geometric shard routes — 2026-11-11

Implemented and verified locally; uncommitted and unpublished. [Structured results](first-glow-geometric-shard-routes-2026-11-11.json). The previous [care fallback window](first-glow-care-recovery-fallback-2026-11-11.md) and the recorded diagnostic copies under `.tmp/fallback-diagnosis-krEvxE/` distinguish the motivating failure from this fresh-policy rerun.

## Policy boundary

Fresh constructors may explicitly select `geometricShardRoutes: true`, persisting `geometric-shard-routes-v1`. Initialization supplies Wild Cache choice if absent; other policies remain separate. Default startup/reset and older recordings retain their rules. Unknown versions, missing prerequisites and attempts to initialize recorded histories reject.

A conditional topology view ignores only Pattern Shard reservations for route facts and future feasibility. Wild Cache surveys, initial/pattern preparation forecasts and surveyed-shard recovery use that view. It changes neither geometry nor navigation rules and grants no contact ownership. An occupied shard no longer hides its route or prevents conditional recovery planning. A funded surveyed goal records waiting for the actual shard contact without committing departure.

Actual cache contact, retry authorization, the three-charge/zero-deficit/75-readiness probe gates and real probe costs remain in force. Actual shard dispatch uses the authoritative reservation table and rechecks resources, care, navigation and contact availability. Current owners remain intact. Sharing and care priorities, urgent rest below 70, required care rest and 90-readiness departure, the shared 64-action allowance, source stock, actual arrival/completion gates and separate public-artifact gates remain unchanged. Future access is conditional; no extra retry or automatic shared knowledge is granted.

## Six ordinary histories

Raw recordings: `.tmp/route-patterns-geometric-shard-ordinary-bmhXnj`. All six use unmodified fresh constructors, fixed seed 2, populations 1/8/12, current/review bundles, ten explicit policies and 360 pulses. Fetch is blocked; zero provider calls. These are fresh histories, not retrofits of the motivating recordings.

| Bundle | Sparks | Public patterns | Later encounters | Guided uses |
| --- | ---: | ---: | ---: | ---: |
| Current | 1 | 1 | 0 | 0 |
| Current | 8 | 4 | 6 | 0 |
| Current | 12 | 3 | 3 | 0 |
| Review | 1 | 1 | 0 | 0 |
| Review | 8 | 5 | 11 | 0 |
| Review | 12 | 0 | 0 | 0 |
| **Total** | | **14** | **20** | **0** |

The preceding care-fallback window had **12 patterns / 19 encounters / one guided use ending in conservation**. New totals are **14 / 20 / zero**, with zero committed guided retries. This is a mixed result, not evidence of general improvement or natural useful reuse.

Current/8's former retry reader, Spark 2, now surveys on its initial visit at **79**, completes the shard at **163**, and correctly declines the later pattern encounter because it already surveyed. All six current/8 encounters belong to Sparks that already probed. The controlled retry check below establishes the intended occupied-shard behavior; this ordinary window does not contain a natural retry demonstrating it.

Review/8 records six completed survey goals and five public patterns; completion and public creation remain separate gates. Across current/8 and review/8 there are **47 explicit busy-shard wait events**, preserving the pending goal without awarding departure or ownership. All other runs have zero such events.

**Review/12 regresses from one public pattern to zero by 360.** Its fresh surveys occur at **111 / 132 / 153**, rather than the preceding history's two surveys at 135 / 156. No surveyed-shard departure commits by the cutoff. Spark 1 remains deferred at one charge, zero deficit and 37 readiness, with 15 combined preparation actions. Sparks 2/3 remain in rest preparation, respectively **37/39 charge, zero deficit, 68/69 readiness**, with **20/21 combined actions**. Source stock is 784. Their resources are not yet eligible for care-gated departure; no completion is invented. These changed trajectories do not reproduce the old pulse-296 snapshot and are not a same-history counterfactual.

Across all six runs, **15 survey goals complete and six remain unfinished**. Maximum combined preparation count is **28/64**. S001 remains open for timely broader completion, natural successful useful reuse and independent human sustained-interest acceptance. No further gameplay change is selected here.

## Verification

- Full four-package build passed; the existing Vite chunk-size advisory remains.
- **202 root tests** passed, including **eight geometric-policy checks**: fresh-only initialization and unknown-version rejection; conditional geometry without reservation mutation; real cache survey/probe costs while another Spark owns the shard; low-resource conservation; unchanged resource projection; waiting without evicting or committing; admission after release; urgent care/action bounds; and an authorized guided retry that probes while the shard is busy.
- **11 state/SQLite checks** passed, including a funded busy-shard checkpoint with intact ownership, version validation and five equal continuation pulses after normalization.
- **58 older checkpoints**, including all six care-fallback final states, continue byte-identically for five pulses against the pre-change compiled engine.
- All six new final states validate and continue equally after SQLite normalization for five pulses. Checks find no duplicate contact ownership or stranded reservations; combined action bounds hold.
- Controlled fresh-policy WAL backup/restore preserves the marker and five setup/fallback/rested/committed/completed checkpoints, eight bundle files and five equal continuation pulses per checkpoint. This is separate from ordinary-history evidence; busy-shard persistence is covered by the state test.
- Whitespace and local documentation links checked. No commit, publication, default opt-in, bundle edits, provider calls or existing-history upgrade.
