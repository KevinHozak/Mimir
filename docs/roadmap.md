# Mimir Current Roadmap

**Active runtime:** The Living Circuit / **The First Glow** is the only supported runtime.

## Delivery direction

Prioritize a coherent observer experience across World, Follow, and Chronicle before expanding provider use, hosted access, or world ages. Prefer repeatable automated browser checks for technical acceptance; distinguish those results from subjective engagement and model-benefit evidence.

## Work tracking

The [local issue backlog](../issues/) is the source of truth for unfinished work, acceptance criteria, dependencies, priorities, and deferred design decisions. Work with more than three major phases is tracked as an epic with child stories. Do not duplicate those issue plans here.

Completed functional delivery belongs in the [Changelog](changelog.md). Historical planning remains in [Project History](history.md), and dated verification remains in [Evidence](evidence/).

## Current selection order

- [MIM-S001](../issues/MIM-S001.md): independent human review of World, Follow, and Chronicle remains the observer gate. The connected journey and launcher/example-label repairs are merged; do not repeat them as unfinished implementation.
- [MIM-E001](../issues/MIM-E001.md): approve a frozen study packet ([S002](../issues/MIM-S002.md)) before the bounded comparison ([S004](../issues/MIM-S004.md)), then evidence and decision (S005). The comparison also depends on S001 and the [S003 protocol](../issues/MIM-S003.md). [S004 v4](model-study-s004-protocol-v4.md) now has an implemented isolated adapter, revised budget guard and [fresh offline verification](evidence/model-study-v4-verification-2026-11-08.md). The matched comparison remains deferred. The owner separately authorized a USD 5 local Spark AI pilot, now implemented and live-verified; see the [pilot guide](spark-ai-local.md). Its operational use does not establish study or human-review acceptance.
- [MIM-E002](../issues/MIM-E002.md): genuine hosted expiry/refresh remains in [S008](../issues/MIM-S008.md), alongside unresolved financial attribution and a separate decision before wider access. Other child stories are closed; closure does not establish broad readiness.
- Deferred design remains in [S011](../issues/MIM-S011.md), [S012](../issues/MIM-S012.md), [S013](../issues/MIM-S013.md), and [S014](../issues/MIM-S014.md): natural Hero rarity, capacity progression/presentation, and the next-age gate. These do not change First Glow defaults.

## Gates for selecting new work

- First Glow remains the sole runtime until a separately selected and verified age transition is approved. Use [World Theme](world-theme.md) for intended setting and terminology.
- Provider studies require explicit scope, account, privacy/retention controls, budget, telemetry, and a kill switch. Issue creation does not authorize provider calls or spending.
- Hosted access remains limited staging: at most two concurrent observer sessions for at most three minutes. Wider access requires fresh verification and a separate decision under the [hosted runbook](hosted-observer-runbook.md).
- Preserve server-authoritative outcomes, deterministic history, private Spark knowledge, immutable world bundles, provider-free replay, and the single SQLite writer. See [Architecture](architecture.md) for current implementation boundaries.

Add new roadmap possibilities only while they are untriaged. Once selected and recorded as local issues, track their delivery there rather than maintaining a second task list.
