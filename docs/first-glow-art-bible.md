# First Glow art bible

Status: executable working specification for the active First Glow runtime. This guide turns the selected [Living Circuit theme](world-theme.md#visual-character) into production decisions. It does not authorize new lore, mechanics, routes, or assets by itself.

## 1. North star and composition

First Glow is a quiet, intimate digital frontier. Compose a small number of readable lights inside broad near-black space. A useful starting target is roughly three quarters dark and quiet, with local circuitry gathering around actual nodes, traces, and shelter access. Warmth comes from Sparks waiting, sharing, pausing, and returning to one another. It does not come from village scenery, orange-green nature colors, or human portraits.

Use a top-down 2D composition with three depth layers:

1. Near-black expanse: the negative space and the dominant visual field. Almost no texture, particles, or global bloom.
2. Local structure: subdued blue-and-silver nodes, pads, seams, and authored routes. Decoration must follow world geometry and must not imply a traversable diagonal, blocker, entrance, or interaction slot.
3. Living foreground: bright non-human Spark cores, selected overlays, charge states, and labels above bloom.

At normal zoom, the observer must distinguish Spark, resource, shelter, trace, and selected state. Zoomed out, silhouettes and status markers remain legible even when labels disappear. Keep labels and interaction targets above effects.

## 2. Tokens, contrast, and glow

| Token | Value | Use |
| --- | --- | --- |
| Void | `#050914` | dominant background and empty space |
| Deep navy | `#101A2B` | local plates and panels |
| Circuit blue | `#3D6EA8` | quiet structure and inactive route |
| Cyan charge | `#8DE8FF` | available charge, active edges, focus details |
| Silver | `#A9B9CC` | rims, contact pads, structural edges |
| Spark core | `#EDF7FF` | crisp, near-white non-human cores |
| Primary text | `#E3ECF7` | names, labels, main interface copy |
| Secondary text | `#A7B9CF` | supporting text and metadata |
| Selection | `#C7B7FF` | restrained outline/focus accent, never the only cue |
| Warning | `#F1C27A` | rare caution symbols |
| Blocked | `#EF8B9A` | small barriers and blocked markers |

Darkness remains dominant. Use local halos with bounded opacity and radius; never lift the entire scene into gray. Every important state has a shape, label, pattern, position, or icon cue in addition to hue. Review normal contrast, zoomed-out recognition, keyboard focus, text contrast, and glow-disabled rendering with `npm run art:bible:review`.

## 3. Shape language and Spark signatures

Sparks are luminous artificial people without faces, limbs, clothing, or human-shaped bodies. Each Spark has:

- a crisp, slightly irregular star, mote, or diamond core;
- a small blue-white halo that does not obscure nearby details; and
- one stable signature mark: broken ring, split ray, orbit dash, paired satellite, notch, or another simple authored motif.

Signature marks remain visible when motion and glow are reduced. Use subtle ice-blue, pale-cyan, or lavender nuance, but never make identity depend on color alone. A name appears on selection/hover; the inspector enlarges the same non-human core and signature.

## 4. Nodes, routes, and interaction states

Locations are circuit forms, not miniature buildings. A charge pool uses a circular contact pad with concentric silver rings and cyan supply segments. A shelter niche uses an open crescent or U-shaped plate, a visible modeled entrance, and a quiet recess. A trace junction is a small square or diamond contact whose connections match actual route cells. Pattern shards are angular fragments on a pad. Light marks are fine resident-made glyphs, visibly distinct from manufactured tracks.

Routes are subdued orthogonal silver-blue conductors with brighter inner lines only when active or selected. Endpoints are brighter than routes. Rounded or clipped corners are polish, not diagonal movement. Decorative etching must remain disconnected from access points unless the world data declares the connection.

| State | Visual treatment | Independent cue |
| --- | --- | --- |
| Normal | crisp core, quiet halo, subdued local structure | label/inspector on request |
| Selected | restrained violet-white outline, brighter signature and route overlay | selection ring, name, focus target |
| Low-charge | core remains visible but halo contracts; cyan supply is sparse | charge icon, numeric value, low-charge label |
| Blocked | route interruption with capped ends and a small coral barrier icon | blocked text/reason, no invented alternate path |
| Gathering | several individually readable cores near the real interaction slot | activity label and slot/location cue |
| Reduced motion | static core, signature, markers, and discrete position changes | no orbit, pulse, trail, or ambient current required |

Cosmetic animation must follow committed activity and movement. It never creates an arrival, resource change, relationship, or social action. Depleted Sparks do not disappear; dimming must not imply death or shutdown unless that mechanic exists.

## 5. Interface, typography, and icons

Use dark navy panels, fine silver borders, clear sans-serif prose/names, and optional monospaced numerals for readings. Rounded corners may soften panels without turning them into decorative cards. Keep panels, inspectors, event history, menus, dialogs, tooltips, and empty states in the same dark palette.

Use world-shaped icons: ring for charge, sheltered arc for rest/readiness, angular fragment for pattern shard, and a small barrier for blocked. Preserve text, number, and shape cues alongside color. Objective events and subjective interpretations must remain visually distinct without brighter treatment implying greater truth. Hide credit and mature-institution icons in First Glow when those systems are absent.

## 6. Motion and reduced motion

Default motion is gentle: a slow halo variation, short fading travel tail, brief selection emphasis, and quiet paired contact tones where supported. Avoid relentless particles, frantic glitches, global bloom, and continuous current racing along every route. A blocked warning is short and identifiable, not an alarm loop.

Reduced motion removes orbiting particles, pulsing halos, trails, ambient current, and repeated attention pulses. Retain static signatures, status markers, labels, focus outlines, and understandable committed position changes. Sound has an independent control and is not required for state comprehension.

## 7. Source, dimensions, naming, and provenance

Editable originals live under `assets/world/assets/`. Tiled map sources, templates, object footprints, slots, and route geometry remain under `assets/world/` and are the source of truth for world behavior. Use SVG for crisp icons, nodes, and state marks; use a lossless raster format only when an authored texture genuinely requires it. Start world art on the 24 px First Glow grid and export at integer multiples; preserve a viewBox and avoid hidden overflow. Do not bake state, collision, pathfinding, or interaction semantics into an image.

Use lowercase kebab-case names with a stable First Glow role, for example `first-glow-charge-pool.svg` and `first-glow-spark-signature-broken-ring.svg`. Keep editable source, metadata, and provenance together in review. Every asset needs a stable identifier, source path, format, dimensions, role, version, license, attribution, and (when external) source URL/retrieval date. Repository-authored assets use the Mimir project license entry. Copied game art, unrecorded generated imagery, and unclear licenses are not acceptable.

Exports are normalized by the Tiled importer into an immutable `assets/world/generated/sha256-*/` bundle with a manifest-qualified asset path and provenance record. Generated hash directories are output, never hand-edited. Retain every bundle referenced by a checkpoint; replacement creates a new content hash and does not overwrite history. Backup and restore must include the bundle directory as well as the SQLite history.

## 8. Safe production and review path

From Windows PowerShell:

```powershell
npm run art:bible:check
npm run world:import -- assets/world/maps/first-glow.tiled.json
$bundle = Get-ChildItem assets/world/generated -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
npm run world:validate -- (Join-Path $bundle.FullName 'world.json')
npm run art:bible:review -- --bundle (Join-Path $bundle.FullName 'world.json')
```

The checker verifies required bible sections, palette tokens, state treatments, source/provenance links, retained bundle structure, and the active First Glow metadata. The review command writes disposable desktop/mobile frames and an annotated sheet under `.tmp/first-glow-art-review/`; it never writes server state or generated bundle content.

## 9. Review sheet: practical do/don't examples

| Do | Don't |
| --- | --- |
| Keep most of the frame near-black and make one real node locally readable. | Fill the whole map with an evenly illuminated motherboard texture. |
| Give each Spark a crisp near-white core plus a stable shape signature. | Draw faces, limbs, clothing, portraits, or color-only identities. |
| Use a brighter endpoint and a subdued line for a route present in world data. | Add decorative lines that look like traversable shortcuts. |
| Show low charge with a contracted halo plus icon/text/value. | Make a low-charge Spark vanish or flicker frantically. |
| Show blocked routes with capped ends and a barrier cue. | Animate around a blocker as if a route or arrival exists. |
| Test the same frame with glow and motion disabled on desktop and mobile. | Treat a bright, animated screenshot as proof of accessibility or geometry. |

The review sheet is evidence for visual decisions, not authored source. Record the bundle hash, viewport, reduced-motion setting, and reviewer notes with any future capture.
