# Mimir Game Simulation

## Expanded First Glow frontier — S020, local 2026-11-13

Fresh server worlds now select `first-glow-frontier-v1` (`sha256-1ee5c0af5f365d8dee6aaef585dcc986d4286074c84f24a88ec4e77fcb0a079e`): a 64×40 authored map with Charge Reach, Quiet Fold and Shard Verge, 19 sites, limited crossings, four charge-pool locations, four conventional shelter niches, three two-contact rendezvous traces, five discovery/cache sites and two trace weaves. Charge pools still draw from the existing shared regional source ledger; their access differs by geography/contact availability, not separate invented stocks. Assets reuse the recorded repository-authored SVGs.

The optional bundle/checkpoint policy `local-frontier-v1` is initialized only for fresh authored-frontier worlds. It records per-Spark nearby object discovery (five-cell Manhattan radius), actual region visits and bounded project contributions. Fresh frontier worlds select validated activity completion; old bundles/checkpoints remain untouched. New goal contexts expose only noticed sites and one locally visible unfamiliar trace target, with actual route costs and discovery evidence. They never include the full region geometry or another Spark's private discoveries. Goals bind their destination through travel/recovery and require matching arrival evidence. A contributor whose site has already been completed ends the obsolete goal once that completion is locally observable. `follow-trace` explores a local trace; `explore-contribute` pays one charge at an owned weave contact after a real shape arrival. Normal activity sustenance remains an additional accounted cost.

Each weave needs two distinct Sparks, each contributing once. Completion improves rest at that exact site by six readiness, capped at 100; the base recovery is ten. Contributions and completion survive replay/restoration and are objective events, not AI claims. Earlier contributors retain credit but do not become remote witnesses of later work. Repeating a contribution cannot farm progress. Real rendezvous requires two independently arriving Sparks with separate authored contacts at the same cell; no companion is fabricated. Existing goal timeout and resource/recovery rules continue to apply.

`npm run start:frontier` opens a separate paused goal world at `http://127.0.0.1:4178/`, database `data/local/mimir-frontier.db`, with AI spending disabled. Existing databases keep their bundle/history. Whole-map zoom reaches 0.5×; the observer displays region names and weave progress. Goal admission skips Sparks with continuing work before constructing routes, and goal checkpoints retain immutable bundle identity to preserve navigation caches.

## Sharing continuity for fresh goal worlds — 2026-11-13

New goal-enabled worlds record the existing sharing-continuation policy at creation. A charge transfer may pause a participant for that pulse, then restore its valid travel/contact plan; it cannot turn a traveling Spark into a permanently choosing contact owner. Invalid plans release only their own reservations. Physical arrival and actual action costs still occur through the authoritative executor. Old histories without the marker are not upgraded.

## Current First Glow goal admission — S019, 2026-11-13

An explicitly enabled server can now ask the bounded AI runtime to choose a goal before social interpretation at an available Reflection slot. Explore/mark leaves a sign; explore/shape examines a shard; explore/meet/mark additionally requires an actual companion. The model sees the Spark's own values, local memories, outgoing trust and own commitments. One feasible option uses rules without a model request.

Recorded goal intent never grants success. The same physical executor, recovery priorities, finite lifetime, reservations and actual costs determine progress. Goals and social choices share one RC allowance and one paid allocation. Historical reads and continuation of an existing goal make no goal-provider calls. New-world opt-in does not relabel old saves or enable a later age.

## Current First Glow exception: persistent goals (local foundation, 2026-11-13)

Fresh histories may explicitly enable `spark-goal-loop-v1`. A Spark can retain an explore/meet/mark goal across pulses, with an explore/mark alternative. Intent alone never advances a step: encounters require independently owned, co-present contacts. A missing partner yields waiting and eventual interruption, not a fictional conversation.

Actual charge need takes priority, followed by urgent rest below 70 and care-related rest below 90 before discretionary trip funding. Movement and recovery retain actual costs. Lifetime/dispatch bounds prevent endless retry, and expiry releases only the owner's plan. This executor is separate from earlier cache-preparation opt-ins; it does not upgrade old histories or default startup. The local fixture uses a fake provider; live AI and an expanded authored world remain [planned work](../issues/MIM-E003.md).

Date: 2026-09-07
Status: Historical simulation guide. The active runtime is the schema-3 First Glow implementation described in `docs/architecture.md`; village-era mechanics below are retained as design history, not current support.

Mimir is an observer game about a small society trying to live together under pressure. The player does not directly issue a command to every villager. Instead, the player watches an autonomous world, follows people and institutions, studies the consequences of decisions, and uses season boundaries to continue, branch, or restart the experiment.

