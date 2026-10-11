# 可调用地图工具：实际能力与验收范围

`/map-generator` 的「2.5D 等距素材地图」分支使用真实 Kenney PNG、Canvas2D 和脚点深度排序；不是 3D 正交投影。`/map-generator-3d` 使用真实高度 mesh、Three 0.185.1、GLTF 模型、Poly Haven Diffuse/Normal/ARM 和阴影。二维俯视使用已修 atlas 注册与随机连续采样，并接入与等距相同的 planner3 河流源路径。

3D 实际复用 ZyFou/ProceduralTerrains commit `7452c2ce5dc598be020a44735d78e444ae0ed255` 的 CPU NoiseStack、seed domain 和 ChunkStreamScheduler；来源与 SHA 在 `map-vendor/SOURCE-terrain-3d.json`。没有移植整个上游 studio/GPU noise，也没有真实地理高程。完整本地资源来源、ZIP/文件哈希在 `public/map-resources/*/source.json`。资源浏览器支持筛选、原始 PNG 预览和实际模型旋转预览。

## Codex API / CLI

```js
import {terrain3dOperation,TerrainWorld3D,sweepTerrainMotion} from './map-terrain-3d.mjs';
terrain3dOperation({operation:'features',config:{seed:'漫游-2026',style:'forest',scale:256},bounds:{x:128,z:0,width:128,depth:128}});
terrain3dOperation({operation:'chunk',config:{seed:'漫游-2026',style:'dunes'},chunk:{x:-1,z:0},resolution:32});
```

```sh
node scripts/terrain-3d-cli.mjs features --seed 漫游-2026 --style forest --scale 256 --x 128 --z 0 --width 128 --depth 128 --output /tmp/features.json
node scripts/terrain-3d-cli.mjs export --style forest --scale 256 --x 5 --z 0 --width 3 --depth 3 --out-dir /tmp/game-map-3d
node scripts/isometric-map-cli.mjs export --args '{"style":"settlement","config":{"seed":"village","scale":256},"region":{"x":0,"y":0,"width":32,"height":32}}' --out-dir /tmp/game-map-isometric
node --test test/map-terrain-3d.test.mjs test/map-isometric.test.mjs test/world-feature-plan.test.mjs
```

3D 命令 `plan|features|sample|chunk|export`。config：seed 长1–160、style `scanforest|forest|dunes|moon`、scale16–512、height1–120、waterLevel−1..1、vegetation0..1；preset 六种官方源 presets。sample/features 的 x/z 是世界米；chunk/export 的 x/z 是32米块坐标，不能混用。resolution4/8/16/32/64；export最多49块；features窗口最多1024×1024；探索支持±999000米，给语义查询 halo 留余量。退出码0成功、2参数错误、1执行/文件错误。

等距命令 `generate|export`，`--args` JSON 对应 `buildIsometricScene({config,style,region})`；style `forest|desert|settlement`，region是全局格坐标整数矩形，最多8192格。export生成真实 scene.png、复制精灵、离线 scene.json、collision.json、map.tmj、source*.json、SHA receipt。Tiled 对象坐标与引擎导入尚待实际编辑器验证，collision.json 全局格坐标是权威碰撞数据。浏览器 PNG 按当前视窗导出，JSON保留来源 URL；离线完整文件需使用 CLI。

3D 导出 scene.glb 嵌入真实纹理与模型，不依赖网络；源 GLB 可以含外部 texture URI，适配器会读取并真正嵌入，不能只检查 GLB 文件头。scene.json 保留 props、全局 features、noiseStack、collision 和材质主题。各样例附官方 Khronos validator 输出。

## 主题与语义

四套三维 environment bundles 分别指定 terrainPBR、water shader参数、模型池和光照。月面默认无水。主题切换即时移除旧实例/水带、终止旧worker，代次隔离旧结果，释放旧纹理与模型GPU资源。保留原素材不变；三维 Kenney grass/dirt/leaf 材质配色映射与建筑展示底座埋入属于派生展示规则，记录在 source。

WorldFeaturePlanner 基于未经修改的高度规划：25点地基检查 castle/village，再平整 foundation；plannerVersion3 的溪流源沿基础高度下降，最大相对转向30°，用下降幅度与转向代价筛选路径。二次圆角重新检查沿点下降与完整邻区城堡/乡村/洞口避让；raw `sourcePath`、渲染/碰撞 `path`、termination 和 seed 均保留。再雕刻河床；高度修饰对枚举顺序无关，地基优先。核心 heightAt、normalAt、mesh与碰撞使用改后连续高度。每块缓存 modifier，避免每顶点重新发现 POI。城堡复用 Castle Kit 模块，乡村由四栋房屋组成，溪流真实全局path水带跨块共享。坡地找不到可靠地基时不强放城堡。

