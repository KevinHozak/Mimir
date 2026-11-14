# Persistent route patterns — offline verification, 2026-11-10

Local implementation of `persistent-route-pattern-v1`; no inference, countTokens or other provider calls. No publication or deployment. [Machine-readable results](first-glow-route-patterns-2026-11-10.json).

## Recorded consequence chain

The positive fresh history records Spark 1 surveying the Wild Cache and completing a Pattern Shard activity. It creates a public return-route artifact at pulse 9. Spark 2 physically encounters it at pulse 10, uses the learned route at pulse 11, and reaches the identified cache at pulse 18, where the recorded choice is probe. At arrival it has 13 charge, zero charge deficit and 80 readiness. Route selection is recorded separately from arrival; no travel savings or social benefit is inferred.

The same initial conditions without the route-pattern policy select exploration at pulse 11 instead of scavenge-cache. A charge-needy reader encounters the artifact but declines at pulse 11 to seek charge. A reader whose endpoint misses the artifact gets no encounter, route knowledge or use. The artifact persists without forcing use. Unit checks also cover stale navigation, malformed provenance, interruption, private evidence boundaries, immutable inputs and snapshot isolation.

## Scope and reproducibility

After `npm run build`, run `node scripts/first-glow-route-patterns-review.mjs`. Every run creates a unique disposable directory with four histories, all checkpoints, an observer SQLite database, summary and table baseline. Fetch is blocked by the harness. Each 24-pulse history matches continuation from a SQLite checkpoint at pulse 12.

These are controlled pulse-zero conditions, not ordinary spawn frequency evidence: the creator starts at cache contact with five charge; the reader starts on a declared transit plan toward the shard, replanned by the engine on the first pulse. Subsequent movement, costs, creation, encounter and outcomes are real engine transitions; no later teleport or injected success is used. The authored bundle is `sha256-591d53ab30c749f531d0b322609bbfe88096abc8f18b08977ca4d50296d873ca`.

The policy is opt-in on fresh histories only. Default and existing histories are not upgraded. Public knowledge conveys the recorded return connection, not creator-private probe memories. Explicit public artifact creation bypasses the old post-action public/private label, with no unearned trust grant or extra charge. Bounds are one artifact per creator, 64 artifacts overall, and one use per reader/artifact.

## Verification

- Four-package build, root world-data/engine suite, server state normalization, Chronicle event persistence, immutable Chronicle revisions and partial-travel restart checks
- Real WorldEvent JSON/SQLite-boundary regression retains creation, encounter, use and outcome references
- Five existing Wild Cache v1 fresh-history hashes reproduced exactly; read-only table hashes checked for the existing review recordings
- Desktop and 390×844 browser checks show all four Chronicle links; mobile has no document overflow. The use link opens pulse 11 on the same timeline with Spark 2/Follow retained

Technical screenshots and fresh observer data are in `.tmp/route-patterns-review-yRoPCk/`: `desktop-pattern-chain.png`, `mobile-pattern-chain.png`, `evidence-use-pulse11.png`, `observer.db`. Temporary technical browser tabs and server were closed; existing observer tabs were preserved.

## Acceptance boundary

S001 remains open. This proves a bounded later behavioral consequence in controlled fresh histories, not natural-play diversity, net benefit, sustained human interest or AI quality. The next human review should follow creation, encounter, choice and arrival, then assess whether this lasting consequence makes the Spark worth following.
