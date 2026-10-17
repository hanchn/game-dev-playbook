# 帝国时代 / 传奇世界 / 热血传奇：第一轮原资料与格式逆向（2026-10-17）

三款都是 PC 游戏，不能套用街机的 MAME 采集。本轮先做**原资料取得 + 格式解析 + 角色/动作结构提取**，把能证实的和不能证实的分开。原包、客户端与 ISO 全部在 `output/pc-original-games/`（gitignored），仓库只提交脚本、清单和文档。

## 总表

| 目标 | 已取得 | 已实现 | 仍未通过 |
|---|---|---|---|
| 帝国时代（AoE Gold 1999，含罗马复兴） | 原版 ISO 282,060,800 字节，SHA256 `ea597ecc…3d3bbab`；解出 `GAME/DATA*` | DRS 表结构解析：`GRAPHICS.DRS` 内 76 个 SLP 资源 | SLP **像素解码尚未验收**：首帧渲染是噪声，扩展指令/行命令未覆盖，不能当素材 |
| 热血传奇（Mir2 1.5/1.7.6） | 原客户端+服务端 Delphi 源码（`lzxsz/MIR2`）；官方 39MB 安装器（下载桩） | 从 `Client/Actor.pas` 提取 **14 个人类动作 + 38 张怪物动作表**，含起始帧/帧数/skip/每帧毫秒/usetick | 没有 WIL/WIX 图像字节；官方完整端是 15 × 2GiB ≈ 30GiB 的 7z 分卷，未下载 |
| 传奇世界（Woool） | 原客户端数据（`JevLOMCN/Woool-C-`），含 `Data1.wpf` 29MB、`Texture1.wpf` 12MB | 自写 WPF 解析器；`Texture1.wpf` 枚举 **4,490 个 .tex**（human1 738、monster1 781、goblin1 698…）；`Data1.wpf` 56 项（gamedb CSV + NMP 地图） | TEX 像素解码（新/旧格式、RLE/DXT、XOR 键）尚未实现 |

## 1. 帝国时代（Age of Empires Gold）

- 来源：Internet Archive `Microsoft_Age_of_Empires_Gold_Edition_Windows_1999_Eng`，ISO 282,060,800 字节，SHA256 `ea597eccd30cbc9ad600a8f91f516c0a6a5474bfe0f945726bd2028fd3d3bbab`。
- 解包后 `GAME/DATA/GRAPHICS.DRS` 16,871,914 字节，表结构：表头 `ext="slp "`、76 个条目；条目为 `(id, offset, size)`，偏移单调、全部落在文件内。
- 已实现 `tools/pc-asset-reverse/aoe_slp.py`：DRS 表链解析 + 资源清单；SLP 命令流按 openage 文档实现（lesser/greater draw/skip、fill、player color、shadow）。
- 第一次渲染是噪声，根因已定位：AoE1 SLP 帧内**先放一张"每行命令偏移"表**（height 个 u32），命令流从这些偏移开始；之前把偏移表当成命令解析。修正后 SLP 0/2/3 能解出连续形状（116×67、137×104、116×63），轮廓见 `tools/pc-asset-reverse/previews/aoe-slp*-silhouette-unverified.png`。
- 另一个已修的错误：调色板索引 0 在 AoE1 SLP 里是透明色；当成不透明会把整幅填满，掩盖真实轮廓。
- **仍未验收**：还没有 AoE1 原始调色板，剪影呈黑白；轮廓边缘有大量孔洞，不能确认是"树叶间隙"还是"仍漏画/错画"。扩展指令 `0x1E/0xAE/0xFE` 仍未覆盖。因此**不把这批图当已验收的 AoE 素材**。
- 下一步：找 AoE1 调色板做颜色还原；与已知单位的官方截图逐帧对照；再解析 DAT 里的单位→SLP 映射与动作表。

## 2. 热血传奇（Legend of Mir 2）

- 原客户端/服务端 Delphi 源码：`https://github.com/lzxsz/MIR2`，提交记录见回执。
- 从 `GameOfMir/Client/Actor.pas` 提取到客户端**声明的动作表**：

