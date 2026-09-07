# Mimir Game Simulation

Date: 2026-09-07
Status: Historical simulation guide. The active runtime is the schema-3 First Glow implementation described in `docs/architecture.md`; village-era mechanics below are retained as design history, not current support.

Mimir is an observer game about a small society trying to live together under pressure. The player does not directly issue a command to every villager. Instead, the player watches an autonomous world, follows people and institutions, studies the consequences of decisions, and uses season boundaries to continue, branch, or restart the experiment.

The simulation is designed to make tradeoffs visible. It should be possible for cooperation, independence, and reflection to each produce useful results in some circumstances and costs in others. The engine does not select a winning philosophy.

## The core loop

The game loop is:

1. Create or load a world from a seed and scenario.
2. Advance the world by one authoritative tick.
3. Resolve villager needs, activities, movement, resources, weather, travel, dilemmas, and hazards.
4. Record objective events that describe what happened.
5. Attach social interpretations to selected events.
6. Save a complete checkpoint and broadcast the committed result to observers.
7. Continue until the season boundary, then review the season.
8. Continue the same history, branch from an earlier checkpoint, or reset with a new seed.

The important distinction is between the world and the observer. The world proceeds according to its rules even when the browser is only watching. The browser can animate and explain the result, but it is not allowed to invent or commit simulation outcomes.

## The world model

The engine's top-level `WorldState` contains:

- `seed`, `tick`, and `season`, which identify the deterministic run and its position in time;
- scenario settings such as starting food, harvest cadence, hunger pressure, and tick limit;
- villagers and their needs, traditions, belief signals, trust, activities, locations, and movement state;
- the shared granary and its contribution, distribution, status, and dissent counters;
- settlements, settlement-local food reserves, routes, and trade history;
- current weather and active hazards;
- resolved dilemma history;
- normalized world geometry and runtime object blockers.

The first world is Hearthmere, with a second settlement called Riverbend. The initial population is twelve named adults divided among three fictional traditions:

| Tradition | General emphasis | Typical pressure |
| --- | --- | --- |
| Hearthkeepers | Care, continuity, and shared protection | Common resources can be spent before consent is clear. |
| Freehands | Autonomy, initiative, and voluntary exchange | Shared work may have too few volunteers. |
| Seekers | Reflection, inquiry, and understanding consequences | Deliberation can delay urgent action. |

Tradition is not a fixed behavior script. Each villager also has numeric belief signals for cooperation, self-reliance, and reflection. Those signals change through activity and dilemma consequences, so two people from the same tradition can still respond differently.

## What one tick does

`advanceWorld()` is the engine's single-tick transition. It receives one complete `WorldState` and returns a new state, objective events, and deterministic social interpretations.

### 1. Derive deterministic inputs

Randomness is generated from the stored seed and current tick using a small deterministic pseudo-random function. The engine does not use ambient process randomness. Given the same starting state, the same engine version, and the same inputs, the same tick produces the same result.

This makes tests, saved checkpoints, and replay understandable. It also means a seed is not a promise that future versions of the rules will produce the same history; rule changes need compatibility handling or a new world/branch.

### 2. Update weather

Weather is reconsidered every fifteen ticks. The current implementation can produce clear, rain, cold, drought, or storm conditions, each with a severity and forecast.

Weather affects the next tick's economy and needs:

- rain adds one to food production;
- drought subtracts three from production;
- storm subtracts two from production;
- cold adds three hunger pressure;
- storm adds two hunger pressure.

A storm can also create an active bridge-washout hazard and block the River Road route.

### 3. Produce food

Food production uses the scenario harvest interval and amount. On a harvest interval the village produces the configured harvest amount; on other ticks it produces a smaller baseline amount. Weather then modifies that result.

The current default engine scenario is `The First Winter`, with 72 starting food, an eight-food harvest on harvest ticks, three-food baseline production on other ticks, and nine hunger pressure. The server's default season limit is 360 ticks. `scenarios/first-winter.json` currently describes a 60-tick planning/test configuration; it is not automatically loaded by the server at startup, so changes to that file do not by themselves change the server's imported default.

### 4. Choose villager activities

Each villager is evaluated independently, in stable array order. A villager may work, rest, share, collect, craft, meet, gather, or travel.

The current decision priority is intentionally small and legible:

- a villager with no personal food collects from the granary when the common reserve is available;
- a hungry Hearthkeeper shares when food is available;
- other hungry villagers work;
- otherwise, deterministic variation can choose craft, meet, gather, or rest.

The villager's hunger, food, tradition, current activity, current destination, and the common reserve all matter. This is a rules-based behavior model, not a general-purpose planning AI.

Activities have direct effects:

