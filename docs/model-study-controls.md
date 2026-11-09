# Living Lives model-benefit study controls

Date: 2026-11-08. Owner story: [MIM-S002](../issues/MIM-S002.md); parent: [MIM-E001](../issues/MIM-E001.md).

Status: proposed controls, not execution approval. The user selected drafting around Vertex AI/Gemini and a proposed USD 1 ceiling. No account/model, data transfer, live call or expenditure is approved by that drafting decision. S002 remains in progress until its explicit approval criterion is satisfied. [S003](../issues/MIM-S003.md) owns the executable preregistration and enforcement checks; [S004](../issues/MIM-S004.md) owns any approved execution.

## Question and decision rule

Does bounded model assistance help an observer explain and remember a Spark's choices and consequences, compared with the same observer experience using rules-only choices?

Primary hypothesis: across three matched seed pairs, model-assisted histories improve the median independently scored explanation/recall result by at least one point on a four-point rubric, with improvement on at least two pairs and no technical hard-gate failure. One point each: identify the focal Spark; identify a committed choice; identify a supported consequence; cite the matching event or utterance. Score correctness against committed public evidence, not preferred moral outcomes. Refusal, disagreement and quiet periods are valid outcomes.

Secondary measures: interest in continuing to follow the Spark (1–5), accurate delayed recall after ten minutes without viewing the history (0–4 using the same rubric), time to locate supporting evidence, and unsupported causal claims. A one-point median interest gain is a signal to investigate, not proof of general engagement. Changes in calls, word count, dialogue count or social activity are descriptive only.

This is a small exploratory within-reviewer study, not a population estimate. Report every pair and reviewer separately, ties and regressions included. No significance or generalization claim. No independent human reviewer means engagement/recall benefit is unmeasured, even if agent checks pass. Passing suggests a separately scoped replication, never automatic rollout.

## Matched comparison

- Proposed sample: seeds 2, 4 and 8; six Sparks; 80 authoritative pulses; checkpoints 0, 16, 40 and 80. Freeze exact source SHA, simulation/schema, authored bundle hash, initial state hashes, focal Spark rule, prompt/context and narrator versions before outputs in S003.
- Two arms per seed: true rules-only baseline and bounded model-assisted choices. A fake-provider arm may verify tooling but cannot replace either arm or count as model-benefit evidence.
- Begin each pair from the same initial state and use identical schedules, RC policy, feasibility rules, pulse limit, UI and rules-only Chronicle generation. Only the permitted decision provider differs. Later contexts may diverge because of earlier choices; record that divergence rather than claiming identical later prompts.
- Preserve First Glow RC 1, natural Heroes disabled, and ordinary rules-only behavior. No injected encounters, extra reflection opportunities, forced conversations, owner-created Anchors, replacement seeds or selected best takes. No eligible calls or no dialogue is a reported finding.
- Freeze a balanced A/B presentation order and conceal arm labels from the reviewer until scoring is locked. The operator may know the labels; record this limitation. Same timed tasks and review windows for both arms. The rubric and sample sizes cannot be changed after viewing outputs.
- At least one independent human reviewer must complete both arms of all pairs for an exploratory human result; log reviewer consent and pseudonymous ID locally. S003 must freeze the task wording, order allocation and scoring procedure. S001 observer acceptance remains a prerequisite to S004.

## Provider, identity and data

| Control | Proposed selection / execution gate |
| --- | --- |
| Provider | Google Cloud Vertex AI via the existing gated server adapter; no consumer Gemini/API-key substitution. |
| Model | Existing code pins `gemini-2.5-flash-lite`, temperature 0, at most 128 output tokens. Availability, current pricing, regional support and exact model identity are unverified here; verify official sources before admission. No silent replacement. |
| Account / project | Dedicated operator-approved billing account, project, runtime principal and region, recorded in a private approval manifest. All are currently **unselected/unverified**. Do not reuse hosted observer authorization or a historical project as approval. |
| Allowed outbound data | Synthetic authored Spark profile; minimized acting-Spark state, witnessed/communicated facts, bounded memory, event IDs and allowed alternatives from the existing Spark-local context packet. Freeze a representative redacted payload for review. |
| Excluded data | Other Sparks' private knowledge, future/hidden facts, unrelated histories, personal records, reviewer responses/identities, credentials, owner tokens, cloud configuration dumps and hidden reasoning. |
| Provider policy | Verify current training-use, abuse logging, retention/deletion, region and any exception terms for the selected account/service. Record source URLs and review date in the private manifest. Unknown or unacceptable terms block execution; an environment variable does not prove provider retention. |
| Local retention | Restricted ignored directory under `.tmp/model-study/<run-id>/`; minimized synthetic request packets and validated outputs for 30 days after report sign-off, then operator-reviewed deletion of only that run's transient files. Retain public-safe hashes, versions, aggregate telemetry and report in the repository. Keep canonical study histories and bundle-inclusive recovery artifacts locally for 90 days after sign-off, then explicitly decide archive/delete. No raw credential retention. |

Reviewers see only the existing public observer projection. Provider access to synthetic Spark-local private context does not authorize publishing that context. Do not record chain-of-thought. Public reports contain pseudonymous reviewer aggregates only, with explicit consent; otherwise keep human results private.

## Bounded resource controls

