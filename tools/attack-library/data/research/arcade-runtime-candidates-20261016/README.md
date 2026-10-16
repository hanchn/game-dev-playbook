# Top 100 local original arcade inventory — 2026-10-16

All 100 original ranking positions and titles remain in `data/arcade-local-runtime-progress.json`. `data/arcade-next-rom-candidates.json` contains all 100 static MDK page observations, retained HTML SHA, exact observed split ZIP links and parent/BIOS/device dependencies. Shortname proposals are not renamed games or proof of boot.

Actual acquisition: 98 selected original game ZIPs and 33 listed dependency ZIPs, all ZIP CRC valid with SHA and member receipts in `acquisition-receipt.json`. Initial Space Invaders DNS failure is retained in priorAttempts; its separate retry succeeded. No executables launched. Older Kawaks/FBNeo files were preserved; colliding MDK 0.289 packages were downloaded under each game's `mdk-0289/` directory rather than overwriting or falsely attributing old bytes to MDK.

Derived packaging: all 98 at `assets/original-games/{romid}/runtime/{romid}.zip`. `derived-merged-runtime-packages.json` records each source ZIP SHA, member SHA/CRC and override provenance. Dependencies merged first; base game wins exact member names. Final members byte-verified and source ZIP hashes rechecked unchanged. Derived ZIPs are candidates for matching MAME 0.289; they do not establish FBNeo DAT compatibility or successful gameplay.

Two source-directory limitations: `/game/pong` and `/game/breakout` return a generic MDK index with no exact game ZIP links. These remain blocked discovery candidates; no fabricated empty ROM package. Root's independent MAME metadata may establish ROM-less discrete driver requirements separately. Dragon's Lair's page lists `https://mdk.cab/download/chd/dlair/dlair.chd` (11.45 GB); it remains separately pending and its small ROM ZIP alone is not a complete Laserdisc game.

Reproduction scripts, run from repository root:

```sh
python3 tools/attack-library/scripts/inventory-top100-local-runtimes.py
python3 tools/attack-library/scripts/acquire-observed-arcade-candidates.py
python3 tools/attack-library/scripts/acquire-observed-arcade-candidates.py --acquire pacman,galaga
python3 tools/attack-library/scripts/package-derived-arcade-runtime.py
```

Acquisition without `--acquire` lists candidates only. Selected download actions preserve existing originals; successful receipts merge across batches. Static inventory reuses retained 2026-10-16 HTML evidence, scans only Desktop/Downloads for matching local ZIP names, excludes derived runtime archives from original acquisition counts, and does not override independent runtime acceptance. Root owns actual MAME boot, coin/start, gameplay/input, memory/frame reverse-engineering acceptance and its separate overlay.

Source ZIPs and derived archives remain local runtime assets; this task stages or commits none. Code, source observations and receipts are independent of ROM distribution.
