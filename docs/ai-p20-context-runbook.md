# AI-P20 persistent context runbook

AI-P20 defines the provider input boundary for bounded First Glow decisions. It is an audit and evaluation contract, not authorization for live provider calls. The rules-only engine remains the normal path, the server remains authoritative, and historical playback is provider-free.

## Context contract

- `world-codex-v1` is the authored World Codex version. Its canonical hash identifies the First Glow rules, terminology, knowledge boundary, and bounded provider output contract.
- `context-packet-v1` is the reconstructed provider-input packet. It contains one authored Spark profile, that Spark's local knowledge and bounded memory projection, and recent witnessed events.
- The packet and the enclosing interpretation context are canonically hashed. Persisted decisions must retain the context hash and the profile/codex versions needed to reconstruct the input.
- The packet must not contain another Spark's private facts, future events, hidden evidence, provider credentials, or hidden model reasoning.

## Retrieval and compaction

Memory records retain their kind and provenance: witnessed fact, received report, subjective inference, or recorded consequence. Ordering is by pulse and stable ID. Retrieval is bounded to the configured memory/event limits, with omission counts and reconstruction event IDs retained for audit. If the actor's local knowledge is unavailable, context construction fails closed and the caller uses the deterministic fallback.

## Usage and replay

Each proposal usage record includes request ID, context hash, outcome, fallback reason when applicable, reserved and used budget units, input/output token estimates, and latency. These fields support cost and latency review without storing chain-of-thought. The existing per-Spark and global RC attention gates remain authoritative.

Historical playback reconstructs context only to validate the recorded decision and never invokes a provider. Missing, malformed, or non-reconstructible records use the deterministic fallback and record the reason.

## Cost control

Use the checked-in [AI-P20 context cost report](evidence/ai-p20-context-cost-report-2026-09-13.md) for the deterministic full/retrieved/summarized comparison. Before any live evaluation, recheck first-party pricing, select one provider channel, set the hard cap and kill switch, confirm privacy/retention settings, and run the deterministic control arm first. No live call is implied by this runbook.
