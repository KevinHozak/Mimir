# Reliability, security, and maintenance review

**Date:** 2026-09-15\
**Scope:** Whole-project review of current First Glow code and hosted configuration, not a branch diff and not a claim that findings are fixed.\
**Evidence:** `packages/server/src/index.ts`, `state.ts`, `backup-lib.ts`, `observer-auth.ts`, `scripts/observer-bridge.mjs`, `render.yaml`, `.github/workflows/ci.yml`, observer UI, and related tests. Line numbers refer to that snapshot and will drift.

This is a risk ranking, not a delivery record. Completed hosted and AI gates remain in the [Changelog](changelog.md) and [hosted observer runbook](hosted-observer-runbook.md). Architecture and API claims still need verification against code; this review found at least one documented route that is not present on the writer.

**Address first:** serialize pulses, fail closed on a missing `OWNER_TOKEN` when the process is publicly bindable, and stop copying a live SQLite file as the backup.

The Firebase Hosting / Cloud Run bridge is a strong public gate. Remaining risk concentrates on the **single SQLite writer**: one Fastify entry file, fail-open owner auth, overlapping pulses, and backups that can race the scheduler.

## Ranked findings

| Rank | Severity | Area | Finding | Location |
| --- | --- | --- | --- | --- |
| 1 | Critical (reliability) | Pulse commit | Pulses are not serialized; AI work runs before the DB transaction; the scheduler does not await or catch failures | `packages/server/src/index.ts` (`commitPulse`, `restartScheduler`) |
| 2 | Critical (security, hosted/misconfig) | Owner auth | Unset `OWNER_TOKEN` allows pulse/reset/archive from any caller; CORS reflects any origin; process binds `0.0.0.0` | same file; `render.yaml` |
| 3 | High (reliability) | Backups | Scheduled backup checkpoints then `copyFileSync`s the live database while the writer stays open | `packages/server/src/backup-lib.ts` |
| 4 | High (reliability) | Compatibility | `/api/owner/reset` and `/api/owner/reset-v2` persist worlds that `normalizeState` refuses on restart | `index.ts`, `packages/server/src/state.ts` |
| 5 | High (integrity) | History | Resonance owner routes rewrite the current checkpoint in place | `index.ts` (resonance POST handlers) |
| 6 | Medium (security) | Disclosure | Unauthenticated `/health` (and `/api/backup/status` when observer auth is off) leak database path and backup destination | `index.ts` |
| 7 | Medium (reliability) | Commands | Unknown objects are skipped, then marked `applied` | `index.ts` (`applyFirstGlowPendingCommands`, `commitPulse`) |
| 8 | Medium (maintenance) | Server core | The writer is `@ts-nocheck` plus unsupported legacy routes in one large file | `index.ts` |
| 9 | Medium (maintenance) | Drift | `/api/reflection` is documented, bridged, and fetched, and is not implemented on the server | docs, bridge, web vs `packages/server` |
| 10 | Medium (maintenance) | CI | Hosted-auth, archive, AI-runtime, backup-replication, and command-acceptance tests exist but are not in CI | `.github/workflows/ci.yml` |

## 1. Overlapping pulses

`commitPulse` is async. It advances the world, awaits AI evaluation, then opens `BEGIN IMMEDIATE`. The interval timer calls `commitPulse()` with no lock, no await, and no `.catch()`.

Two HTTP pulses, or a pulse overlapping the scheduler (especially if AI latency exceeds `PULSE_INTERVAL_MS`), can:

- both read the same in-memory `state`
- both try to insert the same `(timeline_id, pulse)`
- leave memory and SQLite disagreeing
- throw an unhandled rejection from the timer

**Recommendation:** a single in-flight mutex (queue or reject 409), take the write lock before any await, `await` inside the timer, and `.catch()` without advancing. Do this before enabling the Vertex pilot on a live writer.

## 2. Fail-open owner control plane

`requireOwner` returns true when `OWNER_TOKEN` is unset. CORS is registered with `origin: true`. The server listens on `0.0.0.0`. Token comparison uses `===`, not a constant-time compare.

Unset-token local use is documented in `AGENTS.md` and [architecture](architecture.md). The danger is hosted or LAN exposure:

- `render.yaml` sets `autoDeploy: true` and `OWNER_TOKEN` with `sync: false`. A Render service that starts without that secret is a public writer (`SERVE_WEB=true`, `0.0.0.0`).
- Reflected CORS plus no token lets another origin CSRF pulse/reset from a browser.
- The Firebase path is safer: `scripts/observer-bridge.mjs` allowlists GET/HEAD only, requires an approved Google ID token, and never forwards owner routes.

**Recommendation:** require `OWNER_TOKEN` whenever `SERVE_WEB=true`, the listen address is not loopback, or a hosted start command is used. Keep fail-open only for explicit local loopback. Use `timingSafeEqual`. Tighten CORS to the observer origin.

## 3. Live-file SQLite backups

