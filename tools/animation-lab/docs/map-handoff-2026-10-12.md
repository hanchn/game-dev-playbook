# 地图交接：2026-10-12 收工

用户明确要求今天停止，并由主代理整理经验、提交和推送。本子任务已停止新增资源查询、下载、渲染及代码修改；只写本交接和校验回执。没有提交，没有启动第二个服务，没有修改共享server、world-feature-plan、角色、UI套图、项目memory或全局skill。

## 当前已完成并可复核

- 2.5D算法 `kenney-2d-continuous-ground-planner4-worker-ground-zoom-v18`；3D保持 `procedural-terrains-7452c2c-cpu-planner4-softbanks-v15`，planner4不变。
- 无河流场景不再处理水图；原256px源纹理mip异步、pending去重、旧generation释放与迟到bitmap关闭；源模块排序由Worker输出。
- 连续地面在现有OffscreenCanvasWorker栅格化，按全局像素边界transfer ImageBitmap；旧bitmap在新结果或主题切换时释放。像素预算8,388,608，当前64px场景2,803,712pixels（约10.7MiBRGBA，另计源纹理）。无OffscreenCanvas时仍用原directrenderer，性能保证不能继承。
- 缩放新区域等待期间，按世界比例复用旧bitmap，实际新区域/分辨率结果替换；button/wheel缩放即时同步URL，真实reload保持32px。
- 同城堡机位v13冷48.9ms；v17独立冷1.8/2.0/2.3ms；v18冷1.7ms。保留v14冷23.2/v15冷20.4/v16冷29.9等失败，不用快样本覆盖慢样本。v18同64机位完整初始化218.8ms；扩展32场景冷2.9ms/完整初始化348.7ms/4489logicaltiles/615visible/47textures。v17四步缩小draw15.3/7.9/12.7/11.7ms，v18变为.9/.9/1.2/.7ms。
- 这些是JS/renderer冷reload；HTTP缓存没有清空。APIelapsedwalltime不是GPUtiming；实际rAF33–67ms，另有后台/空闲2466.7ms间隔样本保留，不宣称60FPS或完整高可用。河道mip准备67.2ms、沙漠generation247.7ms仍是独立延迟。
- v17实际UI3Up/3Down跨源门洞Y47.33654↔44.33654，X37.880241，双方fraction1；X+.55撞part19停Y45.721155。v18仅改地面缓存缩放和URL，碰撞源不变且回归重测；不冒称新的v18门洞视觉capture。
- 地图专属技术测试86/86，0skip，日志`examples/map-terrain-3d-v1/core-iso-v18-test.log`。不是整个项目回归。35源/adapterSHA审计0mismatch，原上游源码和美术bytes没有修改。
- 真浏览器32px下载PNG719,262bytes/JSON1,649,756bytes与当前core精确一致。CLI`examples/map-isometric-v1/castle-v18/`保留PNG/源素材/scene/collision/Tiled/receipt。Tiled实编辑器/引擎导入仍未验。
- 经验已追加本仓库`skills/infinite-map-generation/SKILL.md`及`tools/animation-lab/docs/map-terrain-and-isometric.md`。全局skill和知识库由主代理同步。

## 证据与可提交文件范围

所有路径以仓库根为基准。

主要代码：

- `tools/animation-lab/map-isometric-core.mjs`
- `tools/animation-lab/public/map-isometric.mjs`
- `tools/animation-lab/public/map-isometric-worker.mjs`
- `tools/animation-lab/scripts/isometric-map-export.mjs`
- `tools/animation-lab/test/map-isometric.test.mjs`
- `tools/animation-lab/scripts/record-map-qa-report.mjs`
- `tools/animation-lab/map-vendor/SOURCE-terrain-3d.json`
- `skills/infinite-map-generation/SKILL.md`
- `tools/animation-lab/docs/map-terrain-and-isometric.md`
- 本交接文档。

