# First Glow procedural audio provenance

Audio-P4's currently shipped listening layer is repository-authored Web Audio
code. It contains no downloaded or third-party recordings and therefore has no
external attribution or retrieval date to invent.

| Source | Role | License | Provenance |
| --- | --- | --- | --- |
| `packages/web/src/first-glow-audio-runtime.ts` | procedural one-shot feedback, sparse ambience, and optional score | Mimir project license (MIT) | authored in this repository; generated at runtime by the browser Web Audio API |
| `packages/web/src/first-glow-audio-ambience.ts` | rendered-context mix plan and place-aware level mapping | Mimir project license (MIT) | authored in this repository; derives only from visible First Glow context |

The procedural sources are deliberately quiet, deterministic in their mapping,
and free of voices, alarms, continuous crackle, or Originator-signaling musical
content. The Audio-P2 palette remains `contract-only`: no binary asset is
promoted until a future reviewed source has a complete license, provenance,
checksum, and runtime record.
