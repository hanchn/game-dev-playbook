# Standard original arcade runtime

Entry: [SF2CE standard mode](http://127.0.0.1:4321/standard-play.html?game=sf2ce). Press **加载标准游戏**, let the original game boot, click the game canvas, use **5** for coin, **1** for start, arrows for selection/movement and **J/K/L, U/I/O** for the six-button layout. External buttons forward input through the pinned emulator's actual GameManager; mouse and Enter/Space presses hold for at least the selected duration; they do not simulate a match or substitute animation frames. The emulator's native controls menu supports remapping and gamepads. A core-start callback is recorded as a diagnostic event, never proof of an actual match.

`data/standard-games.json` independently registers SF2CE, SSF2T, KOF98, Metal Slug and Knights of Valour. Each entry supports original `rom`, `core`, `supportedCores`, `bios`, `input.defaultControls`, `actionMap`, source SHA/CRC records and `runtimeVerified`. Neo Geo titles reference the existing `kof98/neogeo.zip`; KOV retains the MAME `kov/pgm.zip` and uses the complete pinned FBNeo BIOS `kov/fbneo/pgm.zip`. All entries begin **runtimeVerified=false** pending real browser coin→start→selection→play testing. Archive CRC validity is not ROM-set compatibility evidence.

## Original runtime and cores

- [Official EmulatorJS v4.2.3 release](https://github.com/EmulatorJS/EmulatorJS/releases/tag/v4.2.3), original `4.2.3.7z`, 303554683 bytes, SHA256 `07d451bc06fa3ad04ab30d9b94eb63ac34ad0babee52d60357b002bde8f3850b`.
- [Author core documentation](https://emulatorjs.org/docs4devs/cores/) lists `fbalpha2012_cps1`, `fbalpha2012_cps2` and `fbneo` as arcade cores. Original core binaries are extracted unchanged from that fixed release, not downloaded from an unpinned nightly.
- Local runtime: `vendor/emulatorjs-4.2.3/data/`; local receipt: `vendor/emulatorjs-4.2.3/source-receipt.json` covers all56 deployed files (43320251 bytes), including modern, legacy and thread variants of the three cores. No CDN is required by the configured dependency paths.
- Original archive is retained locally as `source.7z`, ignored by Git because its single-file size exceeds ordinary GitHub limits. The pinned URL/hash and importer reproduce it; deployable files and receipt are ordinary local files. No source archive is deleted.
- `scripts/import-emulatorjs-standard.py` extracts the author's fixed release with system libarchive `tar`, rejects unsafe archive paths, records SHA per file and checks all required loader/CSS/decompressor/core members. Versioned CDN returned403 during acquisition; the author's official GitHub release succeeded without credentials or payment.
- `scripts/audit-standard-games.py` verifies the56 local runtime file hashes, ZIP CRC/ROM+BIOS hashes for all five games and the six nonthread modern/legacy core archives' embedded JS/WASM members and WASM magic/version. Its report is `data/research/standard-runtime-preflight-20261016.json`; this is dependency evidence only.

## Configuration and acceptance boundaries

[Embedding/options](https://emulatorjs.org/docs/options/) and [control mapping](https://emulatorjs.org/docs4devs/control-mapping/) follow the fixed runtime's `loader.js`. The4.2.3 implementation replaces the entire default controller map and iterates players0..3; all four map objects must exist even for1P. An initial browser test exposed this missing-player exception before ROM boot. The wrapper now explicitly normalizes all four players without modifying upstream code. Button indices follow RetroPad mapping; precise per-title punch/kick labeling remains part of live verification.

The wrapper uses `EJS_threads=false` and disabled database caching for predictable local tests; no COOP/COEP server changes are required for this single-thread configuration. A threaded deployment would need the official isolation headers and separate testing. Runtime core selection is configurable (`?core=fbneo` or the dropdown before launch) because a MAME ROM set may differ from a particular FBA/FBNeo driver's expected files.

Do not change `runtimeVerified` on loader readiness or game-start alone. Record actual original boot/title, coin counter, selected character and active match/gameplay, plus observed input and console/network failures. Root handles this browser acceptance and navigation integration. This change does not edit shared `index.html`, `app.mjs` or `server.py`, and does not claim decompiled original gameplay rules or MUGEN source gameplay.

Reproduce/check:

```sh
python3 tools/attack-library/scripts/import-emulatorjs-standard.py
python3 tools/attack-library/scripts/audit-standard-games.py
node --check tools/attack-library/standard-play.mjs
```