- rest improves rest;
- travel reduces rest;
- non-travel activity generally consumes rest;
- collecting adds personal food;
- sharing protects the sharing villager from some hunger while increasing cooperation and trust;
- work increases self-reliance;
- meeting increases reflection and can create an encounter event;
- occasional deterministic variation can reduce trust slightly.

All needs and belief values are clamped to the range 0-100.

### 5. Resolve movement

An activity normally has a location target: Fields for work, Granary for sharing or collecting, Workshop for craft, Meeting Place for meetings, Woodland for gathering, and Homes for rest.

The engine chooses an available target cell near the location anchor, validates it against the world definition, and calculates a route. The world uses four-direction movement and deterministic A* pathfinding with terrain costs and stable tie-breaking. Solid object footprints, bridges, and runtime-blocked objects can make cells unavailable.

The engine advances only part of a route per tick. While a villager is moving, the activity is recorded as `travel`; the intended activity is retained until arrival. Occupied cells and next-step collisions are checked so villagers do not all resolve to the same position.

The browser may interpolate movement for presentation, but the server's committed position and route are authoritative.

### 6. Apply needs and resource accounting

After activities are selected, the engine updates each villager's hunger, rest, trust, food, beliefs, activity, location, and position. It then updates the shared reserve:

```text
next reserve = current reserve
             + food produced
             - villagers who have no food to consume
             - sharing actions
             - collection actions
             + dilemma food effect
             - trade leaving Hearthmere
```

The reserve cannot go below zero. Settlement-level reserves are updated alongside the top-level reserve. The shared granary records production as contributions and sharing/collection as distributions.

### 7. Resolve regional travel and trade

At the current milestone, Jonan departs for Riverbend on tick 8. The River Road takes three travel ticks. On arrival, a deterministic food trade can move up to six food from Hearthmere to Riverbend, subject to the available reserve after that tick's accounting.

This is an early regional prototype rather than a complete market system. It establishes the boundary for future settlement-specific economies, routes, hazards, and exchange.

### 8. Resolve dilemmas

The first three authored dilemmas occur at ticks 12, 24, and 36:

1. The Hungry Neighbor — grant food, offer a measured loan, or refuse until work is offered.
2. The Common Repair — repair the bridge together, work privately, or split the effort.
3. The Broken Promise — explain and repair, enforce the promise, or release it.

The engine selects an involved villager deterministically, using hunger and a seeded circumstance-pressure value to identify the situation and choose among the available options. The choice is not a player menu yet; it is the current autonomous simulation adapter.

Each choice has explicit consequences for food, trust, one belief signal, dissent, and sometimes the institution status. A resolution is added to `dilemmaHistory` and emitted as a `dilemma` event. The decision is therefore part of the saved world history rather than only a line of dialogue.

### 9. Create events

Events are objective records of things that happened during the tick. Possible event kinds include:

- `tick` for the completed state transition;
- `harvest` for food production;
- `sharing` and `collection` for granary activity;
- `institution` for shared-store accounting;
- `encounter` for meeting-place gatherings;
- `dilemma` for authored value conflicts;
- `trade` for regional exchange;
- `weather` for a weather change;
- `hazard` for a newly created danger.

An event contains a stable ID, tick, kind, human-readable message, and related villager or settlement IDs. Events are evidence for the observer UI and for social interpretation; they are not themselves the entire state.

### 10. Interpret selected events

Objective events and subjective interpretations are separate by design. The default rules adapter currently interprets sharing and meeting events only:

- sharing is read as evidence that cooperation can protect the village;
- meeting is read as a chance to compare values and revise understanding.

Each interpretation links to its evidence event, names the villager doing the interpreting, gives a belief category, confidence, and trust delta, and records its source as `rules`.

An optional AI adapter may provide richer interpretations for selected social encounters. It is bounded by validation, evidence-event references, confidence limits, trust-delta limits, a timeout, and a budget. Invalid, missing, timed-out, or over-budget AI results fall back to deterministic rules. Historical playback uses the recorded interpretation and never calls live AI again.

## Institutions and dilemmas

The shared granary is the first institution. It is intentionally provisional at world creation:

- harvested food enters the common reserve;
- food can be distributed when a villager shares or collects at the granary;
- the institution tracks contributions, distributions, and dissent;
- a dilemma can make the institution active or change how villagers feel about it.

This is more than decorative lore. Institution state changes food outcomes, trust, beliefs, and later reporting. Future institutions should follow the same rule: a promise, council, norm, or agreement should affect real choices and resources or it should remain a character/social detail rather than a simulation mechanic.

## Seasons and timelines

The server treats a season as a bounded run of ticks. It refuses to commit another tick when the season limit is reached or when the active timeline is archived.

