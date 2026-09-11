# First Glow audio production contract

Audio is observer presentation, not a second simulation. The server remains authoritative, and the observer must remain understandable with every channel muted. Audio-P1 provides the opt-in and persistence boundary. This document defines the Audio-P2 palette and review contract before any sound is attached to runtime events.

## Palette boundary

The machine-readable palette lives at [`assets/audio/first-glow/palette.json`](../assets/audio/first-glow/palette.json). It contains exactly seven planned candidates:

| Candidate | Category | Allowed meaning |
| --- | --- | --- |
| Open-space hum | Ambience | Quiet presence of open space; not danger or hidden state |
| Charge-pool tone | Ambience | A visible charge source is being observed; not a completed draw |
| Shelter stillness | Ambience | A shelter niche can support rest; not proof that a Spark rests |
| Route/current texture | Ambience | A visible committed route has local texture; not predicted travel |
| Paired exchange tone | Feedback | A matching committed exchange event was received |
| Short warning | Feedback | A matching committed blocked or warning state was received |
| Selection/focus feedback | Feedback | The observer explicitly changed interface focus or selection |

No binary audio files are shipped by Audio-P2. `planned` entries are intentionally incomplete for license and provenance, and the contract validator rejects a `shipped` entry without those records.

## Review targets

- Keep the baseline near-silent. An observer should notice pauses and quiet space rather than a constant soundtrack.
- Review at ordinary listening volume, low volume, and with one channel muted. The written UI remains the source of truth.
- Test at least ten minutes of observation for fatigue, repetition, loop seams, and attention capture.
- Prefer short loop-safe beds with gentle crossfades. One-shot feedback must have a clear tail and must not form a rhythm when repeated.
- Keep ambience and feedback separate in the mixer and in review notes. Ambience describes the observed presentation context; feedback acknowledges an explicit observer action or committed visible state.
- Check keyboard traversal, reduced motion, reconnect, history, and silent mode. Audio must not fire from predicted movement, animation-only positions, hidden knowledge, or replay/reconnect duplication.

## Promotion gate

Before a candidate becomes `shipped`, add its reviewed source and update the palette entry with its source path or URL, retrieval date when applicable, license, attribution, edit record, runtime format, version, checksum, and final loudness measurement. Audio-P3 and Audio-P4 own runtime integration; they must preserve the immutable world-bundle and provenance boundaries and must not add audio-only simulation evidence.

## Audio-P3 committed event cues

Audio-P3 uses small procedural Web Audio one-shots while the palette remains `contract-only`; it does not add unreviewed binary assets. The observer maps only newly received committed records to cues: explicit selection, completed arrival, charge draw, charge share, blocked or waiting warning, and recorded interaction. Initial snapshots, history navigation, replay views, and SSE reconnect state do not replay old cues. A session ledger deduplicates event IDs before playback, and muted audio leaves the event stream and visual evidence unchanged.

## Audio-P4 place-aware listening layer

Audio-P4 keeps the same provenance boundary. The shipped sources are repository-authored procedural Web Audio code, recorded in [`assets/licenses/first-glow-audio.md`](../assets/licenses/first-glow-audio.md); the palette remains contract-only until reviewed binary sources are available.

The observer derives one sparse context from the rendered First Glow selection: open space, a charge pool, a shelter niche, or a quiet route. The mapping uses only visible object positions, visible route cells, and the selected entity. It does not inspect charge quantity, hidden knowledge, future destinations, social progress, or uncommitted transitions. Ambient voices use short, low-level pulses with long quiet gaps and gentle fades, rather than a constant loop. The optional score is a separate bus and can be disabled independently from ambience; both remain subordinate to master, mute, and the existing effects controls.

The score and ambience are presentation layers only. Initial snapshots, history views, reconnects, and muted sessions remain silent and readable through the existing visual and written evidence.

## Audio-P5 validation evidence

The current Audio-P5 browser validation is recorded in [`docs/evidence/2026-09-10-first-glow-audio-p5.md`](evidence/2026-09-10-first-glow-audio-p5.md). The automated check covers opt-in autoplay behavior, the complete shipped asset library, persisted controls, muted event readability, history silence, reduced-motion mobile layout, and desktop/mobile captures. The event-ledger regression also treats committed event IDs as the boundary for preventing duplicate cues across replay and SSE reconnect batches.

Physical listening remains a review responsibility: automated browser checks cannot prove speaker balance, perceived loudness, or fatigue over a ten-minute session. Those observations are explicitly separated from the automated results in the evidence record.
