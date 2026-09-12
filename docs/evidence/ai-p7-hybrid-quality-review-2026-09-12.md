# AI-P7 Hybrid choice quality review

Date: 2026-09-12

This is a deterministic blinded comparison of the retained AI-P6 Vertex artifact. It does not make another provider call. The baseline and Flash-Lite variants were paired by encounter and scored without a source label. Readability and personality scores are bounded proxies, not a human observer study.

## Run contract

| Field | Value |
| --- | --- |
| Provider/model | Google Vertex AI / gemini-2.5-flash-lite |
| Project/account | mimir-realm / khozak@gmail.com |
| Matched encounters | 16 |
| Provider encounters | 8 |
| Per-Spark daily limit | 4 |
| Global daily limit | 16 |
| Actual cost | 0.06272 cents |
| Hard cap | 4 cents |

## Results

- Rules-only evidence grounding: 16/16; Flash-Lite: 8/8.
- Flash-Lite validity: 8/8; fallbacks: 0; hidden-knowledge leakage: 0; simulation-authority violations: 0.
- Flash-Lite changed 6 interpretation choices, but meaningful downstream committed choice changes were 0.
- Flash-Lite latency was 582–929 ms (p50 687 ms).
- Historical replay provider calls: 0; normal runtime provider calls: 0.

## Decision

**defer**. Defer a later hybrid runtime phase. Flash-Lite produced bounded, valid, evidence-grounded interpretation proposals and changed 6 interpretation choices, but this evaluation recorded no committed downstream behavior change and did not include independent observer comprehension. Keep provider use evaluation-only until a later study demonstrates meaningful behavioral value under the same zero-leakage, zero-authority-violation, replay-free boundary.

## Acceptance

- Hidden-knowledge leakage zero: **pass**
- Simulation-authority violations zero: **pass**
- Historical replay provider-free: **pass**
- Actual token cost and budget adherence recorded: **pass**
- Explicit later-phase decision: **pass**

