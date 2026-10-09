# 游戏开发经验包

从实际小游戏迭代中整理的可复用方法：游戏架构、主视觉与审美、素材出图顺序、序列帧、固定化 UI、加载、结算、性能与问题排查。这里包含知识、原创 Skill 和只读验收脚本。

## 使用方式

1. 新游戏先读 [架构](docs/architecture.md) 和 [审美设计](docs/art-direction.md)。
2. 按 [素材流水线](docs/asset-pipeline.md) 制作代表样本，并用 [场景素材矩阵](docs/scene-asset-matrix.md) 列清需要的图。
3. 角色、动物、载具动画按 [序列帧规范](docs/sprite-animation.md) 和 [步态专项经验](docs/sprite-gait.md) 验证后再批量。
4. UI 按 [加载](docs/ui/loading.md)、[按钮](docs/ui/buttons.md)、[结算](docs/ui/settlement.md) 固定槽位制作，动态文字和数值独立。
5. 问题先看 [排查表](docs/troubleshooting.md)，玩法状态与测试看 [模式](docs/gameplay-patterns.md)。

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

- [街霸奶蛙：原设计还原、3D格斗与场景动画](docs/cases/dad-n-me-native-3d.md)：持续记录实测方法及未通过的手部修复方案，避免把技术通过当作美术完成。
