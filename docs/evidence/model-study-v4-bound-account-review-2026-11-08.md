# S004 v4 token, fee, account and privacy review

Date: 2026-11-08. **Review complete for the configured candidate; live admission remains blocked.** [Machine receipt](model-study-v4-bound-account-review-2026-11-08.json). This is additional evidence for the unchanged [v4 source freeze](../model-study-protocol.json), SHA-256 `4f9802ac746d456bd8d2b763cff40a2207c9dcc81fc1cec907d627c921b770c7`. It does not promote a synthetic envelope into an approved live bound.

The user explicitly allowed read-only Cloud billing, IAM and configuration metadata checks while continuing to prohibit inference and `countTokens`. Existing credentials were used only for those management checks. No new login, key creation, IAM change, service enablement, cache/logging update or provider generation occurred. SDK credential refresh/cache handling may occur during authenticated reads; token values were never printed or persisted by the review helpers.

## Verified and unresolved requirements

| Requirement | Evidence and result | Admission status |
| --- | --- | --- |
| Exact model and location | Current official model page lists GA `gemini-3.5-flash-lite`, `us` Standard PayGo, 1,048,576 context tokens and 65,536 maximum output tokens | Public model limits reviewed; project access not verified |
| Small-payload input bound | The official Python SDK loader does not explicitly map `gemini-3.5-flash-lite`; no tokenizer alias or asset was downloaded | 16,384 tokens remains an unverified fixture bound |
| Combined reasoning/output bound | Cloud documentation counts thinking as billable output and describes `maxOutputTokens` as response length, but the reviewed Cloud pages do not establish the exact combined ceiling for this model/operation | Neither 128 combined tokens nor the fixture's separate 65,536 reasoning allowance is certified |
| Standard tariff | Current non-global text rates: USD 0.33 input / 2.75 output including reasoning per million tokens, unchanged across the listed 200K threshold | Public reference rates verified; account-specific all-in price unverified |
| Fees, currency and prior allocation | Billing read denied; payer currency, tax/contract terms and any outside-checkout allocation unavailable | USD 0.10 overhead remains proposed; no all-in fee ceiling certified |
| Configured principal | Local account-ID-only database query and SDK active-account listing match the configured account; existing credentials were accepted for an IAM test | Configured identity confirmed for metadata; not approved as the study principal |
| Project permissions | `testIamPermissions` returned HTTP 200 with none of `resourcemanager.projects.get`, `serviceusage.services.use`, `aiplatform.endpoints.predict` | Execution-related service-use/predict permissions and metadata-read requirement not demonstrated |
| Project/billing/API reads | Project, billing linkage and service-status GETs returned HTTP 403 `PERMISSION_DENIED` | Project state, enabled API, linked/open billing account and payer unverified |
| Cache configuration | Selected US multi-region project's cache-config GET returned HTTP 403 `IAM_PERMISSION_DENIED` | Actual cache/retention settings unverified |
| Request-response logging | Exact model/location `fetchPublisherModelConfig` GET returned HTTP 403 `IAM_PERMISSION_DENIED` | Actual logging configuration unverified |
| Agreement and retention acceptance | Current public terms reviewed; exact online/Master Agreement and any exemption not established | Privacy/retention approval remains false |

The configured project matches the repository's Firebase project candidate. This is an identity consistency check, not proof of existence, access, billing readiness or suitability for model charges. A 403 may conceal resource state; do not infer a disabled API or nonexistent project from these responses. The owner has been asked which account/project pair should be verified next. Do not activate an alternate account or change permissions automatically.

## Token-bound findings

