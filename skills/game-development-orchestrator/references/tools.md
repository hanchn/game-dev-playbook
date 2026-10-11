# 本机工具入口

实现位于经验库 `tools/animation-lab`。本机绝对目录为 `/Users/lemon/Desktop/game-dev-playbook/tools/animation-lab`。在其他游戏项目使用时先解析此技能 symlink 的实际文件位置，从经验库调用工具；输出写入当前游戏项目，不能假定当前工作目录就是经验库。安装为本机 symlink 时源码仍在经验库；复制技能到另一台机器时也需携带工具，或按同样设计/验收流程完成，不能假定服务已启动。

`node tools/animation-lab/mcp.mjs` 是 stdio MCP。`services.mjs` 的 `definitions` / `callTool` 可直接调用；CLI 不依赖网页。环境已配置这个 MCP 才使用对应工具名，否则调用实际 CLI，不声称已经接入某个客户端。

| 工作 | 调用方式 | 诊断页面 |
|---|---|---|
| 完整游戏计划 | `scripts/game-plan-cli.mjs plan --brief brief.json --output game-plan.json` | 计划文件 |
| 完整UI套图方案 | `scripts/ui-kit-cli.mjs`（先 `help`） | `/ui-kit-solution` |
| 无限地图 | `scripts/infinite-map-cli.mjs`（先 `help`） | `/map-generator` |
| 原地图源码复用 | `scripts/infinite-map-cli.mjs studio-chunk` / `tiled` | 结构化JSON |
| 骨骼关键帧 | `scripts/keyframe-generator-cli.mjs generate/edit/validate/export` | `/keyframe-generator` |
| 实际角色关节 | `scripts/audit-gait.mjs` 与角色QA | `/lab`、`/lab/alien`、`/lab/<species>` |
| PNG序列帧 | `skills/sprite-animation-production/scripts/check-sheet.mjs` | 逐帧、正常、慢速 |

表中 `scripts` 路径相对 `tools/animation-lab`。服务端口默认4317；这些页面用于诊断审图。正式游戏由当前项目选择的引擎承载，不能以诊断页代替游戏。

真人、外星人各自校准。二足动物看近远腿交换；马四拍行走和对角小跑分开；鳄鱼看低姿态回收、长口鼻和尾根；蜘蛛/蝎子看逐足近端回折；蛇/蚯蚓看连续蒙皮、首尾旋转和波传递。每个角色关联源图、骨骼姿势、帧动画导出版本并实际观察同一动作。

examples 中的证据只支持记录的版本与范围。当前角色仍有未完成美术修复，不能把全部素材标为已批准，也不能把独立工具功能测试当角色签收。
