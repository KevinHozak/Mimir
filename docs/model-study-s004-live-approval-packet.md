# S004 live-study approval packet

Prepared 2026-11-08. **BLOCKED; draft for review, not authorization to execute.** No inference, token-counting or provider configuration calls were made during preparation. No credentials were created or printed. Public documentation retrieval and read-only Google Cloud CLI metadata checks are distinguished below.

Subsequent revision: [S004 v4 specification](model-study-s004-protocol-v4.md) selects supported `gemini-3.5-flash-lite` for offline migration and revises thinking, multi-region endpoint, reservation and funded-attempt requirements. It supersedes the replacement-decision portion of this packet; implementation, source freeze and all live approval gates remain pending. The v3 findings below remain dated evidence for the existing runner, not proof the replacement is integrated.

Subsequent implementation: the isolated v4 serializer, durable candidate/reasoning accounting and protected funded-attempt allowance are now implemented under a new offline source freeze. V3 manifest/guide/control bytes remain archived. The private `.tmp/model-study-approval-preparation/approval-v4-draft.json` is inert: no credential, executable price/bound object, approval window or approved run directory, and every live flag false. Account/privacy evidence, proof of token/fee bounds, independent review and explicit execution approval remain open. The remainder of this packet describes the earlier v3 review and must not be used as v4 live admission evidence.

[V4 offline verification](evidence/model-study-v4-verification-2026-11-08.md) is complete for the active source hash `4f9802ac746d456bd8d2b763cff40a2207c9dcc81fc1cec907d627c921b770c7`: 27 study tests, six synthetic histories, deterministic rules repeat and six-history desktop/mobile read-only checks passed. This completes technical migration checks, not the live account/privacy/token/fee/human approval gates.

[Current v4 token/fee/account/privacy review](evidence/model-study-v4-bound-account-review-2026-11-08.md): the configured principal is active and its existing credentials were accepted for an IAM test, but none of the three tested permissions were returned. Project/billing/API/cache/model-logging reads were denied with HTTP 403. Exact-model local tokenization and Cloud combined-output guarantees were not established; payer/fee/privacy evidence remains unavailable. Public reference rates are confirmed, but live bounds and approval remain unset. Read-only management checks were explicitly authorized; inference and `countTokens` were not called. The owner is being asked which account/project to verify next; no account/IAM/configuration changes were made.

Subsequent [account/project identification](evidence/model-study-s004-account-project-identification-2026-11-08.md) resolves that selection question among available cached identities: the second cached account passes all three tested permissions on the repository's Mimir project, with active project, enabled Vertex API and enabled/open USD billing. The private v4 draft now names this qualified candidate without granting live approval. The SDK default remains unchanged and ADC has a different quota project/unverified principal. Durable cache configuration is visible; model logging remains unverified after a 404. Token/fee/privacy/human approval gates remain open. Do not reuse the previous account's 403 results as the qualified candidate's current access status.

Latest [selected-account requirements review](evidence/model-study-v4-selected-requirements-2026-11-08.md) verifies the exact account contract prices for standard regional text input/output at USD 0.33/2.75 per million tokens, reconfirms USD billing, and reads the exact GA model catalog entry. Cache retention is `DURABLE`; the logging error specifically establishes an absent PublisherModelConfig, supporting default-off as an inference rather than an explicit disabled readback. The owner answered “Unknown” for agreement type, maximum tax/fee rate and outside-checkout attempts. Proven token bounds, all-in fees/prior allocation and accepted privacy/retention remain unresolved; no inference/countTokens or live approval occurred.

The [offline-bound investigation](evidence/model-study-v4-offline-bound-investigation-2026-11-08.md) reconstructs the three natural pre-treatment request bodies, matching every context/wire ledger hash at 6,064–6,109 bytes. These are not token counts or exhaustive live-path coverage. The full published input ceiling cannot fund the three-seed minimum, and no affordable combined bound is established. A separate [owner decision sheet](model-study-s004-owner-decisions.md) and inert JSON draft prepare fee evidence, prior cost/count reconciliation and retention choices. Any outside attempt requires cumulative/per-seed count enforcement as well as a prior-dollar allocation; the current guard does not import historical counts. All live gates remain closed and the source freeze is unchanged.