The [model page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash-lite) establishes the published context and maximum output sizes. The [Cloud generation-parameter guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/content-generation-parameters#max-output-tokens) does not, by itself, state that the configured response limit is an exact combined thinking-plus-answer guarantee for this model. [Cloud thinking guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking) confirms that thinking tokens are billable and `MINIMAL` is an effort setting, not zero reasoning. The official [Developer API thinking guide](https://ai.google.dev/gemini-api/docs/thinking) has a combined-token statement tied to **Interactions**; that statement was not borrowed as proof for this Cloud `generateContent` route.

The current [official SDK tokenizer loader](https://github.com/googleapis/python-genai/blob/main/google/genai/_local_tokenizer_loader.py) maps some neighboring Gemini models but not the exact selected ID. Its unsupported-model path raises an error. The [local tokenizer implementation](https://github.com/googleapis/python-genai/blob/main/google/genai/local_tokenizer.py) is also explicitly experimental. Do not substitute Gemma, Gemini 3.5 Flash, Gemini 3.1 Flash-Lite or the retired model's tokenizer and claim exact validation. No package, model vocabulary or gated asset was installed/downloaded for this review.

The earlier 3,169-byte synthetic wire example proves serialization size only. Neither byte length nor a characters-per-token heuristic certifies all prompt/schema overhead. No actual token estimate is promoted into `inputTokenUpperBound`.

Using only the full published input-context ceiling and the verified tariff, the conservative **input-only** reservation is:

```text
ceil(1,048,576 × 0.33) = 346,031 micro-USD per request
3 × 346,031 + 100,000 overhead = 1,138,093 micro-USD
```

That exceeds the 1,000,000 ceiling before output, reasoning or extra fees. This shows the full-context reservation cannot fund the minimum three-seed study; it does not predict actual prompt cost. Do not raise the cap, omit seeds, or begin a knowingly underfunded study. The smaller synthetic reservation remains test arithmetic until its token maxima are independently supported.

The [Cloud token-counting documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/get-token-count) states `CountTokens` has no charge and lists a 3,000 requests/minute limit. That does not authorize sending it data: **zero `countTokens` requests were made**. A future separately authorized counting step must use the exact model and full token-relevant request, meet privacy requirements first, and bind counts to payload hashes; it cannot prove unrelated future payloads or resolve reasoning limits on its own. A model-specific supported offline tokenizer or authoritative bounded-tokenization contract would be another route.

## Fee and allocation findings

[Published pricing](https://cloud.google.com/model-garden/pricing) supports the standard non-global reference rates. The adapter excludes grounding, tools, explicit cache creation/storage, media, Batch/Flex/Priority and continuation requests; no discounts or promotional credits are needed for its reservation arithmetic. Schema/prompt overhead must still be covered by the input bound.

The pricing page uses USD and directs non-USD payers to currency-specific SKUs. The denied billing reads prevent verification of actual payer currency and contractual/tax terms. A USD 0.10 reserve is not evidence that every fee fits it, and credits are not a hard cap. `requestFeesMicrousd`, an approved overhead bound and `pricingVerified` therefore remain unset/unapproved in the private draft.

All seven inspected local integration reports are synthetic, with no unknown modes and no live reports. That supports zero known live attempts in those local reports only; it does not establish an approved cumulative prior allocation across other directories, machines or operators. Require explicit reconciliation/owner evidence before assigning a live `priorAllocationMicrousd` value. No paid billing-export query was run.

## Privacy requirements and disposition

The current [retention guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention) states managed-model customer data is not used for training/fine-tuning without permission or instruction. It also documents default caching and potential project/model request-response logging. Default behavior is not evidence of this project's current settings. In-memory and supported durable caches may retain data for up to 24 hours; the actual project configuration was not readable. No cache/logging settings were changed.

The [abuse-monitoring page](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/abuse-monitoring) documents up to 90 days of flagged-prompt retention and possible human review for the ordinary Google-model category, with agreement-dependent exemptions. The selected model is not listed in that page's Google Frontier scope, so ordinary Google-model treatment is the review inference; it is not proof of an account exemption or accepted agreement. Do not promise ZDR, CMEK coverage of abuse logs or exclusion from human review.

Approval must record the exact account agreement, any exemption, actual logging/cache settings, permitted US multi-region retention and any accepted human-review terms. Keep the existing fictional Spark-local payload restriction, no personal Vault/household data or credentials in prompts, one-turn `generateContent` exclusions, and local 30/90-day post-sign-off retention with owner-reviewed cleanup. None of these local controls waives provider-side retention.

## Remaining actions

1. Owner identifies the intended account/project; repeat only the necessary read-only checks for that pair. The current candidate cannot pass account admission from the observed permissions
2. Obtain exact-model input tokenization evidence and a Cloud `generateContent` reasoning/combined-output guarantee; do not use a neighboring model or an Interactions-only statement
3. Verify payer currency, taxes/contract terms, all-in fee allowance and prior allocation; prove the conservative minimum three-seed treatment fits USD 1
4. Read actual cache/model logging configuration and establish agreement/exemption evidence, then obtain explicit retention acceptance
5. Bind approved evidence hashes only after those gates pass. Keep S001/reviewer disposition and explicit source-specific owner approval separate

The source freeze and its 266 hashes are unchanged. No executable approval was created; private v4 flags remain false, prices/bounds/window/directory remain null, and effective admitted live requests remain zero. This evidence-only review does not require another simulation run or invalidate the existing 27-test/six-history offline verification. No commit, push or deployment occurred.
