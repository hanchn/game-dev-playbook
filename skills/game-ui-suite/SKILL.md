---
name: game-ui-suite
description: 为游戏开发主动制作整套 UI 方案，连接核心玩法、页面流、HUD、组件状态、素材生产、QA 与 Phaser/Godot 接入；使用实际imagegen源图、页面与组件状态PNG、生产下载及来源回执，区分规格、美术与游戏运行证据。
---

# 游戏 UI 套图

在新游戏或整套游戏开发中，随整体设计主动完成 UI 方案；窄范围修复只补相关缺口。继承当前项目约束、已有玩法、角色参考与素材，先使用真实来源，不把一张好看的整图称为可导入套件。使用 `game-ui-ux` 的安全区、布局、screen stack 和事件驱动 HUD 约定。

## 形成可调用的方案

从名称、核心循环、类型、人群、触控/键鼠/手柄、横竖屏、画风、引擎和已有角色参考生成 brief。工具支持 `platformer/runner/puzzle/action/rpg/idle/card`；未提供字段进入 `assumptions`，不能写成用户已确认。新增类型或独特玩法应扩展规划器规则并检查输出，不强套示例文案。

```sh
node tools/animation-lab/scripts/ui-kit-cli.mjs sample --output /tmp/ui-brief.json
node tools/animation-lab/scripts/ui-kit-cli.mjs plan --input /tmp/ui-brief.json --output /tmp/ui-plan.json
node tools/animation-lab/scripts/ui-kit-cli.mjs validate --input /tmp/ui-plan.json --output /tmp/ui-check.json
node tools/animation-lab/scripts/ui-kit-cli.mjs export --input /tmp/ui-plan.json --dir /tmp/ui-suite
node tools/animation-lab/scripts/ui-kit-cli.mjs production --input /tmp/ui-plan.json --output /tmp/ui-art-job.json
node tools/animation-lab/scripts/ui-kit-cli.mjs art-export --input /tmp/ui-plan.json --dir /tmp/ui-art
```

Codex 服务可直接调用 `planUiSuite(brief)`、`validateUiPlan(plan)`、`renderUiComponent(plan,id,state,options)`、`renderUiScreenPreview(plan,screenId)` 和 `planLayout(plan,viewport)`。参数、schema 与引擎约定见 [工具说明](../../tools/animation-lab/docs/ui-kit-solution.md)。规划输出需与整体游戏设计保持同步。

## 完整 UI 产物

方案至少覆盖当前玩法所需的进入、真实加载/失败恢复、教程、游玩HUD、暂停/设置、结算或失败重试、确认弹窗与所有返回路径。不要为未定义的玩法添加商店、付费、广告或背包。HUD 写清数据字段、事件、显示格式与反馈；UI发送语义操作意图，奖励和状态重置属于游戏逻辑。

每个必要组件提供 default/pressed/disabled/focus/selected 等实际适用状态，统一色彩/字体/间距/安全区/命中区/9slice约定。导出独立 SVG 源件时去除示例文字；引擎字体保持可本地化。仅参考尺寸像素稿不足以交付，必须检查设备逻辑像素最小触控区和字体。

完整游戏任务不能以规格SVG或一张漂亮大图作为最终套图。运行 `prepareUiArtProduction(plan)`/CLI production 生成完整生产任务，通过内置imagegen逐件制作菜单/世界/关卡背景、透明面板、主次按钮、圆控件、胜败徽章；pressed从对应default源图编辑并锁住几何和风格。新画风必须执行实际生产，纯函数只列任务，不冒称已调用imagegen。先view所有来源，再把文件、SHA、真实工具回执、透明度/边界与版本加入已生产manifest，接入组合器并覆盖每个必要页面和每个适用状态。不要用截图或拼贴猜切件；游戏标签由引擎字体绘制。

当前恐龙jade/amber套件 `dinosaur-jade-amber-v2` 实际有12来源（11本轮生成+1已有菜单背景），其中3个pressed为实际imagegen编辑；disabled/focus/selected由明确渲染配方派生。它覆盖12页和73状态PNG，不把派生状态谎称独立imagegen生成。brief明确绑定productionKit时可运行 art-export 导出sources/pages/states PNG、可移植SVG、plan与带哈希回执。其他brief不可自动套恐龙皮肤，应按其生产任务建立新套件。CLI用已安装Sharp，浏览器Canvas；原始源PNG保持不变。

## 验收与接入

`/ui-kit-solution` 默认恐龙实际美术预览，可切规格模式；提供页面流、实际组件状态、当前页PNG及整套sources/pages/states PNG ZIP下载，属于开发辅助。按 `qa` 清单自测页面转移、栈顶输入隔离、暂停恢复、事件HUD、重复结算、长文案、安全区、字体放大和减少动态效果。失败和同条件复测记录在项目 QA 路径总索引；工具结构通过不表示游戏美术或实机通过。

SVG/9slice 导入 Phaser/Godot 时先核对本项目实际引擎版本，再实现适配器。不要仅凭方案文档声称已经创建引擎场景或已导入游戏。接入后用完整游戏循环确认数据和页面一致，保存可复用源图、tokens、状态文件及生产回执。

实际成像的触控区和文字要检查组合后的 SVG 坐标，不能只看规划器声明的最小尺寸。小屏缩放会把源组件内的字体和按钮一起缩小；操作标签可在外层按设备逻辑像素绘制，紧凑横屏弹窗可分两列排列。字体放大后逐页看标题/眉题、节点标签/返回按钮是否重叠；先修布局，不靠把标签缩回小字通过。图标可用明确的 SVG 路径覆盖生成的控件底图，记录为派生配方，避免 Unicode 字体回退改变形状。

页面 PNG 与完整套图 ZIP 应冻结同一份 plan、viewport、safe insets、textScale 和全部源图字节，校验源 SHA 再渲染。回执记录每件源/页面/状态字节和哈希；下载用真实 download 事件返回的路径。选同一页面实测单页 PNG 与 ZIP 对应文件一致，保留失败包和复测包。当前 layout3 的手机样例与记录见 [移动端复测](../../tools/animation-lab/examples/ui-suite-art-mobile-v3/qa-report.json)；它只验证当前 brief，长文案、实机和游戏循环仍分别验收。

具体规则优先：把 objective/failure 的 description、event、condition 透传到 UI brief；提供 hud 时用 `{id,label,path,event,format?,feedback?,critical?}` 列表，严格继承顺序与绑定，`[]` 表示无数据 HUD。不为未声明计分的益智游戏添加 score；结果页不擅自添加奖励/评级。保留 sourceGamePlan 和 integrationAssumptions 的 planned/pending 证据边界；未明确运行条件和默认绑定必须记录假设。
