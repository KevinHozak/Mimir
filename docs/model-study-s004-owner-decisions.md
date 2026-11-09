# S004 v4 owner decisions for fees, prior allocation and retention

Prepared 2026-11-08. **Owner choices recorded; evidence gates remain open and no live execution is authorized.** [Decision record](model-study-s004-owner-decisions.json), [owner response receipt](evidence/model-study-s004-owner-response-2026-11-08.json), [offline bound investigation](evidence/model-study-v4-offline-bound-investigation-2026-11-08.md).

## Recorded owner choices — 2026-11-08

| Area | Owner answer | Recorded effect |
| --- | --- | --- |
| Prior allocation | Still unknown | No zero-allocation or no-outside-attempt attestation; dollars and attempt counts remain null |
| Fees | Defer until evidence is available | Fee gate remains closed; agreement and maximum tax/fee ceiling remain unknown |
| Retention | Accept the documented policy, subject to agreement verification | Policy choice is accepted conditionally, including documented caching/abuse retention and possible human review, the disclosed default-off logging inference, and local 30/90-day post-sign-off retention |

The retention condition is not yet satisfied: agreement evidence and its verification remain absent. `privacyTermsVerified`, the executable `retentionApproved` flag and all live approval flags therefore remain false. No exemption, ZDR, settings change or run approval follows from this response. The sections below remain the supporting decision framework; proposed choices that were not selected are not accepted.

The selected account/project is recorded privately. Base account rates and USD currency are verified; the owner's last answer on agreement, tax/fees and outside-checkout attempts was **Unknown**. This sheet preserves that answer. The safest current disposition is to defer execution while obtaining evidence. No need to choose a numeric fee rate or claim zero prior spend to keep preparation work moving.

These are owner facts and policy decisions, not permission to flip technical-verification flags. Proven token bounds, S001/reviewer disposition and a separate manifest-specific live approval still gate execution. Completing this sheet does not approve a run, acquire credentials, change settings or publish anything.

## 1. Fees and the USD 1 ceiling

Choose **defer** until evidence is available, or provide an evidence-backed bound containing:

- Applicable agreement type and a private evidence reference; a `default-price` SKU response does not prove an online agreement or absence of a Master Agreement
- Maximum aggregate percentage tax/fee rate and maximum fixed USD charges attributable to the entire admitted study, including any per-request fees multiplied by all funded attempts
- Confirmation that the ceiling covers the relevant billed usage and uncertainty, without relying on discounts, promotional credits or refunds
- Proposed overhead reservation inside the unchanged USD 1 total, never extra permission to spend

Use a current billing/contract record or billing-owner confirmation with enough scope to support a ceiling; a prior invoice's observed tax rate alone is not proof it is the maximum future rate. Keep personal billing records private; a local evidence path/hash and the necessary ceiling are sufficient for the decision record. Unknown stays unknown.

For planning, let `R` be the proven per-request base reservation, `B` the reconciled prior allocation, `H` the overhead reserve, `r` the maximum percentage charge and `F` the maximum fixed total charge. Require:

```text
N = min(24, floor((1,000,000 - B - H) / R))
N >= 3
N × ceil(R × r) + F <= H
B + H + N × R <= 1,000,000 micro-USD
```

Round each reservation and percentage allowance upward per request. `F` must also cover any documented invoice rounding, minimum charges or fees at their actual billing granularity; micro-USD arithmetic does not prove an unknown invoice rule. The fee bound must cover **all funded attempts**, not only the expected three natural requests. Per-request charges already included in `R` must not be counted twice; every additional charge must be allocated explicitly. Prior allocation must already cover its own attributable costs/uncertainty, or those costs need an additional documented allowance.

Conditional illustrations using the **unverified fixture** `R=185,983`, `B=0`:

| Overhead `H` | Funded attempts | Hypothetical documented percentage | Rounded percentage charges | Fixed-total-fee room inside `H` |
| --- | --- | --- | --- | --- |
| USD 0.10 | 4 | 10% | USD 0.074396 | USD 0.025604 |
| USD 0.10 | 4 | 15% | USD 0.111592 | None; exceeds reserve by USD 0.011592 |
| USD 0.15 | 4 | 15% | USD 0.111592 | USD 0.038408 |

These percentages are arithmetic examples, not estimates of the owner's tax or fees. The guard allows a larger overhead reserve inside the same USD 1 cap, but no value is selected here. Once token bounds or prior allocation change, recalculate the funded allowance and all-in fee proof; an example does not clear `feeBoundsVerified` or `pricingVerified`.

