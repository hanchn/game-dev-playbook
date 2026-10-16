# Supplementary original KOF98 inputs

Six independent fresh-match groups cover the16 intended original characters. Five active groups per character are published: opponent-cross turn and Down→jump variants; forward/back/short airborne ABCD/CD; and pre-crouched/airborne reactions. The original extra-reactions group is retained but superseded in playback by extra-reactions-v2, whose P2 starts crouching before attacking. Thus the current index contains30 input windows per character, not30 uniquely verified moves. Setup/settle windows remain explicit.

```
python3 tools/attack-library/scripts/kof98-edges-build.py
python3 tools/attack-library/scripts/kof98-edges-run.py
python3 tools/attack-library/scripts/audit-kof98-expanded.py
```

The runner preserves source.lua/SHA, command, trace, I/O changes, PNG, VRAM and palette for each executed group. No RAM writes. Actual320x224 frames remain on the local machine under ignored raw directories; representative contacts, source/receipts and exact rerun paths are portable. Do not confuse a JPG contact with the complete continuous sequence.

`triggerStatus:observed` from the runner refers narrowly to measured airborne/facing/HP state evidence. It is not a claim that a named aerial attack, defensive action, super jump or hyper hop was fully identified. High/hyper labels remain **attempts** until native horizontal movement and complete poses are compared, not just jump height.

Root separately viewed Joe turn-super contact: P2 crosses P1, grounded P1 changes facing, and all jump inputs show actual takeoff/airborne/landing. Root also viewed Joe extra-reactions-v2 contact: crouched light/heavy hit, airborne hit/recoil, and a blue native air-defense circle while P2 attacks at ticks3555/3570. `review/visual-review.json` records this limited observation; do not automatically apply it to all roles.

Both `../kof98-full-action-qa-20261016/edges-reaction-16-review-{1,2}.jpg` contacts were viewed: all16 intended unique character names/designs are visible in the new matches. This is identity evidence and representative reaction review, not all-move acceptance.

A first route parser failed on AST list repetition before MAME launch; the constrained literal reader supports only the existing list/dictionary/add/repeat route expressions. Per-batch captures remain immutable, and index temporary filenames include PID to avoid concurrent publishers deleting each other's temporary file. Old shared-temp processes are allowed to finish before final index republish. Existing capture metadata is not overwritten on resume.
