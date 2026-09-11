# Mimir Current Roadmap

**Current runtime:** The Living Circuit / **The First Glow**. This is the only supported runtime: schema-3 world bundles, `mimir-sim-v3-first-glow`, and `structured-v2`. Sparks—not villagers—explore charge pools, shelter niches, traces, and informal cooperation. The removed village prototype, Hearthmere, First Winter, food economy, and old save paths are historical; do not revive, relabel, or migrate them.

This is the current delivery order. It complements the dated planning documents rather than rewriting their history. Completed functionality is grouped in the [Changelog](changelog.md). For selected setting and visual direction, read [World Theme](world-theme.md); for implemented behavior, read [Current Architecture](architecture.md).

## Active gates

| Gate | Current work | Status |
| --- | --- | --- |
| Audio-P1 | [Establish an accessible, silent-by-default audio foundation](https://github.com/KevinHozak/Mimir/issues/93) | Ready. Next implementation work after the completed Graphics-P8 visual pass. |
| Resonance-P0 | [Define the evidence-first Resonance and Anchor contract](https://github.com/KevinHozak/Mimir/issues/85) | In progress. Contract and deterministic fixtures only; no Anchor runtime work begins before the Living Stories gate. |

## Next non-hosting delivery sequence

With Graphics-P8 complete, **First Glow Audio** is the next workstream. Its phases are scheduled on Mimir Development below.

## Proposed First Glow Audio delivery

Audio should make the observer feel alive and intimate without making the sparse First Glow feel mechanically noisy. It is supporting evidence and atmosphere, never a second simulation or a substitute for readable visual state. Keep the baseline nearly silent: darkness, distance, and pauses should remain part of the experience.

| Phase | Outcome | Scope and acceptance gate | Board status |
| --- | --- | --- |
| [Audio-P1](https://github.com/KevinHozak/Mimir/issues/93) | **Establish an accessible, silent-by-default audio foundation.** | Add browser-safe audio initialization that begins only after an observer gesture; persist independent master, music, and effects levels plus mute controls; provide keyboard-accessible controls and clear labels. No sound may be required to understand play, and a first visit remains silent until the observer opts in. | Ready |
| [Audio-P2](https://github.com/KevinHozak/Mimir/issues/94) | **Create the First Glow sound palette and asset contract.** | Define a small palette: quiet open-space hum, local charge-pool tone, shelter stillness, subtle route/current texture, paired exchange tone, short warning, and restrained selection/focus feedback. Record license/provenance, source format, edits, loudness targets, and intended meaning for every shipped asset. Prefer short, loop-safe, non-fatiguing sources; exclude continuous crackle, alarms, voices, and music that implies human/Originator knowledge. | Backlog after P1 |
| [Audio-P3](https://github.com/KevinHozak/Mimir/issues/91) | **Attach effects only to committed, observable events.** | Play cues only after the client receives the corresponding committed state or event: explicit selection, completed arrival, recorded charge draw/share, blocked or warning state, and recorded interaction. Do not cue predicted movement, animation-only positions, unrecorded relationships, interpretations, or hidden knowledge. Deduplicate replay/SSE reconnect cues so history navigation and reconnects cannot create false repeated outcomes. | Backlog after P1–P2 |
| [Audio-P4](https://github.com/KevinHozak/Mimir/issues/92) | **Add restrained place-aware ambience and an optional ambient score.** | Mix sparse local ambience from the currently observed place and add a licensed, provenance-recorded low-intensity score only when it complements—not fills—the quiet. Crossfade gently; avoid a global constant loop. Position or volume changes may reflect rendered observer context, but must not imply new reachability, resource levels, social progress, or an uncommitted transition. | Backlog after P3 |
| [Audio-P5](https://github.com/KevinHozak/Mimir/issues/90) | **Validate accessibility, performance, and evidentiary honesty.** | Review desktop and mobile with sound on and muted; test autoplay refusal, mute/volume persistence, keyboard use, reduced-motion compatibility, reconnect/history behavior, and long-session fatigue. Capture provenance and representative evidence. The gate passes only when all important states still read without sound, no cue fires before or without its authoritative record, and audio stays within the visual performance budget. | Backlog after P4 |

Audio-P1 is the first implementation step after Graphics-P8. Audio-P2 may prepare the assets alongside P1, but no shipped asset or event integration begins until the control and provenance contract is in place. Audio-P3 is required before effects can be described as evidence-led; Audio-P4 follows only once those effects are trustworthy; Audio-P5 closes the audio workstream.

The next story gate is **Living Stories**: use fixed-seed, multi-season evidence to prove that First Glow produces legible social stories before adding more systems. [Stories-P1](https://github.com/KevinHozak/Mimir/issues/99) records the initial validation; Stories-P2 deepened the evidenced gaps, and Stories-P3 revalidated the transition gate with a positive 20/20 review. Resonance-P1 now makes contract-defined candidate evidence inspectable without adding Anchor state or changing play. Audio may be included in review captures where useful, but the scorecard must also pass with sound disabled.

The following **Resonance** workstream turns durable, repeated social patterns into evidence-first places only after the Living Stories gate supports it:

| Phase | Current work | Status |
| --- | --- | --- |
| Resonance-P1 | [Observe candidate patterns without changing play](https://github.com/KevinHozak/Mimir/issues/84) | In review after the Stories-P3 gate; observer-only candidate evidence is implemented without Anchor state. |
| Resonance-P2 | [Introduce the Shelter Loom as the first real Anchor](https://github.com/KevinHozak/Mimir/issues/86) | Backlog after P0–P1 and positive story validation. |
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
