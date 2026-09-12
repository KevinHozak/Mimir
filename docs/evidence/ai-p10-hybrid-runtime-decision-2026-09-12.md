# AI-P10 hybrid runtime implementation path

Date: 2026-09-12

## Decision

**Proceed with bounded hybrid runtime implementation toward AI-assisted play.**

AI-P10 is not a broad deployment authorization. It selects the next implementation boundary: connect an explicitly authorized provider/model to the existing attention gate and interpretation validator, then let the deterministic transition adapter commit bounded consequences. The server remains the only simulation authority.

## Evidence reviewed

- [AI-P7 blinded quality review](ai-p7-hybrid-quality-review-2026-09-12.md): retained 16-encounter comparison with valid, evidence-grounded proposals and zero leakage or authority violations, but recorded zero committed downstream simulation changes because that harness was review-only.
- [AI-P8 isolated staging](ai-p8-hybrid-staging-2026-09-12.md): 16/16 validated alternatives were accepted by the allowlisted deterministic transition adapter; 16 bounded social diffs were produced, 14 differed from rules-only, and runtime authority remained unchanged.
- [AI-P9 limited pilot](ai-p9-hybrid-pilot-2026-09-12.md): 32-encounter budget rehearsal observed 16 provider opportunities and 16 rules-only outcomes, with per-Spark maximum 4, global maximum 16, and provider-free replay. The run used a local deterministic rehearsal and retained AI-P6 outcomes, so it added no external provider spend.

## Implementation boundary

The next implementation phase will:

- use one explicitly authorized and pinned provider/model behind the existing per-Spark and global daily caps;
- pass only bounded, privacy-reviewed context and request a schema-constrained proposal;
- treat the provider as an interpreter of selected Spark situations, never as a movement, resource, relationship, or timeline authority;
- validate evidence scope, Spark knowledge boundaries, supported actions, and context hash before accepting a proposal;
- route accepted proposals through the deterministic transition adapter, which alone commits consequences;
- record source, model/version, context hash, validation, fallback, latency, and usage metadata;
- preserve deterministic rules-only fallback for invalid output, unsupported claims, timeout, provider failure, budget exhaustion, and unavailable access;
- keep historical playback and branching provider-free by replaying recorded decisions;
- keep the public observer provider-free while the bounded internal runtime pilot is built and verified.

Before any live provider call, the project must separately authorize the provider/model, privacy and retention policy, data scope, hard cost cap, kill switch, and telemetry. This phase does not authorize uncontrolled spending or broad deployment.