`validated` 只表示放置检查通过。三维洞穴入口已集成原始 cliff_blockCave_rock，按基础下坡法线定向、旋转实际开口−Z，地板平整与三段OBB侧/后墙避免把入口整块封死；已有实际 UI 进出入口与后墙阻挡检查。完整地下关卡、传送、三角网格碰撞仍待开发；hill是基础地形标记。等距城堡现为原 Castle Kit 八模块在独立 Blender5.2.1 EEVEE 离线渲出的1024px透明PNG，原始GLB和render脚本SHA已保存。地图仍是Canvas2D；原点地面锚点实测为0.6737，先绘地面再排序建筑/角色，避免前景地块把门口切掉。俯视 styled renderer 已消费源河流并导出胶囊路径/宽度、格通行与连续disc sweep，建筑/洞穴/道路美术资产尚未消费。以上缺口不能标已完成美术。

## QA 的实际含义

- CPU determinism、负坐标边界高度/法线/tangent、跨块对象唯一性、连续disc移动、water/slope阻挡已有核心测试。3D 浏览器地面采样现按实际 [a,c,b,b,c,d] 网格对角线做三角插值，避免旧双线性近似漏过水岸交叉；GLB 物件仍为近似圆柱/OBB，并非任意三角网格碰撞系统。
- 数据与纹理的缓存分开控制；3D当前窗口上限29块，worker nearest-first生成。语义首次预规划实测最大约600ms在后台，仍有渐进加载时间。完整扫描对象三角形较多，GPU真实timer数据以QA报告为准。
- 沙丘原始 white 粒度层默认 floor 阶跃会产生约0.48m方块台阶；薄适配将该层 smoothing 设为1，使用上游连续 vnoise2，源文件不改。
- 同世界坐标随机 UV 对 Diffuse/Normal/ARM 同步变换减少周期重复；水面波动全局坐标连续。它们是WebGL自定义 shader，标准GLB未携带该shader，导出使用真实源纹理而非完全相同的随机采样画面。引擎侧等效shader接入或烘焙仍待开发，不能声称导出像素相同。
- 所有视觉均为候选，`visualAccepted:false / engineImported:false / gameplayValidated:false`。漂亮预览不能证明出生点、目标、资源节奏或关卡玩法成立。

## 资源导入与实际复测

`node scripts/import-polyhaven-material.mjs rock_08` 从官方 Poly Haven API 下载原始 Diffuse/NormalGL/ARM 1K JPG，先验证原 MD5/字节数，再记录 SHA256、API 原文并更新可浏览 catalog。退出码0成功、2输入错误、1下载/文件/校验失败。资源库现为9套上游资源 + 2套派生精灵、1315项，包含18张PBR贴图；未启用的贴图保留库中，并不表示所有地图风格都使用它们。

荒原候选的旧 rocky_terrain_02 是带苔绿地，实际截图判失败；另检 aerial_rocks_02 与 gray_rocks 仍带植物。当前裸岩采用实看原图的 rock_08；Kenney 原石块草顶按主题映射为灰石。原图不改，也不是实际月球高程/纹理。

3D 页面保存配置、世界位置和相机到URL，方便同坐标复查。资源 catalog 使用 no-store，防止刚导入的整包在页面仍显示旧索引。详见 `examples/map-terrain-3d-v1/qa-report.json` 的失败、复测、实际下载与冷热性能差异，及 `examples/map-isometric-v1/qa-report.json`。

当前3D算法 `procedural-terrains-7452c2c-cpu-planner3-river-scenes-v10`；等距算法 `kenney-2d-continuous-ground-planner3-river-textures-v7`；俯视为 `wangscape-top-two-global-planner3-rivers-v3`。它们均为候选，不提升之前未通过的美术或引擎状态。

v9自测发现旧双线性 mesh 检查漏掉实际水岸交叉，最差水面低于实际三角地面0.080859米，日志保留 `core-v9-triangle-failure.log`。v10扩大原河宽内部平底区并加深，源池/终池使用同一胶囊范围；当前fixture水面顶点、三角形中心与边中点共931点检验，最低净空0.02379998米。它不是所有世界/分辨率的水文验收，详见 `river-triangle-clearance-v10.json`。当前水 shader v3 添加按岸缘顶点色渐隐与全局细水纹；独立圆角内圆扇曾造成透明重叠黑团，失败近图保留。

