# 多机种原生动作采集要点

适用于 `scripts/capture-native-actions.py` 这一代计划式采集（CPS1 / NeoGeo / PGM 等）。细节与失败记录见 `tools/attack-library/docs/native-action-capture-2026-10-17.md`。

- 一游戏一份计划 JSON：投币/开始/playBegin、字段名、阶段（hold/press/repeat/motion）、截图与 VRAM 采样间隔。生成 autoboot Lua，不要手写。
- 生成的 Lua 必须是 Lua 字面量（`{["up"]="P1 Up"}`），不是 JSON；否则 MAME 直接 exit 3、零帧。
- `:spritegen` 只有 NeoGeo 有。CPS1/PGM 要跳过 VRAM 导出；调色板先 `pcall(pal:pen_color(0))` 探测再导出。
- `screen:snapshot()` 用绝对路径；相对路径会落到 MAME 自己的 snapshot 目录。
- `NativeRuntime.game_path()` 只认 Top100 id；标准模式 id（sf2ce、kov）从 `data/standard-games.json` 解析 ROM/BIOS。
- 开局时序按作品实测，不能照搬：合金弹头1 有约 1 分钟 How to Play（任务约 tick 4900）；三国战纪选人后有剧情字幕（playBegin 2900 并先跳字幕）；街霸II' 约 1800–2000 进入 FIGHT。
- 单人模式下 CPU/敌兵会打断窗口。街霸 2P 加入被动对手在本次时序失败，保留为已知限制。
- 批次报告默认 `visualReviewed/moveTriggerVerified/nativeTimingVerified=false`；只有逐帧看过并单独验证后才能改。窗口数不是招式数。
