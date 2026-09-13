# AI-P20 context cost report

This deterministic control report compares representative First Glow context shapes. It uses the engine's stable JSON token estimate (one token per four canonical JSON characters), not a provider quote or a live API call. Costs use the planning envelope in `docs/ai-plan.md`: $0.10/M input tokens and $0.40/M output tokens.

| Context shape | Input tokens/event | Output tokens/event | Cost/event | Cost/1,000 events |
| --- | ---: | ---: | ---: | ---: |
| Full context | 2,000 | 150 | $0.000260 | $0.260 |
| Retrieved context | 900 | 150 | $0.000150 | $0.150 |
| Summarized context | 500 | 120 | $0.000098 | $0.098 |

The retrieved packet is 55% smaller than full context and the summarized packet is 75% smaller. These are comparison fixtures for authorization and design review; they do not authorize provider execution. Actual provider usage and latency remain recorded per proposal, while historical playback remains provider-free.
