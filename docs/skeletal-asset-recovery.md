# 骨骼资产储备与逆向提取知识

更新：2026-10-14。适用目标是人、家禽、动物、恐龙的可编辑骨骼与动作，以及可编辑法术特效。常规动作需求覆盖站立/待机、走路、奔跑、撞击/受击、死亡、跳跃、翻滚/闪避、打斗/连招、格挡、施法、欢呼、拿取/搬运、举剑/持械、投掷，以及飞行、游泳、爬行、攀爬、坐下/休息和互动工作。动作覆盖按实际 clip 与来源证据记录，不能认为任一动作包包含全部动作。本次完成公开来源和文件目录调查；没有执行目标游戏逆向、解包、安装 REA 或验证引擎导入。下文提取步骤是后续工作方法，不是已完成结果。

## 1. 先找容易获得完整资产的来源

优先顺序：

1. 作者公开完整工程：骨骼、蒙皮、动作、图集、贴图均可直接取得。
2. 作者免费包：明确写有 rigged/armature 和 animations，并列出 FBX、glTF/GLB、Blend、DragonBones、Spine、SCML 等实际文件。
3. 可访问的演示或导出项目：能够从公开文件目录确认骨骼数据、图集与纹理；保留加载入口和版本，作为未来提取候选。
4. 导出游戏包：只有可下载的运行包，尚未确认内部骨骼与贴图；列入候选，不能标成已获得骨骼。
5. 只有视频、GIF、序列帧、静态模型：不计入可用骨骼资产。可单独留作美术参考。

“骨骼 JSON 一定存在”不能作为采集依据。Spine 可以导出二进制 `.skel`，DragonBones 可以导出 `.dbbin`；Unity、Unreal 和自定义引擎也可能把数据打包。先记录实际格式，再选择分析工具。运行时数据可以保留骨骼与动作，但不一定包含作者的原始控制器、命名、曲线或编辑工程。

## 2. 最小完整资产集合

| 系统 | 骨骼与动作 | 配套资源 | 需要单独确认 |
|---|---|---|---|
| Spine 2D | `.json` 或 `.skel`，原始 `.spine` 工程如有 | `.atlas`、所有图集页 PNG/WebP | 导出版本、网格权重、IK、皮肤、附件、事件；编辑器/运行时条件 |
| DragonBones 2D | `*_ske.json` 或 `.dbbin`，`.dbproj` 如有 | `*_tex.json`、图集页及分件图 | armature、bone、slot、skin、animation、网格权重、帧率、版本 |
| Spriter 2D | `.scml` 或 `.scon` | 原始分件 PNG、目录层级 | bone/object、父子关系、timeline、mainline、pivot、循环区间 |
| glTF/GLB 3D | joints、skins、inverseBindMatrices、animation channels/samplers | mesh、buffer、纹理、材质；GLB 内嵌与外链均可能 | 节点层级、权重、单位、坐标、插值、扩展和外部依赖 |
| FBX/Blend 3D | skeleton/armature、权重、动画曲线/Action | 模型、材质、贴图 | 控制骨骼与变形骨骼、根运动、独立动作文件、约束是否已烘焙 |
| Unity 导出 | 骨骼层级、SkinnedMeshRenderer、Mesh、AnimationClip/Animator | AssetBundle/Addressables 依赖、材质、纹理 | 引擎版本、资源依赖、原脚本/Prefab 是否缺失；不能默认有 JSON |
| Unreal 导出 | SkeletalMesh、Skeleton、AnimSequence | 材质、贴图、包依赖 | 版本、cooked 状态、是否可恢复工程；运行包不等于源码 |
| Effekseer/VFX | `.efkproj`/`.efkefc` 等效果工程 | 纹理、模型、曲线、材质 | 格式版本、插件、着色器；特效工程与角色骨骼分开分类 |

OBJ 通常只是静态几何，不能因为同一包也列 FBX 就把 OBJ 标成带骨骼。粒子特效通常也没有角色骨骼；用户要法术特效时应保留可编辑粒子/着色器工程，而不是强行要求 bone。