## 2. Prior allocation and attempts

Choose one disposition:

| Choice | Required owner statement/evidence | Result |
| --- | --- | --- |
| Defer / unknown | No unsupported assertion needed | Admission stays blocked |
| Attest no outside attempts | Confirm no S004 live, failed, interrupted or uncertain attempts occurred outside the recorded synthetic runs, across relevant revisions/directories/machines/operators | Reconcile known local reports, then a zero live prior baseline can be reviewed; not automatically approved |
| Declare outside attempts | Provide private attempt records, seed/revision if known, settled allocations and full uncertain reservations | Reconcile both dollars and cumulative/per-seed counts before any new dispatch |

Seven known local integration reports are synthetic; that is not proof of every outside action. A failed, cancelled or timed-out request may retain its full reservation even if its local telemetry showed zero cost. Do not report net spend after credits/refunds as the cumulative allocation, or start a fresh directory to reset the study.

**Implementation boundary:** the current v4 guard accepts an initial dollar allocation but starts with an empty attempt list. It does not import historical total/per-seed attempt counts. If any outside attempt is declared, do not admit it merely by entering a dollar amount: first reconcile counts against the 24-total/eight-per-seed ceiling and ensure they are enforced across the continuation. That may require a source change and fresh verification. Unknown historical counts remain blocking. This investigation does not modify the frozen guard.

For the same conditional fixture, retaining funding for three new attempts requires `B <= 342,051` micro-USD with `H=100,000`, or `B <= 292,051` with `H=150,000`, before considering historical attempt-count limits. These are arithmetic thresholds, not suggested prior allocations.

## 3. Retention and privacy evidence

Choose a policy disposition after reviewing the documented facts:

| Choice | Concrete meaning | Additional requirements |
| --- | --- | --- |
| Defer | No live prompt/context transfer | Current default; all privacy/retention flags remain false |
| Accept documented retained-data policy | Accept supported project caching up to 24 hours, including observed durable storage; accept the applicable abuse-monitoring retention/human-review terms without claiming an exemption | Record applicable agreement, evidence and explicit acceptance; resolve logging-evidence disposition below |
| Require stronger privacy / ZDR | Do not accept the observed durable-cache policy or possible abuse retention/human review | Obtain supported exemption/terms and separately authorize any needed settings changes; this choice does not itself authorize a PATCH, consent, opt-out request or vendor message |

Known facts: selected project cache retention is `DURABLE`; the exact model logging override is absent; default-off request-response logging is an inference from the documented default plus absence, not an explicit disabled-configuration response. The public ordinary Google-model policy can retain flagged prompts up to 90 days and permit human review depending on the agreement. Training/fine-tuning without prior permission/instruction is prohibited by the reviewed public managed-model terms. No abuse exemption or zero-retention guarantee is established.

Record whether to accept the **default-off inference** for the absent override or require stronger confirmation. This is an evidence disposition, not proof of all logging arrangements. Unknown agreement terms and unverified exemption status must not be relabeled as verified just because the owner consents to a retention duration. If agreement evidence cannot be obtained, keep `privacyTermsVerified` false.

The data boundary remains fictional, bounded Spark-local context only: no Vault/household records, credentials, unbounded source data, tools/grounding, stateful Interactions storage or Live sessions. Keep local transient study material for 30 days after report sign-off with operator-reviewed deletion, and canonical histories/recovery material for 90 days after sign-off followed by explicit archive/delete disposition. No cleanup runs automatically; sign-off and disposition dates are not invented before sign-off.

## Reviewable response form

The JSON record now carries the explicit choices above, while unsupported facts stay unknown or null. For later evidence review, supply only additional facts/decisions that are actually known:

```text
Fees: defer | evidence-backed bound
Agreement: unknown | standard online | negotiated agreement, with evidence
Maximum percentage and fixed total fees: unknown | documented values
Overhead inside USD 1: unset | proposed micro-USD
Prior attempts: unknown | attest none outside local synthetic reports | declare records
Prior allocation and attempt counts: unset | reconciled values with evidence
Retention: defer | accept documented retention | require stronger privacy
Logging evidence: unresolved | accept default-off inference | require stronger confirmation
Local retention: confirm 30/90 days after report sign-off | propose a revision
```

An owner answer is still subject to evidence and arithmetic checks. The technical token bound cannot be waived through this form. The private account/project, exact model/location, evidence hashes, run directory and finite time window must ultimately be bound in a separate live approval after all gates pass. No live approval, fee bound, zero prior allocation or retention acceptance is inferred from silence or an `Unknown` answer.