实际保留源seed与相同相机重新走查 v7、v8、v9、v10：当前岸缘/转向有所改善，但短水带、孤立流域末端、构图尺度、地面重复和雾遮城堡仍需美术收敛。新增 `qaTime=0` URL固定水相位，用于今后截图复查；旧图未记录相位，不声称与新图像素同相位。2D/等距共用 InfiniteWorld 的格地形与128格语义区域；3D来自 NoiseStack 的米制地形与256米语义区域。共享规划器不等于三者生成了相同地理数据。

等距保留v4实际8源模块分层和9个门墙AABB；v6真实UI重新穿入/返回 fraction1，侧柱 offset1.6格被挡 fraction0.4615，源门洞几何规则未变。v7新增原 painted atlas 水纹 PNG 的连续全局 pattern 和多圈湿岸过渡，森林/乡村使用原 forest_leaves_02 JPEG 连续世界地面替换亮绿烘焙菱形边线。原PNG/JPG字节及SHA未改；运行时256px mip减少主线程绘制，实际失败中间图曾75–82ms，后续当前视图约1.5ms。新真实水纹导出最初被@napi因PNG XMP里含SVG文本误识别，失败日志保留；按PNG签名用pngjs解码到运行时Canvas后通过。源 atlas/metadata 仍原样复制到离线包。地面枝叶周期和乡村规则道路仍未通过。

当前70项核心回归通过（包含原世界13项及新薄河disc/真实水纹/独立负窗口RGBA）；六组v10离线GLB经Khronos0错误0警告，五份v7等距完整离线样例包含river。实际浏览器v10森林GLB13,223,764字节，SHA `6782dbd2203bd8ca82414cdf5cf43c812ba0986c44975f14994291db0f2e26d0`，Khronos0错误0警告；真实2D ZIP通过独立Python CRC检查并含河流路径与宽度。技术验收不提升美术状态。

新版2D冷加载仍为渐进式：原负坐标river视图第一块最大6.78秒、4块完成9.36秒；避免无用洞穴/山丘25点地基查询、缩小有数学界限的规划halo、单独缓存基础海拔后复测第一块2.64秒/4块5.43秒。中途并行负载采样23.02秒也保留。主线程该视图约0.4ms，不能以warm绘制时间掩盖冷加载延迟。3D/等距GPU/FPS、用户原缩小坐标复测以报告原始metrics为准；没有多设备60FPS验收。

UI门洞与洞口走查不等于完整城堡/地下场景玩法。当前未接任务/传送/室内关卡、引擎实际导入、目标路线和资源节奏；GLB保留真实标准PBR与水岸COLOR_0，却不携带浏览器随机采样/水波shader。Tiled真实编辑器对象坐标对齐仍未验。所有原失败截图、源SHA和当前技术/视觉证据在 `examples/map-terrain-3d-v1/qa-report.json`，任何旧算法图不继承为当前美术通过。


Cold overview performance follow-up: exact user seed漫游-2026, scale96, seaLevel.45, roughness.45, vegetation.65, painted x251/y−272 zoom4 went17,987.9→3,035.2ms to40/40 textures (2.5MiB). The intermediate height-only version16,549.6ms is retained. Early foundation rejection removed the main waste: invalid candidates stop immediately; accepted25-point fits and source river geography remain identical by regression. LOD4 omits invisible prop sampling. Actual DOM worker phase metrics and screenshot `ui-topdown-user-overview-after-v3.*` are retained. Draw.3ms/backgroundrAF33ms do not establish universal60FPS orhigh availability.

Current follow-up: terrain v11 / isometric v8 / top-down v4 / plannerVersion4. Source turns remain unchanged; local/visited river endpoints can receive explicit `terminalBasin` generated depression with `hydrologicallyValidated:false`, source variable widths and complete neighboring castle/village/cave avoidance. Terrain carve and all three projections/collision use those widths. UI171/148→four ArrowLeft presses stop167.8/148, hit water, with actual indexed triangle ground sampling.931 checks remain minimum+.02379998m.73/73 dedicated tests; source raw points, widths, generated-basin provenance and current capture paths retained in QA report. Six currentCLI exports0errors0warnings; actualbrowser terminalGLB13,212,848bytes SHA256 ce4c2ae78f3d80a1a5075b0a1687bb41088c5a121c316e707f2410074072d705 validates0/0. Full v10/v7 offline snapshots retained.

