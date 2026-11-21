---
depends_on: []
id: "MIM-S025"
parent: ["MIM-E003"]
priority: "high"
schema_version: 1
status: "open"
title: "Reconcile bounded pilot billing and retained storage"
type: "enhancement"
---
## Outcome

Reconcile or explicitly disposition final invoice, pilot and resource attribution, and retained-storage costs for the stopped S021 pilot, preserving uncertainty when source data cannot resolve it.

## Context and boundaries

The November 21 read-only SKU-grouped report for Mimir and Mimir Realm Backups matched 90,548 input and 3,927 output tokens for November 8–15. The November 16–21 filtered total displayed USD 0.00 with no inference SKU; these are project-wide figures including credits and baseline activity, not final run-level attribution. See [MIM-S021](MIM-S021.md) for CSV precision and the fresh Edge confirmation. The historical inventory recorded the original VM terminated and its 30 GB disk retained. The pilot remains stopped.

Retain both USD 0.50 holds for uncertain requests 11 and 12, conservative AI accounting of USD 1.181396 / USD 5, and hosting/recovery accounting of USD 1.963414 / USD 2 until a separately supported decision. Do not treat reservations as actual charges or project credits as new budget. This issue authorizes no spending, paid queries, API/export enablement, resource changes, hold release or pilot restart.

## Acceptance

- [ ] Review the final relevant invoice and available no-cost billing evidence when available; reconcile known token quantities and costs while distinguishing estimates, savings, baseline project activity and charge periods.
- [ ] Attribute hosting, recovery and retained-storage costs to the pilot where supported; explicitly document any amounts or request IDs that cannot be resolved from available evidence.
- [ ] Record an owner decision on retained storage and the disposition of uncertain holds and reserves, supported by evidence and separate authorization for any resource or accounting change.
- [ ] Record final amounts, sources, dates and residual uncertainty without exposing private billing records or implying a renewed allocation.
