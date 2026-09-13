# AI-P18 Spark decision-budget cadence review

AI-P18 adds a deterministic cadence layer to the bounded attention policy. A Spark budget is both a daily maximum and a spacing target. The default existing policy is unchanged; the cadence is enabled only when a versioned per-Spark budget profile is supplied.

## Powers-of-two ladder

For a 64-tick day, the supported budget ladder is:

| Budget | Target interval |
| ---: | ---: |
| 2 | 32 ticks |
| 4 | 16 ticks |
| 8 | 8 ticks |
| 16 | 4 ticks |

The interval is `floor(ticksPerDay / budget)`. Each Spark receives a stable phase offset derived from its ID so all Sparks do not become eligible on the same tick. If an opportunity arrives late, the next window is also bounded by the last consumed tick plus the interval; this prevents catch-up bursts.

Unavailable or ineligible events are suppressed without debt or forced activity. The attention decision records the budget, cadence interval, phase offset, window index, and next eligible tick. The global daily cap and repeated-event cooldown remain authoritative.

## Candidate determinants

The control compares two deterministic mappings to the ladder:

- readiness tier 0, 1, 2, 3 maps to 2, 4, 8, 16;
- age days 0, 2, 4, 8 maps to 2, 4, 8, 16.

Neither mapping is automatically selected by the control. A later decision must choose a versioned determinant based on observed value and fairness review. Age must not become a hidden moral ranking, and a larger budget must not imply universal correctness or authority.

## Control run

```text
npm run ai-p18:cadence-review
npm run ai-p18:cadence-review:test
```

The control uses seeds `2`, `4`, `8`, and `16`, 32 encounters per seed, both candidate determinants, a local fake provider, and provider-free replay. It writes disposable output under `.tmp/ai-p18-cadence-review.json`. The checked-in control summary is `docs/evidence/ai-p18-cadence-control-2026-09-12.json` and `.md`.

## Live quality rerun

The live arm must remain private, operator-authorized, and capped. Use the P17 Vertex contract and review the control artifact first. No live P18 execution is implied by this implementation phase. The live decision must compare fallback rate, useful interpretations, downstream changes, latency, cost, per-Spark consumption, cadence gaps, and provider-free replay against the P17 result.