当前QA索引`tools/animation-lab/examples/map-terrain-3d-v1/qa-report.json`有75真实UIcase与9个3DCLIexport，保留历史版本。对应2.5D索引`examples/map-isometric-v1/qa-report.json`。当前变更证据包括`isometric-performance-v17.json`、`isometric-performance-v18.json`、`source-current-iso-v17-audit.json`、`source-current-iso-v18-audit.json`、`core-iso-v17-test.log`、`core-iso-v18-test.log`、`ui-isometric-*v14/15/16/17/18*`及`browser-isometric-current-v14/15/17/18*`。早期整源码快照`source-v15-before-perf/`和新`source-iso-v17/`、`source-iso-v18/`必须保留版本，不用新源SHA给旧图标当前版本。完整snapshot是本工具adapter代码，未复制整个主应用/所有上游资源，不称独立应用归档。

离线新导出位于`tools/animation-lab/examples/map-isometric-v1/castle-v14/`、`castle-v15/`、`castle-v17/`、`castle-v18/`；当前材质/几何与原source引用保留。主代理可按仓库已有大文件策略选证据/源码；本子任务不擅自提交。

## 新素材：已下载、未接入

收工消息之前下载进程`python3 scripts/import-polyhaven-nature.py`已经exit0，无待清理下载进程或渲染进程。不涉及正在运行主服务。

发现API403替代途径是官方资产HTML的`__NEXT_DATA__.props.pageProps.files.gltf.1k.gltf`，包含真实URL/官方MD5/size。没有猜路径，没有运行上游应用。

- 官方TreeSmall02：`https://polyhaven.com/a/tree_small_02`。11原始文件100,974,143bytes；原glTFLOD0有2,062,487triangles。官方尺寸约4.65m高，是中型阔叶树，不说已经有成熟大树整套。95,102,324byteBIN必须先生成并实际审查可用LOD，不能直接高密度流式放置。
- 官方Shrub03：`https://polyhaven.com/a/shrub_03`。5原始文件1,628,793bytes，4个独立source根/总8287triangles。尚未选择/导出单株variant、量anchor/collider或做多朝向PNG。
- 总16文件102,602,936bytes；SHA及官方MD5/size全部校验成功。回执`examples/map-terrain-3d-v1/resource-handoff-2026-10-12.json`。
- 下载器`tools/animation-lab/scripts/import-polyhaven-nature.py`。本地原始包`tools/animation-lab/public/map-resources/polyhaven-nature-expansion-v1/`，内含`source.json`、两个`*-official-manifest.json`、两组glTF/BIN/PBR。原文件未修改。
- **未注册catalog、未导出GLB、未制作PNG、未测collision、未渲染真实地图。**当前catalog仍1349items/11packs，不加未接入资源计数。

可提交下载器、回执及officialmanifest/source元数据，明确它们是未接入下载候选。完整原始包约98MiB，主代理遵照项目大文件政策决定是否随本次推送；若暂不推原BIN/纹理，文档和回执必须明确仅本地保存、远程不是可运行生产资源包。不要为“经验已记录”把未做的多朝向PNG/LOD/3D主题写成完成。

## 下次准确续接点

1. 对刚下载的树选择/制作30–60k级可用LOD；原native与derivative同角度保留render对照、材质通道、尺寸与原sourceSHA。尚未启动任何Blender渲染脚本。
2. 将4个原灌木根按原形拆为variants，测真实footpoint/bounds，保留原材质与alpha。
3. 用统一相机/照明渲染至少4朝向透明PNG，source/3D/2D/collision/export同源；只有实际像素和UI局部scene通过后再扩资源。
4. 先补负坐标河流自然局部场景中的树/灌木/石，不改变未经验证的建筑主题。当前建筑/洞穴/道路/水岸仍缺成套写实资源，继续官方可下载来源。
5. 地皮枝条重复、低poly与扫描风格混杂、正交道路、等距海岸阶梯、窄直河岸、浏览器customshader不在标准GLB、城堡/洞穴interior及真正玩法均未通过。不以86技术测试或1349计数宣布美术/游戏完成。

全部验收flag保持visualAccepted=false、engineImported=false、gameplayValidated=false、realGeographicData=false、portableExactShader=false。
