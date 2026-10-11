# 无限地图与风格场景工具

本工具服务 Codex 的游戏开发工作，输出可复现的地形、通行和资源数据。浏览器用于检视相同 JS 核心，核心不依赖 DOM。

`infinite-map.mjs` 公开 `InfiniteWorld`、`ChunkCache`、`mapOperation`、`analyzeRegion`。配置和导出契约详见项目 [skill](../../../skills/infinite-map-generation/SKILL.md)。CLI 从本目录运行 `node scripts/infinite-map-cli.mjs --help`。

`infinite-world-region/v1` 采用 `row-major`。第 `i` 行对应全局 `x = region.x + i % width`、`y = region.y + floor(i / width)`。`columns` 标明数组列：群系索引、海拔、湿度、温度、装饰、通行、资源。数值字段保存四位小数；语义种子/配置/版本完整保留。重新生成应使用原算法，而不是把量化数据作为噪声源。

`infinite-world-chunk/v1` 输出未量化对象格点和块坐标。负坐标采用 floor 分块，例如 (-1,-33) 属于块 (-1,-2)，局部 (31,31)。生成顺序、缓存回收和屏幕像素不影响数据。

内存按块数回收；地图块是地形数据，不包含游戏角色与已保存手工改动。当前工具没有实现坐标 patch 编辑器、存档、跨块道路/水路 typed ports、桥梁自动修复或实际引擎碰撞导入；上述上游架构仅作为后续集成契约，未伪报实现。

上游复用范围：alea/simplex-noise 本地源码与许可证、Python 两个生成/转换函数、环境目录和地图文档 schema。详情在 `map-vendor/SOURCE.json`。浏览器算法与上游 Python chunk 算法版本明确分开。上游文档 schema 本次用于兼容资料；本次区域 schema 另有 ID，不冒充完整上游 map document。

QA 记录见 `examples/infinite-map-v1/qa-report.json`。技术测试不能替代游戏实测：当前只做区域四邻接与资源统计，没有目标关卡或角色尺寸约束。

## 风格场景与实际地图包

`map-scene.mjs` 在同一世界数据上生成手绘森林 painted、复古像素 pixel、科幻荒原 scifi 三套正交俯视地图。每套有真实 imagegen 图集：8种地表材质与4种装饰物，而非色块换色。源PNG原样保留；生成与编辑提示词在 `public/map-styles/generation-prompts.json`。

过渡实际复用 MIT 的 Wangscape `CalculatorTopTwo.cpp`，原始源码/许可证位于 `map-vendor/wangscape/`，提交与哈希在 `map-vendor/SOURCE-scene.json`。JavaScript 移植保持排序、epsilon 和8位 alpha 分配；测试用原封不动C++在独立临时 harness 编译逐字节对照。没有移植它的完整GUI、libnoise或C++工具链。评估过 tsoding/wang-tiles，但其 rand/time 有限网格/X11演示未用于本世界。

地形四角共享全局格点，材质噪声来自同一世界；纹理地址使用全局坐标，四角连续随机平移采样削弱重复镜像花圈。生成atlas并非等分网格，使用RGB/alpha跃变实测的逐风格列/行边界（SOURCE-scene.json）注册素材，而不是按4×3标签平均切图。块渲染无局部纹理相位，装饰采样包含邻区 halo，独立导出窗口和整区RGBA测试一致。浏览器数据缓存192块，地表位图按32MiB和512块双重上限回收（不含原始atlas、逻辑数据和Worker副本）。每格屏幕尺寸<8/8–16/≥16时采用4/8/16像素LOD；大视口再按内存预算降低LOD。纹理生成、装饰halo收集及PNG/ZIP导出在模块Worker运行，UI只接收像素、上传Canvas和画图；远景<8像素不画细小装饰。旧24块缓存导致40块可见区域每次平移约880ms重建，现已消除。加载初期有低细节占位，完整纹理会逐块出现；不把逐块加载时间算成0ms或宣称跨设备60fps。切换风格/世界终止旧Worker与未完成导出，错误显示在页面。

Codex 无浏览器调用：

```sh
node scripts/styled-map-cli.mjs styles
node scripts/styled-map-cli.mjs export --style painted --seed 漫游-2026 --args '{"config":{"scale":96,"seaLevel":0.45},"region":{"x":224,"y":-220,"width":32,"height":24}}' --out-dir examples/my-painted-map
node scripts/styled-map-cli.mjs plan --style scifi --seed space-01 --x -32 --y -32 --width 32 --height 32
node --test test/map-scene.test.mjs
```

CLI `plan` 输出 `styled-game-map/v1` 场景描述；`export` 写 `terrain.png`、透明 `decorations.png`、组合 `scene.png`、`atlas.png`、`scene.json`、`map.tmj`、`source.json` 和带实际文件字节/hash的 `receipt.json`。PNG由 pngjs 实际解码/编码，已测试7.0.0，优先项目node_modules，其次Codex bundled runtime；其他机器安装 `npm install pngjs@7.0.0`。退出0成功、2参数/schema错误、1IO/运行错误。

JS `createMapScene({config,region,style,pixelsPerTile})` 返回纯描述，`exportStyledMap({...args,outputDir})` 返回实际写入收据；后者位于 `scripts/styled-map-export.mjs`。`pixelsPerTile` 8–96，导出最多16,777,216像素、边长8192；风格只改变画面，种子地形、资源与碰撞保持一致。Browser当前窗口最多64×64格，实际 ZIP包含上述地图像素和Tiled。进一步开发可按32×32格逐块调用导出，而非试图将无限世界烘成一张图。

Tiled地图是有限窗口，含真实本地PNG image layers与地形矩形/装饰圆形 collision object layers，不引用缺失tileset。globalX/globalY与seed、算法、style属性用于回接世界。它是可用于引擎的场景包，当前未在Godot/Phaser项目中实际导入；不要把格式正确称为engine-imported。

导航报告目前仍是地形四邻接，明确没有纳入装饰碰撞或角色尺寸；需在实际游戏检查出生点、任务位置、碰撞尺度与障碍物。没有道路/桥梁/城镇自动设计、存档patch，也没有真实地理高程数据。随机平移并未创造新素材，近看仍可能察觉源图细节重复和混合软化；三套示例已人工看过源图、实际导出与UI，仍为视觉候选，不是用户签收。

当前完整QA为 `examples/map-scenes-v1/qa-report.json`；原source裁切失败、科幻透明边黑线、像素props夹带地表条带、修正截图和实测ZIP分别保存。此包与前一版诊断数据QA并存。
