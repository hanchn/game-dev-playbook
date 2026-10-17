# 五款原游戏当日跑批结果（2026-10-17）

用户要求：今天跑完已有的五款游戏（街霸II'冠军版、拳皇98、合金弹头、三国战纪、宝可梦 Empress）；有余力再跑马里奥。本文按"原机证据层级"如实分列，不把不同深度混成一个完成率。

## 总表

| 游戏 | 原机运行 | 今日新增 | 动作窗口 | 逐窗口门槛 | 完整逆向 |
|---|---|---|---|---|---|
| 拳皇98 | MAME 0.289 | 无（10-16 已完成 16/16 角色） | 2004 | 元数据 186/187、像素 170/212、时间表 173/212 | 否 |
| 街霸II'冠军版 | MAME 0.289 / CPS1 | 原生动作批 1051 帧 | 13 阶段 | 未建立 | 否 |
| 合金弹头 | MAME 0.289 / NeoGeo | 原生动作批 991 帧 | 11 阶段 | 未建立 | 否 |
| 三国战纪 | MAME 0.289 / PGM | 原生动作批 901 帧 | 9 阶段 | 未建立 | 否 |
| 宝可梦 Empress 1.0 | 作者原版 Node/Web | 协议级受控对局 66 采样 | 10 阶段 | 未建立 | 否 |

## 1. 街霸II'冠军版（sf2ce）

- 批次：`data/research/sf2ce-actions-20261017/`，1051 连续帧（tick 2000–3050），1051 张 384×224 原生截图，211 帧调色板，`completed=true`，ROM 校验通过。
- 操作：Ryu（选人界面普通按键确认）→ 待机、蹲、弱/中/强拳、短/中/重脚、前后走、跳、波动拳指令（↓↘→+强拳）、升龙指令（→↓↘+强拳）。
- 已逐帧查看确认：站立守架、对局 HUD（RYU vs E. HONDA）、CPU 贴身投技（Ryu 被摔）、窗口末期双方拉开。
- 已采集但**未逐帧确认**：蹲、六种普通技、前/后走、跳、波动拳与升龙指令窗口。
- **未通过**：CPU 对手会立即贴身与投技，多个窗口被打断；尝试 2P 加入被动对手失败（对手仍是 CPU）。因此这些窗口只证明输入发出与原画面，不证明招式成功命中。
- 尚未覆盖：其余 16 名可选角色、必杀/超必杀逐招、判定框、取消、受击/防御分支。

## 2. 合金弹头（mslug）

- 批次：`data/research/mslug-actions-20261017/`，991 连续帧（tick 4900–5890），991 张 320×224 原生截图，199 帧 VRAM+调色板，`completed=true`。
- 操作：P1 默认 Marco（本作无选人）→ 待机、右走、左走、蹲、跳、手枪连射、手雷、跳跃射击、持续射击。
- 已逐帧查看确认：Mission 1 丛林废墟场景、HUD（1UP、ARMS、手雷 10、LEVEL-4、CREDIT）、右走触发镜头推进与俘虏出现、手枪连射的枪口火光。
- 已采集但**未逐帧确认**：蹲、跳、手雷投出、跳跃射击、持续射击。
- **未通过**：未建立玩家坐标/武器/弹药 RAM 字段（本批 trace 只有输入与 screenFrame）；HMG/霰弹/火焰/火箭/激光等武器未取得；Tarma（P2）身份未观察；载具（Metal Slug 坦克）未进入。
- 尚未覆盖：敌人/BOSS、载具、全部武器、受击/死亡、关卡全流程。

## 3. 三国战纪（kov）

- 批次：`data/research/kov-actions-20261017/`，901 连续帧（tick 2900–3800），901 张 448×224 原生截图，181 帧调色板，`completed=true`。
- 操作：P1 关羽（GUAN，选人界面确认）→ 待机、右走、左走、Button1 连打、Button2、Button3 特殊技、跳、跳攻、走+连打。
- 已逐帧查看确认：关卡一（火场/木屋）进入、HUD（GUAN 1P×1、0 LEVEL、TIME）、敌兵、一次爆炸特效画面（未确认与哪个按键一一对应）。
- 已采集但**未逐帧确认**：右走/左走、Button1 连打、Button2、Button3 特殊技、跳、跳攻、走+连打。
- **首次失败已保留**：playBegin=2400 时整段停在剧情字幕（"WINTER OF JIAN AN 16TH YEAR…"），说明开局时序不能照搬；改为 2900 并在 1500–2800 用普通按键跳过后进入关卡。
- 尚未覆盖：其余可选角色、必杀/超必杀逐招、判定、道具、多关卡。

## 4. 宝可梦 Empress 1.0.0（empress）

- 来源：作者原包（ZIP SHA `9d1a756f…`，ASAR SHA `97a09a00…`），运行作者原版 Node 服务，未改规则、未改入口。
- 今日证据：`data/research/empress-controlled-20261017/report.json` + `states.jsonl`。通过作者协议 `startCpu` 开一局 easy CPU、stadium，队伍喷火龙/甲贺忍蛙/皮卡丘，再用 `input` 消息发送普通移动/闪避/出招/换人。
- 实测状态变化：右移 +119.02px、左移 −173.70px、闪避 −92px、斜上 +95.53/−95.53px、出招后对应冷却非零、换人后 species 由 charizard 变 greninja、走+出招同时生效。
- 边界：这是协议级权威状态证据，不是画面证据；命中、伤害公式、原生帧时序未验证。画面证据仍是 10-16 的浏览器 QA（`empress-controlled-qa-20261016/qa-report.json`），两次运行分开记录。

## 5. 拳皇98（kof98）

延续 10-16 的成果：16/16 角色 observe→export→audit 全部通过，212 基线缺口的元数据恢复到 186/187、严格可见像素 170/212、原生时间表 173/212；全角色/全动作拆解见 `docs/kof98-full-decomposition-2026-10-16.md`。`allMovesComplete` 与 `targetArtworkComplete` 仍为 false。

## 统一限制

- 五款都**没有**达到"完整逆向"：招式触发、判定框、取消窗口、命中停顿、原生时序仍各自待验。
- 只有拳皇98建立了逐窗口的元数据/像素/时间表门槛；其余四款目前是"原机窗口已采集并校验连续性"，不等于同等级验收。
- 街霸与三国战纪的 CPU/敌兵会介入窗口；合金弹头有原生敌人；Empress 的对手是 CPU。所有批次都记录"输入发出 ≠ 招式成功"。
- 未开始马里奥（按要求排在五款之后，本轮未有余力）。

## 复现

```sh
python3 tools/attack-library/scripts/capture-native-actions.py --plan tools/attack-library/data/native-action-plans/sf2ce-20261017.json --output <新目录>
python3 tools/attack-library/scripts/capture-native-actions.py --plan tools/attack-library/data/native-action-plans/mslug-20261017.json --output <新目录>
python3 tools/attack-library/scripts/capture-native-actions.py --plan tools/attack-library/data/native-action-plans/kov-20261017.json --output <新目录>
python3 tools/animation-lab/scripts/run-empress-original-20261016.py --port 4369
EMPRESS_OUT=<目录> node tools/attack-library/scripts/probe-empress-controlled.cjs
```
