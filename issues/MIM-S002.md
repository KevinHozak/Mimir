---
depends_on: []
id: "MIM-S002"
parent: ["MIM-E001"]
priority: "medium"
schema_version: 1
status: "in_progress"
title: "Define the model-benefit study controls and approval gate"
type: "enhancement"
---
## Outcome

Select one concrete observer question and record provider/account, allowed data, retention, maximum budget, call caps, kill switch, and telemetry. No calls are authorized by creating this issue.

## Source and scope

docs/ai-p14-rollout-runbook.md

## Acceptance

- [x] Record a measurable hypothesis and a matched rules-only comparison.
- [x] Document provider, account, privacy, retention, budget and stop conditions.
- [ ] Obtain explicit approval before running any paid or live-provider study.

## Controls drafted — 2026-11-08

[Owner choices recorded](../docs/model-study-s004-owner-decisions.md): defer fees, preserve unknown outside attempts/prior allocation, and accept documented retention subject to agreement verification. Executable privacy/retention and owner-run approval flags remain false until the condition and remaining gates pass. This story remains in progress.

The [prepared owner decision sheet](../docs/model-study-s004-owner-decisions.md) separates evidence-backed fee ceilings, no-outside-attempt attestation versus reconciliation, and retention/default-logging evidence acceptance versus stronger privacy. Its JSON/private drafts remain unanswered and non-executable. The [offline token investigation](../docs/evidence/model-study-v4-offline-bound-investigation-2026-11-08.md) verifies exact natural wire hashes but does not certify an affordable token bound. Owner policy decisions cannot waive technical proof or grant live execution automatically.

The [selected-account requirements review](../docs/evidence/model-study-v4-selected-requirements-2026-11-08.md) now verifies account-specific base token prices, not just public tariffs. The owner's agreement/tax/fee/outside-attempt information is unknown; it was not converted into zero fees or zero prior allocation. Token and all-in fee bounds and privacy acceptance remain open, with every live approval flag false.

Later [account comparison](../docs/evidence/model-study-s004-account-project-identification-2026-11-08.md) resolves the earlier account-selection blocker: the other cached account passes read-only project/permission/billing/API checks for Mimir, including USD currency. The private draft records it as a qualified candidate, with all live approval flags false. Token/fee bounds, logging/retention acceptance, reviewer gates and execution approval remain unresolved. No defaults or Cloud configuration were changed.

The latest [bound/account/privacy review](../docs/evidence/model-study-v4-bound-account-review-2026-11-08.md) confirms public tariffs but cannot certify live token/fee or privacy bounds. The configured candidate has no returned study permissions and its project/billing/cache/logging reads are denied. An intended account/project and supporting evidence remain required; all approval flags remain false. The v4 source freeze is unchanged.

The [v4 revision](../docs/model-study-s004-protocol-v4.md) now selects supported Gemini 3.5 Flash-Lite for offline migration and defines explicit reasoning/total-token accounting, US multi-region routing and conservative funded-attempt controls inside the unchanged USD 1 ceiling. It is not integrated or approved for calls; unknown token/fee bounds and account/privacy evidence continue to block execution.

[Study controls and approval packet](../docs/model-study-controls.md) define the question, matched baseline, exploratory human rubric, data/retention boundaries, proposed Vertex direction, USD 1 ceiling, 24 attempted requests, kill procedure and required telemetry. The user approved drafting that provider/budget proposal, not live execution. Exact account/project/region and current model/terms/pricing require manifest-specific admission.

Planning is complete locally. Keep this story in progress: explicit live-study approval remains unchecked, and S003 must first establish the frozen protocol and enforceable resource controls. Existing provider telemetry is not asserted sufficient for crash-safe cumulative cost admission. No calls, credentials, cloud changes or spending occurred.

Subsequent [v4 offline implementation and verification](../docs/evidence/model-study-v4-verification-2026-11-08.md) migrates the isolated adapter and durable reasoning/overhead/funded-attempt controls. Proven live token/fee bounds, account/privacy evidence, reviewer acceptance and explicit approval remain open. The inert private v4 draft contains no credential or executable approval; this story remains in progress.

The [2026-11-08 S004 approval packet](../docs/model-study-s004-live-approval-packet.md) now records current public documentation and private candidate account metadata. It is blocked: the pinned model retired on 2026-10-20; authenticated account/billing/privacy checks and a conservative all-in reasoning cost bound remain unverified. S003's offline guard evidence does not resolve these live admission gaps. Explicit approval remains unchecked; no inference or credential acquisition occurred.