The simulation is designed to make tradeoffs visible. It should be possible for cooperation, independence, and reflection to each produce useful results in some circumstances and costs in others. The engine does not select a winning philosophy.

## Current First Glow exception: Wild Cache choice

Fresh histories explicitly tagged `choice-before-probe-v1` decide at valid cache contact before any probe effects. Probing requires at least three carried charge, no charge deficit, at least 75 readiness and a currently reachable Pattern Shard. It spends one charge and two readiness to survey a route to that shard; this is a bounded local navigation fact, not lore or proof of future success. The surveyed route can prioritize shaping a pattern on the next pulse, after immediate needs and reachability are checked again.

Otherwise the Spark conserves: no probe cost, no route discovery, and a recovery goal toward reachable charge or shelter (or idle if neither recovery route is available). Travel already spent reaching the cache is not refunded. Automatic exploration does not repeatedly return to the cache after a recorded decision. The choice, immediate outcome and next actual goal have separate evidence records. This opt-in changes neither untagged histories nor existing recordings, and makes no AI calls. See [verification](evidence/first-glow-cache-choice-2026-11-09.md).

## The core loop

The game loop is:

1. Create or load a world from a seed and scenario.
2. Advance the world by one authoritative pulse.
3. Resolve villager needs, activities, movement, resources, weather, travel, dilemmas, and hazards.
4. Record objective events that describe what happened.
5. Attach social interpretations to selected events.
6. Save a complete checkpoint and broadcast the committed result to observers.
7. Continue until the season boundary, then review the season.
8. Continue the same history, branch from an earlier checkpoint, or reset with a new seed.

The important distinction is between the world and the observer. The world proceeds according to its rules even when the browser is only watching. The browser can animate and explain the result, but it is not allowed to invent or commit simulation outcomes.

In the active First Glow runtime, a co-present meeting may produce one bounded recorded exchange. The exchange uses only the meeting event witnessed by both Sparks, can add a communicated claim to the recipient's later local memory, and is saved with the checkpoint/history record. It is not unrestricted dialogue, does not reveal hidden or future facts, and is replayed from saved data without a provider call.

## The world model

The engine's top-level `WorldState` contains:

- `seed`, `pulse`, and `season`, which identify the deterministic run and its position in time;
- scenario settings such as starting food, harvest cadence, hunger pressure, and pulse limit;
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

## What one pulse does

`advanceWorld()` is the engine's single-pulse transition. It receives one complete `WorldState` and returns a new state, objective events, and deterministic social interpretations.

### 1. Derive deterministic inputs

Randomness is generated from the stored seed and current pulse using a small deterministic pseudo-random function. The engine does not use ambient process randomness. Given the same starting state, the same engine version, and the same inputs, the same pulse produces the same result.

This makes tests, saved checkpoints, and replay understandable. It also means a seed is not a promise that future versions of the rules will produce the same history; rule changes need compatibility handling or a new world/branch.

### 2. Update weather

Weather is reconsidered every fifteen pulses. The current implementation can produce clear, rain, cold, drought, or storm conditions, each with a severity and forecast.

Weather affects the next pulse's economy and needs:

- rain adds one to food production;
- drought subtracts three from production;
- storm subtracts two from production;
- cold adds three hunger pressure;
- storm adds two hunger pressure.

A storm can also create an active bridge-washout hazard and block the River Road route.

### 3. Produce food

Food production uses the scenario harvest interval and amount. On a harvest interval the village produces the configured harvest amount; on other pulses it produces a smaller baseline amount. Weather then modifies that result.

The current default engine scenario is `The First Winter`, with 72 starting food, an eight-food harvest on harvest pulses, three-food baseline production on other pulses, and nine hunger pressure. The server's default season limit is 360 pulses. `scenarios/first-winter.json` currently describes a 60-pulse planning/test configuration; it is not automatically loaded by the server at startup, so changes to that file do not by themselves change the server's imported default.

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

The engine advances only part of a route per pulse. While a villager is moving, the activity is recorded as `travel`; the intended activity is retained until arrival. Occupied cells and next-step collisions are checked so villagers do not all resolve to the same position.

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

At the current milestone, Jonan departs for Riverbend on pulse 8. The River Road takes three travel pulses. On arrival, a deterministic food trade can move up to six food from Hearthmere to Riverbend, subject to the available reserve after that pulse's accounting.

This is an early regional prototype rather than a complete market system. It establishes the boundary for future settlement-specific economies, routes, hazards, and exchange.

### 8. Resolve dilemmas

The first three authored dilemmas occur at pulses 12, 24, and 36:

