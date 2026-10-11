# Codex UI 套图方案工具

该工具是游戏开发辅助：从玩法 brief 规划全部必要页面、HUD 数据契约、交互状态、视觉 tokens、独立素材与 QA 路径。它没有实现新游戏，也没有创建 Phaser/Godot 运行场景。用户的新全局 `Proactive game development` 规则要求新游戏主动完成整套方案；本工具与整体游戏设计 pipeline 配合，窄修复只补相关 UI 缺口。

## 输入与纯函数

机器 schema：`schemas/ui-suite-brief.schema.json`、`schemas/ui-suite-plan.schema.json`。

| 字段 | 约束 / 默认 |
| --- | --- |
| name / coreLoop | 必填，1–100 / 1–500 字符 |
| genre | platformer / runner / puzzle / action / rpg / idle / card；默认 platformer |
| orientation | landscape / portrait；默认 landscape |
| input | touch / keyboard / gamepad / mixed；默认 touch |
| engine | phaser / godot；默认 phaser |
| theme | jungle / candy / space / paper；默认 jungle |
| progression | levels / endless / single-session；默认 levels |
| audience / artStyle | 可选文本，最多 200 / 300 字符；缺省进入假设 |
| sessionMinutes | 0.5–120，默认 3 |
| objective / failure | 可选文本或 `{description,event?,condition?}`；条件 JSON 原样保存，由游戏逻辑执行 |
| hud | 可选最多20项 `{id,label,path,event,format?,feedback?,critical?}`；显式列表严格继承顺序与绑定，`[]` 表示无数据 HUD |
| sourceGamePlan / integrationAssumptions | 可选来自游戏计划薄适配的来源与归一假设；保留原计划的 planned / pending 状态 |
| productionKit | 可选已生产套件ID；恐龙sample明确绑定 dinosaur-jade-amber-v2，其他brief不会自动继承 |
| references | 最多 20 个 `{role,path,kind}` 来源；角色/菜单背景等用途分别记录 |

输出 `game-ui-suite-plan` schemaVersion 1；未提供字段保留 assumptions。跑酷默认以距离/历史最佳结算并省略成功关卡页。其他类型仅使用本身的默认生命、目标、步数、能量、任务、资源或回合 HUD 提案，未声明的默认数据路径/事件记录为假设。益智游戏不默认添加计分。显式 HUD 列表覆盖全部默认数据绑定；暂停导航可独立存在。输入为键鼠/手柄时不生成触控操作素材。未定义经济/商业化时不添加商店、支付或广告。

核心文件 `ui-kit-planner.mjs` 导出：

- `planUiSuite(brief)` → 全套 plan。
- `validateUiPlan(plan)` → 结构报告，视觉始终 `not-reviewed`。
- `renderUiComponent(plan,id,state='default',{label=null,value=.65,includeText=false})` → 单件 SVG 源码。默认不输出文字；includeText 仅用于规格预览。
- `renderUiScreenPreview(plan,screenId)` → 固定参考尺寸页面规格 SVG，明确不是完成的游戏画面。
- `renderUiContactSheet(plan)` → 组件所有状态的检视 SVG。
- `planLayout(plan,{width,height,insets:[top,right,bottom,left],textScale:1})` → 安全区、触控/字体下限和容器建议。最小触控 48 与字体 16 是设备逻辑像素约束。
- `packUiSources(files)` → ZIP 字节，files 为 `[fileName,stringContent或Uint8Array]` 数组；PNG保留真实二进制字节；浏览器导出复用该函数。

纯函数不调用网络、imagegen 或游戏引擎。生产状态由事实记录，不从输入 kind 猜已验收。

## CLI 与导出

```sh
node tools/animation-lab/scripts/ui-kit-cli.mjs sample --output /tmp/dinosaur-ui-brief.json
node tools/animation-lab/scripts/ui-kit-cli.mjs plan --input /tmp/dinosaur-ui-brief.json --output /tmp/dinosaur-ui-plan.json
node tools/animation-lab/scripts/ui-kit-cli.mjs validate --input /tmp/dinosaur-ui-plan.json --output /tmp/ui-check.json
node tools/animation-lab/scripts/ui-kit-cli.mjs export --input /tmp/dinosaur-ui-plan.json --dir /tmp/dinosaur-ui-suite
node tools/animation-lab/scripts/ui-kit-cli.mjs component --input /tmp/dinosaur-ui-plan.json --id button-primary --state pressed --output /tmp/button-primary-pressed.svg
node tools/animation-lab/scripts/ui-kit-cli.mjs layout --input /tmp/dinosaur-ui-plan.json --width 740 --height 360 --insets 16,44,16,44 --output /tmp/mobile-layout.json
```

