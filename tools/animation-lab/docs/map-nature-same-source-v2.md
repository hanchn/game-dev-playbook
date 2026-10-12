# 同源自然局部候选：2026-10-12 续接

入口：`http://127.0.0.1:4317/map-generator-3d?natureReview=1`。该页独立比较真实 Canvas2D 四朝向 PNG 与原 PBR 3D 模型，共享 7 个放置、米制脚点、朝向、角色移动与保守碰撞。不改无限等距 v18 / 三维地形 v15 / planner4，不注册正式资源主题；默认地图已实际运行29块、61props。没有提交或推送；没有启动第二个4317服务。

## 实际交付与失败

- TreeSmall02 原2062487三角形。55998版把树冠减稀，明确失败；159999版作为局部候选，GLB27548696bytes。原树、低LOD、中LOD固定512px相机比较，不按各模型尺寸重新找镜头。
- Shrub03 原4个根分别拆为4变体，2385/2134/1790/1978三角形；实际高.255–.403m，是低草本植被，不是成熟灌木整套。保持原材质/纹理/alpha。
- 原PBR Boulder01 LOD原型缩放.25，54098三角形；两个实例复用同一GLB。先误用植物低点中位根导致90°/270°裁切，保留失败PNG及metadata；改为岩石水平bounds中心/最低地面，所有朝向通过边界检查。
- PNG/GLB源坐标基于实测根/脚点，2D投影为 `orthoMeters × screenPixelsPerMeter / sourcePixels`。原16下载文件SHA验证一致。Blender派生GLB可能重新编码/打包纹理，嵌入材质字节没有冒称与原JPEG相同。
- 实际UI四个1280×480成片均逐张查看；两侧输入树干均停X−.350/Z0、石块停X−1.800/Z0、低植被穿过至X−1.600/Z1。数据和截图在`examples/map-nature-same-source-v2/`。
- 实际浏览器PNG/来源碰撞JSON/42287516byteGLB下载成功。JSON与当前core全部位置/朝向/源引用一致。Khronos发现派生岩石和初次场景GLB3个零切线，保留失败；仅修派生GLB3个切线XYZ为法向正交单位向量，其余bytes完全不变、原source未改。重新实际导出后7个派生+1个浏览器GLB共8容器0errors/0warnings。
- 新检查3/3，本机0skip；地图专属回归77/77。本轮没有全项目回归；原候选BIN/JPG仍按已有ignore本地保存，缺原包的checkout源SHA检查明确skip，不冒称已验证。

整体美术仍失败：2.5D源PNG太浅、与WebGL颜色不一致；没有审查通过的接地阴影/地表融合；地皮枝条重复；159999tri/27.5MB树和40.33MiB局部场景不满足密集无限森林资源预算。四个草本根不是丰富成熟植被库。本局部无水岸/村落/洞穴/道路/城堡、无限流式或玩法接入。GLB验证不等于引擎导入。`visualAccepted/completeNaturalTheme/engineImported/gameplayValidated/infiniteStreamed`全部false。

真实局部HTTP缓存未清空：ready119.8ms与firstDrawCpu/firstPresented分开记录，不能称冷网络载入；先前381.5ms ready、121.8ms首draw、504.3ms首完整帧保留。default-map-smoke报告11694982渲染三角形/GPU6.284ms，仅该当前扫描森林机位，不能推广FPS。资源目录max-age3600曾让旧JS/GLB/PNG留在UI，候选链接均按真实内容SHA固定。

## 文件范围与复现

- 仅共享入口`public/map-generator-3d.mjs`添加一个query分支；没有改server、角色、UI套图、world planner、主README、全局memory或root交接。
- 候选`public/map-resources/polyhaven-nature-candidate-v2/{manifest.json,review-core.mjs,review.mjs,*.glb,*.png}`。
- 前序失败`polyhaven-nature-candidate-v1/`，光照probe仍失败`polyhaven-nature-candidate-v3/`。不要因文件名v3就提升为生产。
- 生产脚本`scripts/render-polyhaven-nature-rooted.py`：默认导出原树/56k/4灌木/石；再`--tree-mid`补160k，再`--boulder`确保石头使用独立root规则。运行`render-nature-fixed-camera-review.py`固定原/低/中同相机，然后`repair-nature-derivative-tangents.mjs`修派生零切线。最后在UI重新下载。没有source raster重绘。
- `scripts/render-polyhaven-nature-candidate.py`保存原第一版；`render-nature-light-probe.py`保存未推广的光照probe。
- `scripts/audit-nature-candidate.mjs`检查实际downloadJSON/currentcore，验证8GLB，记录实现/证据SHA。validator2.0.0-dev.3.10当前在`/tmp/map-nature-validator/node_modules/gltf-validator`；其他安装位置用`NATURE_GLTF_VALIDATOR_MODULE`指定。不称默认项目已包含该validator依赖。
- QA索引`examples/map-nature-same-source-v2/qa-report.json`、`final-source-audit.json`；技术测试`test/map-nature-candidate.test.mjs`。
- 经验追加`docs/map-terrain-and-isometric.md`与仓库`skills/infinite-map-generation/SKILL.md`（全局skill为symlink，已通过quick_validate）。

衍生生产包约60MB均还未提交。原Tree95MB BIN及JPEG仍本地；examples媒体按既有ignore本地保留。后续发布要明确包含哪些运行衍生物和source重现依赖，不把当前本地可用说成远程已可运行。下一步先解决源PNG与WebGL光照/alpha对照、共享纹理打包与近远LOD预算，再考虑密集布置，不扩大主题数量。