- Proposed cumulative **USD 1.00 all-in maximum** for this study, including preparation, failures, uncertain charges, any cloud infrastructure and applicable fees. No automatic replenishment, per-arm reset or new allowance after a crash. This budget is separate from the hosted S010 allocation and grants no access to that reserve.
- At most **24 attempted outbound requests across all seeds**, at most **8 per seed**, concurrency **1**, zero automatic retries, no live warm-up or probe calls outside these caps. Timeout and rejected responses consume attempts. Fallbacks remain in the scored history.
- Maximum serialized input **16 KiB UTF-8 per request**, maximum output **128 tokens**, configured request timeout **10 seconds**, and overall generation window **30 minutes**. A timeout must cancel the underlying request or terminate the isolated caller; retaining an unresolved in-flight request blocks resumption. Time spent by humans reviewing saved histories is provider-free.
- Before each request, reserve a conservative cost bound for the full allowed input/output plus non-token charges. Admit only if settled usage plus unresolved reservations plus the next bound fit USD 1. Unknown prices, missing usage or unbounded fees fail closed. Retain the full request reservation after ambiguous transport failure until reconciled.
- Persist attempt/cost reservations before dispatch in a run-wide ledger that survives process restart. No second process or resumed run can acquire a new allowance. No third-party paid evaluator, generated images/narration, hosting changes or cloud resource creation is included.

These are study requirements. The [S003 integration](model-study-protocol.md) implements the study-specific guard and worker cutoff; existing application provider telemetry alone remains insufficient. Inspection of the existing adapter shows a fixed model/output cap and process-local estimated-cost telemetry; its error path can report zero cost for an attempted request. That is insufficient proof of this cumulative budget, cancellation or crash-safe admission. S003 verifies the required external guard with synthetic failure tests; S004 still requires current account-specific price/retention admission and owner approval. Do not change runtime defaults merely to make this plan executable.

## Authority, telemetry and stop procedure

The server alone validates and commits supported choices and bounded effects. The provider never writes world state. World/Follow/Chronicle viewing, historical replay, branching from persisted outcomes and rereading saved editions must make zero provider requests. No fresh generation to reconstruct missing results.

Record run/arm/seed, source and bundle hashes, initial/checkpoint hashes, prompt/context hash and version, opportunity/suppression reason, request attempt ID, model identity, input/output usage, reserved and settled cost, latency, acceptance/rejection/fallback reason, selected alternative, public evidence IDs, and resulting checkpoint. Record cancellations, uncertain charges, cap stops and incomplete runs. Do not dump raw provider telemetry or arbitrary error bodies into public artifacts; sanitize against an explicit allowlist.

Stop before the next request on any privacy/knowledge violation, invalid world effect, duplicate commit, replay call, budget/attempt/deadline breach, unknown model or missing audit entry. Also stop after two consecutive request failures/timeouts/invalid proposals; retain rules-only fallbacks and report incomplete coverage. The independent supervisor must prevent new dispatch and cancel/terminate outstanding work without depending on the UI.

Operator kill procedure: stop the study dispatcher, cancel/terminate the isolated provider caller, set `AI_ENABLED=false` and `AI_RUNTIME_MODE=rules-only`, then verify no further attempts in the ledger and rules-only config. The existing environment switches take effect on restart; they are not an in-flight cancellation mechanism. S003 must demonstrate kill behavior with a fake transport before admission. Preserve history and a bundle-inclusive backup; restore only to a new isolated destination for comparison. Never rewrite failed outputs or replace them with a new model response.

## Approval packet and outstanding gates

Before any real provider interaction, present one frozen packet for explicit owner approval:

- Source/bundle/protocol fingerprints, matched sample and reviewer procedure; S001 disposition and passing S003 synthetic checks.
- Exact provider/model/version, region, private account/project/principal identifiers, current pricing and account-specific privacy/retention evidence.
- Allowed payload example, local retention destinations/dates, reviewed call/cost reservations, 24-attempt and USD 1 cumulative ceilings, timeout/cutoff/kill receipts, and rollback evidence.
- A bounded execution window and explicit statement: approve this manifest's S004 study only; no deployment, wider access or ongoing provider use.

Current disposition: **NOT APPROVED FOR EXECUTION**. Account/model admission, current provider terms/pricing, enforcement receipts, human-review arrangements, S001 and S003 readiness, and the owner's final manifest-specific approval remain outstanding. Drafting this document satisfies planning work, not those gates. Any material change requires a revised packet; silence is not approval.

References: [AI plan](ai-plan.md), [AI-P14 runbook](ai-p14-rollout-runbook.md), [Living Lives direction](living-lives-plan.md), and [historical offline study](evidence/first-glow-lives-p5-study-2026-09-20.md). Historical fake-provider results do not establish live quality.

## V4 study-specific migration

The [v4 protocol](model-study-s004-protocol-v4.md) supersedes the retired-model planning choice for the isolated study: Gemini 3.5 Flash-Lite, US multi-region Standard PayGo, explicit minimal thinking and all-category accounting. Keep USD 1 cumulative all-in maximum and structural attempt/time/input caps. Reserve at least USD 0.10 inside the cap for approved overhead and every request's approved input plus candidate/reasoning maxima; protect funding for all three seeds before dispatch. The four-request synthetic allowance is unverified for live use. Unknown token/fee bounds, account evidence, prior allocation or approval remain blocking. Normal application defaults and all live admission flags remain disabled/unapproved.
