当前入口 `/` 与 `/lab` 支持十类角色的侧面真实贴图和多动作；人包含跳跃、拳击、深蹲、弯腰、翻滚。详见 [圆弧零件制作与动作覆盖](docs/rounded-parts-workflow.md)。

# 零件工坊 · 角色资产工作台

角色从设计阶段就是零件资产，而非完整画面完成后再裁切。可视化流程为：设计形象 → 结构拆分 → 组合成型 → 测试动作。拆解/合并演示、独立配件动作、局部组合和整角色各自有入口。

## 启动

需要 Node.js 22 或更新版本，无 npm 依赖。

```sh
cd tools/animation-lab
npm start
```

打开 http://127.0.0.1:4317 。用 `PORT=4318 npm start` 指定其他端口。

```sh
npm test
```

## 当前可用能力

- 十类参数化角色：人、鸡、恐龙、马、鳄鱼、百足虫、蜘蛛、蝎子、蛇、蚯蚓。
- 每个零件有稳定 ID、父级、形状、连接标识、静息位置、尺寸、材质、绘制层级和适用关节范围。可修改零件尺寸与层级，以及整体色彩、尺度、步幅。
- 装配树、零件点击选择、带连接线的爆炸拆解和合并动画；拆解位移不会改变原资产。
- 单腿收拢/伸展与身体节段屈伸；独立零件、子树和全角色三层检视；近远侧腿分别保留身份。
- 两段肢体与七节步足逆运动学、连续身体蒙皮动作生成、脚端轨迹、32 帧拖动、慢放、逐帧与接地时序。
- 生产动作检查用 97 个采样点（原型保留 65 点）验证结构、腿骨长度、膝关节角度、连接、脚端运动、支撑滑步、穿地、分组相位、节段长度和循环接缝。不同动作应用不同检查；静态部件只做结构检查。
- 正常预设回归和蜘蛛同相、滑步、拉长、接缝、不动五种故障；无足角色另外验证拉长和接缝。
- 浏览器真实 rAF 帧耗时/FPS曲线、P95、超预算帧；切到后台重置采样。该指标只描述工作台运行环境。
- 角色 JSON、骨骼动画采样帧 JSON、详细动作设计 Markdown、透明 SVG/PNG 图集和固定 512×512 帧元数据导出。图集不会重复周期终点。
- 本地知识记录包含完整资产快照、版本、重新计算的检查证据、用户备注、时间和状态；失败记录也保留；支持重新载入和导出。
- 可复用 UI 样式变量、按钮、标签、输入与面板，入口为侧栏 UI 套件。窄屏侧栏变为横向资产列表。

动作设计见 [资产与分层验收契约](docs/asset-contract.md) 和 [十类角色说明](docs/actions/README.md)。

## MCP

stdio MCP 服务提供角色、游戏计划、UI 套图、关键帧与地图共 20 个工具。`game_plan` 关联玩法、架构、场景和角色；`ui_suite_from_game` 继承计划中的目标、失败规则和HUD；`ui_suite_plan/validate/component/layout` 提供整套 UI 与独立 SVG；`world_generate` 和 `studio_world_generate` 生成分块数据；`keyframes_create/edit/validate/sample` 提供可编辑时间轴。原有 8 个角色工具继续可用。stdout 仅输出逐行 JSON-RPC；支持初始化、发现、调用和工具错误。按 [MCP stdio 规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) 实现。

客户端配置示例（替换为你的绝对项目路径）：

```json
{
  "mcpServers": {
    "character-asset-lab": {
      "command": "node",
      "args": ["/absolute/path/game-dev-playbook/tools/animation-lab/mcp.mjs"]
    }
  }
}
```

例如先调用 `asset_create`，参数为 `{"species":"spider"}`，再将返回资产传给 `animation_test`：

```json
{
  "asset": "替换成 asset_create 返回的完整对象",
  "options": {
    "clip": "extend",
    "scope": "component",
    "partId": "leg-0-2",
    "fault": "none"
  }
}
```

HTTP `/api/tool` 是工作台后端 API，**不是** Streamable HTTP MCP。真正的 MCP 入口是 `mcp.mjs`。服务仅监听本机并验证 Host/Origin。该工具不替你改写任何客户端配置。

## 数据与边界

知识写入 `data/<uuid>.json`，已排除版本控制；手工导出即可迁移。复制这些文件可备份，恢复后重新启动即可检索。工具以不覆盖的独立文件保留每次记录。

当前十类角色的真实透明圆弧零件参与播放、独立关节测试、拆合、16 帧合成和 PNG/SVG 导出。内部轴点控制关节，外观不绘制机械插槽。各角色素材、动作、技术报告和复核记录保存在 examples 对应版本目录；旧版原型和失败素材保留。俯拍、背面、三维、Spine/Blender 适配器和物理仿真未实现。技术通过不等于视觉验收通过。详见 [人的侧面制作经验](docs/human-side-workflow.md)。

## Codex 游戏开发辅助

全局自动发现的 [game-development-orchestrator](../../skills/game-development-orchestrator/SKILL.md) 沿用项目约束，主动补齐玩法、架构、场景、角色与完整 UI，再实施与验证。当前工具安装为技能 symlink，实际源码在本经验库。

- [无限地图与来源](docs/infinite-map-generator.md)：`/map-generator`，可复现分块、负坐标、通行检查与上游 Tiled。
- [关键帧](docs/keyframe-generator.md)：`/keyframe-generator`，当前角色 FK 编辑、姿势与 SVG/PNG 导出。
- UI 套图：`/ui-kit-solution`，页面流、HUD、组件状态、独立源件、素材任务和 QA。
- 完整游戏计划：`node scripts/game-plan-cli.mjs plan --brief brief.json --output game-plan.json`。

这些页面是制作与审查工具。地图区域检查、关键帧数值检查、UI 结构检查分别保留证据；不能替代游戏玩法接入或源角色美术验收。新角色队列和当前动物美术缺陷仍独立处理。
