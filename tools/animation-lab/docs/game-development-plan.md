# Codex 游戏开发计划

`createGamePlan(brief)` 将已有需求和资源组织为可实施的游戏方案。其结果始终为 `status: planned`；它没有运行游戏、生成美术或代替用户验收。

JS：

```js
import {createGamePlan} from './game-plan.mjs';
const plan = createGamePlan({
  title: '三色棋盘',
  engine: 'Godot 2D',
  genre: 'puzzle',
  platform: 'mobile',
  coreLoop: ['观察目标','交换棋子','结算有效匹配','检查回合结果'],
  objective: {description:'收集12枚蓝色棋子',condition:{blueCollected:12}},
  failure: '步数耗尽且目标未达成'
});
```

CLI 从 `tools/animation-lab` 目录运行：

```sh
node scripts/game-plan-cli.mjs plan --brief examples/game-plan/brief.json --output examples/game-plan/game-plan.json
node scripts/game-plan-cli.mjs plan --brief-json '{"genre":"card","engine":"Godot 2D","coreLoop":"抽牌→选择→结算→结束回合","objective":"赢得3轮","failure":"牌库耗尽"}' --output /tmp/card-plan.json
```

`--brief` 接受文件路径，或以 `{` 开头的 inline JSON。`--brief-json` 仅接受 inline JSON，二者互斥。没有 `--output` 时 JSON 输出到 stdout；保存消息输出到 stderr。退出码：0 结构合法、2 输入/schema/场景图错误、1 IO/运行错误。输入文件最多2 MiB。验证失败发生在输出写入前，不覆盖已有计划。

## Brief 契约

- `title`、`engine`、`genre`：非空字符串；未提供 engine/genre 时保留 null 并列出 assumptions。
- `platform`：字符串或字符串数组；未提供时为空数组并列出 assumption。
- `coreLoop`：字符串或非空字符串数组；不提供时按明确游戏类型提出流程，并标为假设。
- `objective`、`failure`：字符串，或 `{description,event?,condition?}`。`condition` 是保留的 JSON 数据，计划器不执行代码、不编译谓词。未给条件时标明 predicate-required，必须在实际游戏实现和测试。
- `characters`，或 `current.characters`：数组。每个角色可为名称字符串或 `{id,name?,role?,view?,actions?,availableActions?,assets?,proportions?,visualStatus?}`。`id` 为小写 slug；动作不能重复。已有动作只标 existing-candidate，贴图和动作的 visualStatus 保持 pending；输入的验收声明保留在 reportedVisualStatus，生成计划不提升美术状态。
- `scenes`，或 `current.scenes`：1–100项数组。字符串项是合法场景 ID；对象为 `{id,name?,purpose?,camera?,scale?,interactions?,connections?}`。
- `connections`：顶层 `{from,to,event?,condition?,bidirectional?}` 数组，或每个场景的 `connections: ["target-id", {to,event?,condition?,bidirectional?}]`。
- `entryScene`：入口 ID，默认首个场景且列为假设。
- `source`、`camera`、`world.mode` 等附加数据可保留。未知扩展字段完整保留在 `brief`，不逐个虚构为假设。

明确给出的场景图必须引用已定义场景；全部场景从入口结构上可达。重复 ID、未定义目标、错误入口和不可达场景抛 TypeError/RangeError。未给场景时提出入口/教学/核心回合/结算流程；给了场景但完全没给连接时提出按输入顺序连接的方案，列为 assumption。显式空连接不会被自动补边掩盖。

结构检查排除显式 `condition: false` 的永远关闭连接，其余条件按待实现路径处理；它不证明玩家满足钥匙、资源、任务、剧情等连接条件，也不证明碰撞/导航路线可达。输出 `conditionalRuntimeReachability: not-tested`，需要实际引擎走查。

## 输出与实施

`codex-game-plan/v1` 包含规则与事件、架构层和接口、场景及连接、角色/实体动作和资产需求、完整 UI 页面流和素材状态、地图/布局建议、QA与按依赖排序的实施任务。

内置 platformer、puzzle、card、shooter、survival、racing、management 的有限模板。未知类型保留为 custom；不会把所有游戏默认成恐龙平台跳跃，不自动添加生命值、敌人、跳跃或无限地图。棋盘与牌桌保持有限布局；只有 brief.world.mode 为 infinite 时明确要求分块世界。

角色的圆弧衔接、遮挡、比例、近远侧动作与素材完整性继续按项目美术QA执行。未提供视角时列出假设，不能用默认人形图填补未知角色；卡牌、棋子、设施与载具也属于可设计实体。

UI输出是制作清单，包含 loading/entry/tutorial/HUD/pause/result/settings、交互状态、安全区域、焦点/触摸和动态文字分离。实际UI套图和引擎接入必须由后续工具完成。计划里的 controls 是动作语义，具体键位、手柄/触摸映射尚待实现。

先实现最小可玩回合：输入有反馈、成功/失败谓词可触发、结算与重试清理正确；再接场景和代表角色、UI与地图、实际玩法QA，最后扩内容。计划器只完成结构检查，不能把生成文件说成游戏完成。

## 当前证据

`gamePlanUiBrief(plan)` 将合法的 `codex-game-plan/v1` 方案直接传给 `planUiSuite`。它检查 schema、planned 状态及场景/角色/UI/任务等必填结构；将 title 转为 name、核心循环数组连为文本、Godot2D/Phaser4 名称归一为 godot/phaser，并把原始选择保存在 `sourceGamePlan`。超过 UI 名称100字符/核心循环500字符的输入明确拒绝，不截断规则。

支持的 UI 类型为 platformer/runner/puzzle/action/rpg/idle/card；match-3 和 card-game 等同义名称可归一，survival/shooter/racing 等尚无直接对应 UI 类型会明确拒绝，要求扩展工具，不能默映射到其它玩法。引擎 Unity 或未选择也会拒绝而不默认 Phaser。

目标、失败的 description/event/condition 与显式 `brief.hud` 完整透传；未提供 HUD 时交给 UI 工具列出默认路径假设。移动设备在缺少显式设置时提出 touch/portrait；桌面提出 keyboard/landscape。主题与进度模式默认也列入 `integrationAssumptions`，不是用户已确认选择。`sourceGamePlan.visualStatus` 不会提升素材验收。

```js
import {createGamePlan,gamePlanUiBrief} from './game-plan.mjs';
import {planUiSuite} from './ui-kit-planner.mjs';
const game = createGamePlan({title:'棋盘',engine:'Godot 2D',genre:'puzzle',platform:'mobile',objective:'收集12枚蓝色棋子',failure:'步数耗尽'});
const ui = planUiSuite(gamePlanUiBrief(game));
```

`examples/game-plan/brief.json` 使用实际工作台恐龙与外星人资源清单作为示例，明确 source visual pending。计划中的 gather 等新动作是 planned，不是假称已有动画。

`test/game-plan.test.mjs` 实际测试非平台规则继承、未知类型、资源状态、图连接拒绝、CLI退出码。QA路径及代码hash保存在 `examples/game-plan/qa-report.json`。