`createBundleInclusiveBackup` opens a second connection, runs `PRAGMA wal_checkpoint(FULL)`, closes that connection, then `copyFileSync`s the source file. The writer connection stays open. Pulses between checkpoint and copy can produce a torn backup. There is no `VACUUM INTO` or SQLite Backup API. [Architecture](architecture.md) already notes that the manifest checksums `world.json` rather than every copied asset.

**Recommendation:** `VACUUM INTO` (or the backup API) from the live connection, serialize with `commitPulse`, then package. Checksum every copied asset file.

## 4. Unsupported reset cannot restart

`normalizeState` throws unless the checkpoint is First Glow structured-v2. `/api/owner/reset` still calls `createWorld`; `/api/owner/reset-v2` still calls `createWorldV2`. Those checkpoints persist. The next process start runs `loadState` → `normalizeState` and exits. Empty non-`main` timelines hit the same `createWorld` fallback.

These routes are not a supported compatibility path. First Glow remains the only runtime; do not revive or migrate the removed prototype.

**Recommendation:** remove the routes or return 410. Startup should fail with a recoverable message, not a boot loop.

## 5. Resonance mutates committed history

Shelter Loom and Crossing of Voices handlers `UPDATE timeline_checkpoints SET state_json` for the current pulse, then broadcast. Replay of pulse N is no longer the original commit. That breaks frozen-checkpoint history.

**Recommendation:** apply choices as the next pulse (or a dated mutation record). Never rewrite an existing checkpoint.

## 6. Health and backup-status disclosure

`GET /health` is outside `/api/`, so observer auth never covers it. It returns `databasePath` and backup replication status (destination URI, last object, errors). `/api/backup/status` is the same payload under `/api/`. Fine on a private IAP VM; bad if the port is reachable without that gate.

**Recommendation:** `/health` → `{ ok, pulse }` for probes. Put replication detail behind owner auth.

## 7. Commands marked applied when they did nothing

If the object is missing, First Glow command application continues with no event. `commitPulse` then treats any command without a “could not” event as `applied`.

**Recommendation:** mark `rejected` or `noop` explicitly; only `applied` when blocked state actually changed.

## 8. Untyped writer and leftover routes

`packages/server/src/index.ts` starts with `// @ts-nocheck`. The same file still carries unsupported prototype metrics and owner reset routes. TypeScript cannot catch the pulse and auth mistakes above.

**Recommendation:** split the file and remove `@ts-nocheck` while deleting the unsupported reset paths.

## 9. `/api/reflection` drift

The route is treated as shipped:

- RC-P5 evidence describes delivery in an issue worktree
- `scripts/observer-bridge.mjs` allowlists the path
- `packages/web/src/main.tsx` fetches it on live refresh
- [Architecture](architecture.md) now records that the writer route was missing as of this review

There is no `app.get("/api/reflection")` in `packages/server`. The observer panel stays empty. This is documentation and UI drift, not proof the projection exists.

**Recommendation:** restore the route to match the contract, or stop advertising and fetching it. Correct architecture when the code is the source of truth.

## 10. CI gaps and duplicated allowlists

CI runs a solid First Glow core (world-data/engine tests, state normalization, commands, restart, backup/restore, Playwright, audio, importer, history sequencing). Scripts that already exist are not in that workflow:

- `test:hosted-auth-boundary` (`@mimir/web`)
- `test:public-archive`
- `test:ai-runtime`, `test:backup-replication`, `test:first-glow-command-acceptance` (`@mimir/server`)

Hosted auth is hostname-hardcoded to `mimir-realm.web.app` in `hosted-auth-boundary.ts`. Firebase Storage rules hardcode `khozak@gmail.com` separately from `PUBLIC_OBSERVER_EMAILS`. Those three allowlists can drift.

Each checkpoint embeds the full world bundle (`FirstGlowSettlement.bundle`). A 360-pulse season plus branches will grow SQLite and backups quickly (including the 1 GB Render disk in `render.yaml`). A later persistence change should store `contentHash` plus runtime, not a copy of `world.json` per pulse.

## Already in good shape

- Bridge: GET-only, 10.x upstream, Firebase token plus approved email, no `OWNER_TOKEN`.
- Bundle asset routes: hash regex, containment checks, checksums.
- Reset-v3: hash format and path containment.
- AI pilot: several explicit env gates before Vertex is enabled.
- Restart-equivalence and bundle-inclusive restore tests exist (even if backup *creation* is racy).
- Hosted UI can hide owner controls when `hostedAuthEnabled` is true.

## Recommended order of work

1. Pulse mutex plus await/catch on the scheduler.
2. Fail closed on hosted or public bind without `OWNER_TOKEN`; stop reflecting `*` CORS for mutations.
3. `VACUUM INTO` / SQLite backup API, serialized with pulses.
4. Delete or 410 `/api/owner/reset` and `/api/owner/reset-v2`; keep only reset-v3.
5. Stop rewriting checkpoints for resonance.
6. Remove `@ts-nocheck` from `index.ts` (split the file while doing it).
7. Reconcile `/api/reflection` and add the missing tests to CI.

This document does not authorize a hosted widening, a Vertex rollout, or a persistence migration. Those remain separate selected decisions with their own evidence.