At a season boundary, the observer should be able to review:

- final food and food distribution;
- average and individual trust;
- hunger and rest pressure;
- activity and travel patterns;
- institutional contributions, distributions, and dissent;
- dilemmas and their consequences;
- weather and hazards;
- the people and relationships the observer wants to follow next.

The persistence model stores a complete checkpoint for tick 0 and every committed tick. A timeline can then:

- continue from its current endpoint;
- branch from any stored checkpoint, copying history through the selected tick into a child timeline;
- be archived without rewriting its past;
- be reset into a new seeded world.

Branching is the main experiment tool. It lets the observer compare what might have happened after an earlier state without destroying the original history.

## Persistence and replay

The Fastify server is the only live simulation writer. For a tick it:

1. loads the in-memory authoritative state;
2. calls the engine;
3. starts a SQLite transaction;
4. writes the new state checkpoint, events, and interpretations;
5. commits the transaction;
6. updates in-memory state;
7. broadcasts the committed result over Server-Sent Events.

If the transaction fails, the live state must not advance. A browser reconnects to the latest committed checkpoint and then resumes receiving live updates.

Replay is checkpoint-based. The browser can request a historical state by tick, keep that state separate from the live state, and display recorded events and interpretations. Replay is not a re-simulation and must not depend on current weather rolls, current AI output, or current code behavior.

## What the observer can see

The web client combines React panels with a Phaser world view. It can show:

- the current or selected historical world;
- villagers, activities, positions, routes, and destinations;
- locations, settlements, routes, weather, and hazards;
- objective event history;
- social interpretations and their evidence;
- design cards for characters, dilemmas, and the shared store;
- food, trust, hunger, travel, collection, and season metrics;
- timeline scrubbing, playback rate, return-to-live, and owner recovery controls.

The owner controls can manually tick, pause or resume scheduling, change the interval, branch, continue, reset, archive, and change runtime object blocking. These are operational controls, not a replacement for the autonomous simulation.

## Determinism and source-of-truth rules

Future changes should preserve these invariants:

1. Only the authoritative server commits world-state changes.
2. Browser animation never creates an outcome absent from committed state.
3. Objective events remain separate from interpretations.
4. Historical playback uses recorded results and does not invoke live AI.
5. Branching preserves parent history without rewriting it.
6. World definitions are validated before entering simulation state.
7. Schema and rules changes declare compatibility behavior for old checkpoints.
8. Any move beyond one simulation writer requires a deliberate persistence design.

## Current implementation versus future design

Implemented now:

- deterministic seeded ticks;
- twelve villagers, three traditions, needs, beliefs, trust, and activities;
- movement, terrain, object blocking, and replayable routes;
- Hearthmere, Riverbend, one route, travel, and a small trade event;
- food pressure and the provisional shared granary;
- three authored dilemmas with state-changing consequences;
- weather, storm hazards, and route blocking;
- objective event records and deterministic social interpretations;
- optional bounded AI interpretation with deterministic fallback;
- SQLite checkpoints, timelines, branching, reset, replay, and live updates.

Still planned or intentionally simplified:

- richer memory, relationship-specific history, commitments, and capabilities;
- more complete institution rules, negotiations, and conflict resolution;
- nuanced knowledge boundaries so villagers act on partial information;
- a larger set of settlements, economies, hazards, and social events;
- human temporary embodiment of an existing villager;
- production AI integration with measured quality and cost;
- final authored map art and immutable asset bundles;
- multi-user control leases and shared-world alpha operations.

The guiding test for new mechanics is simple: can an observer trace a meaningful change back through evidence? A strong feature should produce an understandable chain such as:

```text
weather or scarcity
  -> villager need
  -> activity or dilemma choice
  -> resource / trust / belief consequence
  -> institution or relationship change
  -> later behavior and season outcome
```

If a mechanic only produces flavor text and cannot affect decisions, resources, relationships, or future interpretation, it probably belongs in the presentation layer for now.

## Useful source locations

- `packages/engine/src/index.ts` — state model, tick transition, resource rules, dilemmas, events, and interpretations.
- `packages/engine/src/world.ts` — terrain, objects, validation, world import, walkability, and routing.
- `packages/engine/src/design.ts` — character cards and authored dilemmas.
- `packages/engine/src/social.ts` — bounded AI validation and deterministic fallback behavior.
- `packages/server/src/index.ts` — authoritative commit path, scheduler, persistence, timelines, and API.
- `packages/web/src/main.tsx` — observer UI, live/history state, controls, and presentation.
- `scenarios/first-winter.json` — checked-in scenario configuration used for planning/tests; verify runtime wiring before treating it as the server default.
