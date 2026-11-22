# Preserved pulse-293 archive restore — 2026-11-21

The preserved local archive from the [November 15 shutdown qualification](final-backup-shutdown-local-2026-11-15.md) was independently extracted and restored to a new isolated temporary directory. The archive was 45,555,293 bytes and its SHA-256 matched the recorded value, `731db5f3f9718ab6762d3257ffe021329bfa3e6bdb52ebf0ff85be89e3da12f9`.

The server backup restore command verified the paired database and ledger checksums, allocation, and bundle contents. Additional read-only checks found:

| Check | Result |
| --- | --- |
| World and ledger SQLite integrity | Both passed `integrity_check` |
| Latest checkpoint | Pulse 293; normalized First Glow state passed validation |
| Sparks and checkpoints | 12 Sparks; 294 checkpoints |
| Database history | Table evidence matched the preserved backup receipt |
| Restored bundle files | 8, validated by the restore command |
| Allocation ledger | All 41 attempt rows and the budget profile matched the preserved working ledger |
| Uncertain requests and cap | IDs 11 and 12 remained uncertain; original USD 5 AI cap retained |

This was a local restore check of the preserved rehearsal archive. It did not establish a cloud restore, hosted startup, live systemd behavior, or final invoice attribution. No pilot was restarted or advanced, and live data was not touched. The original recovery artifacts remain preserved under `data/local/worktree-preservation-20261121/s021-polling/.tmp/shutdown-recovered-p293-archive/`; the isolated restore was temporary.
