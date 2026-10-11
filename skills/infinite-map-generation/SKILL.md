---
name: infinite-map-generation
description: Generate reproducible streamed 2D world data for Codex game development, inspect bounded traversal and resources, reuse game-asset-studio chunk/Tiled outputs, and retain QA provenance.
---

# Codex 地图生成辅助

用在游戏开发中的地形数据、分块世界、风格场景、资源布置或地图导出任务。用户要真实地图时，应交付实际纹理、装饰层、地图图片、碰撞和可调用导出，不能用诊断色块冒充成品地图。地图页面用于检视实际结果。

## 真实风格地图

`map-scene.mjs` 使用三套真实生成图集（painted/pixel/scifi），八类地表和四类装饰；不是换色方块。实际复用Wangscape MIT `CalculatorTopTwo.cpp`并编译原源码对照JS移植。源图、提示词、版本和原始源码/hash保留在 `tools/animation-lab/map-vendor/SOURCE-scene.json`、`public/map-styles/`。源码读取和atlas保持非破坏性；错位/透明边残线通过实际截图发现、裁切校准和同坐标复测。

```sh
node scripts/styled-map-cli.mjs export --style painted --seed forest-01 --x -32 --y -32 --width 32 --height 32 --out-dir examples/forest-01
node scripts/styled-map-cli.mjs plan --style pixel --seed forest-01 --x -32 --y -32 --width 32 --height 32
node --test test/map-scene.test.mjs
```

输入结构 `{config,region,style,pixelsPerTile,outputDir}`；config/region承袭原JS生成器，style必须为三种之一。`plan`只产描述；`export`实际写地表/透明装饰/组合 PNG、原atlas、Tiled map、逻辑JSON、来源和hash收据。PNG编码依赖pngjs7.0.0（Codex runtime已提供，其他机器安装项目依赖），退出0/2/1为成功/参数/运行错误。

页面默认真实游戏场景纹理，可连续探索/换风格，另有群系/高度诊断；真实ZIP下载含像素与碰撞对象。地形四角和纹理地址用全局坐标，装饰导出有halo，负块独立渲染与整区RGBA一致。位图按32MiB/512块限制，4/8/16像素LOD随缩放及可见块预算调整；模块Worker生成纹理与导出，远景省略不可读小装饰。AI图集不可按文字网格假定等分，必须实测边界注册。场景包是无限世界的有限窗口，按块导出和实时生成可以继续世界，不烘焙整个无限地图。

先按目标玩法与参考风格选择素材和地图空间，再在用户实际坐标与缩放检查过渡、条带、重复花纹、装饰尺度、遮挡、每个边界及实际导出。图集生成不等于地图构图验收；地图看过也不等于引擎已接入或游戏好玩。QA `examples/map-scenes-v1/qa-report.json` 明确保留技术、视觉候选、引擎未导入和导航未检查装饰碰撞的状态。没有真实地理高程、道路/桥梁/城镇生成，不能宣称已经有。

## 入口

在 `tools/animation-lab` 工作目录执行：

```sh
node scripts/infinite-map-cli.mjs region --seed survival-01 --x -64 --y -64 --width 128 --height 128 --out examples/world.json
node scripts/infinite-map-cli.mjs validate --input examples/world.json --out examples/world-review.json
node scripts/infinite-map-cli.mjs chunk --seed survival-01 --x -1 --y 0 --out examples/chunk.json
node scripts/infinite-map-cli.mjs test
```

无 `--out` 时 JSON 写到标准输出。退出码：`0` 成功、`2` 参数或 schema 错误、`3` 区域可玩性检查失败、`1` IO、运行或测试错误。失败输出不能当成验收通过。

JS 工具入口：

```js
import {mapOperation} from './infinite-map.mjs';
const result = mapOperation({
  operation: 'validate',
  config: {seed:'survival-01',scale:192,seaLevel:.38,roughness:.45,vegetation:.65},
  region: {x:-64,y:-64,width:128,height:128},
  spawn: {x:0,y:0}
});
```

`operation` 为 `tile`、`chunk`、`region`、`validate`。`point` 是全局格坐标；`chunk: {x,y}` 是 32 格块坐标；`region` 是全局格矩形。CLI `--args` 接受同一结构，显式 CLI 参数优先。

## 两个已区分的算法

