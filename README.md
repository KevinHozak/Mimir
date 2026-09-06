# Mimir: A Thousand Worlds

Mimir is a small autonomous world simulation about values, relationships, cooperation, conflict, and the consequences of different ideas about how to live well.

The first release will let one observer watch a shared fictional village, inspect its people and history, replay earlier moments, and review the outcome of bounded seasons. The simulation is intended to reveal tradeoffs rather than declare a single philosophy the winner.

## Current status

The current observer slice includes a deterministic engine, SQLite-backed Fastify server, persistent tile movement, replay controls, rules-based social interpretations, and a local owner-operations panel for timeline recovery. The project is still pre-alpha and the simulation remains intentionally small; no paid AI provider is connected by default.

The initial world is planned around:

- Twelve adult villagers.
- Three provisional value traditions: Hearthkeepers, Freehands, and Seekers.
- Six village locations and a seasonal resource pressure.
- Needs, values, beliefs, relationships, memories, commitments, and practical capabilities.
- A deterministic simulation engine with bounded AI interpretation for selected social encounters.
- Historical checkpoints, event records, replay, branching, continuation, and reset.
- Typed scenario parameters, with the initial season defined in `scenarios/first-winter.json`.

## Planned technology

- TypeScript across the browser, server, and simulation engine.
- Phaser for the animated 2D village view.
- React and Vite for the observer interface.
- Node.js with Fastify for the authoritative server and season scheduler.
- SQLite on persistent server storage for the initial single-world deployment.
- Server-Sent Events and HTTP for live updates and commands.

The initial hosting candidate is one paid Render service with a persistent disk, serving the frontend and Node server together. A small Google Compute Engine VM with SQLite and Cloud Storage backups is a possible lower-cost later deployment. The persistence layer should remain isolated so the project can migrate to PostgreSQL if scaling eventually requires it.

## Development principles

- Keep the simulation authoritative and validate every state-changing event.
- Keep objective events separate from villagers' interpretations of those events.
- Use seeded deterministic rules for reproducible tests and recorded AI results for historical replay.
- Treat AI as a bounded interpretation layer, never as an unchecked source of world-state changes.
- Preserve archived seasons and branches without silently rewriting history.
- Measure material wellbeing, distribution, cooperation, relationships, conflict, agency, growth, and experience separately.

## Plans

- [Simulation Game Plan](docs/2026-09-06_Simulation_Game_Plan.md) — world design, mechanics, stages, experiments, and success gates.
- [Web Development Plan](docs/2026-09-06_Web_Development_Plan.md) — application architecture, persistence, hosting, operations, and verification.
- [World Implementation Plan](docs/2026-09-06_World_Implementation_Plan.md) — phased scene, tile, object, collision, navigation, and replay implementation; criteria for reconsidering Godot.

## Repository status

The project is private while the design and implementation are being developed. Runtime databases, secrets, logs, and generated build output are intentionally excluded from version control.

## Local operations

Run the complete local world with `npm start`. It builds missing artifacts, starts the simulation server, and serves the browser client at `http://127.0.0.1:4173/`.

Run the server and browser with `npm run dev:server` and `npm run dev:web`. When `OWNER_TOKEN` is configured, enter that token in the owner panel before using state-changing controls. For a safe database copy, use `DATABASE_PATH=<path> npm run backup --workspace @mimir/server -- backup <destination>`. Scheduled local backups are opt-in with `BACKUP_INTERVAL_MS` and `BACKUP_DIR`.

Run the local browser flow with `npm run test:e2e --workspace @mimir/web` after building; it starts isolated local services and verifies authenticated ticking plus independent live/history observers.