## 3. 候选分级与证据

- **A：文件目录已确认。** 有精确骨骼文件链接和图集/贴图/模型配套路径，适合直接取得或做提取研究。
- **B：作者明确声明。** 免费包明确说明绑定、动画、格式，尚未打开下载包核验；不声称已经导入成功。
- **C：待查线索。** 演示或包可获得，但骨骼存在性、资源完整度尚未证明。
- **排除项。** 只有序列帧、免费预览不含资产、免费档不含骨骼、静态模型无绑定。

公开索引不等于本机已保存原始资产。分别记录 `source-indexed`、`payload-downloaded`、`rig-verified`、`import-verified`、`visually-accepted`。同一角色的多引擎导出、多清晰度贴图、多版本路径不重复算成多种动物。

每条记录建议保存：

```json
{
  "name": "角色或资源包名称",
  "source_url": "作者页面或精确仓库目录",
  "repository_commit": "固定提交，如有",
  "dimensions": ["2d"],
  "animation_method": "skeletal",
  "subjects": ["chicken"],
  "actions": ["walk", "attack"],
  "action_evidence": "author-documented / public-data-inspected / unknown",
  "rig_status": "file-directory-confirmed / author-documented / unknown",
  "skeleton_files": [],
  "atlas_files": [],
  "texture_files": [],
  "project_files": [],
  "free_scope": "免费档具体包含的内容；完整包/源工程可能另售",
  "acquisition_grade": "A",
  "recovery_route": "direct-project / runtime-resource / exported-package",
  "missing_dependencies": [],
  "license_source": "作者现有声明",
  "payload_status": "source-indexed",
  "reverse_engineering_status": "not-performed",
  "engine_import_status": "not-tested"
}
```

## 4. REA 的用途与边界