1. `studio-simplex-biomes-v1`：本项目薄适配，复用上游本地 alea 1.0.1 与 simplex-noise 4.0.3。该数据与页面共用 JS 核心，九种诊断群系、独立高度/湿度/温度、木材/石料/纤维散布、通行属性。配置的 `seed` 是 1–160 字符；`scale` 48–768、`seaLevel` .2–.62、`roughness` 和 `vegetation` 0–1。全局坐标支持 ±10 亿整数；每次区域最多 65,536 格。LRU 缓存最多 192 块，可独立设定预算。
2. `deterministic-chunks-v1`：从用户指定本地 `game-asset-studio` 原样提取 Python `generate_world_chunk` 与 `world_chunk_to_tiled`，只适配环境目录读取。不能宣称两种噪声输出数值相同。

复用上游的数据：

```sh
node scripts/infinite-map-cli.mjs studio-chunk --world-id my-world --seed 2048 --x -1 --y -1 --chunk-size 64 --environment mortal-temperate --out examples/studio-chunk.json
node scripts/infinite-map-cli.mjs tiled --world-id my-world --seed 2048 --x -1 --y -1 --out examples/studio-tiled.json
```

上游种子必须是安全整数；块坐标 ±1,000,000；块大小 16–128。上游环境 `planned`/`in-progress` 仍是该状态，不能因生成出地表就提升为完整玩法。Tiled 文件引用外部 `asset-forge-surface-materials.tsj`；未包含该 tileset 像素，不宣称已完成 Godot/Phaser 导入或美术验收。

## 游戏质量检查

先按游戏角色设定通行规则，当前默认海水、岩山不可通行。检查按区域内四邻接图执行，输出 `spawn`、`reachableCount`、`reachableFraction`、`componentCount`、`reachableResources`。未指定出生点时选择最大通行分区中靠近区域中心的格子；指定出生点必须在区域内且可通行，否则退出码 3。

该检查仅覆盖导出区域，不证明无限世界全局连通、跨河桥梁存在、道路/任务/目标可达、敌人和经济平衡、角色碰撞体可通过。没有游戏类型与目标位置时，不把漂亮地图或 `ok: true` 当成“好游戏”。按实际游戏增加出生点到目标的路径、资源距离、危险分布与碰撞尺寸检查。

保存种子、配置、算法版本、导出文件、报告及失败复测。升级噪声库、阈值或算法必须换版本，不静默更改已存世界。原地形无全局 RNG/时间依赖；UI 的随机种子按钮只生成新显式种子。

## QA 与来源

- 来源锁定：`tools/animation-lab/map-vendor/SOURCE.json`，含源项目 commit、文件 SHA-256、转换范围、许可证元数据。
- 确定性回归：`tools/animation-lab/test/infinite-map.test.mjs`。
- QA 路径：`tools/animation-lab/examples/infinite-map-v1/qa-report.json` 与 `core-test.log`。
- 页面：本地工作台 `/map-generator`，拖动、方向键、滚轮、负坐标跳转、分块边界、海拔/湿度层、区域 JSON 和可达性检视。

上游只读；不得为复用启动、改写或重新生成原项目资源。上游 Phaser 页面目前是有限文档预览，不把架构里的计划 streaming 当作已实现。

## Actual 2.5D / 3D scene paths

Read `tools/animation-lab/docs/map-terrain-and-isometric.md` for the implemented mature-source adapters, structured APIs, coordinate units, style environment bundles, streamed caching, local full resource packs and offline exports. Use `terrain-3d-cli.mjs` for actual mesh/PBR/GLTF scenes and `isometric-map-cli.mjs` for Canvas2D sprite maps. These supplement the original top-down path; never call a 3D orthographic camera “2D 2.5D.” Re-run core tests plus real UI screenshots when modifying these paths. Distinguish foundation/stream placement validation from art approval.

Current source-backed capabilities include 11 local packs / 1315 indexed resources, 4 distinct 3D environment bundles, 3 Canvas2D isometric themes, plannerVersion 3 source curves with maximum30° raw turns and stream/foundation/cave avoidance, measured native cave entrance direction and compound collision, and a source GLB castle assembly rendered offline to a pinned 1024 PNG. The cave aperture exit and rear-wall blocking are tested; no underground scene transfer is integrated. The high-resolution castle sprite uses a measured foot anchor; draw all ground before depth-sorted objects so foreground tiles cannot slice its base. The 3D castle source arch now has two jamb colliders with a measured clearance rectangle and actor height guard; actual UI ingress, egress and jamb blocking are tested. Current isometric v7 projects the actual eight source modules into nine flattened wall/jamb AABBs: UI ingress, egress and jamb blocking are tested. Eight separately rendered sprite layers sort around the actor; the failed whole-sprite floating-wall capture is retained. Derived Nature Kit sprites retain source GLB/render/PNG hashes and measured anchors; failed dark shadow renders were retaken with real fill lights. Current 3D v10 retains v6 aperture rules, replaces the incorrect bilinear-clearance check with actual indexed triangle sampling, and deepens flat channels/source/terminal plateaus. The genuine v9 minimum clearance−.080859m is retained; v10 checks931 actual vertices/centroids/edge-midpoints with minimum+.02379998m. It does not establish arbitrary triangle-based engine actor collision. Canvas2D v7 uses original source ground diffuse and actual cropped raster water, globally patterned with256px runtime mips; preserve the original PNG metadata and decode by PNG signature because the native codec mistook embeddedSVG metadata for an SVG image. Do not edit source images to hide this codec failure.

