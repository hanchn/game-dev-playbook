# 游戏 Skill 能力索引

此索引整理本次环境中可配合的技能。技能安装情况会变化；新环境先查可用目录，不能假设名称对应的技能已经安装。除本仓库两个原创 Skill 外，这里只介绍能力，不复制第三方技能正文。

| 工作 | 可配合 Skill | 用法 |
|---|---|---|
| 路由引擎/游戏类型 | router | 不确定专项技能时先识别项目引擎和任务 |
| 美术与素材计划 | create-game-assets | 风格、清单、来源、导入与原图验收 |
| 位图生成/编辑 | imagegen | 主视觉、角色、背景、UI外壳，使用真实参考 |
| 菜单与HUD | game-ui-ux | 状态栈、锚点、安全区、焦点、事件更新 |
| 动效反馈 | game-feel | 缓动、受击、拾取、回弹及音画层次 |
| 性能 | performance-optimization | 测帧时间、定位CPU/GPU、复测预算 |
| 输入 | input-systems | 触屏、键鼠、手柄、死区和动作映射 |
| 碰撞与运动 | physics-tuning | timestep、穿透、稳定检测与物理参数 |
| 镜头与关卡 | camera-systems / level-design | 摄像、边界、路径、可读性与节奏 |
| AI与程序化 | game-ai / ai-behavior-trees-utility-ai / procedural-gen | 行为、路径、效用、种子和内容生成 |
| 音频与存档 | audio-design / save-systems | 混音、反馈与保存迁移 |
| 像素着色与特效 | shader-programming | 坐标、UV、着色器效果；先验证资源本身 |
| Godot结构与代码 | godot-nodes-scenes / godot-gdscript / godot-csharp | 场景组合、脚本、语言接口 |
| Godot动作/物理 | godot-animation / godot-physics / godot-2d-movement | Tween、AnimationTree、移动、碰撞 |
| Godot UI / 资源 | godot-ui-control / godot-resources / godot-signals-groups | Control、主题、数据和事件 |
| Godot 3D与渲染 | godot-3d-essentials / godot-shaders / godot-tilemap | 3D环境、材质、地图 |
| Godot交付与测试 | godot-export / godot-gdscript-headless-testing / godot-multiplayer | 导出、无界面测试、联网 |
| 类型专项 | platformer / roguelike / rpg / fps-shooter / survival-crafting | 对应玩法架构，不套到无关类型 |
| Figma设计落地 | figma-design-to-code / figma-use / figma-implement-motion | 设计源与代码/动效对应，按插件要求调用 |
| 技能维护 | skill-creator | 验证发现描述、正文、脚本和参考文档 |

建议组合：生产流程用 `game-production-experience`，具体位图操作用 `imagegen`，动画异常用 `sprite-animation-production`，UI实现用 `game-ui-ux`。性能问题不要靠继续出图解决，先走测量流程。

- [原格斗动作逐帧换图生产](../skills/original-fighter-action-reskin/SKILL.md)：按源独立图、持帧和坐标制作；alpha归属拆帧、逐张接入和原机/美术证据分开验收。
