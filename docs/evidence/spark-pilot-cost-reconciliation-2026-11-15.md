# S021 charge reconciliation — 2026-11-15

## Result

**Known AI token usage reconciles exactly with the posted Cloud Billing quantities. Final attributable dollar charges are not yet reconciled.** The available rounded project report shows no apparent overrun of the USD 5 AI budget or USD 2 hosting ceiling. Keep the original uncertainty holds and hosting reserves; this review neither releases them nor authorizes another run.

The signed-in read-only report was scoped to **Mimir** and **Mimir Realm Backups**, excluding the unrelated third project. AI uses charge dates **November 8–15**, covering the original allocation; the hosting comparison uses **November 13–15**, covering preparation, pilot shutdown and disk recovery. These are charge-period project totals, not exact resource/run-window attribution.

## AI: quantities match, final money remains open

| Evidence | Input tokens | Output tokens | Cost status |
| --- | ---: | ---: | --- |
| Recovered original ledger, 39 completed receipts | 90,548 | 3,927 | USD 0.040698 recorded token estimate |
| Posted Gemini 3.5 Flash Lite regional text SKUs, November 8–15 | 90,548 | 3,927 | Input USD 0.03 and output USD 0.01 at displayed cent precision |
| Difference | 0 | 0 | Exact quantities match; no exact currency CSV obtained |

The input SKU is `A078-09CB-E461`; output is `A841-F27B-EE62`. The shorter November 13–15 report had 88,999 input and 3,841 output tokens. Expanding the dates resolved that apparent discrepancy: the additional 1,549 input and 86 output tokens belong to the earlier allocation period, rather than a demonstrated missing final request.

The ledger contains **41 attempts: 39 completed, two uncertain (IDs 11 and 12)**. The estimate includes USD 0.008844 for the original ten completed attempts and USD 0.031854 for later known costs. Retain USD 1 in uncertain-request holds. Current conservative AI accounting remains **USD 1.181396 / USD 5**: twice USD 0.040698, plus USD 1 holds and USD 0.10 contingency. Guarded headroom is USD 3.818604; it is not permission to restart the expired pilot.

The visible Vertex AI service row shows about USD 0.04 usage and USD 0.02 subtotal after displayed savings; individually rounded SKU savings/subtotals do not add exactly. Matching aggregate quantities does not map charges to individual uncertain request IDs, prove those requests can never be charged, or establish invoice finality. Do not release their holds or call a reserved USD 0.50 per attempt an actual charge.

## Hosting: posted amounts below the conservative allowance

The November 13–15 service report displayed:

| Service | Usage-cost column | Subtotal after displayed savings |
| --- | ---: | ---: |
| Networking | USD 0.26 | USD 0.05 |
| Cloud Run | USD 0.22 | USD 0.00 |
| Artifact Registry | USD 0.01 | USD 0.01 |
| Cloud Storage | USD 0.01 | USD 0.00 |
| Compute Engine | USD 0.00 | USD -0.08 |

Non-AI usage-cost rows sum to **approximately USD 0.50 at display precision**, not an exact pilot invoice. Compute Engine's zero usage-cost row includes separate negative free-tier-discount SKUs: positive core/RAM rows show USD 0.24 and USD 0.13, canceled by corresponding negative usage rows. Therefore the service usage-cost column is not an undiscounted list-price sum. Other service credits also apply. The full project filtered subtotal, **including AI**, displayed **USD -0.01**. This is a credited project total, not a cash refund, free-hosting guarantee or extra budget allowance. Do not subtract project-wide credits from a different cap to manufacture headroom.

Itemized quantities include 12.07 private-endpoint hours, 8,616.65 Cloud Run CPU seconds, 4,306.2 GiB-seconds memory, 11,629 requests, 0.51 GiB Cloud Run transfer, 0.05 GiB-month Firebase Hosting storage and 2 GiB-month persistent-disk capacity. Several charges display USD 0.00 at cent precision; that does not establish exact zero. The report also includes baseline storage/networking activity and does not isolate the temporary recovery helper or each deployment.

Retain **USD 1.923414** in prior conservative hosting accounting plus the **USD 0.04 recovery reserve**, totaling **USD 1.963414 / USD 2** with USD 0.036586 conservative headroom. The smaller posted report does not settle delayed/unattributed charges or release this reserve.

## Why final billing remains open

- The November statement is not available: the latest displayed statement is October 31. The invoice page says previous-month documents are usually available by the fifth business day of the following month
- All five displayed BigQuery billing export types are disabled: FOCUS, standard usage, detailed usage, pricing and CUD export. None was enabled
- The report CSV download timed out; no CSV was obtained. Currency rows remain rounded, with no exact project/resource-level invoice reconciliation
- Project date filters include preparation/baseline activity, not solely the 24-hour pilot. Retained storage and possibly delayed recovery charges need separate attribution

Fresh inventory confirms the original VM is **TERMINATED**, with only its original **30GB standard persistent disk** remaining. No temporary reader/clone remains in the project inventory. Stopping a VM does not delete retained storage; this review leaves that disk and backup/artifact storage untouched and does not assert future storage is free or final charges have stopped accruing.

## Actions and S021 state

This review performed local read-only ledger analysis, existing resource/service inventory reads and Cloud Billing UI filtering/download attempt only. It created no resources, enabled no APIs or exports, ran no paid BigQuery jobs, contacted no inference provider, restarted nothing and deployed nothing. Private account identifiers, unrelated project costs, payment details and raw financial records are excluded from this summary.

S021 remains **in_progress**. Record known AI token quantities as reconciled; retain final currency/invoice attribution, uncertain holds, exact hosting/resource attribution and retained-storage disposition as open. PR #341 merged the shutdown repair, but it remains undeployed. Genuine hosted auth/return qualification also remains open; the expired pilot stays stopped.

[Machine-readable reconciliation](spark-pilot-cost-reconciliation-2026-11-15.json) · [Final recovery](spark-pilot-final-recovery-2026-11-15.md)
