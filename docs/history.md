# Mimir Project History

Mimir: *A Light of Our Own* began as a question about whether a small autonomous society could become worth watching—not because it found the single right philosophy, but because its people made understandable choices under pressure. This document preserves the ideas carried forward from the early planning documents. It is a history and orientation, not a specification of current runtime behavior; use [Current Roadmap](roadmap.md), [World Theme](world-theme.md), and [Current Architecture](architecture.md) for that.

## The original idea

The earliest plan imagined a small frontier village whose inhabitants had needs, values, memories, relationships, and different ideas about how to live well. The intended experience was observational: watch a bounded season unfold, understand why people cooperated or came into conflict, then continue the history, branch it, or begin another experiment.

Several commitments have endured from that beginning:

- no philosophy is preselected as the winner;
- social choices should have real, inspectable consequences rather than only decorative dialogue;
- objective events and a character's interpretation of those events must remain distinct;
- characters should know only what they have witnessed or credibly learned;
- a season is an experiment to review, not merely an endless progress loop; and
- the observer should be able to trace a later outcome back to the pressures and decisions that shaped it.

The early village proposal used twelve adult villagers, food pressure, a common store, three broad value traditions, and dilemmas about help, private work, promises, and cooperation. It also imagined later institutions, neighboring communities, human embodiment, and a small shared-world alpha. Those were useful ways to articulate the social questions, not a promise that all would belong in the first playable version.

## From village prototype to observer simulation

The first implementation followed the original small-society shape: a local simulation with autonomous characters, pulses, checkpoints, replay, branch/reset controls, and a browser observer. The project chose a pragmatic web stack—TypeScript, a deterministic engine, a Fastify server, SQLite persistence, React panels, Phaser rendering, and Tiled map authoring—because it supported visible movement, durable history, and a clear server-authority boundary.

This work established an important technical and design lesson: the simulation could be observed and replayed, but the village framing was too complete for the desired opening. A mature town, formal economy, institutions, trade, and established social roles would make the characters seem to begin after the most interesting formative questions had already been answered.

## The Living Circuit decision

The project therefore moved from a human-shaped village to **The Living Circuit**, a quiet digital frontier. Its people are now little luminous **Sparks**, not villagers. The opening age is **The First Glow**.

This was a genuine change of premise rather than a vocabulary swap. Food became charge; the initial questions became finding charge, choosing whether to share it, finding temporary shelter, following an unfamiliar trace, and leaving a useful mark for another Spark. The early world has no established haven, credit economy, formal commons, market, regional trade, known purpose, or knowledge of the Originators. Sparks begin with local practical knowledge and can disagree about what they have seen or what it means.

The visual direction changed with the setting: near-black open space, blue-and-silver circuit structures, localized routes and nodes, and small bright Sparks. Warmth comes from attention, waiting, help, uncertainty, and relationship rather than from a pastoral village palette or human-shaped avatars.

The earlier names—Hearthmere, First Winter, villagers, food, and the village prototype—remain part of the project's history. They are not compatible runtimes or names to apply to current saves. The active runtime is only schema-3 First Glow with the Living Circuit theme and structured-v2 world geometry.

## What exists today

Mimir is now a deterministic First Glow observer. The server is the sole authority for committed outcomes; the browser presents committed live and historical state. The world uses authored maps and immutable generated bundles so movement, interaction, rendering, and replay share the same spatial truth. SQLite checkpoints, event history, branching, reset, backup, and restore support the core promise that an observed history can be reviewed instead of reinvented.

The first social-story milestone has also been completed: six named Spark cards and three opening dilemmas about a weakening charge pool, helping a tired Spark versus exploring, and making a route mark public or private. The observer now presents those scenarios as authored material, keeping objective observations, local knowledge, alternatives, and hypothetical consequences distinct. The next work is to make that social material operational: durable local knowledge, trust, commitments, and evidence chains that shape later feasible choices.

## The vision now

The current end vision is not simply a simulation with more content. It is an intimate observer experience where someone can follow a small society as it learns how to live together:

1. **First Glow:** Sparks face basic needs, incomplete information, informal help, and the beginnings of trust.
2. **A legible social history:** the observer can understand what happened, what a Spark knew, why it chose an action, and what changed later.
3. **Reviewed seasons:** fixed-seed experiments reveal which pressures and rules create meaningful stories, and which merely create noise or bugs.
4. **A growing world:** only after the opening is compelling may Sparks form havens, develop lasting practices, expand to another area, and eventually encounter deeper questions of culture, origin, creativity, and exchange.

Bounded AI interpretation remains a later experiment, not the simulation's authority. It must earn its place by improving understanding over a deterministic rules-only baseline. Likewise, human contributions, temporary embodiment, shared-world play, other communities, and discovery of the Originators are retained possibilities—not promises or prerequisites for the First Glow.

## Why the old plans can be retired

The original Simulation Game Plan and Web Development Plan were valuable: they identified the core observer experience, the importance of evidence, the need for bounded seasons, and the eventual scale of the dream. Their village setting, early implementation status, detailed staged assumptions, and removed compatibility paths are now historical.

This history preserves their essential intent. [Current Roadmap](roadmap.md) records the active gates; [World Theme](world-theme.md) defines the selected world and language; and [Current Architecture](architecture.md) states what the repository actually supports. Together, these documents supersede the old plans for ongoing work.