1. The Hungry Neighbor — grant food, offer a measured loan, or refuse until work is offered.
2. The Common Repair — repair the bridge together, work privately, or split the effort.
3. The Broken Promise — explain and repair, enforce the promise, or release it.

The engine selects an involved villager deterministically, using hunger and a seeded circumstance-pressure value to identify the situation and choose among the available options. The choice is not a player menu yet; it is the current autonomous simulation adapter.

Each choice has explicit consequences for food, trust, one belief signal, dissent, and sometimes the institution status. A resolution is added to `dilemmaHistory` and emitted as a `dilemma` event. The decision is therefore part of the saved world history rather than only a line of dialogue.

### 9. Create events

Events are objective records of things that happened during the pulse. Possible event kinds include:

- `pulse` for the completed state transition;
- `harvest` for food production;
- `sharing` and `collection` for granary activity;
- `institution` for shared-store accounting;
- `encounter` for meeting-place gatherings;
- `dilemma` for authored value conflicts;
- `trade` for regional exchange;
- `weather` for a weather change;
- `hazard` for a newly created danger.

An event contains a stable ID, pulse, kind, human-readable message, and related villager or settlement IDs. Events are evidence for the observer UI and for social interpretation; they are not themselves the entire state.

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

The server treats a season as a bounded run of pulses. It refuses to commit another pulse when the season limit is reached or when the active timeline is archived.

At a season boundary, the observer should be able to review:

- final food and food distribution;
- average and individual trust;
- hunger and rest pressure;
- activity and travel patterns;
- institutional contributions, distributions, and dissent;
- dilemmas and their consequences;
- weather and hazards;
- the people and relationships the observer wants to follow next.

The persistence model stores a complete checkpoint for pulse 0 and every committed pulse. A timeline can then:

- continue from its current endpoint;
- branch from any stored checkpoint, copying history through the selected pulse into a child timeline;
- be archived without rewriting its past;
- be reset into a new seeded world.

Branching is the main experiment tool. It lets the observer compare what might have happened after an earlier state without destroying the original history.

## Persistence and replay

The Fastify server is the only live simulation writer. For a pulse it:

1. loads the in-memory authoritative state;
2. calls the engine;
3. starts a SQLite transaction;
4. writes the new state checkpoint, events, and interpretations;
5. commits the transaction;
6. updates in-memory state;
7. broadcasts the committed result over Server-Sent Events.

If the transaction fails, the live state must not advance. A browser reconnects to the latest committed checkpoint and then resumes receiving live updates.

Replay is checkpoint-based. The browser can request a historical state by pulse, keep that state separate from the live state, and display recorded events and interpretations. Replay is not a re-simulation and must not depend on current weather rolls, current AI output, or current code behavior.

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

The owner controls can manually pulse, pause or resume scheduling, change the interval, branch, continue, reset, archive, and change runtime object blocking. These are operational controls, not a replacement for the autonomous simulation.

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

- deterministic seeded pulses;
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

- `packages/engine/src/index.ts` — state model, pulse transition, resource rules, dilemmas, events, and interpretations.
- `packages/engine/src/world.ts` — terrain, objects, validation, world import, walkability, and routing.
- `packages/engine/src/design.ts` — character cards and authored dilemmas.
- `packages/engine/src/social.ts` — bounded AI validation and deterministic fallback behavior.
- `packages/server/src/index.ts` — authoritative commit path, scheduler, persistence, timelines, and API.
- `packages/web/src/main.tsx` — observer UI, live/history state, controls, and presentation.
- `scenarios/first-winter.json` — checked-in scenario configuration used for planning/tests; verify runtime wiring before treating it as the server default.


## Opt-in persistent route patterns — First Glow

Fresh histories tagged `persistent-route-pattern-v1` can turn a successful Wild Cache survey followed by actual Pattern Shard completion into a persistent public return-route mark at the shard contact. Creation requires a reachable original cache. Another Spark must physically reach that cell on a later pulse to learn the route fact; private creator memories are not shared.

On a still later choice, a sufficiently supplied Spark can use the encountered pattern to select that cache. Charge and shelter needs take priority; stale, unavailable or already considered destinations are declined. Travel still pays ordinary costs and obeys reservations/navigation. The record distinguishes choosing a route from reaching it, and records arrival or interruption with actual resources. Neither faster travel nor lasting social value is presumed. Untagged histories retain their earlier rules. [Offline evidence](evidence/first-glow-route-patterns-2026-11-10.md) uses controlled fresh initial conditions; ordinary-play frequency and human interest remain unverified.


### Versioned activity completion - 2026-11-10

