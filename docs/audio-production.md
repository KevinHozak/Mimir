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
