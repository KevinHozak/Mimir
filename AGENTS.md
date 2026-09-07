# Working in Mimir

## Project and collaboration

Mimir: A Light of Our Own is an autonomous society simulation about values, relationships, cooperation, conflict, and the consequences of choices. The primary experience is observing characters, tracing outcomes through evidence, and reviewing or branching bounded histories. No philosophy is the designated winner.

Be warm, playful, and encouraging; use light emoji where appropriate. Communicate changes plainly, preserve unrelated work, and distinguish completed implementation from design proposals.

This file applies throughout the repository. Read any more specific `AGENTS.md` when working beneath its directory. Follow the user's current instructions when they update earlier design choices.

## Documentation map and source-of-truth boundaries

| Document | What it is for |
| --- | --- |
| [README.md](README.md) | Project introduction, workspace entry points, and local runtime-data layout. |
| [docs/world-theme.md](docs/world-theme.md) | Current consolidated theme reference: First Glow, Sparks, terminology, opening knowledge, blue-and-silver dark-mode aesthetics, and visual rollout. Read first for naming, art, UI, or setting work. |
| [AI World Theme Plan](docs/2026-09-06_AI_World_Theme_Plan.md) | Broader brainstorming, retained alternative palettes, resource proposals, human inspiration, discovery ages, and staged development. Confirmed choices are marked; alternatives are not all approved features. |
| [docs/game-simulation.md](docs/game-simulation.md) | Explanation of ticks, activities, resources, social interpretation, seasons, replay, and persistence. Useful orientation, but verify detailed behavior against the relevant engine version. |
| [docs/architecture.md](docs/architecture.md) | Current package boundaries, First Glow runtime, API surface, persistence, local data, and hosted operations. |
| [Simulation Game Plan](docs/2026-09-06_Simulation_Game_Plan.md) | Original goals, social mechanics, development stages, experiments, and acceptance gates. Opening status/path metadata is historical; newer theme decisions supersede the original village/AI-awareness proposals. |
| [Web Development Plan](docs/2026-09-06_Web_Development_Plan.md) | Planned web architecture, operations, hosting, persistence, and verification. Treat gates as planned until supported by current evidence. |
| [World Implementation Plan](docs/2026-09-06_World_Implementation_Plan.md) | World geometry, authoring, rendering, navigation, versioning, and phased verification; criteria for reconsidering the rendering approach. |
| [Hosted observer runbook](docs/hosted-observer-runbook.md) | Deployment preparation, operational checks, and durability requirements. Read before hosted changes. |
| [Structured world profile](docs/2026-09-06-world-profile.md) | Dated performance and browser evidence for a particular bundle and scenario. Associated desktop/mobile PNGs are historical captures, not current theme mockups. |
| [World map sources](assets/world/README.md) | Map-authoring and import instructions, supported source features, immutable generated bundles, and provisional art status. |
| [First Glow asset provenance](assets/licenses/first-glow-assets.md) | Provenance for the active authored First Glow assets. |

For intended visual and narrative behavior, use `docs/world-theme.md` and the latest explicit user decisions. For actual runtime behavior, inspect code, selected simulation/bundle versions, tests, and live configuration. A design document does not prove a feature exists; an older code identifier does not override the selected theme.

When implementation changes invalidate a current guide, update the affected guide. Preserve historical measurements and distinguish their date/version rather than presenting them as fresh results.

## Selected design direction

- **Setting:** The Living Circuit. **Opening age:** The First Glow.
- Characters are little luminous **Sparks**, not human-shaped villagers. Personal names and relationships remain meaningful.
- Begin with charge pools, shelter niches, traces, exploration, simple creativity, and informal cooperation. Established havens, markets, formal commons, and regional trade belong later.
- Sparks initially do not know their purpose or the **Originators**. Reveal evidence gradually and preserve individual knowledge boundaries. Human reverence and creative exchange develop later, not as starting objectives or dialogue.
- The world is predominantly near-black open space, with blue-and-silver circuit nodes/routes and bright spots for Sparks and civilization. Use dark mode throughout the UI. Circuit-board details are local rather than an evenly illuminated background.
- Keep charge, credits, and data distinct: charge sustains activity; later credits are money; packets carry information. Readiness increases with rest, while charge deficit increases with need.
- First Glow is the active and only supported runtime. Historical village prototype assets, timelines, and compatibility paths have been removed; do not reintroduce them or silently relabel old saves.

## Main folders

