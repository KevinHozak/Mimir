# First Glow audio assets

Audio-P2 ships a contract and palette, not audio binaries. The contract is [`first-glow/palette.json`](first-glow/palette.json); it names the seven permitted First Glow candidates and records their intended meaning, presentation category, loudness target, loop behavior, source format, edit boundary, and provenance requirements.

Do not add an audio file to the shipped runtime until its palette entry is changed to `shipped` and its license and provenance fields are complete. A shipped entry must also include a stable `file` path, a source identifier or repository-authored source record, and a checksum recorded by the eventual asset pipeline.

The current entries are deliberately `planned`. This prevents placeholder or unreviewed audio binaries from entering a First Glow bundle and keeps Audio-P1's silent mode fully valid. Audio-P3 may connect feedback cues only to committed observable events; Audio-P4 may add place-aware ambience after this contract is accepted. The current P4 implementation uses repository-authored procedural Web Audio sources; their code provenance is recorded in [`assets/licenses/first-glow-audio.md`](../licenses/first-glow-audio.md) while the binary palette remains unpromoted.

Five user-provided music candidates are retained under [`first-glow/music/`](first-glow/music/), with normalized browser copies served from `packages/web/public/audio/first-glow/`. They are optional First Glow score candidates, with the procedural score remaining the fallback. Their origin and licensing are recorded as user-provided but not independently verified; do not redistribute them or promote them in the palette until those details are confirmed.

The extracted SFX library is retained under [`first-glow/sfx/`](first-glow/sfx/) and mirrored under `packages/web/public/audio/first-glow/sfx/`. Its event mapping and intended loudness are recorded in [`first-glow/sfx/manifest.json`](first-glow/sfx/manifest.json). These are review candidates until the event wiring and redistribution rights are confirmed.

The supplied `mimir_mp3_audio_manifest.json` is the metadata source for the current 17-asset set. Its generated export filenames are not present in the download folder, so the project manifests retain its musical metadata while mapping `sourceTrack` names to the actual downloaded MP3/WAV filenames.

## Provenance requirements

For every promoted asset, record:

- original source URL or the repository-authored source path;
- retrieval date when the source is external;
- license identifier and required attribution;
- source format, edits, runtime conversion, checksum, and version;
- intended meaning, allowed presentation state, and whether it is ambience or feedback.

Never use voices, alarms, continuous electrical crackle, or music that implies human or Originator knowledge. A cue may decorate an already-readable state, but it must never be the only evidence that an event occurred.
