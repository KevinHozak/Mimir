# Local data layout

This directory is for mutable local runtime data, separate from authored source content.

- `local/` contains persistent local databases, settings JSON, and other local game state. It is ignored by Git.
- `backups/` contains local backup outputs and their bundle sidecars. It is ignored by Git.

Disposable test and profiling artifacts belong under `.tmp/`, not here. Authored world maps, templates, fixtures, generated immutable bundles, and provenance records remain under `assets/world/` and `assets/licenses/`.

The default local server database is `data/local/mimir.db`. Set `DATABASE_PATH` explicitly when opening another local database.