The [owner's recorded choices](evidence/model-study-s004-owner-response-2026-11-08.json) defer fees, retain unknown outside-attempt/prior-allocation status, and accept the documented retention policy **subject to agreement verification**. The condition remains unmet; executable retention/privacy approval flags remain false. No fee ceiling, zero prior spend, agreement exemption, settings mutation or live execution permission is inferred.

## Decision and frozen scope

The pinned `gemini-2.5-flash-lite` model retired on **2026-10-20** according to the current [model page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash-lite) and [lifecycle table](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions). Published prices and region listings do not establish availability after retirement. Do not approve this source-bound runner for live execution, substitute a model, or switch to the consumer Gemini API. A supported exact model/region decision, any necessary adapter/accounting repairs, fresh offline verification and a new source freeze must precede another approval packet.

Reference protocol: [revision 3](model-study-protocol.md), [manifest](model-study-protocol.json), SHA-256 `b5b614fc6079aa08da0c751e818a584f1746981f46f2554c165a952c942a5a46`. It remains `liveApproved:false`. This packet does not modify its 261 source fingerprints or frozen controls.

| Item | Proposed bounded scope |
| --- | --- |
| Sample | Seeds 2/4/8; six Sparks; 80 pulses; matched rules/model arms |
| Admission/review | Shared `event-rc-v1`; focal Spark 6; checkpoint 80 and admitted-event scenes |
| Attempts | At most 24 total, eight per seed, concurrency one; no automatic retry or budget reset |
| Payload/output | At most 16 KiB serialized request; 128 candidate output tokens |
| Timing | 10-second request/evaluator timeout; at most 30-minute generation window |
| Budget | Proposed USD 1 cumulative all-in ceiling, including prior allocations and uncertain attempts |
| Evidence | [Offline verification](evidence/model-study-v3-verification-2026-11-08.md): three synthetic requests, natural admissions at 52/48/52; no real-model benefit measured |

## Account and endpoint checks

Local SDK configuration contains a candidate account and project. Their exact identifiers are retained only in ignored `.tmp/model-study-approval-preparation/local-metadata.json` and `approval-draft.json`; they are not a selected or approved billing identity. The draft contains no credential and cannot admit a live run.

| Check | Result / required evidence |
| --- | --- |
| Local configuration | Read successfully; candidate account/project present; impersonation not configured |
| Authenticated principal | `gcloud auth list` failed; effective principal unverified |
| Project identity/access | Read-only project describe failed; ownership/effective IAM unverified |
| Billing linkage | Read-only billing project describe failed; enabled payer, currency, contractual rates and taxes unverified |
| API enablement | Read-only enabled-service query failed; Vertex AI enablement unverified |
| Failure diagnosis | Sanitized inspection of seven SDK logs did not classify the failure; do not infer an authentication or permission cause |
| Exact regional endpoint | Region unselected; frozen shape is `https://<region>-aiplatform.googleapis.com/v1/projects/<project>/locations/<region>/publishers/google/models/gemini-2.5-flash-lite:generateContent` |
| Credentials | None acquired for this task; future credential must be short-lived, held in memory and limited to the selected project; no key files or tokens in evidence |

No login, token printing, IAM change, API enablement, billing change, model availability probe or credential refresh was attempted. Failed metadata queries establish no account readiness. Before a future run, verify the exact account, project, payer and region through authenticated read-only evidence without exposing secrets; obtain a fresh manifest-specific owner decision.

## Privacy and retention review

The intended payload is bounded fictional Spark-local context: the current event, witnessed evidence, supported alternatives and minimized local interpretation material, plus the structured response schema. No personal Vault material, household records, source tree, account identifiers or secrets belong in prompt content. Project identity remains in the endpoint and authorization remains in headers. The byte ceiling is a size control, not a privacy proof; inspect an exact locally serialized request for the eventual supported adapter before approval. No real-provider payload was transmitted or captured in this preparation.

The current [data-retention guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) states Google does not train or fine-tune on customer data without permission/instruction. This is not a zero-retention guarantee:

- Request/response logging can be enabled for a project/model; its default-off status does not verify this project's settings
- Implicit caching is on by default, with documented retention up to 24 hours; durable caching on supported models adds a separate setting. Regional versus global residency matters. No cache settings were queried or changed
- [Abuse monitoring](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring) can retain flagged prompts for up to 90 days with human review for the applicable non-Frontier Google-model category. Contract-based exemptions are unverified; replacement models may have different categories/terms
- The intended runner uses `generateContent`, without grounding, tools, explicit cache-resource creation, Interactions storage or Live sessions. Do not extend these exclusions to an unreviewed replacement

Owner acceptance must explicitly cover the applicable contract, region, logging, caching, abuse monitoring and human-review terms. `privacyTermsVerified` and `retentionApproved` remain false. ZDR, an exemption and deletion from provider systems are not claimed.

The frozen local retention plan uses an isolated ignored `.tmp/model-study/<run-id>/`: retain minimized transient request/response/debug material for 30 days after report sign-off, then operator-review deletion of that run's transient files. Keep canonical study histories and bundle-inclusive recovery artifacts locally for 90 days after sign-off, then explicitly decide archive/delete; retain public-safe hashes, versions, aggregate telemetry and report in the repository. These are retention controls requiring operator disposition, not an implemented deletion job or a promise about provider retention. Do not delete unfamiliar existing artifacts automatically.

## Pricing and budget review

The current [published pricing page](https://cloud.google.com/model-garden/pricing) lists standard Gemini 2.5 Flash Lite text input at **USD 0.10 per million tokens** and output, including reasoning, at **USD 0.40 per million tokens**. These are reference prices for a retired model, not a quotation establishing availability, a verified payer rate or an executable cost bound. Cached, Batch, Flex and Priority prices are excluded; no discount is assumed. Taxes, payer currency/conversion, contractual rates, ancillary charges and prior allocation remain unknown.

Reference arithmetic only:

| Illustration | Calculation | Rounded reservation |
| --- | --- | --- |
| 16,384 input + 128 output | `(16384 × 0.10 + 128 × 0.40) / 1000000` | 1,690 micro-USD/request; 40,560 for 24 |
| Full published input context plus deliberately separate output/thinking maxima | `(1048576 × 0.10 + (65536 + 24576) × 0.40) / 1000000` | 140,903 micro-USD/request; 3,381,672 for 24 |

The first illustration is **not an approved maximum**: 16 KiB is not a proven token bound and candidate output is not proof of all billable reasoning. The second is a sensitivity illustration, deliberately allowing separate maxima without assuming how output and thinking limits interact; it exceeds USD 1 for 24 attempts and is not a verified all-in bound either. Natural offline feasibility yielded three requests, but that is not a contractual ceiling on live attempts.

The [thinking documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking) lists automatic thinking for 2.5 Flash Lite and an explicit zero thinking budget option. The frozen adapter sends no `thinkingConfig`; the study calculator reserves only 128 output tokens and validates candidate-token usage, without separately reconciling thinking usage. Therefore the current accounting does not establish the all-in reasoning bound. Resolve this for a supported model through explicit request controls and complete billable-usage reconciliation, or a documented conservative reservation, then refreeze and reverify. Do not set `pricingVerified:true` based on the small illustrative estimate.

The future ledger must satisfy `prior allocations + uncertain/in-flight reservations + completed allocations + fee/currency/tax reserve <= 1,000,000 micro-USD`. Unknown prior allocation must block rather than become zero. A timeout or missing usage retains its reservation; it must not become free or trigger a retry. If uncertainty prevents a defensible bound, do not dispatch. Cloud billing alerts are supplementary and are not a synchronous hard cap. No executable price object, funded attempt count or approval window is supplied here.

## Stop controls and remaining gates

The existing offline evidence exercises durable attempt/cost reservations, the isolated generation worker/watchdog, request/window deadlines, persistent stop, no retry after uncertainty, source binding, concurrency one and deterministic fallback. A stop prevents new admission and terminates local in-flight work; it cannot guarantee cancellation or refund of provider-side work already accepted. Preserve the reservation and review receipts before any later run. No live stop behavior or provider billing reconciliation is claimed.

- [ ] Select a supported exact model and regional endpoint; revise/version the frozen adapter/protocol if required
- [ ] Verify authenticated account, project, effective IAM, API enablement, billing identity/currency and prior allocation
- [ ] Verify applicable privacy terms, logging/cache settings and retention disposition; inspect exact minimized wire payload
- [ ] Establish a conservative all-in token/reasoning/fee bound and reconcile every billable usage category; reverify accounting/stop controls offline
- [ ] Complete S001 independent observer acceptance and resolve reviewer blinding: current source labels are visible, so blind human presentation is not established
- [ ] Refresh evidence for the resulting source freeze; obtain explicit owner approval binding that hash, private account/project/model/region, isolated run directory, price bounds, allocation and a finite window of at most 30 minutes
- [ ] Only after all gates pass, acquire the runtime credential without persistence and separately authorize execution

All draft approval flags remain false, `prices` and approval dates remain null, and `approvedFor` is `null`. S004 live acceptance remains unchecked. This packet is a completed preparation artifact with unresolved gates, not a request to approve the retired-model run.
