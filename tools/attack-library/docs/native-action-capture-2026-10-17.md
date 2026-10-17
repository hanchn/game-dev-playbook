# 多机种原生动作采集：方法与失败（2026-10-17）

目标：把 2026-10-16 只在拳皇98上做到的动作级原机采集，做成能对多个原街机复用的采集批次。本文只写方法与已发生的失败，不把"采集到画面"说成"招式已触发"。

## 统一批次结构

每个游戏一个计划 JSON（`data/native-action-plans/*.json`），一份生成式 autoboot Lua，一次串行运行。每批保留：

- `plan.json`（以及它的 SHA256）与生成脚本 `autoboot.lua`；
- `trace.csv`：tick、阶段、阶段内 tick、screenFrame、逐帧方向/按键状态；
- `inputs.csv`：只在字段值变化时记录；
- `snap/`：逐刷新原生截图；
- `vram/`、`palette/`：仅设备存在时导出；
- `capture-report.json`：命令、引擎版本与二进制 SHA、ROM 校验与归档 SHA、frame 连续性、阶段帧数、截图几何、完成标记。

复现：

```sh
python3 tools/attack-library/scripts/capture-native-actions.py \
  --plan tools/attack-library/data/native-action-plans/mslug-20261017.json \
  --output tools/attack-library/data/research/mslug-actions-20261017
```

全部输入都走 MAME ioport，不写 RAM/VRAM/调色板。`capture-report.json` 里 `visualReviewed`、`moveTriggerVerified`、`nativeTimingVerified` 默认 false，必须另行验证才能改。

## 本次实际踩到的坑

1. **`ioport_field:value()` 不存在**。读输入字段只能自己维护状态表；用 `field:value()` 会在 gameplay 第一帧抛 `attempt to call a nil value`。
2. **`:spritegen` 是 NeoGeo 专属设备**。CPS1（街霸）与 PGM（三国战纪）没有，`assert(m.devices[':spritegen']...)` 直接让整批失败。改为设备存在才导出 VRAM；调色板则单独 `pcall(pal:pen_color(0))` 探测。街霸/PGM 的 `palette` 设备可用（本批各导出 211/181 帧调色板）。
3. **生成式脚本必须是 Lua 字面量**，不能把 JSON 直接塞进去。`{"up":"P1 Up"}` 和 `[...]` 都会让 MAME 报 `'}' expected near ':'`，整次运行 exit 3、零帧。
4. **`screen:snapshot()` 相对路径会落到 MAME 自己的 snapshot 目录**（实测写到 `<repo>/snap/<相对路径>`），必须传绝对路径。
5. **`NativeRuntime.game_path()` 只认 Top100 榜内 id**。`sf2ce`、`kov` 是标准模式 id，需从 `data/standard-games.json` 解析 ROM/BIOS 路径，否则整批被拒。
6. **开局面板各不相同**，不能照搬拳皇的 2700 tick：
   - 合金弹头1：投币→Start 后会先放约 1 分钟的"How to Play"，任务画面约 tick 4900 才出现。
   - 三国战纪：选人后先播剧情字幕（英文/中文），2400 的 playBegin 会停在字幕页；改到 2900 并在 1500–2800 用普通按键跳过才进入关卡。
   - 街霸II'：选人确认后约 1800–2000 进入"FIGHT!"。
7. **CPU 会打断窗口**。街霸II' 单人模式里 CPU 会立刻贴身/投技，采集到的窗口可能只证明"按键发出"而不是"该招式成功"。尝试用普通 2P Start 加入被动对手在本次测试的时序下失败（对手仍是 CPU E. Honda），因此街霸批次保留该限制。

## 边界

- 本批只证明：原机确实运行到对应画面、输入确实按计划发出、帧是连续的、截图几何与设备约定一致。
- 不证明：招式真的触发、命中/挥空、判定框、取消窗口、原生帧时序。
- 拳皇98 的逐窗口元数据/像素/时间表门槛不因本方法扩大而放宽；其他游戏仍是"窗口已采集"，未建立同等门槛。