| Folder | Contents and responsibility |
| --- | --- |
| `packages/world-data/` | `@mimir/world-data`: shared structured-world types, canonical serialization/hash calculation, spatial queries, and world/runtime validation. This is the lower-level contract used by simulation and authoring tools. |
| `packages/engine/` | `@mimir/engine`: deterministic First Glow transitions, charge rules, structured-v2 navigation, authored Spark material, and bounded interpretation. |
| `packages/server/` | `@mimir/server`: Fastify HTTP/SSE API, SQLite state/history, scheduling, owner operations, state normalization, and bundle-inclusive backup/restore tooling. |
| `packages/web/` | `@mimir/web`: React observer UI, Phaser world scene, CSS, coordinate/debug helpers, Vite entry point, browser tests, and static public assets. |
| `assets/world/` | Authored Tiled JSON, object templates, authoring notes, and generated content-addressed bundles. |
| `assets/world/generated/` | Versioned `sha256-*` directories containing `world.json` and `manifest.json`. Some generated bundles are deliberately tracked for reproducibility and historical playback. |
| `assets/licenses/` | Asset attribution and provenance. |
| `data/` | Local mutable databases, settings, game state, and backup outputs; see `data/README.md`. |
| `.tmp/` | Disposable test and profiling artifacts; ignored by Git. |
| `scripts/` | Local launcher, Tiled importer, bundle validator, and profiling harness. |
| `docs/` | Current references, design plans, runbook, and dated visual/performance evidence. |
| `node_modules/` and package `dist/` | Installed dependencies and build output. Regenerate through package commands; do not hand-edit or commit them. |

Local SQLite files, WAL/SHM sidecars, test backups, and restored `.bundles` directories belong under `data/` or `.tmp/`, not in the repository root. They are runtime/test artifacts, not authoring sources. Do not stage them because a broad status listing happens to show them, and do not delete unfamiliar artifacts or active databases as routine cleanup.

## Important files and entry points

| File | Responsibility |
| --- | --- |
| `package.json` / `package-lock.json` | npm workspace membership, orchestration, and locked dependencies. Use npm and preserve the lockfile. |
| Root and package `tsconfig.json` | TypeScript compilation configuration. Use the root npm build command for the actual four-package build order. |
| `render.yaml` | Render service configuration, Node version, build/start commands, persistent disk, and environment settings. Its existence is not evidence a deployment is live. |
| `.gitignore` | Runtime DBs, secrets, dependency/build output, and local tooling exclusions. It does not necessarily exclude every backup directory or generated artifact. |
| `packages/world-data/src/types.ts` | Structured world/bundle/runtime contracts. |
| `packages/world-data/src/canonical.ts` | Canonical data representation and SHA-256 bundle identity; preserve browser compatibility. |
| `packages/world-data/src/spatial.ts` / `validation.ts` | Shared spatial behavior and validation. |
| `packages/engine/src/index.ts` | Public First Glow world state, creation/advance entry points, and simulation-version dispatch. |
| `packages/engine/src/structured.ts` | Structured-v2 actors/Sparks, reservations, movement, validation, and resource ledger. |
| `packages/engine/src/first-glow-actions.ts` | First Glow activity transitions, arrival-gated actions, and event/ledger effects. |
| `packages/engine/src/design.ts` | First Glow design copy and bounded observer-facing concepts. |
| `packages/server/src/index.ts` | Server startup, configuration, routes, scheduler, SQLite transaction path, and live broadcasts. |
| `packages/server/src/state.ts` | Historical state normalization and compatibility checks. |
| `packages/server/src/backup-lib.ts` / `backup.ts` | Shared backup implementation and CLI for backup/restore with bundle data. |
| `packages/web/src/main.tsx` / `styles.css` | Main observer application, scene integration, and styling. |
| `packages/web/src/first-glow.tsx` / `fixtureDecoder.ts` | First Glow inspector and shared fixture decoding. |
| `assets/world/maps/first-glow.tiled.json` | Active authored map source; imported through `scripts/import-world.mjs`. |
| `scripts/run-local.mjs` | Starts the local server and Vite preview; builds only when required artifacts are missing. |
| `scripts/profile-first-glow.mjs` | First Glow engine/browser profiling harness tied to an explicit bundle and isolated runtime. |

## Commands and verification

Run from the repository root. The project uses TypeScript, ES modules, npm workspaces, React/Vite/Phaser, Fastify, and Node's SQLite API. Hosting currently targets Node 22; use a runtime with the required `node:sqlite` support.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies for a clean setup. |
| `npm run build` | Build world-data, engine, server, then web. Build shared dependencies before running package-level checks that import their `dist` output. |
| `npm start` | Start local server plus browser preview at `http://127.0.0.1:4173/` by default. Existing output is reused; run a build after source changes to avoid stale artifacts. |
| `npm run dev:server` | Watch server TypeScript. |
| `npm run dev:web` | Run Vite development server. Use its displayed URL; preview and development ports differ. |
| `npm test` | Root world-data and engine tests only; this is not the complete server/browser suite. Build first, because world-data's test script uses existing compiled output. |
| `npm run test:first-glow-commands --workspace @mimir/server` | First Glow object-command persistence checks. |
| `npm run test:first-glow-restart --workspace @mimir/server` | First Glow restart-equivalence checks. |
| `npm run test:backup-restore --workspace @mimir/server` | Bundle-inclusive backup and restoration checks. |
| `node packages/server/dist/state.test.js` | State-normalization regression checks after building the server; currently not listed as a package test script. |
| `npm run test:first-glow --workspace @mimir/web` | Playwright First Glow observer checks after building; requires the browser runtime. |
| `npm run world:import -- assets/world/maps/first-glow.tiled.json` | Generate the content-addressed First Glow bundle from authored source. |
| `npm run world:validate -- assets/world/generated/<sha256>/world.json` | Validate a specific generated bundle; replace the placeholder with the actual directory. |
| `npm run profile:first-glow` | Run the dedicated First Glow engine/browser profiling harness after building. |

