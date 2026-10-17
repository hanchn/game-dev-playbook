# VS. Super Mario Bros. 原机跑批（2026-10-17，五款之后）

用户要求："如果还有余力 那就继续跑 马里奥"。本项目 Top100 榜内没有马里奥，故按既有 MDK 取包路径新取 **VS. Super Mario Bros.**（街机 VS System 版），不是家用机版。

## 取包与校验

- 来源页 `https://mdk.cab/game/suprmrio`（页面留档 + SHA），下载 `https://mdk.cab/download/split/suprmrio.zip`。
- 归档 37327 字节，SHA256 `e4589eead7c435abeaf69e0c8e5ff94087d88e10cb02b6182cd7d0db038aa631`，7 个成员，ZIP CRC 通过。
- `mame suprmrio -verifyroms` → `romset suprmrio is good`（exit 0）。
- 回执：`tools/attack-library/data/research/suprmrio-acquisition-20261017.json`。

## 原机运行与采集

- 机种：VS System，屏幕 `256x240 @ 60.098475521045Hz`，无 `:spritegen`（非 NeoGeo），调色板设备为 `:ppu1`。
- 输入：`Coin 1` 投币、`Select 1 (Blue)` 开始、`P1 A` 跳跃、`P1 B` 跑/火球。
- 时序实测：投币 300、开始 420 后，tick 900 已在 WORLD 1-1，TIME 385。VS 版比家用机多一个倒计时 TIME。

| 批次 | 帧数 | 尺寸 | 调色板 | 说明 |
|---|---|---|---|---|
| `suprmrio-timing-20261017` | 181 | 256×240 | 19 | 只验证开局时序 |
| `suprmrio-actions-20261017` | 961 | 256×240 | 97 | 待机/右走/左走/跑/跳/跑跳/蹲/持B/跳B |
| `suprmrio-tight-actions-20261017` | 476 | 256×240 | 48 | 收紧窗口，减少首只 Goomba 干扰 |

三批均 `completed=true`、frame 连续、几何与计划一致。

## 已看画面与失败

- 已逐帧确认：WORLD 1-1 起始画面（HUD: MARIO 000000、金币×000、WORLD 1-1、TIME）、右走导致关卡横向推进、? 块/水管/山丘等原生地形、Goomba 出现。
- **失败（保留）**：第一次完整批次里 Mario 在约 tick 1400 撞上 Goomba 死亡并重新开始（TIME 从 394 回到 393 后画面回到起点），因此该批次后半段不是连续同一局面。收紧批次仍未能避开首只 Goomba。
- 未确认：跳跃离地/落地逐帧、跑动加速、蹲伏、火球（小 Mario 无火焰花）、旗杆/过关。
- 未建立：RAM 字段、判定/碰撞、原生时序、速度曲线。

## 复现

```sh
python3 tools/attack-library/scripts/capture-native-actions.py \
  --plan tools/attack-library/data/native-action-plans/suprmrio-tight-20261017.json \
  --output <新目录>
```

## 边界

这是"原机确实跑起来并采到连续窗口"的证据，不是招式/机制验收。VS 版与 NES 版内容差异（TIME 倒计时、关卡布局）不得混用。
