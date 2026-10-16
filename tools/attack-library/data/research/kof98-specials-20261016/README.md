# KOF98 official partial-special ordinary-input probe

Independent from the 21-window basic captures. Source: `../kof98-move-research-20261016/executable-move-checklist.json` (16 characters, 155 listed button variants; not a complete move list).

Each character boots an original MAME KOF98 match, navigates the verified menu route and uses ordinary input fields. No RAM writes, health, power, forced action, savestate or training patch is used. Native PNGs, selection proofs, input-bearing trace rows, native screen-frame numbers and read-only box observations remain in each character directory. `capture-script.lua` records the exact script for that run; the manifest hashes that saved script version.

Motion directions use each proposal's step count with three frames per non-charge direction; the first charge step holds 70 frames. Facing is sampled from relative positions at each attempt and horizontal fields are mirrored. Close moves walk toward the opponent for up to 110 frames and are blocked if distance remains above 42. Air moves request an actual neutral jump and are blocked if airborne height is not observed. Super moves are explicitly blocked because natural meter readiness has not been established; they are not failed inputs or successful moves. Air and close conditions remain capture hypotheses requiring visual review.

`attempted` means the ordinary sequence was delivered, never that the named special executed. Some windows can begin in the preceding move's recovery; this is not a recovered clean action boundary. The exact source proposal and conditions remain in `moves.json`; `attempt-status.json` records the per-variant outcome. `summary.json` exposes formal continuous captures to the UI while retaining `completeMovesCharacters: 0`.

## Known failure retained

The initial specialized script copied startup/selection cadence but omitted the existing multichar script's file-top registration latch. MAME autoboot can register it twice, producing interleaved CSV records despite plausible screenshots. This was a reuse error: a known lifecycle invariant was omitted while copying the inner callback. All that initial batch was isolated in `failed-initial-no-screenframe`, including the first Kyo visual sample, and excluded from formal completion. The corrected script has a global registration latch. The runner checks CSV field integrity and every consecutive native screenFrame before writing a completed capture manifest, stopping the batch on failure. Formal Kyo was rerun and visually checked before the corrected batch continued.

Reproduce with `python3 tools/attack-library/scripts/kof98-special-run.py kyo` (existing formal outputs are retained), then regenerate the audit using `python3 tools/attack-library/scripts/kof98-special-capture-summary.py`. No download or unrelated arcade collection is involved.

## Formal batch outcome

16/16 characters passed native screenFrame continuity and strict trace field checks. 14,993 original PNGs cover 119 attempted variants; 36 super variants remain blocked because natural meter readiness was not established. All 155 listed variants have an explicit status; zero are automatically marked as executed or complete. First formal-window HUD/player bodies were visually reviewed for all 16 in `identity-contact.jpg`; their identity receipts are in each character directory. Kyo ordinary inputs were additionally reviewed against flaming rising and RED Kick action frames before expanding the batch.

`battle-box-sample-review.json` samples four records per character only in phaseRaw=2 after tick2700; all JSON records parsed and plausible nonempty player geometry was observed. For example Kyo tick2700 has ground push box (rx16, ry40), while tick2740 has y181 and an attack box (dx−28, dy−84, rx20, ry44), consistent with the rising attack screenshot. This remains geometry observation, not an overlap/hit or complete box decoder acceptance.