The exact original top-down overview x251/y−272, scale96, zoom4 loads40 visibleLOD4 textures/2.5MiB. ActualChrome cold ready time improved17.988s→3.035s via early rejection of invalid foundation candidates, height-only river sampling and skipping invisible overview props. Accepted foundations still sample all25 points with unchanged heights; compare original and optimized placements and paths deterministically. Main draw≈0.3ms and background rAF≈33ms are separate measurements, not a60FPS claim. Keep per-phase worker planning/terrain/logic metrics and cold-versus-warm distinction.

Full native/scene/isometric/terrain/planner regression currently72/72 (`core-v10-performance-test.log`). QA remains candidate: thin abrupt river termination, repeated caustics/leaf branches, implausible distant castle shape/scale/fog, block-like2D overview contours, road grids, interior gameplay and engine import remain open. Do not call these accepted because export validators pass. New UI fixtures use explicit `qaTime=0` to fix water phase; earlier screenshots had uncontrolled phase, so their comparison is coordinate/camera-level, not identical-animation-phase proof.

Record failed and repeated observations in `tools/animation-lab/examples/map-terrain-3d-v1/qa-report.json`, the isometric report, catalog hash audit and current core-test log. Preserve before/after images at identical coordinates, camera, scale and algorithm. Validate actual downloaded browser GLB using Khronos and include its hash separately from CLI exports. Missing top-down semantic assets, gate/interior gameplay, engine-side import, and portable equivalent stochastic/PBR/water shaders remain explicit gaps. Do not carry a prior algorithm screenshot forward as a current-version visual pass.

## Current planner4 terminal refinement

Current terrain v11, isometric v8 and top-down v4 use plannerVersion4. Planner3 source coordinates/max30° turns remain; local/visited terminations may add an explicitly generated depression (`terminalBasin`, `hydrologicallyValidated:false`). Final path widths smoothly expand inside that footprint; source geometry, carved bank, 2D/2.5D/3D art and collision consume identical widths. Validate complete neighboring foundation/cave footprints before expansion. This is a generated basin, not evidence of a real watershed or geographic water supply.

Actual same-phase main/near captures and source points are `ui-river-natural-fixed-phase-v11.png`, `ui-river-terminal-fixed-phase-v11.png` and `river-source-planner4.json`. Expanded basin UI movement from171/148 toward−X stops167.8/148 with hit water. The931 actual triangle checks retain minimum+.02379998m. Current73/73 core tests and six CLI GLB exports pass; actual browser terminal GLB13,212,848bytes validates0errors0warnings. Preserve v10/v7 complete offline snapshots. Forest100–165m fog restores distant castle walls; rejected130–260m exposed the streamed horizon and must remain a failed intermediate.

Actual original overview planner4 cold40/40 ready2.833s,2.5MiB, draw.4ms; Canvas2D first draw39.8ms versus warm2.9ms must be reported separately. Generated pond bank texture stretching, periodic branch/caustic repeat, boxy castle and mechanical vegetation remain art candidates. Do not inherit prior-version visual conclusions or claim source metadata/import validator is aesthetic approval.

## Source castle / slope QA refinement (terrain v12)

For a distant castle that reads as one hollow box, inspect the actual pack's native sample and modules before inventing replacement art. Current3D `castleSceneProps` uses33 original measured Castle Kit tower/base/window/roof/curtain/arch modules, stacked without floating floors; rendering, conservative OBB collision and both GLB export paths share these props. Record aperture ingress/egress/jamb separately from courtyard/interior gameplay. Actual v12 keyboard ingress/egress is fraction1, offset+1.3m hits the gate. Isometricv8 remains the older8module raster assembly: don't claim automatic parity with the3D assembly.

