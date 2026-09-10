# First Glow procedural audio provenance

Audio-P4's currently shipped listening layer is repository-authored Web Audio
code. It contains no downloaded or third-party recordings and therefore has no
external attribution or retrieval date to invent.

| Source | Role | License | Provenance |
| --- | --- | --- | --- |
| `packages/web/src/first-glow-audio-runtime.ts` | procedural one-shot feedback, sparse ambience, and optional score | Mimir project license (MIT) | authored in this repository; generated at runtime by the browser Web Audio API |
| `packages/web/src/first-glow-audio-ambience.ts` | rendered-context mix plan and place-aware level mapping | Mimir project license (MIT) | authored in this repository; derives only from visible First Glow context |
| `assets/audio/first-glow/music/Weightless_Shore-source.mp3` | user-provided First Glow score candidate | not independently verified | supplied by the project owner on 2026-09-10; normalized runtime copy: `packages/web/public/audio/first-glow/weightless-shore.mp3` |
| `assets/audio/first-glow/music/Navigation_By_Starlight-source.mp3` | user-provided First Glow score candidate | not independently verified | supplied by the project owner on 2026-09-10; normalized runtime copy: `packages/web/public/audio/first-glow/navigation-by-starlight.mp3` |
| `assets/audio/first-glow/music/Haven_Under_Starlight-source.mp3` | user-provided First Glow score candidate | not independently verified | supplied by the project owner on 2026-09-10; normalized runtime copy: `packages/web/public/audio/first-glow/haven-under-starlight.mp3` |
| `assets/audio/first-glow/music/Where_the_Light_Pools-source.mp3` | user-provided First Glow score candidate | not independently verified | supplied by the project owner on 2026-09-10; normalized runtime copy: `packages/web/public/audio/first-glow/where-the-light-pools.mp3` |

The procedural sources are deliberately quiet, deterministic in their mapping,
and free of voices, alarms, continuous crackle, or Originator-signaling musical
content. The Audio-P2 palette remains `contract-only`: no binary asset is
promoted until a future reviewed source has a complete license, provenance,
checksum, and runtime record.

The four imported music files are review candidates rather than palette-promoted
assets. Their normalized runtime copies are available to the local First Glow
music bus, but their external origin and redistribution rights still require
confirmation before a public release.
