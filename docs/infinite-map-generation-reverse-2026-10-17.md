# 无限地图生成：四款游戏地图逆向的当前地基（2026-10-17）

用户目标已明确：**未来要基于这几个游戏（热血传奇、传奇世界、帝国时代、红色警戒2）做逆向，用来做无限地图生成**。本文只记录与"地图结构 + 生成规则"直接相关的已证实内容，不把素材抽取当目标本身。

## 已证实的地图格式

### 热血传奇（Mir2 1.76）`.map`

来自原客户端源码 `GameOfMir/Client/MapUnit.pas`（不是推测）：

| 结构 | 大小 | 字段 |
|---|---|---|
| `TMapHeader` | 52 字节 | `wWidth` u16、`wHeight` u16、`sTitle` shortstring[16]、`UpdateDate` TDateTime(8)、`Reserved[23]` |
| `TMapInfo`（每格） | 12 字节 | `wBkImg` u16、`wMidImg` u16、`wFrImg` u16、`btDoorIndex`、`btDoorOffset`、`btAniFrame`、`btAniTick`、`btArea`、`btLight` |

- 寻址是**列优先**：`offset = 52 + x*height*12 + y*12`。
- 绘制时 tile id 取 `& 0x7FFF`（bit15 是标志位）；门、动画帧/步进、区域、光照是每格独立字段。
- **碰撞不在 `.map` 里**：行走性来自 tile 库（Tiles.WIL）的 tile 属性，要另解 tile 库。
- 读取器与合成往返测试：`tools/pc-asset-reverse/mir2_map.py`、`tools/pc-asset-reverse/tests/test_mir2_map.py`。
- 仍缺真实 `.map` 样本：官方怀旧客户端 `Legendofmirtfull7.exe`（1,848,627,400 字节，SHA256 `dee48dec…3e5d6`）是 SDO 定制安装包，7z 17.05 与 unar 1.10.8 都识别失败，文件内也搜不到 `WEMADE`/`.WIL` 明文，说明负载被整体压缩/加密；需要 Windows 环境或专用解包器。

### 传奇世界（Woool）`.nmp`

来自 Ghidra 分析（NixieProject/WoOOL-docs，`nmp-format-deep-dive.md`）并在真实文件上验证：

- 头 20 字节：`dataOffset` u32、`version` i32、`width` i32、`height` i32、两个 u16 保留。
- v1：固定 12 字节/格，行走位 = `flags & 2`。
- v2/v3/v5/v6：1 字节 flags + 按位可选字段（0x02→u16、0x04→u16、0x08→u32、0x10→u8、0x20/0x40→u8、0x80→u16、u32 的 0x10000000→2 字节）。
- 网格是 **1 字节/格**的可行走掩码（1 可走 / 0 阻挡），loader 不建纹理。
- 实测 `T011.nmp`：v5，150×150，73% 可走，解析消耗 37007/37360 字节，渲染出连贯的陆块与斜向山脊（预览见提交的 `woool-nmp-T011-walkable.png`）。
- 3D 图（`0-3d.nmp` 800×800、`zqd.nmp` 340×400 等）是 **version 11**，当前 MiniClient 反编译只覆盖 1/2/3/5/6；用 v6 布局试解只消耗不到一半数据，说明 v11 有额外结构，**尚未解开**。
- 读取器：`tools/pc-asset-reverse/woool_nmp.py`。

### 帝国时代（AoE Gold 1999）

- 原版 ISO 内**没有 `.rms` 随机地图脚本**；`EMPIRESX.EXE` 里能搜到 `RGE_RANDOM_MAP_MODULE`，说明 AoE1 的随机地图是**编进引擎的模块**，不是外置脚本。
- ISO 里有 24 个 `.SCN` 场景（固定地图）与 `DATA*/TERRAIN.DRS` 地形资源。
- 结论：AoE 的"生成规则"要走引擎逆向或场景格式（`.SCN`）分析，不能像 AoE2 那样读 `.rms` 文本。

### 红色警戒2（RA2）

- 尚未取得原盘。archive.org 有多个候选（如 426MB 的 `red-alert-2-yuris-revenge`、1.5GB 的 Win10 修复版）。
- 计划：MIX 档案解包 → `IsoMapPack5`（`.map` / `.mpr`，等距菱形网格、地形高度、overlay、单位/触发）→ INI（rules/art）里的地形与装饰规则。
- RA2 没有官方随机地图生成器；要学的是**等距网格 + 高度层 + overlay 叠加**这套地图表达，而不是现成生成算法。

## 对无限地图生成的设计启示

1. **分层网格**是共性：Mir2 用 back/middle/front 三层 tile id；Woool 用单层行走掩码 + 视觉资源另存；RA2 用地形层 + overlay 层。我们的生成器应显式区分"可行走拓扑层"与"视觉装饰层"。
2. **碰撞应当独立存储**（Woool 的 1 字节/格），或由 tile 属性推导（Mir2）。前者更适合程序化生成：先生成拓扑，再贴视觉。
3. **每格 flags + 变长可选字段**（Woool v2/v5）适合承载门、动画、区域、光照等稀疏元数据，避免整图膨胀。
4. **尺寸跨度大**（Woool 150²–800²，Mir2 数百×数百，AoE 场景固定）：生成器要支持分块（chunk）加载与边界接缝。
5. **区域/光照字段**（Mir2 的 `btArea`/`btLight`）说明原游戏把"地区归属"和"光照"烘进地图格；无限生成需要可复现的区域划分算法。

## 下一步（按优先级）

1. 用 Windows/专用工具解开 Mir2 怀旧客户端，拿到真实 `.map` + `Tiles.WIL`，验证读取器并把"tile 属性→行走性"补上。
2. 破解 Woool `.nmp` **version 11**（3D 图）布局，覆盖现有 8 张真实地图中的 7 张。
3. 取 RA2 原盘，实现 MIX 解包与 `IsoMapPack5` 读取，导出地形/overlay 栅格。
4. 解析 AoE `.SCN` 与地形 DRS，提取固定地图的区块/装饰统计，作为生成器的经验参数。
5. 在以上格式之上写第一版无限地图原型：拓扑掩码 → 分层 tile → 稀疏 flags → 分块输出，并至少能回写成其中一种原格式做验证。