For explicitly opted-in fresh histories (`activityCompletion: true`, persisted as `validated-activity-completion-v1`), completing exploration, trace marking or pattern shaping at a validated destination records completion even when the destination is the current cell. Completion teaches the recorded evidence and incurs activity sustenance/strain once under the per-pulse rules; movement and activity do not double-charge that pulse. Invalid arrivals grant no completion. Histories lacking the policy keep their original behavior, including the older same-cell completion gap; they are not retrofitted.


### One later-information cache retry - local, 2026-11-10

An explicitly opted-in fresh history (`patternGuidedRetry: true`) can reconsider a conserved cache once after physically learning a pattern later than the original decision. Charge and shelter priorities still apply; knowledge and the unused allowance survive deferral. Starting the pattern-guided journey consumes the one retry for that Spark/cache across all artifacts, including if interrupted. Arrival can still conserve if resources or navigation no longer qualify. The original conservation and the later attempt are retained separately. Previously surveyed caches do not qualify automatically. Existing histories keep their original rules.


### Pattern-trip preparation - local, 2026-11-10

Explicitly opted-in fresh histories (`patternPreparation: true`, persisted as `pattern-resource-preparation-v1`) fund pattern-guided travel before recording use. A goal can draw real source charge repeatedly and recover readiness through real shelter actions. The engine projects the actual selected route under the existing two-unit movement budget, readiness strain, deficit and sustenance rules, including arrival/probe costs.

No pattern use or retry is consumed while preparing, waiting for recovery access, or deferring an itinerary that cannot satisfy the existing arrival gates. The planner considers bounded charge/rest sequences and rechecks after real actions or changed conditions; it does not assume future gifts, free source replenishment or readiness above 100. Preparation is bounded to 64 recorded recovery actions per Spark/pattern; funded departure can still be admitted if resources later qualify. No cache contact is held during preparation. Existing history policies retain their original rules.


### Routes paused for sharing - local, 2026-11-10

Fresh histories explicitly tagged sharing-route-continuation-v1 can pause for a real transfer without losing the execution state of a retained route. After the pause a valid route is traveling again, or interacting if already at validated contact; arrival effects still wait for the authoritative action transition. Partial edge progress survives unchanged navigation. Invalid/canceled plans release only their own reservation and clear all associated route fields. Sharing and normal sustenance still cost exactly what their existing rules record. Untagged histories retain their original behavior.

### Waiting for recovery access - local, 2026-11-11

Fresh histories explicitly opted into recovery-admission-v1 queue recovery consumers by waiting age, then Spark ID. Ordinary consumers and pattern readers use the same admission rule. Only a currently reachable, free immediate contact can be reserved; existing travelers retain their contacts. Finishing a recovery visit ends that request, so repeated visits do not keep the original queue age. Contacts released later in a pulse can be admitted next pulse.

Pattern preparation can conditionally forecast a later charge/rest stop even while it is occupied, then wait for real access. This forecasts resource feasibility, not future availability or a release schedule. Every admitted leg is revalidated, actual recovery still requires arrival, and funded cache departure still requires the full existing arrival budget. Waiting consumes no preparation action, pattern use or retry. The 64-action bound and charge/rest ordering preference remain unchanged. Histories without this opt-in retain their recorded rules.

### Preparing the first cache expedition - local, 2026-11-11

Fresh histories explicitly opted into `initial-cache-preparation-v1` can retain a first cache target after exploration, before knowing any public pattern. They prepare through actual charge draws and shelter rests using the same route/resource forecast and recovery admission as pattern readers. Search considers at most 32 draws or 11 rests per stop and at most the remaining allowance of 64 real preparation actions. No cache or future recovery contact is reserved while preparing. A blocked cache/shard contact, stale navigation or infeasible budget defers the goal; independent immediate recovery remains possible.

Departure commits one initial expedition only after the selected contact and projected arrival still meet the unchanged charge, deficit, readiness and shard-route gates. Actual arrival checks still apply, so changed resources or shard occupancy can cause conservation. An interrupted expedition does not authorize another initial departure. A later conservation retry still needs the separately enabled, later-encounter pattern authorization. This opt-in grants no route fact, encounter or public pattern in advance. Older histories and default server startup/reset retain their existing rules. [Local evidence and ordinary histories](evidence/first-glow-initial-cache-preparation-2026-11-11.md) distinguish initial discovery from natural useful reuse and human acceptance.

### Continuing a successful survey - local, 2026-11-11

Fresh histories can explicitly opt into `post-probe-continuation-v1`. An actual successful survey creates one goal for its recorded shard, retaining the survey evidence and navigation revision through recovery and sharing. The goal resumes ahead of unrelated marking, while current charge needs, care preferences and sharing retain priority. It funds the complete final shard leg through real recovery and shared contact admission. Departure readiness respects the existing 70 threshold, or 90 under the social care preference. The projected leg must finish without charge deficit and with positive readiness; dispatch and actual arrival recheck resources and contact validity.

