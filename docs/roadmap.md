# Mimir Current Roadmap

**Active runtime:** The Living Circuit / **The First Glow** is the only supported runtime.

## Delivery direction

Deliver a persistent online First Glow world where Sparks choose consequential goals, act within a larger world, encounter one another, and leave outcomes that survive return visits. This owner-selected direction (2026-11-13) replaces observer-first sequencing. Evaluate progress through compact evidence-linked summaries and automated checks; retain subjective human review as finalization, separately from technical acceptance and model-benefit evidence.

## Work tracking

The [local issue backlog](../issues/) is the source of truth for unfinished work, acceptance criteria, dependencies, priorities, and deferred design decisions. Work with more than three major phases is tracked as an epic with child stories. Do not duplicate those issue plans here.

Completed functional delivery belongs in the [Changelog](changelog.md). Historical planning remains in [Project History](history.md), and dated verification remains in [Evidence](evidence/).

## Current selection order

- [MIM-E003](../issues/MIM-E003.md): active persistent online AI world epic. [S018](../issues/MIM-S018.md), [S019](../issues/MIM-S019.md) and [S020](../issues/MIM-S020.md) are complete locally. [S021](../issues/MIM-S021.md) remains in progress after the bounded online pilot stopped at pulse 293 with 12 Sparks and a verified physical meeting. [Final disk recovery](evidence/spark-pilot-final-recovery-2026-11-15.md) recovered the complete history and recorded AI ledger; the interrupted final offsite backup led to a [locally qualified shutdown fix](evidence/final-backup-shutdown-local-2026-11-15.md). Genuine Firebase refresh/return behavior, final invoice attribution and future operating qualification remain open. The expired pilot stays stopped; restarting or deploying requires separate authorization. [S022](../issues/MIM-S022.md) retains evaluation summaries. No comparative model benefit or human acceptance is claimed. [S020 evidence](evidence/first-glow-frontier-2026-11-13.md) retains its separate offline outcomes, resource-pressure and frame-budget measurements.
- [MIM-S023](../issues/MIM-S023.md): final human review transferred from [S001](../issues/MIM-S001.md). S001 is closed as the technical evaluation/history record with remaining acceptance transferred, not passed. Guided packet comprehension is recorded; unguided review and overall interest were deferred without a result. S023 does not block starting E003 implementation.
- [MIM-E001](../issues/MIM-E001.md): separate matched model-benefit study remains deferred. Its frozen-packet, account/budget and execution gates remain in [S002](../issues/MIM-S002.md), [S003](../issues/MIM-S003.md), and [S004](../issues/MIM-S004.md); S004 now depends on S023 for the transferred human-review gate. The existing [USD 5 local pilot](spark-ai-local.md) is not a renewed allocation, online rollout or demonstration of comparative model benefit.
- [MIM-E002](../issues/MIM-E002.md): genuine hosted expiry/refresh remains in [S008](../issues/MIM-S008.md), alongside unresolved financial attribution and a separate decision before wider access. Other child stories are closed; closure does not establish broad readiness.
- Deferred design remains in [S011](../issues/MIM-S011.md), [S012](../issues/MIM-S012.md), [S013](../issues/MIM-S013.md), and [S014](../issues/MIM-S014.md): natural Hero rarity, capacity progression/presentation, and the next-age gate. These do not change First Glow defaults.

## Gates for selecting new work

- First Glow remains the sole runtime until a separately selected and verified age transition is approved. Use [World Theme](world-theme.md) for intended setting and terminology.
- Provider studies require explicit scope, account, privacy/retention controls, budget, telemetry, and a kill switch. Issue creation does not authorize provider calls or spending.
- The owner authorized an owner-only S021 pilot within the original USD 5 AI allocation and USD 2 additional hosting, ending no later than 2026-11-15 05:24 UTC. At most two observer streams and the hosting cutoff apply. Wider access or continuation requires a separate decision; [the hosted runbook](hosted-observer-runbook.md) retains historical staging limits in their dated scope.
- Preserve server-authoritative outcomes, deterministic history, private Spark knowledge, immutable world bundles, provider-free replay, and the single SQLite writer. See [Architecture](architecture.md) for current implementation boundaries.

Add new roadmap possibilities only while they are untriaged. Once selected and recorded as local issues, track their delivery there rather than maintaining a second task list.