SameqaTime0 main camera now shows distant castle walls: source geometry was grounded, but85–140m fog removed them visually. Forest100–165m fog is current;130–260m failed intermediate exposed finite streamed horizon. Current source bank still shows steep/texture-stretched edge, repetitive source leaf/caustic patterns and boxy castle/mechanical vegetation. Art acceptance remainsfalse. Current originaloverview cold2.833s vsprior17.988s, 40textures/2.5MiB/draw.4ms; Canvas2D first39.8ms/warm2.9ms are separate. Current screenshots do not carry over parent’s v10 visual review.

## Terrain v12: complete source castle and steep-bank projection

`procedural-terrains-7452c2c-cpu-planner4-castle-scenes-v12` keeps planner4 geography and river widths. `castleSceneProps(feature,heightAt)` replaces the eight equal-height blocks with33 original Castle Kit modules: four3-part corner towers, two3-part gate towers, a3-part central keep, eleven narrow curtain/gate wall segments and one original arch. Native `Sample.png` and previews were inspected; source GLB bounds were measured, stack floors meet exactly, all transformed extents remain inside the existing foundation. Original GLBs/materials are unmodified. Prop IDs, positions, uniform scales, scene roles and compound OBBs drive live instances and both exports. Upper floors do not block a floor-level actor merely because their projected footprint overlaps. This is conservative source-bound collision, not native triangle physics. The front gate retains measured local .28 width/.45 height conservative clearance, at world1.419m×2.281m in the recorded23.04m fixture.

`ui-castle-natural-near-v12.png` is the same native-sized camera as the preserved v10 near fixture (castle geometry was unchanged in v11). Actual UI fiveUp/fiveDown crosses betweenZ125.697 and117.697 atX179.615, fraction1. OffsetX+1.3 hits the source gate and stopsZ123.314787. All three screenshots/metrics are recorded. The courtyard currently uses foundation terrain; interiors, stairs traversal, portal scenes, quests and objectives remain unimplemented. Isometricv8 still uses the earlier eight derived PNG modules; do not describe its sprite representation as this33module assembly.

Steep banks previously used X/Z-only UVs. The browser now uses `global-continuous-triplanar-stochastic-pbr-v3`: globalXYZ metric coordinates, actual fragment triangle normal for projection weights, smooth normals for lighting, identical projection/hash/scale/blend for Diffuse/Normal/ARM and a flat-surface fast path. This fixes source textures stretching when height changes while X/Z barely change. An interpolated-normal intermediate still stretched and is preserved; its exact source snapshot was not captured, so it is not final shader evidence. Fixed near terminal screenshot `ui-river-terminal-fixed-phase-v12.png` retains the original geometry/path/camera andqaTime0. Angular1m bank geometry, branch repeats and mechanical trees remain art candidates.

Actual main scene initialGPU5.32ms dropped to final~1.51ms after the flat fast path; near bank~1.66ms, same main29chunks/458props/139,784triangles/57calls. Background rAF~35ms is not60FPS acceptance. `terrain-v12-first-test.log` retains a native float-size strict-equality failure8.53e-10; source size tolerance1e-7 fixed the test without changing source models. `core-v12-test.log` records74/74 technical checks, including source native bounds, tower stack continuity, gate collision and exact CLI prop placements. New CLI `castle-v12/scene.glb`1,934,044bytes and actual downloaded browser `browser-castle-current-v12.glb`13,344,020bytes validate0errors0warnings; original six theme exports remainv11 and are explicitly versioned. Standard GLB still uses original PBR/XZUV; it does not carry the browser's triplanar/stochastic/water custom shaders. Engine equivalent shading or a material bake remains required; browser bank improvement is not a portable export visual pass.

Current evidence/source index: `examples/map-terrain-3d-v1/qa-report.json`37actual UI cases and7CLI exports; `castle-layout-v12.json` includes33props/original model SHA/native bounds; `source-current-v12-audit.json` distinguishes retained upstream hashes from own adapter hashes. Preserve v11 report and images. All visual/gameplay/engine-import acceptance flags remainfalse.


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


### Isometric v17 measured cold rendering follow-up

The preserved same-camera castle fixture is seed `漫游-2026`, scale256, sea.45, roughness.45, vegetation.65, cell64, camera35.045729/38.815633, qaTime0. It has1369logicaltiles,194visible sprites and46decodedtextures. Earlier v13 cold48.9ms is not replaced by warm1.0ms. Instrumented pre-optimization43.7ms splits into ground13.5ms and an unused water-atlas resample27.6ms even though the scene has no stream. Water-free early return, async256px source mip preparation/cancellation and worker-sorted source module queues remove those costs. Later v15 cold20.4ms and v16 cold29.9ms are retained failures; choosing the earlier5.1ms/7.8ms samples would hide variance. Ground subprofiles show a cache hit and6.5–6.9ms in first pattern fill, not decode or sort.

