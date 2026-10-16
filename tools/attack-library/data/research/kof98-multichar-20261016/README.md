# Original KOF98 sixteen-character capture — 2026-10-16

This batch captures the original NGM2420 ROM in MAME0.289 using ordinary I/O. No game RAM was written, no infinite health or forced character ID was used. Read-only entity coordinates, game phase, VRAM and palette observations accompany real rendered screenshots. The sixteen identities were visually checked against actual selection and battle HUDs; see `identity-review.json` and `identity-sixteen.jpg`.

## Actual result and limits

- 16 characters × 1,330 native frames = 21,280 observed frames, each with VRAM and actual palette. Each character has 21 **input-attempt windows**, not 21 verified moves or a complete moveset.
- All final trace rows are schema-complete and ticks contiguous. This is a capture integrity check, not move acceptance.
- Selection route begins at tick960 after ADVANCED mode confirmation, then A at1170/1260/1350 selects the target and two filler team members. Ordinary A inputs choose order; actual HUD proves who entered. `capture.json` retains per-character route and command. `selection/` retains every30-tick menu proof.
- Joe v5 is the first repaired sprite reconstruction. It independently discovers P1/P2 body palette16/48 from the observed first-frame entity regions and native pixels. It has 1,330 samples, 160 unique RGBA drawings and zero remaining visible-pixel/composite mismatches under the declared policy. This is not automatic art or full-move acceptance. Do not assume other characters use the same palette.
- Special windows QCF/QCB/DP are intentions. In particular Joe QCF+A produced normal punches, not Hurricane Upper. The official character-specific and author-guide command research is a separate task; it does not retroactively prove these inputs triggered specials.

## Joe delivery schema

`joe/occlusion-render-v5/study-manifest.json` contains full per-frame `tick`, `phase`, `phaseTick`, `image`, `pixelSHA256`, `entityNativeScreen`, `alphaBounds`, actual occlusion counts, and explicit errors. `clips[].holds` records consecutive equal drawings with native tick counts. Do not discard the per-frame metadata when drawing repeats: root movement and jump height can continue during a hold.

RGBA images are native-pixel 256×256 canvases with pivot `[128,224]`. They are translated by the observed entity anchor, with no bounding-box fitting or resize. To restore the **original viewport**320×224, draw each PNG at `(entityNativeScreen.x-128, entityNativeScreen.y-224)`. The raw trace additionally retains world `p1x,p1y,cameraX` for explicit fixed-world-camera treatment. A centered stationary preview alone removes jump height and locomotion and must be labelled accordingly. Refresh is59.185606060843Hz; draw uniqueness and hold duration are separate.

## Actual failures retained and root causes

1. `failed-joe-route-v1-terry`: route started during mode-transition lock and first two Right pulses were ignored; HUD was Terry, so intended Joe label was rejected.
2. `failed-callback-v2-*`: autoboot script could register a duplicate callback across soft reset; one trace row truncated. Final Lua uses an `_G` registration guard; affected original evidence retained.
3. `failed-shingo-route-v3-daimon`: Down×4 from column0 wraps to top rather than reaching the extra slot. Correct route is Right×5 then Down×4, visually verified as SHINGO.
4. Joe initial renderer had207 error frames. They were not adjacent-frame timing errors: tick2836 matched same tick except169 pixels, while adjacent ticks differed by2500+ pixels. Real P2 coverage and hit/dust sprites occlude the body.
5. Auxiliary v1/v2 initially applied sprite-group filtering per tile, clipping feet. v3 fixed the group predicate. v4 numerically matched but included the character's floor reflection; actual image inspection rejected it. v5 keeps body groups with original originY32..184 while the composite still draws actual lower/reflection/effect layers. The independent comparison proves each claimed overlay pixel against the original screenshot; it does not simply waive mismatches.
6. Original body texture behind another object is reconstructed from VRAM, not directly visible screenshot evidence. Coarse bottom HUD masks remain declared. No restored bones or original artist canvas is claimed.

`joe/occlusion-render-v5/same-pose-review.jpg` shows native screenshots beside the actual same-pose extracted body, including covered hand and dust-covered foot. Earlier failed render directories remain local.

## Reproduction and submission boundary

Run `python3 tools/attack-library/scripts/kof98-multichar-run.py CHARACTER...`; completed final captures are retained. Review with `kof98-multichar-review.py`. Run `kof98-multichar-occlusion-audit.py CHARACTER` in a Python environment with Pillow and NumPy after the shared original sprite dump under `kyo/` exists. The renderer performs per-character palette discovery, but other characters require their own reviewed result before acceptance.

Minimal suggested submission: the new `scripts/kof98-multichar-*` implementation files (source-reference copy unnecessary), this README, `capture-manifest.json`, `progress.json`, `identity-review.json`, three identity contact JPGs plus `identity-sixteen.jpg`, each final character's `capture.json`, `trace.csv`, `inputs.csv`, `review/review-index.json`, and two `review/identity-*` PNGs. For Joe additionally submit the final study manifest,160 final RGBA PNGs, same-pose review JPG and explicit small render failure summary if the parent integrates them into the public original-study assets. Avoid committing all105 representative samples per character unless needed for a specific review.

Raw `snap/`, `selection/`, `vram/`, `palette/`, sprite/zoom memory dumps, emulator config and NVRAM are retained locally and ignored by this directory's `.gitignore`. Do not batch-add the raw hundreds of megabytes. No commit or push was performed by this worker.
