# AI-P8 validated hybrid choices in isolated staging

Date: 2026-09-12

This report replays the retained AI-P6 Vertex artifact and applies its already-validated alternatives only to disposable cloned social state. It does not call a provider and does not wire AI into the normal server pulse.

## Results

- Baseline accepted: 16/16; hybrid accepted: 16/16; rejected: 0.
- Hybrid downstream social diffs: 16; different from rules-only: 14.
- Runtime authority changes: 0; historical replay provider calls: 0.
- New provider calls/cost: 0 / 0 cents.

## Decision

**proceed-to-limited-pilot**. Proceed to the limited isolated hybrid staging pilot in AI-P9. This harness proved that validated alternatives can create bounded downstream social diffs without changing canonical runtime authority or replay behavior.

## Acceptance

- Allowlisted transitions only: **pass**
- Malformed/unknown proposals rejected: **pass**
- Canonical runtime unchanged: **pass**
- Historical replay provider-free: **pass**
- Provider calls during staging: **pass**
- Inherited AI-P6 cost under cap: **pass

