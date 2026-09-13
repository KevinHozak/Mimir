# AI-P18 bounded Vertex quality rerun

Generated: 2026-09-12

This was the explicitly authorized private Vertex quality arm, using the existing
bounded P17 contract while AI-P18's deterministic cadence control remains
provider-free and separately validated.

## Authorization

- Execution: private `vertex-live`
- Provider/model: Google Vertex AI / `gemini-2.5-flash-lite`
- Fixed seeds: 2, 4, 8, and 16
- Encounters: 128 total
- Per-Spark limit: 4
- Global limit: 16
- Hard cap: 100 cents ($1.00)
- Actual provider cost: 0.27085 cents

## Results

- Provider calls: 32
- Recorded interpretations: 28
- Fallbacks: 4 (`malformed-output=2`, `provider-error=2`)
- Useful interpretations: 14
- Changed choices versus rules-only: 14
- Downstream staging changes: 113
- Replay provider calls: 0

## Acceptance

- Private boundary: pass
- Hard and simulation caps: pass
- Deterministic server authority: pass
- Provider-free replay: pass
- No public deployment or canonical AI writes: pass
- Decision: **proceed-to-next-review**

The full machine-readable report was retained in the disposable `.tmp/`
directory and was not committed because it contains per-encounter provider
review records. The committed summary preserves the aggregate evidence needed
for the phase decision without exposing those records.
