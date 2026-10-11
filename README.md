# 游戏开发经验包

从实际小游戏迭代中整理的可复用方法：游戏架构、主视觉与审美、素材出图顺序、序列帧、固定化 UI、加载、结算、性能与问题排查。这里包含经验、Skill，以及可调用的制作与验收工具。

## 使用方式

1. 新游戏先读 [架构](docs/architecture.md) 和 [审美设计](docs/art-direction.md)。
2. 按 [素材流水线](docs/asset-pipeline.md) 制作代表样本，并用 [场景素材矩阵](docs/scene-asset-matrix.md) 列清需要的图。
3. 角色、动物、载具动画按 [序列帧规范](docs/sprite-animation.md) 制作；行走与逃跑按 [步态制作、修正与验收](docs/sprite-gait.md) 先验证近远侧换腿，再扩展批量。
4. UI 按 [加载](docs/ui/loading.md)、[按钮](docs/ui/buttons.md)、[结算](docs/ui/settlement.md) 固定槽位制作，动态文字和数值独立。
5. 问题先看 [排查表](docs/troubleshooting.md)，玩法状态与测试看 [模式](docs/gameplay-patterns.md)。

修正“外侧腿一直迈、内侧腿不接替”时，直接查看 [步态排查表](docs/sprite-gait.md#1-先区分源动作与播放问题)；制作新动画时，按同一文档的相位、关键姿势、打包、播放与验收步骤执行，末尾附验收记录模板。

## 可复用 Skills

- [game-production-experience](skills/game-production-experience/SKILL.md)：从视觉锁定到 UI、动画、加载、性能验收的通用生产流程。
- [sprite-animation-production](skills/sprite-animation-production/SKILL.md)：处理裁切、朝向、循环跳帧、角色比例与车辆形变，附只读 PNG 检查工具。
- [Skill 能力索引](docs/skills-index.md)：其他可配合的游戏、引擎和设计技能；索引不代表这些第三方技能已被打包进本仓库。

把需要的技能目录复制到目标项目的 `.agents/skills/`，或安装到个人技能目录。遵守目标项目的指令、工具能力和用户授权；项目具体规则不能直接当作其他游戏默认。

## 实践原则

先验证一组代表素材，再批量；先固定 UI 外壳和角色尺度，再填充内容；不以生成数量、构建通过替代实际视觉检查。保留原图、中间方案、来源、状态和验收证据。性能先测量，图鉴种类和同屏数量分开，出画对象及时回收。

## 可执行检查

PNG 原图须为 8-bit RGBA。脚本只读取像素，不修改素材：

```sh
node skills/sprite-animation-production/scripts/check-sheet.mjs sprite.png 3 2 3
```

检查 3 列、2 行图集的每格是否为空、是否触边；返回非零表示失败。通过后仍要检查真实播放中的形体、朝向、比例和循环接缝。

## 开发案例

- [Dinosaur Park：折页手册、分层封面与独立加载](docs/cases/dinosaur-park-handbook.md)：独立标题按钮和上下装饰、透明图层校准、轻量入口、首帧就绪边界、语言与 OFL 字体、原生纸面折叠及手机验收边界。
- [胶囊森林：绘制 UI、飞行反馈与帧动画修复](docs/cases/capsule-forest-ui-motion.md)：地图高亮、切片雷达、边界反弹、坠毁结算与未通过的逃跑姿势记录。
- [街霸奶蛙：原设计还原、3D格斗与场景动画](docs/cases/dad-n-me-native-3d.md)：持续记录实测方法及未通过的手部修复方案，避免把技术通过当作美术完成。

## 角色资产可视化工作台

新增 [零件工坊](tools/animation-lab/README.md)：从零件设计形象，演示爆炸拆解与合并，独立测试配件、局部组合和完整动作。首批包含人、鸡、恐龙、马、鳄鱼、百足虫、蜘蛛、蝎子、蛇、蚯蚓；每类有详细动作设计。支持序列帧 SVG/PNG 导出、实测 FPS 曲线、stdio MCP、UI 套件和本地知识记录。首版是二维参数化示意资产，技术检查与人工视觉验收分开。

```sh
cd tools/animation-lab
npm start
```

浏览器打开 `http://127.0.0.1:4317`；运行 `npm test` 检查正常样本、故障样本和 MCP 链路。

游戏开发现在主动使用 [游戏开发统筹技能](skills/game-development-orchestrator/SKILL.md)，串联玩法、架构、场景、角色、[无限地图](skills/infinite-map-generation/SKILL.md)、[关键帧](skills/keyframe-generation/SKILL.md) 与完整 UI 套图。工作台侧栏提供三个工具入口，CLI/stdio MCP 可供 Codex 直接调用。各工具的技术检查与角色美术验收分别记录。

## 动画与游戏资产工作台

[2026-10-12收工、经验与未完成项](docs/closeout-2026-10-12.md)记录当前范围；[工作台](tools/animation-lab/README.md)包含角色分件、帧动画、拍摄、地图与UI生产工具。当前整体美术和游戏集成尚未验收。运行素材使用Git LFS，新克隆先执行 `git lfs pull`；历史大体积QA媒体保留本地，远程保存来源、报告和路径索引。