导出目录包括独立 `components/*.svg`、`screens/*.svg` 规格预览、状态联系表、完整 plan 与生产回执。每个组件状态独立文件，图标/按钮/面板不来自整张截图切割；文字由引擎字体另绘。旧 export 命令导出SVG规格；实际PNG套图使用 art-export，回执将已生产源图、组合页面、派生状态与planned任务分别标识。

工具页 `/ui-kit-solution` 可编辑 brief、查看页面流、模拟页面栈/返回、切设备/安全区/大字、查看所有组件状态和素材提示词，并导出 plan JSON、独立 SVG ZIP 或页面规格 SVG。浏览器的事件按钮是流程模拟，不操作真实游戏状态。示意 HUD 数字不是游戏逻辑结果。

## 恐龙代表方案与真实素材

当前实际方案 `examples/ui-kit-solution/dinosaur-art-plan.json`：12个真实imagegen来源（本轮11图+既有菜单背景）、12个完整页面PNG、73件适用状态PNG。source清单/完整提示词/SHA/原始生成路径在 `public/ui-suite/dinosaur-ui-kit-v2/manifest.json` 和 `production-prompts.json`。恐龙套图统一玉石绿、青铜化石边、琥珀主操作与热带森林环境，背景与按钮分开生产，文字和HUD使用当前规则实时组合。3件pressed来自对应default的imagegen编辑；disabled/focus/selected/progress等由记录的渲染配方派生，不能冒称每件状态都单独生图。

```sh
node tools/animation-lab/scripts/ui-kit-cli.mjs production --input tools/animation-lab/examples/ui-kit-solution/dinosaur-art-plan.json --output /tmp/art-job.json
node tools/animation-lab/scripts/ui-kit-cli.mjs art-export --input tools/animation-lab/examples/ui-kit-solution/dinosaur-art-plan.json --dir /tmp/dinosaur-complete-art
```