v17 rasterizes the continuous world-ground rectangle in the existing OffscreenCanvas worker, transfers an ImageBitmap, and reuses it while the scene region is unchanged. Pixel-aligned global bounds preserve source phase; original source artwork/scene/collision are unchanged. One old bitmap is closed on replacement, all jobs reject on generation cancellation, stale worker returns close their bitmaps, and source caches cannot resurrect released images. The raster budget is8,388,608pixels; the actual fixture2,803,712pixels is about10.7MiB of rawRGBA, separate from decoded source textures. Browser support without OffscreenCanvas keeps the direct source renderer; it has no equivalent cold-cost guarantee.

Actual v17 independent full-page reloads draw1.8ms and2.0ms, ground0–.1ms; worker raster3.3ms/1.2ms, wait4.7ms/1.7ms; first complete scene315.3ms/296.3ms. Warm draw.8ms. HTTP/image caches were not purged, so these are renderer-cold tests, not uncached-network claims. Native Canvas API wall time is not GPU timing. maxrAF66.7ms/35.2ms still fails a universal60FPS claim. The negative-world river reload draws1.0ms but background raster14.3ms/prepare67.2ms/firstscene354.3ms. Desert switch uses4textures, no old forest raster/trees, but generation247.7ms/firstscene414.4ms remains a separate latency case. Current dedicated technical regression86/86 includes budget rejection, direct-versus-cached negative-world pixel identity, unchanged source castle module order/collision, pending mip cancellation and source hashes. It does not establish full-project regression or art acceptance.

Actual keyboard3Up/3Down still crosses the real arch Y47.33654↔44.33654 atX37.880241, fraction1 both directions; shiftedX+.55 stopsY45.721155 at modulepart19. PNG850,104bytes and JSON558,384bytes were really downloaded; current JSON geometry matches v13 exactly after explicit version normalization. CLI `examples/map-isometric-v1/castle-v17` retains source images, full sprite framing, collision.json/Tiled/receipts. Tiled editor/engine import and game objectives remain unverified.

`examples/map-terrain-3d-v1/natural-theme-source-inventory.json` separately audits1349catalog items/11packs. Only two current3Dobjects are photo-derived PBR sources (boulder_01 and pine_sapling_small). The upstream read-only studio at commit391b9dc2941056831d7a1823ceb17fed8e10fcc4 has9photoreal raster components and4groundPNG diffuse files; tree/house native review shows wide soft halos/baked ground and one available view, so these are not a complete3D or multiangle production theme. Missing pools include mature trees/undergrowth, modular PBR rural/castle/cave geometry, isolated realistic2Drocks and consistent roads/shore/water. Official PolyHaven PineForest scene/pine_tree_01/tree_small_02 were verified as potential sources, but all three public API discovery requests returned403; no new binaries were downloaded/registered. This exact lack is retained, not concealed by recoloring ground. Current screenshots still fail overall natural-theme art: realistic leaf ground versus low-poly objects, repeated branches/caustics, hard narrow shore and grid roads. Original source bytes and all older failed images remain preserved.


v18 follow-up preserves the v17 source snapshot and all slow transition frames. Real four-button64→32 zoom initially fell back to native main-thread pattern fill because the bitmap cell differed: draw15.3/7.9/12.7/11.7ms, ground13.3/6.4/9.9/8.1ms. Now the old world raster scales by currentcell/rastercell during worker replacement; the authoritative fresh region/resolution still replaces it. Actual transitions.9/.9/1.2/.7ms, final32scene2.0ms; ground0–.1ms, no extra main pattern fill. URL is synced on button/wheel zoom; real32reload stays32 and draws2.9ms, firstscene348.7ms,4489logicaltiles/615visible/47textures. The preserved17→18 screenshots are art candidates: unchanged scanned ground, lowpoly source objects, square village roads and native stepped sea boundary are still visible. Current86/86 dedicated tests include exact world scale placement of temporary bitmap reuse and original source pixel/window coverage. Browser32PNG719,262bytes/JSON1,649,756bytes matches currentcore exactly; separate native spriteCLI export is `examples/map-isometric-v1/castle-v18/`. Updated source audit35/35 and own adapter snapshot are separate from the old preserved v17 snapshot. Neither implies60FPS or whole-game acceptance.