REA 是 [morluto/rea](https://github.com/morluto/rea)，官网 [rea.tools](https://rea.tools/)。项目提供 MCP 与 CLI，用于原生二进制、JavaScript/Electron、.NET 和网站调查。来源应引用上游，避免把同名 fork 当成原项目。

它适合寻找加载器、资源路径、模块边界、格式解析函数及相关证据。它不是“输入游戏就自动输出完整角色”的保证，也不保证恢复原始源码或编辑工程。静态 JavaScript 分析与原生分析依赖不同，按上游当前文档核对 Node、浏览器和 Hopper/Ghidra/IDA 等环境；不要把一次环境要求写成永久版本。

上游提供 `npx rea-agents setup` 与 `analyze-javascript-application` 等入口。储备阶段只记录文档与能力，用户要求实际分析后再按当前安装说明操作。不要为收录资产自动执行下载游戏、安装 MCP、改变全局配置或启动整个应用。

可复用调查任务：

> 检查指定项目的资源加载结构，寻找 Spine、DragonBones、glTF、FBX 或引擎骨骼资源的证据。返回精确文件/资源路径、格式版本、依赖关系和缺失项。区分直接公开文件、运行时导出数据、可编辑工程与未验证推断；不要将 GIF、截图或序列帧当成骨骼数据。

## 5. 后续实际提取流程

1. 固定目标、原始 URL、提交/版本、文件清单和已有来源元数据。保留原包，转换产物另存。
2. 有完整公开源文件就直接取用，避免无意义反编译。骨骼、atlas、纹理和网格作为同一个依赖集合处理。
3. 网站候选先检查已发布脚本、资源 manifest 和可见加载结构；索引阶段不用运行游戏证明 HTTP 成功。真正动态调查时按授权目标观察网络请求，不把猜测 URL 当成已发现资源。
4. 打包格式先识别引擎和版本，再选择解包/导出器；REA 可帮助定位加载和解析逻辑。不要承诺未知、压缩或加密数据必然能恢复。
5. 导出依赖关系与差异清单：原始工程、控制 rig、约束、根运动、动作事件哪些存在、哪些丢失。
6. 验证骨骼父子关系、skin/weight、动画时长、插值、图集页和 UV。只有文件扩展名不足以确认数据有效。
7. 导入目标引擎，再查看待机、走路、奔跑、转身、攻击、受击、死亡、施法的实际效果。技术解析通过和美术验收分别记录。

## 6. 常见问题与解决方向

| 问题 | 首查证据 | 处理方向 |
|---|---|---|
| JSON 存在但角色不显示 | atlas 页、纹理文件、路径大小写、skins/attachments | 补齐依赖并核对附件名，不用截图替换骨骼 |
| `.skel` 无法打开 | 导出版本与运行时版本 | 固定兼容版本，保留原二进制，转换结果单独验收 |
| 角色爆开/比例突变 | bind pose、inverse bind、父子关系、单位、坐标转换 | 骨骼和网格一起转换，避免重复应用变换 |
| 走路滑步或同侧腿一起迈 | 原动作相位、root motion、模型朝向、重定向映射 | 对照原动作；速度与步幅匹配，不靠上下抖动假装走路 |
| 换动作突然跳位 | 根节点位移、不同 clip 原点、缩放、动作混合 | 统一根运动策略，保留固定载具/角色尺度 |
| 骨骼有了但蒙皮没有 | mesh vertices、weights、bone indices、atlas | 标记不完整；静态分件不能冒充完整蒙皮 |
| 法术导出成 PNG 后不能改 | 原效果工程、曲线、材质、依赖 | 储备工程及运行时数据，PNG 只作预览/兼容导出 |
| 动物动画缺失 | 作者免费档、实际 clips、独立动作包 | “已绑定无动作”与“带动作”分开，不能套人形动作冒充自然四足步态 |

## 7. 本轮确认的来源范例

- [DragonBones 官方美术工程](https://github.com/DragonBones/Demos)：`.dbproj` 和分件目录；已有许可另行记录，不能拿运行时代码 MIT 代替美术许可。
- [DragonBonesJS 示例资源](https://github.com/DragonBones/DragonBonesJS)：可见 `*_ske.json`、`*_tex.json`、PNG 与部分 `.dbbin`；按角色去重，多引擎目录不重复计数。
- [Spine 官方示例](https://github.com/EsotericSoftware/spine-runtimes/tree/4.3/examples)：角色含 `.spine`、JSON、`.skel`、atlas 和纹理；免费评估示例不等于编辑器/运行时全部免费。
- [Charlottezxz 通用动物敌人包](https://charlottezxz.itch.io/free-generic-animated-dragonbones-enemy-pack-10)、[森林包](https://charlottezxz.itch.io/free-forest-animated-dragonbones-enemy-pack-10)、[沙漠包](https://charlottezxz.itch.io/free-desert-animated-dragonbones-enemy-pack-10)：三套各 10 个 DragonBones 战斗角色，包含鸡、鸟、兔、鹿、野猪及恐龙；预览 GIF 不用于证明动作尺度。
- [Quaternius 恐龙](https://quaternius.com/packs/animateddinosaurs.html)、[农场动物](https://quaternius.com/packs/farmanimal.html)、[动物动作包](https://quaternius.com/packs/ultimateanimatedanimals.html)：作者声明的模型/动画来源；下载档与 Blender 源工程范围分别核对。
- [KayKit 人物动画](https://kaylousberg.itch.io/kaykit-character-animations)：免费 FBX/glTF 动作与付费 Blend 源文件分开，不能把整套都标为免费源工程。
- [OpenGameArt 母鸡](https://opengameart.org/content/chicken-animated)、[公鸡](https://opengameart.org/content/rooster-animated)、[迅猛龙](https://opengameart.org/content/low-spec-velociraptor)：可获得 Blend/ZIP 的绑定和动画来源。
- [Effekseer 用户效果库](https://effekseer.github.io/en/contribute.html)：可编辑效果包；粒子工程独立归类，不计为角色骨骼。

本轮资产目录由 `game-asset-studio` 维护；经验仓库保存方法、模板和公开证据链接。未执行的逆向步骤始终保持 `not-performed`。