导出实际 sources/*.png、pages/*.png、states/*.png，pages/*.svg 使用相对 ../sources 路径而非绝对本机URL；production-manifest与receipt包含来源和输出SHA。独立控件PNG默认无本地化文字，glyph作为图标功能保留。页面PNG为组合演示，游戏引擎需用拆件与真实数据重绘标签。浏览器完整ZIP使用实际源文件fetch+Canvas渲染所有页面和状态，当前页可另下载PNG；生成时快照plan，避免过程中换brief导致混包。

新纯函数：`getUiArtKit(plan)`、`renderUiArtComponent(plan,id,state,options)`、`renderUiArtScreen(plan,screenId,{width,height,insets,textScale})` 和 `prepareUiArtProduction(plan)`。productionKit仅显式绑定既有套件；其他brief返回完整imagegen逐件生产任务和pressed编辑依赖，尚未产图时 art-export 明确拒绝，不拿恐龙模板冒充新游戏套图。CLI依赖已安装Sharp；可用UIKIT_NODE_MODULES指定模块目录，当前内置runtime依赖可直接用，不下载新依赖。原始imagegen文件bit-identical复制，透明内容trim仅在组合viewBox处理。

现有菜单背景 `public/ui-suite/dinosaur-jungle-home-v1.png` 是复用来源，不伪装本轮新生成。世界背景为UI演示环境，不等于可碰撞游戏关卡。旧 dinosaur-brief.json/旧SVG联系表及qa-review.json保留历史规格证据。

只读检查本地 `/Users/lemon/Desktop/game-asset-studio` 的 AGENTS、memory、studio.js、workers/generation 与 packages。原项目存储导入目录只有 `.gitkeep`，未发现可直接复用的完整 UI套图规划器；已有 map schema/资源目录不等于此实现。实际复用的是当前 `game-ui-ux` 的布局、焦点、事件与页面栈规则。没有启动原工作台。

## 接入

HUD 订阅生命/分数/目标等语义事件，进入页面绑定、退出解除；不每帧轮询玩家对象。暂停与设置是 stack push/pop，栈顶独占输入；返回恢复调用屏和焦点。奖励、解锁、重试重置保留规则由游戏状态系统执行且幂等，UI只发意图。

Phaser 使用 UI Scene + World Scene、safe-area容器和游戏事件；Godot 使用 CanvasLayer/Control、containers/anchors、安全区 MarginContainer、signals 和 Theme。提供 9slice 数值只是导入约定，具体 API 需核对当前安装引擎版本。引擎适配器和完整运行场景未由此工具自动创建。

## QA 边界

运行 `node --test tools/animation-lab/tests/ui-kit*.test.mjs`。测试包括7类玩法页面可达性、状态素材完整性、事件 HUD、设备逻辑像素安全区、源件无烘焙文字、角色/引擎差异、非法 brief/plan 拒绝、CLI全链路与 ZIP CRC。

组件 SVG 已通过实际本地渲染检视；发现次按钮 pressed 对比度、toast 状态同样、触控方向/disabled 状态等问题并修复，保留失败与同源复测。主代理已在实际 IAB 跑通 home → level-select → tutorial → playing，并完成 740×360 大字安全区修复复测与无文字 disabled SVG 实际导出；证据见 `examples/ui-kit-solution/qa-review.json`。此代理 IAB 不可用，未另造网页截图或冒充实机测试。所有场景初始 `not-run`，按真实证据更新，结构测试不能替代游戏画面与真实数据检查。

独立非平台回归：`puzzle-rules-brief.json` 与 `puzzle-explicit-hud-brief.json` 保留“20步收集12枚蓝子”的完成/失败事件和 JSON 条件。Playing、失败、完成页读取声明描述；结果页不强加 score/rating/reward。浏览器导入后再次生成保留规则、HUD、sessionMinutes、references 与来源字段，可在可选契约折叠区编辑。20 项 UI 技术测试通过。失败原始审计与复测 JSON 均保留在 examples。

主代理实际非平台复测已通过：导入 `examples/ui-suite/puzzle-rule-brief.json` 后再次生成，playing 仅蓝子/步数；激活 `puzzle.failed` 到声明失败描述，实际导出 `puzzle-plan-actual-export.json` 完整保留目标/失败条件和两项 HUD。截图路径与原始失败审计见 QA 报告。这是工具契约和导航复测，未签收纸感主题整体美术或实机手机可读性。

## 实际美术 QA（v2）

26项技术测试已通过，日志 `examples/ui-kit-solution/regression.log`。实际12页PNG逐页view检视：home/map/HUD/教程/加载/错误恢复/暂停/设置/胜败/两个确认页。初轮弹窗标题与顶部琥珀装饰重叠，失败PNG保留在 dinosaur-complete-art/qa-before-header-fix；标题下移后同源复测。65%加载的ready按钮已禁用；失败文案已替换成玩家文案，玩法未知条件仍在assumptions而非产品页面。740×360大字native布局触控和pause坐标已有独立回归；新的art模式实际浏览器截图/完整ZIP验收由主代理补证据，不能拿历史SVG模式安全区截图当作新art模式证据。新来源与每页观测见 art-source-provenance.json / art-qa-review.json。

每个新游戏要执行实际生产任务并逐页检查：美术匹配玩法和角色、按钮文字对比、真实pressed/disabled、HUD数据与安全区、长文案、加载错误和返回路径；机读结构通过不能替代目标设备与完整游戏循环测试。当前工具不声称Phaser/Godot运行场景已集成。

### 当前美术 layout3 的设备导出

浏览器下载当前页面PNG和完整美术套图ZIP使用当前设备、安全区和大字倍率。ZIP export-receipt.json记录layoutVersion、pageViewport、每件文件字节/SHA及12源身份。CLI art-export可传 --width、--height、--insets top,right,bottom,left、--text-scale；默认采用plan参考尺寸。透明源PNG保持原样，图标路径和禁用/焦点配方属于派生状态。

手机740×360大字1.35的逐页实看、30项定点回归、下载字节一致性及原始布局失败见[本轮QA](../examples/ui-suite-art-mobile-v3/qa-report.json)。该范围不覆盖任意长文案、真实游戏状态或物理手机验收。
