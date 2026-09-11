# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Active gates

| Gate | Current work | Status |
| --- | --- | --- |
| First Glow Audio | [Audio-P1 through P5](https://github.com/KevinHozak/Mimir/issues/90) | Complete: accessible controls, provenance-recorded palette, committed-event cues, restrained ambience, and validation are merged. |
| Living Stories | [Stories-P1](https://github.com/KevinHozak/Mimir/issues/99), [P2](https://github.com/KevinHozak/Mimir/issues/100), and [P3](https://github.com/KevinHozak/Mimir/issues/101) | Complete: the long-season baseline, evidence-supported autonomous-loop change, and revalidation record are merged. |
| Resonance-P1 | [Observe candidate patterns without changing play](https://github.com/KevinHozak/Mimir/issues/84) | Complete: candidate evidence is inspectable without Anchor state or changed play. |

## Next non-hosting delivery sequence

The completed audio, Living Stories, and Resonance-P1 gates make **Resonance-P2** the next bounded First Glow delivery candidate. It remains subject to board prioritization and must preserve the completed evidence boundaries.

## Proposed First Glow Audio delivery

Audio should make the observer feel alive and intimate without making the sparse First Glow feel mechanically noisy. It is supporting evidence and atmosphere, never a second simulation or a substitute for readable visual state. Keep the baseline nearly silent: darkness, distance, and pauses should remain part of the experience.

| Phase | Outcome | Scope and acceptance gate | Board status |
| --- | --- | --- |
| [Audio-P1](https://github.com/KevinHozak/Mimir/issues/93) | **Establish an accessible, silent-by-default audio foundation.** | Add browser-safe audio initialization that begins only after an observer gesture; persist independent master, music, and effects levels plus mute controls; provide keyboard-accessible controls and clear labels. No sound may be required to understand play, and a first visit remains silent until the observer opts in. | Done |
| [Audio-P2](https://github.com/KevinHozak/Mimir/issues/94) | **Create the First Glow sound palette and asset contract.** | Define a small palette: quiet open-space hum, local charge-pool tone, shelter stillness, subtle route/current texture, paired exchange tone, short warning, and restrained selection/focus feedback. Record license/provenance, source format, edits, loudness targets, and intended meaning for every shipped asset. Prefer short, loop-safe, non-fatiguing sources; exclude continuous crackle, alarms, voices, and music that implies human/Originator knowledge. | Done |
| [Audio-P3](https://github.com/KevinHozak/Mimir/issues/91) | **Attach effects only to committed, observable events.** | Play cues only after the client receives the corresponding committed state or event: explicit selection, completed arrival, recorded charge draw/share, blocked or warning state, and recorded interaction. Do not cue predicted movement, animation-only positions, unrecorded relationships, interpretations, or hidden knowledge. Deduplicate replay/SSE reconnect cues so history navigation and reconnects cannot create false repeated outcomes. | Done |
| [Audio-P4](https://github.com/KevinHozak/Mimir/issues/92) | **Add restrained place-aware ambience and an optional ambient score.** | Mix sparse local ambience from the currently observed place and add a licensed, provenance-recorded low-intensity score only when it complements—not fills—the quiet. Crossfade gently; avoid a global constant loop. Position or volume changes may reflect rendered observer context, but must not imply new reachability, resource levels, social progress, or an uncommitted transition. | Done |
| [Audio-P5](https://github.com/KevinHozak/Mimir/issues/90) | **Validate accessibility, performance, and evidentiary honesty.** | Review desktop and mobile with sound on and muted; test autoplay refusal, mute/volume persistence, keyboard use, reduced-motion compatibility, reconnect/history behavior, and long-session fatigue. Capture provenance and representative evidence. The gate passes only when all important states still read without sound, no cue fires before or without its authoritative record, and audio stays within the visual performance budget. | Done |

Audio-P1 through P5 are complete. The shipped audio path remains supporting evidence and atmosphere, never a second simulation or a substitute for readable visual state.

## Completed Living Stories delivery

**Living Stories** now has a completed evidence chain. [Stories-P1](https://github.com/KevinHozak/Mimir/issues/99) preserved a four-season baseline and found a 13/20 partial result with no hard evidence-boundary failure. [Stories-P2](https://github.com/KevinHozak/Mimir/issues/100) added only the autonomous social-loop behavior that finding justified. [Stories-P3](https://github.com/KevinHozak/Mimir/issues/101) reran the controls with the changed runtime and recorded a positive 20/20 review. Audio may be included in review captures where useful, but the scorecard also passes with sound disabled.

The following **Resonance** workstream turns durable, repeated social patterns into evidence-first places only after the Living Stories gate supports it:

| Phase | Current work | Status |
| --- | --- | --- |
| Resonance-P1 | [Observe candidate patterns without changing play](https://github.com/KevinHozak/Mimir/issues/84) | Done. Observer-only candidate evidence is implemented without Anchor state. |
| Resonance-P2 | [Introduce the Shelter Loom as the first real Anchor](https://github.com/KevinHozak/Mimir/issues/86) | In review; authored placement, server-committed Anchor record, and deterministic failure paths are implemented. |
| Resonance-P3 | [Give the Shelter Loom a bounded social possibility and tension](https://github.com/KevinHozak/Mimir/issues/87) | Backlog after P2 and Stories-P2. |
| Resonance-P4 | [Validate a contrasting Anchor without a designated winner](https://github.com/KevinHozak/Mimir/issues/88) | Backlog after P3 and Stories-P3. |
| Resonance-P5 | [Earn the Hearth Circuit transition through maintained Anchors](https://github.com/KevinHozak/Mimir/issues/89) | Backlog after P4; transition design only, not a new active runtime. |

Hosted-observer work remains intentionally separate from this sequence: [Hosted-P1](https://github.com/KevinHozak/Mimir/issues/3), [Hosted-P2](https://github.com/KevinHozak/Mimir/issues/18), and [Hosted-P3](https://github.com/KevinHozak/Mimir/issues/53) stay in Backlog until the user explicitly chooses to resume hosting.

## Non-negotiable gates

- The server alone commits outcomes; browser animation and art never invent state.
- Fixed inputs produce the same committed history. Objective events, Spark-local knowledge, and interpretations remain separate records.
- Edit authored Tiled sources or importer code, then regenerate and validate bundles. Hash-named bundles are immutable, including for historical replay.
- Treat SQLite runtime data, backups, and test outputs as isolated artifacts. Hosted operation remains single-writer until persistence architecture changes deliberately.

## Historical context

The retired Simulation Game Plan and Web Development Plan described the original village-era proposal, including villagers, food, Hearthmere, First Winter, and paths no longer supported. Their essential intent is preserved in [Project History](history.md). Use this roadmap, the [Changelog](changelog.md), [World Theme](world-theme.md), and [Current Architecture](architecture.md) for ongoing work.
