# Philosophy World

Philosophy World is a small autonomous village simulation about values, relationships, cooperation, conflict, and the consequences of different ideas about how to live well.

The first release will let one observer watch a shared fictional village, inspect its people and history, replay earlier moments, and review the outcome of bounded seasons. The simulation is intended to reveal tradeoffs rather than declare a single philosophy the winner.

## Current status

This repository contains the design proposals. Implementation has not started yet.

The initial world is planned around:

- Twelve adult villagers.
- Three provisional value traditions: Hearthkeepers, Freehands, and Seekers.
- Six village locations and a seasonal resource pressure.
- Needs, values, beliefs, relationships, memories, commitments, and practical capabilities.
- A deterministic simulation engine with bounded AI interpretation for selected social encounters.
- Historical checkpoints, event records, replay, branching, continuation, and reset.

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

## Repository status

The project is private while the design and implementation are being developed. Runtime databases, secrets, logs, and generated build output are intentionally excluded from version control.
