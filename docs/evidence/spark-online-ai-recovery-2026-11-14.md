# S021 AI recovery evidence — 2026-11-14

This source snapshot records diagnosis and implementation, not successful online AI qualification.

- At pulse 132, the world and offsite backups were healthy. Two new requests were uncertain with no token receipts; spending stopped and rules continued. Neither old hold was released
- Actual private-VM diagnostic: metadata credentials 200 in 20 ms, countTokens exhausted the 8.5-second bound; no generation dispatched
- The subnet had Private Google Access enabled and the VM had no public IP. Google excludes multi-regional rep.googleapis.com endpoints from that network path
- The run-owned private regional endpoint preserves the exact US hostname. At pulse 146, credentials returned 200 in 11 ms and countTokens returned 200 in 114 ms; generateContent was explicitly intercepted and blocked
- Before endpoint creation, the actual VM's early cleanup timer and guest-shutdown hook were installed and armed. The cleanup controller was SHA-256 pinned; actual deletion/recreation qualification and later paid-response results are recorded separately in private operator evidence
- Focused synthetic accounting/provider/cleanup checks passed 22 tests. Actual CLI admission through a release symlink passed. Full exact-source verification must be recorded for publication; these focused results do not substitute for it

The original USD 5 cap remains; USD 1 of uncertain-call holds remains guarded. USD 0.25 of the unchanged USD 2 hosting ceiling is reserved for private networking. The fixed hard cutoff remains 2026-11-15 05:24 UTC; the new endpoint-cleanup timer stops the writer at 05:19 UTC. No global endpoint, model replacement, public VM egress, personal payload or automatically renewed allocation is selected.

Private observations, recovery authorization and model/ledger results belong under `data/local/pilots/spark-pilot-20261114-0524/`, excluded from Git. S021 remains open until live choices, recovery and sustained operation are qualified; historical S008 attribution and S023 human review remain separate.