For steep bank UV stretch, X/Z world continuity alone is insufficient. Use globalXYZ triplanar Diffuse/Normal/ARM with identical transforms; decide projection using actual fragment triangle slope when analytic/interpolated normals fail at the carved rim. Keep smooth normals for lighting, inspect original-size same-coordinate qaTime0 images, and measure GPU cost. Retained first shader cost~5.32ms improved to~1.51ms main/~1.66ms near after a flat fast path. Original source PBR bytes stay unchanged. Standard GLB still has X/ZUV and does not reproduce this browser shader; engine adapter/bake required. Do not erase that limitation because Khronos validates the container.

Current `core-v12-test.log`74/74 and browser13,344,020byteGLB0errors0warnings are technical evidence only. `qa-report.json` preserves37actual UI cases, originalv11failures, interpolated-normal intermediate, source/model/layout hashes and versioned CLI exports. Angular bank geometry, branch-repeat ground, mechanical vegetation, interiors/quests and2Dcastle parity remain open. Keep visualAccepted/engineImported/gameplayValidated false until those corresponding checks actually pass.


## Isometric castle parity and visible gate (terrain v13 / isometric v10)

The Canvas2D path now consumes the same `castleSceneProps`33-module layout as3D. It draws33 independently rendered, alpha-cropped original GLB sprite layers and projects20 source ground-floor footprints. Native model SHA values, Blender5.2.1LTS ortho48/elevation30/azimuth45, exact module heights/yaws/ground anchors and cropped rectangles are retained in `parts-v3.json`. Original GLBs and materials stay unchanged. Cropped layers use about487k decoded pixels instead of33 full1024-square images; this reduces texture memory but does not establish universal performance.

The first33-layer render failed two actual UI checks: tall keep roofs clipped at the old64px ground center, and native arch depth occluded its physically empty aperture when viewed diagonally. Preserve `ui-isometric-castle-near-clipped-v9.png` and `ui-isometric-castle-near-v9.png`. Extent-aware culling, a `完整城堡` fit control, and sprite-inclusive offlinePNG extents correct framing. Production-only arch `sourceScale:[.3,1,1]` is shared by3D instances/OBBs/bothGLB exports and Blender-derived2D pixels; native source files are untouched. In the3D23.04m fixture this leaves .76032m tunnel depth,1.419264m conservative net width and2.28096m height. Visible pillars and adjacent gate towers retain mass, so the aperture is not implemented as a flat line. Normal48px camera38/42 and complete64px fit camera35.045729/38.815633 have actual screenshots.

Actual2D keyboard3Up/3Down crossesY47.33654↔44.33654 atX37.880241 without blocking; shiftedX+.55 stopsY45.721155 at source arch colliderpart19. Actual3D5Up/5Down crosses8m; shiftedX+1.3 stopsZ122.427747 at gate module32. This verifies an aperture only: courtyard/interiors/quests/objective routes and engine integration remain pending. The2D planner uses grid units and3D uses meters; shared normalized assembly does not assert identical global terrain geography across generators.

Browser PNG916,809bytes and JSON896,492bytes are preserved in `browser-isometric-castle-v10.*`; actual downloaded JSON matches current core exactly. CLI `examples/map-isometric-v1/castle-v10/` contains completePNG/source sprites/JSON/collision/Tiled/receipts, with no clipped sprite extents. Actual downloaded3DGLB13,343,992bytes SHA7502bdac50c8f454113f4ff7aaeadb9c84ff05a459016dd976e6d38276ff5fbd and new CLI1,733,252byteGLB validate0errors0warnings. Browser/custom triplanar shader remains nonportable in standardGLB. Current75/75 map-specific technical checks and1349actual catalog items/11packs with0hash mismatches are not art acceptance. Current report has47actualUIcases and preserves earlier source/render/scale failures. Mechanical vegetation, repeated source leaf branches, angular water-bank geometry, mixed village palettes and road grid remain candidates.


## Grove / dry-bank follow-up (terrain v15 / isometric v13)

Root reviewed the actual v10 nearcastle PNG at native size: complete towers and gate are locally recognizable; the whole map remains visually failed because realistic ground, low-poly vegetation/roads and mixed building styles conflict, a crown clips the building, and the source ground repeats. The initial33.0ms was briefly misread as330ms by root and explicitly corrected; preserve33.0 cold /1.5 warm, not a performance acceptance. Latest v13 cold48.9ms /warm1.0ms /worker30.6ms is a separate real measurement; caching does not erase cold stalls.

`forestEcology` uses continuous global source-seeded density plus species domains; stronger density contrast creates clearings and groves, and tree heights vary3.2–6.69m instead of uniform4.8–7.09m.2D uses the same pure ecology in grid-scaled coordinates. This is artistic distribution, not ecological or geographic truth. Native canopy radius/sprite width reserve an outside halo around foundations; source GLBs are unchanged. Actual2D crown overlap fixture improves, and village sprites use original cream walls/brown roof instead of alternating cyan walls/red roof. The redroof intermediate remains preserved.2D jittered colliders now follow actual sprite ground centers. Current source leaf pattern/style mismatch and square village street pattern remain open.

