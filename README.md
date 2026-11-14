# Mimir: A Light of Our Own

## Hosted observer polling

The hosted read-only observer uses one serialized refresh every four minutes while its tab is visible. It opens no SSE connection and preserves the selected Spark, Follow view and historical view across refreshes. The header shows the update cadence. Local owner sessions retain their existing transport. The bridge can enforce polling-only access, compressed response limits and a fixed pilot deadline. See [operating controls](docs/spark-ai-online.md).

## Expanded frontier (local)

Run `npm run start:frontier` for the separate paused 12-Spark world at `http://127.0.0.1:4178/`. It uses `data/local/mimir-frontier.db`, enables goal loops and disables paid AI. Three regions offer exploration, real rendezvous contacts and cooperative trace weaves that improve rest. Existing saved worlds remain intact. Use **Fit map** for the whole frontier. See [S020 evidence](docs/evidence/first-glow-frontier-2026-11-13.md).

## Bounded AI goal world

The prepared `npm run start:ai:goals` launcher uses a separate paused goal world at `http://127.0.0.1:4176/`, sharing the original pilot allocation. S019 is locally qualified: the bounded-context live run selected 4 AI goals (3 completed), with no local wire rejections and verified restored replay. Its saved world is `data/local/mimir-ai-goals-compact.db`; both earlier worlds remain intact. Spending is stopped. See the [final live findings](docs/evidence/first-glow-goal-context-live-2026-11-13.md) and [local pilot guide](docs/spark-ai-local.md).

## Persistent online world development

The active [roadmap](docs/roadmap.md) targets a persistent online AI world under [MIM-E003](issues/MIM-E003.md). Human review is deferred to finalization.

Run `npm run review:goal-loop` for the first offline goal-loop fixture. It builds, runs a fake-provider explore/meet/mark scenario, and writes evidence under `.tmp/goal-loop-review-*`. It does not launch a hosted world or spend the AI allocation. Contacts, starting resources and reflection cadence are controlled test conditions; expanded authored regions and live goal qualification remain unfinished.

## Real Spark AI locally

Run `npm run start:ai` to open a separate, paused AI world at `http://127.0.0.1:4175/`. It uses the owner's existing Google Cloud credentials and a persistent **USD 5 pilot allocation**. Select **Resume clock** to continue; **Stop AI spending** persistently stops new requests. Read the [launch and budget guide](docs/spark-ai-local.md) before changing its data or configuration.


Mimir is an observer simulation of the Living Circuit during the First Glow. Watch luminous Sparks explore charge pools, shelter niches, traces, relays, and one another while the server commits deterministic history.

The active runtime is a schema-3 world bundle with `themeId: living-circuit`, `ageId: first-glow`, `simulationVersion: mimir-sim-v3-first-glow`, and `spatialModel: structured-v2`.

The village prototype is historical and no longer supported. First Glow is the only active runtime; old village saves are rejected rather than relabeled or migrated.

See the [current roadmap](docs/roadmap.md), [functional changelog](docs/changelog.md), [project history](docs/history.md), [World theme](docs/world-theme.md), [Current architecture](docs/architecture.md), and the [GitHub development workflow](docs/github-workflow.md).

## Run locally

```powershell
npm ci
npm run build
npm start
```

Open the URL printed by the launcher. The local API listens on `127.0.0.1:8888` by default, and the browser preview is served at `127.0.0.1:4173`. The server owns simulation outcomes, SQLite stores committed history, and the browser renders the current or replayed First Glow state. Override the API port with `PORT` when needed.

The writer binds to loopback by default and may run without `OWNER_TOKEN` for local development. Set `HOST` to a non-loopback address, set `SERVE_WEB=true`, or use `npm run start:hosted` only with an `OWNER_TOKEN`; those configurations fail closed without one. `npm start` supplies the exact loopback preview origin for CORS, including a custom `WEB_PORT`, and fails if that preview port is occupied. An explicit `OBSERVER_ORIGIN` overrides this default; an empty value keeps cross-origin reads disabled. Servers started directly still deny cross-origin reads unless an origin is configured.

Select a Spark, enter Follow, then open **Chronicle & history** to read its personal
chapter. Evidence links open the exact recorded timeline and pulse with a rendered
scene. **Return to live observer** restores the original Spark and Follow presentation,
even after selecting another Spark in history. Historical viewing does not advance
the world or request AI output. When starting the API and browser separately, configure
`OBSERVER_ORIGIN` to the browser's exact origin (normally `http://127.0.0.1:4173`).

**Resonance examples** are illustrative fixture scenarios with example evidence.
They are separate from recorded events and server-committed Resonance Anchors.

## Verify locally before a pull request

Run `npm ci`, then install Chromium once with `npx playwright install --with-deps chromium`.
Use Node 22 or newer with `node:sqlite` support. Run `npm run verify:local` for the complete
local build, server, engine, importer, authentication, stream, launcher, and browser suite.
It runs sequentially, stops on the first failure, and writes command logs and actual exit
codes to `.tmp/verification/<run>/summary.json`. No GitHub Actions run is required.
The tests use disposable databases and ports; they do not deploy or call paid providers.
Credential-shaped child output is redacted before console or log writes and fails the
run. The guard recognizes common tokens, bearer credentials, and private keys; these
patterns cannot guarantee detection of every secret. Overlong output lines are withheld.

The runner builds all workspaces once and restores that build's web output after launcher
tests rebuild it for disposable ports. If a preview is already open on a custom API, set
`$env:VERIFY_PREVIEW_API_URL = 'http://127.0.0.1:8898'` before running verification so it
keeps using that API afterward. Avoid running builds or other verification suites concurrently.

## Local data

Mutable local runtime data lives under `data/` and is ignored by Git:

- `data/local/` — the default SQLite database and future local settings/game-state files.
- `data/backups/` — local backup databases, manifests, and bundle sidecars.
- `.tmp/` — disposable test and profiling artifacts.

Authored maps, templates, fixtures, immutable generated bundles, and provenance remain under `assets/`.
