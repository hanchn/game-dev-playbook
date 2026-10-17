# 热血传奇：真实地图已解出，武器/姿态/怪物卡在 WZL（2026-10-17）

用户要求学习：**各种武器对象、走路姿势、攻击姿态、怪物**，并服务于无限地图生成。本文记录今天真实拿到的与卡住的部分。

## 已打通：官方怀旧客户端的 7z 负载

官方怀旧客户端 `Legendofmirtfull7.exe`（1,848,627,400 字节，SHA256 `dee48dec…3e5d6`）本身 7z/unar 都不识别，但文件内 0x2621E00 处是真正的 7z 流：

```sh
OFFSET=$((0x2621e00)); tail -c +$((OFFSET+1)) Legendofmirtfull7.exe > mir2-payload.7z
```

`7z l` 显示：2029 个文件、20 个目录、2,347,396,817 字节，包含 `mir.exe`、`data/*.wzl`、`map/*.map`、`wav/`、`Config/`、`SDOA/`。**这是目前取到的最完整的 1.76 系客户端素材。**

## 已打通：真实 `.map`

从负载中解出 `map/0.map`（5,880,052 字节）等，用 `tools/pc-asset-reverse/mir2_map.py` 读取：

| 文件 | 尺寸 | 标题 | 有 back tile 的格数 | 动画格 | 门格 |
|---|---|---|---|---|---|
| 0.map | 700×700 | Legend of mir | 262,976 / 490,000 | 45 | 182 |
| 0100.map | 15×18 | Legend of mir | 0 | 0 | 0 |
| 0110.map | 17×21 | Legend of mir | 0 | 0 | 0 |

渲染出的 700×700 布局（`tools/pc-asset-reverse/previews/mir2-0-back.png`）能清楚看到陆地、道路、建筑矩形与水/空区——这正是无限地图生成要学的"拓扑形状"。

每格仍是 12 字节：back/middle/front（tile id 取 `& 0x7FFF`）、门索引/偏移、动画帧/步进、区域、光照。`data/Tile.Atr` 是文本型 tile 属性表（`0\r\n0\r\n…`，186 字节），行走性仍需结合 tile 库属性。

## 已打通：WZL/WZX 图库（武器、人体姿态、怪物）

关键点：WZL 的索引不在自己文件里，而在**同名 `.WZX`**（和 WIL/WIX 一个思路）。之前只搜 `.wil/.wix` 所以没找到。

- `.wzx`：48 字节头 + `u32` 偏移表。`Weapon.wzx` 182,448 字节 → 45,600 槽；`Hum.wzx` 57,648 → 14,400 槽；`Mon1.wzx` 4,392 → 1,086 槽。偏移 0 表示空槽。
- `.wzl` 单张图像记录（16 字节头）：

| 字段 | 类型 | 实测 |
|---|---|---|
| magic/format | u32 | `0x103` |
| width | u16 | 如 28 |
| height | u16 | 如 7 |
| px | i16 | 27 |
| py | i16 | -12 |
| storedSize | u32 | 0=裸像素，否则 zlib 压缩长度 |

- 像素宽度按解压后字节数判定：`w*h` → 8-bit 调色板索引；`w*h*2` → 16-bit。
- 读取器：`tools/pc-asset-reverse/mir2_wzl.py`。

实测解码（原客户端真实库）：

- `Hum.wzl`：14,400 槽、9,984 非空。槽位与 `Actor.pas` 的 600 帧/方向一致：站 0–3、走 64–67、攻击 200–203、重击 264–267 都能解出连续姿势（预览 `mir2-hum-poses.png`）。
- `Weapon.wzl`：45,600 槽、30,784 非空；样本解出 28×7 与 8×36 的武器/刃形（预览 `mir2-weapon-frame.png`）。
- `Mon1.wzl`：1,086 槽、464 非空；站 0–3、走 64–67、攻击 128–131 解出持械怪物动作（预览 `mir2-mon1-frames.png`）。

**仍未拿到**：颜色调色板。客户端 `data/texture.dat` 是 GBK 文本不是调色板；目前帧是灰度索引，几何/姿势正确，颜色待找（候选：`mir.exe` 内嵌 1024 字节调色板、或公开的 Mir2 调色板对照）。

## 早前的错误判断（保留）

客户端的人体、武器、怪物图库都在 `data/*.wzl`：

- 人体/姿态：`Hum.wzl` 13,914,959 字节
- 武器：`Weapon.wzl` 8,183,461、`Weapon2.wzl` 9,011,955、`Weapon9.wzl` 7,521,161
- 怪物：`Mon1..Mon34.wzl`（例如 Mon1 895,187、Mon22 19,394,962），另有 40 多个 64 字节的空桩
- 地图图块：`Tiles*.wzl`、`smTiles*.wzl`、`Objects*.wzl`
- 特效：`StateEffect.wzl` 44,025,513、`HumEffect.wzl`、`WeaponEffect.wzl`

对 `Weapon.wzl` 实测：

- 没有 `WZL` 魔数（搜不到 "WZL"）；
- 前 40 字节全 0，0x28 起才出现少量数值；
- 文件头 2MB 与尾部 2MB 内都**找不到**递增的 u32 偏移表（WIL/WIX 式索引）；
- 文件整体呈高熵，符合"整包加密或整包压缩"。

结论：这个怀旧客户端用的是新引擎的 **WZL 容器**，不是我们已经实现的经典 **WIL/WIX**；在拿到客户端/登录器的解密逻辑之前，武器、走路/攻击姿态、怪物帧都无法读取。**不把"WZL 已解出"写成成果。**

## 下一步（二选一或并行）

1. **逆 WZL**：从 `mir.exe` / `LaunchLegendOld.dll` / `GPKitClt.dll` 找 WZL 解密与帧解码路径，或找公开的 WZL 读取器交叉验证；需要真实解密后的样本才能验证。
2. **取经典 1.76 WIL 客户端**（约 600MB–1GB 的第三方镜像）：直接走已实现的 WIL/WIX 读取器，`ChrBody/ChrWeapon/Monster` 都是 WIL，能立刻出走路/攻击/怪物帧。

地图侧不受影响：`.map` 已能读，WZL 只影响图块与角色图，不影响地图网格结构。
