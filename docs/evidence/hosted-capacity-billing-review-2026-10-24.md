# MIM-S010 billing review — 2026-10-24

## Reconciliation result

The cumulative conservative allocation remains **USD 0.1469663581 against USD 0.15**, leaving USD 0.0030336419 of allocated headroom. This is a bounded allocation, not a measured invoice. It retains USD 0.105 for prior work and unresolved charges, USD 0.004327455910714285 preparation, and USD 0.037638902189285714 retry reserve. Do not release uncertainty reserves or treat the headroom as permission for another run.

The read-only Cloud Billing report was scoped to **Mimir and Mimir Realm Backups**, charge dates **October 23–24, 2026**. Its rounded service rows show Cloud Run USD 0.10 before savings, Networking USD 0.08 before savings, and net USD 0.00 after displayed savings. Artifact Registry and Compute Engine display USD 0.00 at that precision. These are posted two-day project totals: they include other activity and baseline service operation, cannot isolate S010, and do not prove exact zero cost or free-tier eligibility. The report warns that costs can change once fully monetized.

All account billing export modes are disabled; no accessible BigQuery dataset was found in the Mimir project. The CSV download timed out and no CSV was obtained. No exports, APIs, permissions or query jobs were enabled. The private redacted export-status record is retained under `.tmp/mim-s010-billing-2026-10-24/`; no billing-account identifiers or unrelated project charges are published here.

A fresh Monitoring reconciliation stopped at operator authentication before API reads. Consequently the [attempt 10 posted quantities](hosted-capacity-journal-retry-2026-10-24.md) remain historical measurements, not refreshed values. Missing Hosting transfer is still unknown, not zero. Existing Artifact Registry retention is visible as a billing category but its rehearsal-only share is not independently reconciled; it remains unresolved within the carried reserve rather than being asserted free. Neither a complete actual-quantity reconciliation nor final attributable billing has passed.

## Readiness consequence

Recommend **retain limited staging; hold audience and availability expansion**. Runtime, timed recovery and cleanup passed in attempt 10; financial allocation fits the approved ceiling, but final financial attribution remains open. See the [prepared readiness decision](../hosted-observer-readiness-decision.md).

Implementation was merged in PR 319, with all 76 full local checks passing for source `68e8ea280ee2e0488eb6981760f6cf8ab58685c9`; merged `main` is `4b085502d326ea5505b2867b5fed4df5c1f31bd7` with the same tested tree. This review changes documentation and the local issue only. No clients, rehearsal, pulses, provider calls, deployment, access changes or paid query jobs were started.

## Billing evidence limits

Google documents that reporting frequency varies by service and export delivery has no latency guarantee. Enabling an export would be a separate operational decision, not an immediate guarantee of retrospective attribution. [Google billing export timing](https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables).

Machine-readable status: [billing review JSON](hosted-capacity-billing-review-2026-10-24.json). Financial gates intentionally remain false.
