# First Glow command and isolated restore evidence

Date: 2026-09-08
Branch: `codex/issue-17-command-restore`

The focused acceptance suite uses disposable databases under `.tmp/` and verifies:

- pending commands survive a server restart, apply in request order, and return the same result on idempotent retry;
- blocking an occupied First Glow footprint is rejected without persistence;
- branching before application excludes the pending command, while the parent checkpoint remains byte-identical;
- bundle-inclusive backups retain multiple First Glow bundle versions and every referenced asset;
- a restored server starts with only the restored bundle root and continues a timeline;
- missing restored assets fail before the server becomes healthy with an explicit First Glow asset error.

The active runtime remains schema-3 First Glow with `structured-v2`; no village compatibility path or off-host storage provisioning is included.
