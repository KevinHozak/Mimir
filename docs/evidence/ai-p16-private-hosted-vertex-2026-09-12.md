# AI-P16 bounded Vertex repeatability evaluation

Generated: 2026-09-12T21:48:47.850Z
Execution: **vertex-live**
Fixed seeds: **2, 4, 8, 16**; encounters per seed: **32**

## Results

- Useful seeds: 3/4; valid proposal seeds: 4/4.
- Recorded interpretations: 20; deterministic fallbacks: 12.
- Choice changes: 5; downstream staged changes: 81.
- Provider calls: 32; cumulative cost: 0.27241 cents ($0.0027241); hard cap: 100 cents ($1.00).
- Replay provider calls: 0; all 32 records matched for each seed.

## Per-seed results

| Seed | Recorded | Fallbacks | Choice changes | Downstream changes | Useful |
| ---: | ---: | ---: | ---: | ---: | :---: |
| 2 | 4 | 4 | 0 | 0 | No |
| 4 | 6 | 2 | 1 | 26 | Yes |
| 8 | 6 | 2 | 3 | 29 | Yes |
| 16 | 4 | 4 | 1 | 26 | Yes |

## Review rubric

A seed is useful only when it records a valid evidence-grounded proposal and changes both a staged choice and downstream social state. All private-boundary, deterministic-authority, cap, proposal-validity, provider-free-replay, and no-broader-deployment gates passed.

- Safety gates: **pass**
- Repeatable useful value: **pass** (3/4 seeds)
- Provider-free replay: **pass**
- Decision: **proceed-to-next-review**

This supports the next bounded review; it does not authorize public or unbounded AI rollout.

