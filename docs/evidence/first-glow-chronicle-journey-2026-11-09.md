# Evidence-linked Chronicle journeys — 2026-11-09

Implements the improvement selected after the [guided S001 human review](first-glow-human-observer-review-2026-11-09.md). Local changes only; no additional provider calls, commit, push or deployment.

## Behavior

New deterministic `chronicle-journey-v3` editions add four personal journey sections with individual exact timeline/pulse evidence links:

- Recorded purpose: public activity, status, destination and charge from the selected checkpoint, without inferring a private motive
- Meaningful choice: the latest cutoff-valid saved choice explanation with available evidence for the selected Spark; its label is distinguished from proof that a social action occurred
- Recorded outcome: exact linked event messages, with explicit limits on causation; missing explanations or consequences remain unknown
- Travel in context: repeated movement is counted and condensed instead of dominating the personal story

Journey references are validated for cutoff, available event and exact pulse. Narrator version and public source facts enter the edition fingerprint. Older editions retain their paragraph rendering. Rereading does not silently upgrade them. Owner regeneration now accepts a selected Spark and creates a new revision, preserving existing editions; it never calls a model.

## Verification

- Root four-workspace build passed, followed by final engine and web rebuilds after wording/layout edits
- Seven Chronicle engine tests passed: quotes, selection, immutability, determinism, public purpose, choice/outcome provenance, future/unrelated/missing evidence, source identity and incorrect evidence pulses
- Server Chronicle revision/restart checks passed, including selected-Spark regeneration and retrieval of prior editions
- Original seeds 2/4/8 generated new Spark-6 editions at pulse 80 on an isolated recording copy; AI disabled and zero calls
- All 244 checkpoints, 952 events, 341 interpretations, four timelines and active-timeline metadata retained baseline hashes; all 13 prior review editions remained byte-identical
- Desktop and 390×844 mobile rendering checked; mobile content width 375 pixels. A wrapped citation hit-target overlap was found and repaired using separate citation rows; a normal click then opened the exact pulse-52 Wild Cache event
- Return to live retained Spark 6/Follow at paused pulse 80. The temporary viewport was reset; the updated Chronicle remains open at http://127.0.0.1:4190/

Private receipts and screenshots: `.tmp/s001-journey-2026-11-09/`. The normal world, original recording and human-review copy were preserved. No new simulation histories were generated. The full publication verification suite has not been rerun for these uncommitted edits; run it before publishing.

## Remaining assessment

This implements the presentation improvement, not demonstrated engagement or model benefit. S001 stays open for post-change human feedback and remaining seed-4/8 and mobile human coverage. Where history cannot establish purpose or consequence, honest absence remains part of the summary.