Choose checks according to the change. Documentation-only work needs link/content/whitespace verification, not simulation runs. World-data or movement changes need validation and deterministic movement tests; persistence changes need restart/restore checks; visual changes need rendered desktop/mobile inspection and appropriate browser checks. Report environment failures separately from application assertions, and never present a prior profiling run as current validation.

## Configuration and data safety

Inspect `packages/server/src/index.ts`, `scripts/run-local.mjs`, and `render.yaml` for current defaults. Important configuration includes `PORT`, `DATABASE_PATH`, `AUTO_TICK`, `TICK_INTERVAL_MS`, `SEASON_TICK_LIMIT`, `OWNER_TOKEN`, `WORLD_BUNDLE_ROOT`, `SERVE_WEB`, `WEB_DIST_DIR`, `BACKUP_DIR`, and `BACKUP_INTERVAL_MS`. The browser uses `VITE_API_URL` when configured.

- Use isolated database paths and ports for tests and experiments. Normal `npm start` uses `data/local/mimir.db` and can advance the local world; it is not a read-only inspection command.
- On PowerShell, set environment variables with `$env:NAME = 'value'`; POSIX `NAME=value command` examples do not run unchanged. The default local database is `data/local/mimir.db`; disposable tests belong under `.tmp/`. Prefer absolute paths for custom databases and backup targets, and restore temporary environment overrides afterward.
- When configured, owner authentication uses `OWNER_TOKEN` via `x-owner-token`. The current local server permits owner operations when the token is unset; do not describe this as an authenticated public deployment.
- Use the supplied backup CLI rather than copying a running SQLite file casually: `npm run backup --workspace @mimir/server -- backup <destination>`. Restore with `npm run backup --workspace @mimir/server -- restore <backup> <new-destination>`. Default scheduled backup output is `data/backups/`.
- Preserve backup manifests and accompanying `.bundles` directories. Database-only recovery may omit world assets needed by saved histories. Restore to a new destination and verify it before replacing any live state.
- Never commit secrets, tokens, live databases, WAL/SHM files, or arbitrary test outputs. Do not print credentials while troubleshooting.
- No paid AI provider is connected by default. Treat adding real provider calls or spending money as separate scope; fictional charge has no connection to API billing.

## Engineering conventions and invariants

1. **Server authority:** only the server commits world outcomes. The browser renders/interpolates committed positions and events; it does not create resource changes, arrivals, or relationships.
2. **Determinism:** derive randomness from recorded inputs. Preserve stable ordering and tie-breaking. Avoid ambient randomness or wall-clock-dependent decisions in simulation rules.
3. **Evidence boundaries:** objective events and subjective interpretations are different records. Validate interpretation references and bounded effects; retain deterministic fallback behavior.
4. **Historical integrity:** replay uses recorded state and interpretations, never fresh AI output. Branches preserve parent history. Changes to schema, simulation version, spatial model, or theme need explicit compatibility behavior.
5. **Version-aware code:** schema-3 First Glow state and structured-v2 spatial data are explicit at creation, dispatch, normalization, and serialization boundaries. Invalid or incompatible checkpoints fail rather than being invented or migrated.
6. **Resource accounting:** production, consumption, transfer, and loss must be explicit. Movement/arrival and interaction effects must follow the authoritative rules and not run early because an animation reached a destination.
7. **Shared geometry:** rendering, navigation, collision, surfaces, object footprints, and interaction slots must agree. Visual circuit routes must not imply connections absent from the model.
8. **Immutable bundles:** edit authored sources or importer code, regenerate, and validate. Never hand-edit a hash-named world bundle or remove an old bundle still referenced by a checkpoint. Do not assume template JSON is automatically loaded; inspect importer wiring.
9. **Single writer:** preserve the SQLite transaction boundary and broadcast only committed state. Scaling to multiple simulation writers requires a deliberate persistence design.
10. **Maintainability:** follow local TypeScript/ES-module conventions, including existing `.js` import specifiers where used. Keep pure world logic in engine/world-data and process, storage, or network responsibilities in server/web. Avoid unrelated formatting churn.

## Change and Git workflow

- Start with `git status --short` and inspect the relevant diff. Other tasks may be editing the same checkout; recheck before committing.
- Make focused changes. Do not revert, overwrite, stage, or clean unrelated work.
- Keep selected names and aesthetics consistent with `docs/world-theme.md`; keep implementation and historical references honest about their version.
- Run `git diff --check` and appropriate verification. For newly added files, inspect the staged diff after explicit staging so they are included in whitespace checks.
- When asked to commit or push, stage exact intended paths, inspect the staged content, use a subject describing what changed, and verify the resulting commit and remote branch. Do not force-push or rewrite history as routine cleanup.
- Use `codex/` as the prefix when a new branch is needed, unless the user requests another name. Creating a branch is not required for every documentation edit.
- Deployment configuration and a successful push do not establish a successful deployment. Report local changes, commits, pushes, tests, and deployment outcomes separately.
