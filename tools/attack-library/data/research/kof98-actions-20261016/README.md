# Original KOF98 common-action input sampling

This is a new native MAME 0.289 capture branch, separate from the frozen 21-window base and the original-pixel Joe v5 extraction. It contains ordinary two-player I/O only. No RAM writes, forced character IDs, infinite life, or demo play are used.

## Reproduce

From the repository root:

```
python3 tools/attack-library/scripts/kof98-actions-build.py
python3 tools/attack-library/scripts/kof98-actions-run.py --characters kyo benimaru joe kim king ryo vice shingo iori terry mai athena leona daimon andy robert --batches locomotion normals air reactions victory
python3 tools/attack-library/scripts/kof98-actions-review.py
```

Each role/batch is a fresh original game. Completed `capture.json` batches are retained, not overwritten. Each batch stores the exact executed `source.lua`, command, source SHA, actual input changes, read-only trace, native 320x224 screenshots, native VRAM and palette. Raw heavy directories are locally ignored. Retain them locally for reproduction; do not confuse the contact JPGs with the continuous playback sequence.

`playback-index.json` is atomically updated after each completed batch. Its full native sequence has one frame for each consecutive `sourceTick`, at the actual Neo Geo refresh rate. It is an input-window player, not an assertion that every named action triggered. `capture-audit.json` checks continuity and files; it cannot certify character anatomy, move identity, blocking, or a full move list.

## Current limitations and preserved failures

- Five independent groups cover locomotion, grounded normals, neutral airborne normals, P2-caused reactions, and a repeated ordinary C round-win attempt. Directional airborne attacks, enhanced jumps, low/air reactions, and actual crossover turning require separate edge sampling. The root agent owns that extension.
- `turn-cross-attempt` is ordinary forward walking. Collision prevents walking through P2; it is **not a verified turn**.
- All clips start `not_verified`. Flight with no vertical displacement is explicitly `not_observed`. Ordinary I/O intent, file presence, and a numeric HP change are not complete move verification.
- Far/near variants must use distance at the attack input, not at phase entry. Close C/D may become throws; labels remain input windows until visually verified.
- Holding back may move out of reach. No-damage guard attempts alone do not prove a blocked hit. Stun likewise requires the actual dizzy state, not merely repeated damage.
- KO underflows the life byte: observed raw values include 255, 251 and 250. A zero-only sentinel failed. The new gate observes zero or the signed-negative range >=128. Reactions stop 120 native ticks after that event. Victory uses 300; perfect-KO presentation can still obscure the winner pose at that endpoint (observed Kim). `ko-anchor.json` is a raw threshold event, not a visual victory certificate.
- Joe `reactions-pilot-v1` and `victory-pilot-v1/v2/v3` preserve failed or insufficient stopping attempts. They are excluded from playback. Old numeric traces are not rewritten.
- Native original camera/UI occlusion and aerial top-of-viewport cropping are preserved. These are not transparent production sprites and no per-frame fitting is applied.
- None of this establishes all KOF98 moves complete.

## Actually viewed pilot evidence

`joe/review/pilot-contact.jpg`: locomotion and independent settled jumps. Small jump minimum entity Y167, large Y130, ground216.

`joe/review/pilot-attack-reaction-contact.jpg`: separate far/near/crouch attack poses, native airborne poses, P2-caused light/heavy/sweep contact. Guard and stun remain unverified.

`joe/review/air-input-contact.jpg`: each ABCD/CD air input shown at four native timestamps; distinct actual airborne attack poses appear after input, not crossfaded images.

`pilot-first-three-review.jpg`: Kyo, Benimaru and Joe identity and native KO endpoints. Benimaru and Joe have actual WINNER text with the original winner character visible. Kyo's earlier source copied the +120 stop policy, so its current winner gesture is not visually accepted.

`kim/review/batch-contact.jpg`: actual Kim identity throughout independent groups, native KO/Perfect screen; winner gesture not established by the final screenshot.

## Victory follow-up

Kyo and Kim +300 PERFECT endpoints were insufficient. Their +500 ordinary-input follow-ups now show original winner gestures and `PLAYER 2 LOST` with unchanged P1 identity; exact endpoint paths/SHA are in `pilot-visual-review.json`. Kim's failed concurrent repair is preserved under `victory-pilot-concurrent-v2`, excluded from playback. Runner now acquires a per-role/batch advisory file lock to prevent a second new runner writing the same batch. Index snapshots tolerate a separately preserved directory moving, use a unique atomic temporary file, and do not interrupt an already completed capture on a disappearing read.

## Final sixteen-role delivery

The ten required independent capture groups are complete for all sixteen characters: 160 original-engine matches, 219,759 consecutive native frames across the selected groups. This is **59 input windows per character, including preconditions and settling**, not 59 unique or fully verified moves. `final-sixteen-matrix.json` records each actual directory, input/source/trace hashes, real stock transitions and reviewed evidence. `capture-audit.json` separately checks every completed non-pilot bundle: native tick and screenFrame advance by one, PNG count equals trace rows, all PNGs verify and remain 320x224, each VRAM dump is 68,608 bytes, each palette dump is 16,384 bytes.

Actual native boards reviewed: `identity-sixteen.jpg`, `sweep-sixteen.jpg`, `sweep-recovery-sixteen.jpg`, `ground-recovery-ab-sixteen-2920.jpg`, `ground-recovery-ab-sixteen-2940.jpg`, and the three `guard-cancel-*-sixteen.jpg` boards. Scope-specific reviews live in each role's `trigger-review.json`; the playback index uses these explicit reviews rather than assuming a named input succeeded.

ADV's blue `1` is the mode label, **not one available stock**. Read-only stock1082E3 plus native green markers prove real stock. Whiffed normals and Yuri crouch-missing heavy punches failed to earn it. The successful procedure performs sourced, role-specific ordinary specials until the first real stock, releases inputs, lets P2 approach, blocks a real hit, then sends CD/back+AB/neutralAB. Forced forward+AB broke the intended forward-cancel condition; default neutral AB worked for thirteen roles. All generation/condition failures remain playable research records with explicit failed/unverified status.

Daimon's 623C is a feint and did not earn stock. The authorized one-time repair uses real623A while P2 ordinarily jumps to avoid repeated floor hits. Its CD and backwardAB now consume real stock and show native cancel actions. Old C failures remain intact; corrected folders are named `*-daimon-a-*` and selected explicitly by the final matrix.

**Unresolved:** forward guard-cancel for Vice, Iori and Daimon starts with actual stock1 but does not consume it or show the intended forward cancel. They are `not_observed`, not passed. Actual dizzy was not established by the preserved Joe light-A, heavy-C and Yuri623C chains; repeated hitstun/knockdown/KO is not dizzy. No extra probes or additional characters are running. Conditional system derivatives and every near/far variant still require their own verification; this branch does not claim all original moves complete.

The active batch runners are finished. To refresh only reports (no emulator launch), run `kof98-actions-index.py`, `kof98-actions-review.py`, then `kof98-actions-finalize.py`. Keep large raw directories locally; stage scripts, plans, bounded native review evidence, traces/inputs and reports as appropriate. Do not stage the ignored per-frame snapshot/VRAM/palette trees en masse.
