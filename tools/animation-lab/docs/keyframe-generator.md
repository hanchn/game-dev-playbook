# Codex 关键帧生成辅助

这是可本地调用的开发工具：从当前角色资产建立动作关键姿势，编辑局部关节，输出可复用的时间轴和角色姿势序列。UI `/keyframe-generator` 用当前真实贴图审查编辑效果；支持浏览器草稿、时间轴插入/删除/移动、局部角度与整体位移、缓动、循环端点同步、JSON 导入/导出和透明 PNG 图集。网页不是游戏成品。

## CLI

在项目根目录运行：

```sh
node tools/animation-lab/scripts/keyframe-generator-cli.mjs generate --species human --skin alien --clip run --count 9 --output /tmp/alien-run.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs edit --input /tmp/alien-run.json --edits /tmp/edits.json --output /tmp/alien-run-edited.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs validate --input /tmp/alien-run-edited.json --samples 65 --output /tmp/check.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs export --input /tmp/alien-run-edited.json --format json --count 32 --output /tmp/poses.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs export --input /tmp/alien-run-edited.json --format svg --count 16 --output /tmp/sheet.svg
```

`generate` 默认真人快跑、9 个关键帧；动作名必须属于当前角色。支持当前生产物种 `human/chicken/dinosaur/horse/crocodile/centipede/spider/scorpion/snake/worm`；外星探索者用 `human` + `alien`。`validate` 数值质量通过退出 0，循环等质量失败退出 2，输入错误退出 1。所有报告的美术状态独立为 `not-reviewed`。

编辑文件是操作数组，`keyIndex` 从 0 开始，也可用导出中的 `keyId`：

```json
[
  {"op":"rotate","keyIndex":2,"partId":"arm-0-upper","degrees":-15},
  {"op":"insert","time":0.3},
  {"op":"move","keyIndex":3,"time":0.33},
  {"op":"easing","keyIndex":2,"value":"ease-out"},
  {"op":"translate","keyIndex":2,"x":0,"y":-5},
  {"op":"close-loop"}
]
```

`rotate` 为相对旋转增量；下游按照父级骨端跟随。非骨父件的孩子保留来源姿势的局部附着偏移。`translate` 改整体位置，`delete` 删非端点，`set-duration/set-loop/set-name` 修改动作参数。缓动可取 `linear/smooth/ease-in/ease-out/hold`。`close-loop` 复制起始姿势到末端；不保证末首速度或动作自然度。

## 可复用格式

机器结构见 `schemas/keyframes.schema.json`；运行时检查另验证角色身份、当前骨长、节点完整性、有序唯一时间、0/1 端点和有限数字。JSONschema 文件描述结构，不包含角色动态骨长约束。

- `schema: sprite-keyframes`、`schemaVersion:1`。
- `asset` 保留生成时的物种、皮肤、资产 id 和 atlas 来源；导入会使用当前同角色真实贴图。当前骨长变更时拒绝导入，应重新采样并迁移编辑。资产 id/图集版本只是来源记录，不证明当前新图已经通过美术 QA。
- `frames[].time` 为归一化时间 0–1；每段使用左侧关键帧的缓动。
- `transforms[id]` 中 `x/y` 为相对于父级骨端（非骨父级则是父件中心）的偏移，角度为相对于父级朝向的弧度；`length` 固定为当前骨长。
- 人形柔性蒙皮保留 `spine`/`spineBaseAngle` 等实际驱动数据；不把复杂动作退化为纯骨架展示。
- 输出 `sprite-keyframe-poses` 含角色局部像素节点、末端、时间、fps 和循环标识，供游戏引擎或后续采样使用。循环输出省略重复末端，非循环保留最终姿势。
- SVG/PNG 为每帧固定 512×512、4 列。SVG 只嵌入一份真实源图，其余网格复用；PNG 与姿势清单同时下载。

## 本地来源与复用边界

实际复用本项目 `game-core.mjs` 的动态资产/已有动作及 `skin-renderer.mjs` 的原图与柔性蒙皮。新增部分是局部 FK 插值、可编辑 schema、CLI、UI 和验证器，不声称进行 AI 视频补帧或图像生成。

只读检查 `/Users/lemon/Desktop/game-asset-studio/AGENTS.md`、`docs/project-memory.md`、`workers/collector/resource_generators.py` 与本地素材存储。`storage/library`、`storage/imports` 当时都只有 `.gitkeep`。SpriteForge、ai-sprite-animator、Gorest 等仅有目录中的外部源码线索，没有已下载实现可复用；未运行或启动该工作台。来源证据详见 `examples/keyframe-generator/source-provenance.json`。

## QA 与限制

回归命令：`node --test tools/animation-lab/tests/keyframe-generator*.test.mjs`。覆盖当前 11 个物种/皮肤的所有常规动作关键姿势往返、父级编辑对下游影响、固定骨长/插接、插入保持当前姿势、导入拒绝和循环失败。

真实 UI 已检查真人、外星人、恐龙加载，真人关节编辑/草稿恢复/JSON 导入/时间移动、透明 PNG 和留边。失败与同姿势复测保留在 `examples/keyframe-generator/qa-review.json`，没有把角色既有美术缺陷标为通过。

插值是姿势编辑辅助，不自动提供 IK 锁脚、物理/碰撞或物种解剖校正。必须逐帧看接缝、材质、极限弯曲、接触与循环速度。静态 pose 插值可能导致支撑脚滑步；仅骨长通过不能证明自然。预览镜头根据整段动作边界固定取景，播放时不会逐帧缩放。导出保留角色标准画布，不因预览镜头变化而更改游戏资产比例；大幅修改位移后须重新查留边。

## Codex 工具调用接口

本地 services/MCP 可封装同一组核心函数，无需解析 CLI 输出：

| 工具 | 参数 | 核心函数 |
| --- | --- | --- |
| `keyframes_create` | species、skin、clip、count（2–65） | `createTimeline(asset, options)` |
| `keyframes_edit` | timeline、edits | `applyKeyframeEdits(asset, timeline, edits)` |
| `keyframes_validate` | timeline、samples（2–513） | `inspectTimeline(asset, timeline, options)` |
| `keyframes_sample` | timeline、count（2–120） | `exportFrames(asset, timeline, options)` |

编辑接口先验证并复制输入，因此失败操作不会修改调用方持有的时间轴。CLI 与工具接口复用同一套操作实现。显式未知动作被拒绝；省略动作时默认快跑，物种没有快跑则取首动作。生成和采样返回数据，不表示已在游戏引擎中导入或美术通过。

当前 `dinosaur-run-current.png` 是 **v4 拍摄时的旧证据**；文件名不能当作当前版本凭据。后续 v5 已包含在数值回归中，但本次补测时 IAB 不可用，未补 v5 UI 截图。报告将旧截图和当前技术依赖版本分开记录。

导入要求 asset.id 与 asset.atlas 精确匹配当前加载角色；历史版本即使 species/skin 一致也会拒收，须重新采样。19 项技术回归通过；旧截图仍保留原始版本标识。

蚯蚓 `worm-side-v6` 液压体节采用实际采样长度与直径，插值长度后以 `length × width²` 恒定重建宽度；相邻 `end.width` 共享。导入须满足当前长度比例 0.74–1.26 和体积误差 <0.001，固定骨架仍拒绝改骨长。关键帧原位往返与非关键时刻体积/故障输入已测试；此模型未模拟地面摩擦推进。