| 人类动作 | 起始帧 | 帧数 | skip | 每帧毫秒 | usetick |
|---|---|---|---|---|---|
| ActStand | 0 | 4 | 4 | 200 | 0 |
| ActWalk | 64 | 6 | 2 | 90 | 2 |
| ActRun | 128 | 6 | 2 | 120 | 3 |
| ActRushLeft / Right | 128 / 131 | 3 | 5 | 120 | 3 |
| ActWarMode | 192 | 1 | 0 | 200 | 0 |
| ActHit | 200 | 6 | 2 | 85 | 0 |
| ActHeavyHit | 264 | 6 | 2 | 90 | 0 |
| ActBigHit | 328 | 8 | 0 | 70 | 0 |
| ActFireHitReady | 192 | 6 | 4 | 70 | 0 |
| ActSpell | 392 | 6 | 2 | 60 | 0 |
| ActSitdown | 456 | 2 | 0 | 300 | 0 |
| ActStruck | 472 | 3 | 5 | 70 | 0 |
| ActDie | 536 | 4 | 4 | 120 | 0 |

- 另有 38 张 `TMonsterAction` 表（MA9…MA46），字段同为 stand/walk/attack/critical/struck/die/death。
- 客户端注释给出方向步长：每个方向每动作预留 600 帧，`start = layer*600 + direction*600`。
- **阻塞**：没有 WIL/WIX 图像。官方 `mir2.sdo.com` 完整端是 15 个 2GiB 的 7z 分卷（扩展名写成 `.cab`，头是 `37 7a bc af 27 1c`），约 30GiB；39MB 的 `legendofmirsetup2.0.10.20.exe` 只是下载桩。
- 下一步：要么接受 30GiB 官方完整端，要么用经典 1.76 客户端（约 600MB–1GB，第三方镜像）——需要你确认取哪条。

## 3. 传奇世界（Woool）

- 原客户端数据：`https://github.com/JevLOMCN/Woool-C-` 的 `Legendary World Client`，`Data1.wpf` 29,366,648 字节、`Texture1.wpf` 12,190,120 字节。
- 自写 `tools/pc-asset-reverse/woool_wpf.py`：WPF 头部（magic `0x57504601`）、FAT（FCB1 16 字节 + FCB2 56 字节）、目录树、zlib 解压。
- 实测：`Data1.wpf` 56 项（`gamedb/*.csv`、`map/*.nmp`）；`Texture1.wpf` **4,490 个 `.tex`**，按 actor 分目录：monster1 781、human1 738、goblin1 698、goblinhair1 689、hair1 340、npc2 274、monster6 273、monster2 244…
- TEX 头已确认新格式魔数（`1XET`，即 `0x54455831`），可见 `frameSize=20`、`blockSize=12`、`frames=1` 以及 80/104/86/66 等尺寸字段。
- **未通过**：TEX 像素解码未实现（新旧格式、RLE/DXT、XOR 键、alpha），所以还没有可看的角色帧。
- 下一步：移植 `WoOOLToOOLsSharp/Formats/Tex/TexCodec.cs` 的解码，或安装 dotnet 直接跑该工具；再结合 `ActionCfgNew.dat` 做动作→帧映射。

## 统一边界

- 三款都**没有**运行游戏可执行文件；本轮是原资料、格式与结构层。
- 没有任何"已拆解全部角色/动作"的结论：帝国时代连一帧都没成功还原，热血传奇只有声明表没有图，传奇世界只有帧文件清单没有像素。
- 取包来源、提交号、包 SHA 全在 `tools/pc-asset-reverse/data/acquisition-receipt-2026-10-17.json`；清单在 `tools/pc-asset-reverse/data/*.json`。

## 复现

```sh
python3 tools/pc-asset-reverse/aoe_slp.py output/pc-original-games/aoe-gold/iso/GAME/DATA/GRAPHICS.DRS --inventory /tmp/aoe.json
python3 tools/pc-asset-reverse/mir2_action_tables.py --source output/pc-original-games/mir2-source/GameOfMir/Client/Actor.pas --output /tmp/mir2.json
python3 tools/pc-asset-reverse/woool_wpf.py "output/pc-original-games/woool-server/Legendary World Client/Data/Texture1.wpf" --list
```