The 64-action allowance is shared with the preparation that funded that survey (initial preparation or the actual pattern-guided use), rather than resetting at the probe. Future recovery access remains conditional. Ordinary recovery travel can still incur its existing deficit/strain; those effects are recorded and must be cleared before funded shard departure. No charge, rest, survey or artifact is granted by the goal. Completion records the actual shard activity; public pattern creation retains its separate gates. Interruption spends the committed shard attempt, and stale navigation invalidates it. No extra cache retry is authorized. Default and absent-policy histories retain their rules. [Local checks and six-run results](evidence/first-glow-post-probe-continuation-2026-11-11.md) include remaining unfinished goals and reduced natural reuse in this window.

### Bounded charge then rest - local, 2026-11-11

Fresh histories may select `care-recovery-fallback-v1`. When the care-first post-probe search is resource-infeasible, a Spark with positive charge, zero deficit and readiness from 70 through 89 may prepare charge before required rest. A feasible rest plan waits for admission rather than switching because its contact is busy. The fallback retains real rest and 90-readiness requirements before shard departure, even if social preferences change; urgent rest below 70 remains prior to fallback charging. Real recovery uses the shared 64-action allowance, source stock and fair contact queue, with actual dispatch/arrival gates intact. It grants no new cache retry or automatic public knowledge. [Six ordinary histories](evidence/first-glow-care-recovery-fallback-2026-11-11.md) now yield 12 patterns, 19 encounters and one guided use ending in conservation; review/12 creates a pattern at 311 but still has an unfinished survey goal.

### Knowing a shard route while its contact is busy - local, 2026-11-11

Fresh histories may opt into `geometric-shard-routes-v1`. A temporary shard reservation no longer hides a geometrically reachable route from a Wild Cache survey or conditional recovery forecast. The probe still requires actual cache contact, valid authorization, sufficient charge, no deficit and enough readiness; a successful survey pays its real costs. Survey knowledge grants no shard ownership.

A retained survey goal may prepare while the shard is busy, and a funded goal waits for actual contact admission before departure. Sharing and care priorities, urgent rest below 70, required care rest and 90-readiness departure, source/action bounds, navigation invalidation and actual arrival/completion gates remain authoritative. Conditional route availability never promises future access. [Local evidence](evidence/first-glow-geometric-shard-routes-2026-11-11.md) separates controlled checks from ordinary outcomes; defaults and older histories are unchanged.

### Sharing without spending a protected recovery budget - local, 2026-11-11

Fresh histories may opt into `bounded-sharing-admission-v1`. A proposed donor with an active initial expedition, pattern preparation or surveyed-shard goal checks the selected bounded itinerary after paying both the gift and donor upkeep. Sharing proceeds only if that same itinerary remains feasible; extra future draws or a longer recovery plan cannot justify it. The forecast preserves current source limits, the existing action allowance and required care rest/readiness. Future contact access remains conditional, and actual fair admission is unchanged.

Current deficit, urgent rest below 70 and insufficient carried charge also prevent discretionary sharing. Ordinary care rest retains its priority outside active expedition budgets. A refused proposal transfers nothing and adds no sharing upkeep, while any actual recovery/movement still pays its own costs. An admitted one-unit gift retains both participants' original sustenance charges, so it need not accumulate charge for the recipient. No benefit or future progress is inferred. Defaults and older histories are unchanged; [controlled checks and six ordinary results](evidence/first-glow-bounded-sharing-admission-2026-11-11.md) remain separate evidence.

### Publishing a return route while the cache is busy - local, 2026-11-11

Fresh histories may select `geometric-return-publication-v1`. When a Spark actually completes its surveyed shard, a temporarily reserved return-cache contact no longer hides the traversable route from public-pattern creation. This is a knowledge/publication check, not permission to travel or interact. The current owner keeps its reservation; actual cache trips still require live admission, valid authorization, care and resource budgets. Blocked topology and missing survey/completion evidence still prevent publication.

Publication remains tied to the actual completion pulse, limited to one artifact per creator and 64 per world. Later physical encounter is required to learn the public fact, and already-surveyed Sparks retain their existing refusal to use it for another probe. No charge, action allowance, retry, trust reward or shared private memory is granted. Older histories keep their original publication outcomes. [Local evidence](evidence/first-glow-geometric-return-publication-2026-11-11.md) separates controlled checks, compatibility and six fresh ordinary histories.
