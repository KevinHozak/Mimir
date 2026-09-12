# AI-P10 hybrid runtime decision

Date: 2026-09-12

## Decision

**Defer expansion of hybrid runtime use.**

The evidence supports continuing bounded, provider-free evaluation work, but it does not authorize adding an external provider to the canonical First Glow runtime or public observer.

## Evidence reviewed

- [AI-P7 blinded quality review](ai-p7-hybrid-quality-review-2026-09-12.md): retained 16-encounter comparison with valid, evidence-grounded proposals and zero leakage or authority violations, but recorded zero committed downstream simulation changes and recommended defer.
- [AI-P8 isolated staging](ai-p8-hybrid-staging-2026-09-12.md): 16/16 validated alternatives were accepted by the allowlisted deterministic transition adapter; 16 bounded social diffs were produced, 14 differed from rules-only, and runtime authority remained unchanged.
- [AI-P9 limited pilot](ai-p9-hybrid-pilot-2026-09-12.md): 32-encounter budget rehearsal observed 16 provider opportunities and 16 rules-only outcomes, with per-Spark maximum 4, global maximum 16, and provider-free replay. The run intentionally used a local deterministic rehearsal and retained AI-P6 outcomes, so it added no external provider spend and did not provide a fresh live-model effectiveness sample or independent observer study.

## Rationale

AI-P8 proves the safety and downstream-effect boundary: a validated proposal can select an existing deterministic social transition in disposable staging without becoming simulation authority. AI-P9 proves the operational budget and replay boundary under rehearsal conditions. Together they remove the specific “zero downstream effect” blocker from P7, but they do not establish that a fresh external provider improves observer-facing understanding or produces enough new value to justify runtime complexity, privacy exposure, reliability risk, and spend.

The rules-only resolver therefore remains the sole normal-operation product path. Historical playback and branching remain provider-free. No external provider is wired into the server tick, canonical timeline, or public observer.

## Reconsideration gate

A future phase may reconsider this decision only with separate explicit authorization for the provider/model, privacy and retention policy, hard budget cap, kill switch, and data scope. It must run a fresh matched study with an independent observer-facing measure, preserve zero leakage and zero authority violations, and demonstrate value beyond fluent narration while retaining deterministic replay and fallback.