For hard dry banks, `streamChannelHeight` smooths from .65 to1.5 halfwidth, returns original height inside castle/village foundations, and keeps authoritative river water/width/collision unchanged. Actual terminal camera166.133/147.371, position178.133/17/159.371,targetY5.9,qaTime0 shows a gentler rim; vegetation changed too, so this is not an isolated shader-only comparison. Browser uses32resolution (1m), currentCLI forest-v15 uses64 (.5m). The source/terminal path retains planner4; no hydrologic claim. Portability still requires actual custom triplanar/stochastic/water shader equivalent or bake.

Current79/79 tests include continuity of negative-coordinate grove density/clearings, actual jittered sprite colliders, canopy foundation clearance, dry shoulder slope continuity, unchanged outside-water blocking and foundation-order independence. UI v13 keyboard3step ingress/egress remainsfraction1;+.55X blocks gate part19. Actual browser currentGLB13,282,864bytes SHAdb20ea066ecdb041f5ff0c6d7071119cec625369021825ad042426dec8b32e86 and CLI2,985,032bytes validate0errors0warnings. Browser PNG887,558bytes/JSON558,380bytes match current core; offline scene/source/collision/Tiled receipt is `examples/map-isometric-v1/castle-v13/`. StandardGLB uses original PBR/XZUV, not browser triplanar. Actual nearGPU~2.57ms, main29chunks374props/118,328triangles/57drawcalls, workersmax157–172ms and backgroundrAF~35ms are scope-limited measurements, not universal60FPS/highavailability.

Evidence index preserves56UIcases,9CLIexports, old v13 core snapshots, all original model/source hashes and current adapter audit. All global visualAccepted/engineImported/gameplayValidated flags remainfalse. Local castle-recognition approval is distinct from complete style coherence, rich playable interiors/caves, objective routes or a finished game. Continue from actual current screenshots rather than inheriting a v10/v12 image as current verification.


## Isometric cold draw and theme-source gate

For a cold-stall report, preserve seed/camera/cell/region and the first draw separately from warm toggles. Profile asset decode/preparation, worker generation/raster queue, main ground/order/tile/sprite/water phases and total first scene. Do not process a water atlas in a stream-free scene. Cache async source mips with pending-job deduplication; releasing a generation must close late bitmaps rather than resurrect cached images. Sort source-part ground/object queues in the worker; a continuous ground plane can omit covered dry tile draw entries without deleting logical tiles or collision.

Existing v17 uses pixel-aligned global ground bounds, OffscreenCanvas worker fill and transferred ImageBitmap. Close old/stale rasters; record extraRGBA allocation and the8,388,608pixel cap. Keep direct-render fallback explicit. Tests compare negative-world visible source pixels and complete source33module actor ordering, not implementation-mirroring mocks alone. Preserve v13cold48.9/v15cold20.4/v16cold29.9; latest fixturecold1.8/2.0ms and warm.8ms do not imply60FPS because observedrAF35–67ms and totalfirstscene296–315ms remain separate. HTTP cache was not cleared. Current86/86 dedicated regressions and real PNG/JSON/doorway tests do not replace art/engine/gameplay acceptance.

Before claiming a coherent natural style, audit actual object/material counts and inspect native pixels. Current1349items/11packs contain only2photo-derived3DPBRobjects; upstream9PNGcomponents/4Diffuse-onlygrounds are partial single-view imagery with halos/bakedground. Preserve inventory SHA/source commit and exact missing mature vegetation, realistic modular structures/cave, paths/shore/water pools. External source pages are candidates until binaries, hashes and actual in-scene QA exist; API403 is a discovery failure, not successful integration. Keep overall theme/art flags false until consistent ground+water+objects are actually reviewed.


When zoom changes before the new worker scene/raster is ready, reuse the old raster in world coordinates scaled by currentcell/sourcecell; do not force a main-thread pattern refill. This temporary loaded-window image must be replaced by the new exact region/resolution, preserve budget/cancellation, and retain source assets. v18 actual four64→32transitions.9/.9/1.2/.7ms replace v17 main refill15.3/7.9/12.7/11.7ms. Synchronize the share URL immediately on button/wheel zoom and actually reload to check it. Keep idle/backgroundrAF spikes and full firstscene latency separate; do not use a fast zoom frame to claim finished natural art or portable engine integration.
