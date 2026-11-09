# S004 revision 4: supported-model and budget specification

Date: 2026-11-08. Status: revised protocol implemented for offline verification; **live approval pending**. [Machine specification](model-study-s004-protocol-v4.json). This revision selects a replacement for offline migration work; it does not authorize inference, token counting, credential acquisition, account changes or spend.

## Replacement decision

Select the exact Google Cloud managed model **`gemini-3.5-flash-lite`**, Standard PayGo, text-only, proposed United States multi-region **`us`**. The [official model page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash-lite) lists GA release on 2026-07-21 and retirement on 2027-07-21 or later. It supports structured JSON and `MINIMAL` thinking. Its stated low-cost classification/extraction use fits the bounded alternative-selection task; this is a suitability judgment, not measured Mimir quality. Lifecycle support does not verify this project's access or quota. Recheck immediately before approval.

Retired `gemini-2.5-flash-lite` is excluded. Gemini 3.5 Flash is also supported in the lifecycle listing, but its published non-global standard rates (USD 1.65 input / 9.90 output per million tokens) are materially higher than Flash-Lite's 0.33 / 2.75. No broader model sweep, Preview model, consumer Gemini API, global fallback, hosted rollout or automatic substitution is selected.

The model page lists Standard PayGo in `global`, `us` and `eu`; it does not establish the old `us-central1` choice for this model. The [endpoint guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations#multi-region-endpoints) specifies a distinct multi-region hostname:

```text
https://aiplatform.us.rep.googleapis.com/v1/projects/<approved-project>/locations/us/publishers/google/models/gemini-3.5-flash-lite:generateContent
```

Allow exactly that host, API version, approved project, location, model, method and operation. No redirects, proxy substitution, streaming, continuation requests, model alias fallback, Interactions storage or SDK automatic continuation. `us` is a US multi-region, not an Iowa-only residency commitment. Selection remains subject to account/privacy approval; no project or payer is newly selected.

## Retained experiment and version boundary

Retain v3's question, deterministic server authority, immutable saved histories, shared `event-rc-v1` admission in both arms, seeds 2/4/8, six Sparks, 80 pulses, Spark 6 review at 80, checkpoints 0/16/40/80 and exact admitted-event snapshots. Keep paired opening states, arm order rules/model/rules, immediate explanation/recall rubric, delayed recall, interest and evidence-location measures. Keep ordinary capacity/cadence denials and identical choices; never manufacture opportunities or replace seeds to use spare funds.

Keep structural caps of 24 attempts total/eight per seed, concurrency one, zero retries, 16 KiB complete serialized request, 128 visible candidate tokens, ten-second absolute request/evaluator deadlines and a 30-minute generation window. Structural caps are not a promise that the budget funds 24 requests. This revision adds the tighter funded-attempt and uncertainty gates below. Preserve S001 acceptance and reviewer blinding/disclosure gates; no human or real-model outcome has been measured.

The archived [v3 source freeze](evidence/model-study-protocol-v3-2026-11-08.json), hash `b5b614fc6079aa08da0c751e818a584f1746981f46f2554c165a952c942a5a46`, remains unchanged as historical offline implementation evidence. **It cannot execute v4.** The active manifest is a separate v4 offline freeze. It binds the study-specific adapter, revised accounting and fresh `study-v4-seed-*` histories. Approved account, executable live price object, token-bound evidence, approval window and approved run directory remain absent. V3 treatment histories are not resumed or relabeled.

## Request and payload migration requirements

Use a single text user turn with the existing minimized fictional Spark-local context and bounded JSON response schema. Require `candidateCount:1`, `maxOutputTokens:128`, `responseMimeType:"application/json"`, `thinkingConfig:{thinkingLevel:"MINIMAL"}`. Do not request thought summaries or retain hidden reasoning text. `MINIMAL` is a latency/effort setting, **not zero thinking or a numeric billable-token guarantee**. Do not use the old model's `thinkingBudget:0` as a presumed Gemini 3 equivalent.

Omit temperature, top-P and top-K: the replacement model ignores custom values, so carrying forward `temperature:0` would imply a determinism control it does not provide. Omit frequency/presence penalties, which the model page says reject custom values. Model output is not deterministic; replay must use recorded validated choices and never regenerate. No tools, grounding, file/URL references, media, explicit cache creation, cached-content references, multi-turn state or continuation are permitted.

Inspect an exact locally serialized request and field allowlist before source freeze. Prompt context must contain no personal Vault material, household data, source tree or credentials. The approved project belongs in the endpoint and short-lived credential in the authorization header, never the prompt or persisted receipt. No real payload is sent by this revision.

## Price snapshot and revised spending rule

The [official pricing page](https://cloud.google.com/model-garden/pricing), retrieved 2026-11-08, lists standard text rates for Gemini 3.5 Flash-Lite:

| Endpoint | Input / million tokens | Output including reasoning / million tokens |
| --- | --- | --- |
| Global, comparison only | USD 0.30 | USD 2.50 |
| Non-global, selected `us` planning basis | USD 0.33 | USD 2.75 |

Non-global pricing applies to GA Gemini 3+ from 2026-07-01. These rates apply on both sides of the page's 200K threshold for this model. No cached-token discount, promotional credit, Batch/Flex or Priority rate is assumed. A future approved all-in bound must cover payer currency/conversion, taxes, contractual prices and every ancillary charge. Current payer and prior study allocation remain unverified.

Keep **USD 1 total cumulative ceiling**. Propose reserving **USD 0.10 inside that ceiling** for account-specific fees/taxes/currency uncertainty; it is not extra spending permission and not proof that every unknown fits it. If evidence cannot bound those charges within the reserve, block. Prior allocation must be an explicitly verified nonnegative amount; never silently use zero or create a fresh directory to reset spend.

Use integer micro-USD, round each request upward, and do not release reservations from usage receipts alone:

```text
requestReserve = ceil((inputBound * 330000 +
                       billableOutputBound * 2750000) / 1000000)
admit only if priorAllocation + 100000 +
              sum(all existing request reservations) + requestReserve <= 1000000
fundedAttempts = min(24, floor((1000000 - priorAllocation - 100000) / requestReserve))
```

`inputBound` must bound all charged prompt/schema overhead. `billableOutputBound` must cover all candidate and reasoning tokens for the single candidate. No character-divided-by-four estimate or byte ceiling may be treated as a proven token bound. Both bounds must be documented for this exact model and payload before admission. Lower actual usage does not buy more attempts within the same approval.

Planning sensitivity, excluding per-request fees beyond the dedicated USD 0.10 reserve and assuming verified prior allocation zero:

| Scenario | Input bound | Candidate + separate reasoning envelope | Request reservation | Three requests + USD 0.10 | Funded attempts |
| --- | --- | --- | --- | --- | --- |
| Candidate-only illustration, unsafe for approval | 16,384 | 128 + 0 | USD 0.005759 | USD 0.117277 | Structural maximum 24; illustration only |
| Proposed small-payload planning envelope | 16,384 | 128 + 65,536 | USD 0.185983 | USD 0.657949 | 4, conditional on bound evidence |
| Full published input-context sensitivity | 1,048,576 | 128 + 65,536 | USD 0.526607 | USD 1.679821 | 1, insufficient for three seeds |

The 65,536 separate reasoning allowance is deliberately generous planning arithmetic drawn from the model's published maximum output size, **not a verified separate thinking ceiling**. Neither small-input nor reasoning bound is established by this document. The effective number of admitted live calls is currently **zero**. The draft's four-call plan becomes admissible only if both maxima and all-in price/fee bounds are supported; otherwise use a larger proven reservation or defer. Do not raise the USD 1 cap, silently drop seeds, under-reserve reasoning, or claim the study is fully funded from the cheap candidate-only estimate.

Before any live generation, ensure the approved conservative reservation can fund at least one treatment attempt for each of the three retained seeds. If it cannot, classify the protocol as not affordable under current evidence and defer the matched study. Do not spend on the first seed knowing the full minimum sample cannot be funded. A live change that produces extra eligible contexts may exhaust the funded allowance; preserve all histories and report treatment-not-delivered/inconclusive rather than retry or selectively score successful seeds.

## Usage, uncertainty and stop controls

Require integer, nonnegative `promptTokenCount`, `candidatesTokenCount`, `thoughtsTokenCount` and `totalTokenCount`; reject missing categories rather than assume zero. Validate prompt against the approved input bound, candidates against 128, reasoning and combined billable output against their approved bounds, and total accounting against the documented response contract. Inspect the official usage schema when implementing, including cached-token treatment and any additional billable category; unknown categories or unexplained totals stop further dispatch. Do not double-charge cached counts already included in prompt totals and do not discount them for reservation purposes.

Record model identity/version, response status, request/context/event hashes, seed, pulse, token categories, latency and retained cost reservation without retaining thought text or secrets. Compare returned model version with the approved identity; missing/unrecognized identity blocks further dispatch pending review. A receipt is usage evidence, not settled attributable billing. Reconcile paid billing separately without resetting reservations.

Before the first network action, fsync the attempt and full reservation. Retain it on timeout, HTTP rejection, missing/malformed usage, worker crash, cancellation, privacy rejection or an uncertain provider-side outcome. Accounting/identity/privacy violations stop immediately; no automatic retry. Preserve the existing two-consecutive-failure ceiling for other malformed/transport failures, independent worker watchdog, parent-loss cutoff, durable stop flag and operator stop path. Cancellation prevents local new work and terminates the worker; it cannot guarantee a provider-side refund. Source/approval drift, insufficient budget, unknown prior allocation, unknown bounds or an expired window prevent dispatch entirely.

## Privacy and admission gates

Re-review current [retention](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) and [abuse-monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring) terms for this exact replacement and selected contract. Do not inherit the retired model's category, exemption, cache setting or retention approval. The no-training-without-permission statement does not imply zero retention; account logging/caching, abuse monitoring/human access and multi-region residency need explicit evidence/disposition. Keep the frozen 30-day transient and 90-day local history retention periods after report sign-off and owner-reviewed cleanup; no automatic deletion is introduced.

Execution prerequisites:

- [x] Implement a study-specific adapter for the exact `us` multi-region host/model and explicit `MINIMAL` request; preserve normal server defaults and the blocked legacy route
- [x] Extend durable reservation/usage accounting for reasoning, totals, approved fee reserve, prior allocation and funded-attempt caps; reject unknown or inconsistent receipts immediately
- [ ] Establish input and all-billable-output bounds for the exact serialized request; prove the minimum three-seed treatment is affordable under USD 1 without calls during offline preparation
- [ ] Verify candidate account/project/principal, effective IAM, API enablement, quota/access, billing/payer currency and prior allocation with allowlisted read-only evidence
- [ ] Verify model-specific privacy/retention contract and settings; obtain explicit owner acceptance of remaining permitted retention
- [ ] Pass offline hostile-accounting, cap-boundary, no-retry, timeout/cancel/crash, wrong-host/model and payload tests; repeat matched synthetic histories and exact read-only observer checks for the changed source
- [ ] Preserve v3 artifacts, freeze newly verified v4 sources and private approval draft, complete S001 and reviewer presentation disposition
- [ ] Obtain separate manifest-specific live approval for exact account/project/model/location, bounds, budget, run directory and finite window before acquiring an in-memory credential or dispatching

The study-specific v4 serializer/runner now pins the selected multi-region host/model, sends explicit `MINIMAL` thinking and reconciles prompt, candidate, reasoning and total usage under durable reservations and protected minimum-seed funding. The normal application adapter remains unchanged; v3 sources are archived as evidence, not reused for v4. Synthetic token/fee values are test fixtures, not proven live bounds. All live admission flags remain false. No provider endpoints, including `countTokens`, were called; no credentials, Cloud configuration changes, commit, push or deployment occurred.
