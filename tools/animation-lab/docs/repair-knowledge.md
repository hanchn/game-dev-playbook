# 修复知识库

本轮记录：2026-10-12。技术通过与美术通过分开；收录和修改均不代表整个人物/整套动作验收完成。

| 问题 | 已观察根因与改动 | 实际证据与状态 |
|---|---|---|
| 蚯蚓截面/头帽 | 旧 sections 跨普通躯干、环带、尾帽切素材；v5 一张连续蚯蚓身体包含全部部位，取消额外头帽和跨素材切换 | [旧全角色证据](../examples/cast-review-v1/manifest.json)，[源注册](../examples/worm-side-v5/source-registration.json)，[走路](../examples/worm-side-v5/retest/walk-dark.png)、[收缩](../examples/worm-side-v5/retest/contract-light.png)、[抬前端](../examples/worm-side-v5/retest/raise-dark.png)、[钻地](../examples/worm-side-v5/retest/burrow-light.png)。已实际看16帧/动作：旧截面跳变在这些画面中消除；真实蠕动推进/土壤遮挡未完成 |
| 外星人肩袖/腕/踝 | v6 衣边矩形压在上臂前；前臂轴用横中线；旧靴直立皮肤筒不随胫骨。v7 限制衣边覆盖、注册斜向肘腕和腕根、同源低口靴由裤脚覆盖、肩内核缩小 | [v6失败](../examples/cast-review-v1/manifest.json)，[修改记录](../examples/human-alien-v7/binding-repair.json)，[走路](../examples/human-alien-v7/retest/walk-light.png)、[快跑](../examples/human-alien-v7/retest/run-dark.png)、[弯腰](../examples/human-alien-v7/retest/bend-light.png)、[实际UI t=.25](../examples/human-alien-v7/ui-run-phase025-dark.png)。这些范围衔接改善，整角色未签收，其他极限/抓握须复测 |
| 外星人翻滚 | [v7翻滚16帧](../examples/human-alien-v7/retest/roll-light.png)实际看图：头和腿挤叠，手臂支撑转换和恢复仍显突变；接地测试不能排除此缺陷 | failed，待重新编排大头角色团身姿势，禁止以其他动作改好覆盖 |
| 蛇形体/盘曲 | 老素材圆胶囊重复拉伸；v5绑定真实连续身体与独立头/下颌，新源v6去重复下颌；侧面盘曲目前仍近垂直环/长方环 | [源回执](../examples/generation-receipts/snake-side-v6.json)，[全角色基线](../examples/cast-review-v1/manifest.json)。coil failed，尚未整蛇通过 |
| 生图跑步没有摆臂/中间动作 | 第一轮及定点修版近臂重复、后半周期近远腿不清晰交换。8张不同PNG不是8个正确阶段 | [v1真实源/失败回执](../examples/generation-receipts/alien-run-v1.json)，[工具录制QA](../examples/frame-animation-v1/qa-report.json)。素材failed；新的姿势控制图与生图仍须实际检查 |
| 地图竖条和低缩放卡顿 | 图集分栏实际坐标与等分假设不一致；40可见块被24缓存挤出。按实源区域注册、连续随机采样、LOD、可见区缓存和Worker预算修复 | 地图维护者另保存首轮截图、同参数重测、rAF/绘制/加载耗时。主线程绘制提升不证明60FPS；尚待完整报告及用户截图坐标复测 |
| 鳄鱼/马/恐龙/鸡/节肢动物旧缺陷 | 各角色逐一修复，已有全动作与独立关节像素基线 | [全角色manifest](../examples/cast-review-v1/manifest.json)。不得把未看/未修角色标为通过；当前鳄鱼/马修复仍进行中 |

## 可复现路径

- `node scripts/render-cast-review.mjs`：生产 Canvas 全角色动作相位和关节极限基线，状态 not-reviewed。
- `node scripts/render-character-retest.mjs alien examples/human-alien-v7/retest-new`：生产 Canvas 16帧/动作，深浅背景；在 tools/animation-lab 目录执行，输出新的目录以免覆盖失败证据。
- `/lab/alien` → 选择动作 → 帧条选择对应帧 → 检视倍率/背景。完整装配保持不透明。
- `/frame-animation` → 选择样例 → 逐帧/慢速播放 → QA标记 → 录制/完整包导出；必须保留样例失败状态和真实源SHA。
- `/map-generator`：保留 seed/scale/style/x/y/zoom 参数，缩小/拖动后比较同视口耗时与真实像素。

## Skill 更新

- [sprite-art-qa](../../../skills/sprite-art-qa/SKILL.md)新增 [连续蒙皮与动作知识](../../../skills/sprite-art-qa/references/continuous-skins-and-motion.md)。
- [keyframe-generation](../../../skills/keyframe-generation/SKILL.md)：区分视频/真实生图/骨骼，录制与帧源证据由维护者更新。
- [infinite-map-generation](../../../skills/infinite-map-generation/SKILL.md)：实际风格纹理、来源工程、接缝与性能证据由维护者更新。
- [game-ui-suite](../../../skills/game-ui-suite/SKILL.md)：实际12页源素材/组件状态生产，不用规格SVG冒充成套美术。


## 长任务追踪

任务已创建，状态 active；[当前机器状态](../examples/repair-knowledge.json)与实际页面 `/art-qa` 的当前修复面板保持范围记录。导航入口覆盖角色、帧动画/拍摄、骨骼关键帧、2D地图、3D地图、全套UI和美术QA；2.5D须为2D素材视觉路径，不把3D正交取景当成完成。

### 薄三角网格的渲染横线

马v5头颈源图没有横网格，但[旧实际渲染](../examples/horse-side-v5/retest/idle-light.png)有明显横线。已证实质心径向外扩不能让宽薄三角的长边获得足够法向重叠；改为每条边等距外偏移 .25local、限制尖角的miter长度，并保留源alpha ownership mask。共享精确mask的Canvas/SVG 5项回归通过；[新马v6限定复测](../examples/horse-mesh-edge-v1/retest/idle-light.png)头颈横线明显消除。两次马姿势版本不同，不能据此宣称腿部前后对照通过；马全身与所有动作仍需实际UI复测。

### 新增帧动画质量要求

左右/近远与前后脚身份固定，按物种步态生成承重→离地→经过→落地中间帧。脸部身份、表情、视线与合理眨眼分别查；类人专用握拳/张手/抓握及持物组合有真实素材。每帧统一画布镜头比例锚点和接地基线，完整角色/道具运动留边，溢出裁切判失败；禁止逐帧自动fit造成尺寸跳变。已写入项目持久需求和sprite-art-qa技能，帧工具和生成流程由对应工作流继续落实。
# 2026-10-12：多演员、固定画布与世界语义

- `/lab/chicken-scene` 实际使用鸡 v3 源图，2–12 个独立身份、相位和朝向；已在实际 UI 切换12只，并下载和查看1280×720 PNG。当前仅行走/啄食/待机，不代表鸡的旧关节美术已经通过。证据 `examples/chicken-scenes-v1/qa-report.json`。
- 场景编排 `chicken-scene-core.mjs` 支持母鸡下蛋、公鸡打鸣与相向公鸡格斗掉毛的确定时间状态；seek 不重复生成蛋或粒子。所需母鸡/喙/喉部/羽毛素材及真实渲染仍待完成。多角色动作过渡插值骨角并重新算端点，不能直接插端点缩短骨段。
- 放大检视可以刻意截去其他区域；固定全身输出必须另查。马 v7 的1.65近景蹄出边不单独证明原生输出裁切，仍保留图中细杆和断点的美术失败。恐龙 UI 切换复用旧模块显示v5的截图已改名 `ui-stale-v5-invalid-identity.png`；reload后真实v7的髋膝比例、颈后尖刺另外保存并记为失败。
- 精确mask测试固定真实被邻件污染的旧恐龙v5源与asset，避免换成无mask新源后失去回归条件。当前角色binding和旧源mask回归是不同测试范围。
- `world-feature-plan.mjs` 全局确定性布局：建筑整地基25点查水与坡度，洞穴要求实际坡面，丘陵为地形标记，溪流严格沿基础地表下降并有最大长度。分块预规划一次，再使用共同全局高度修改；不可对已修改高度递归采样。位置 `validated` 只表示采样通过，视觉、实际对象、碰撞和引擎可玩性仍分别验收。
- 用户明确2.5D为2D精灵等距/斜视，不是正交3D；主题切换必须连同水、资产、环境与碰撞改变；城堡、村落、洞穴、溪流和山水地脉需实际实现。未来扩库不得复制未验收缺陷。


## 2026-10-12 · 实际鸡群成片与软体动作

- `/lab/chicken-scene` 真正使用 shared `captureCanvasSequence`。1280×720固定Canvas；每次记录冻结actor身份/相位/朝向/比例。每个PNG不可变bitmap与视频requestFrame相同，附末帧hold。技术验证和动作美术分别判断。
- `examples/chicken-scenes-v1/capture-v2` 是实际浏览器导出：75 ZIP文件（72PNG、contact sheet、movie、capture.json），PNG SHA全匹配/CRC通过；VP9解码73帧含末帧hold、5.994692秒、PTS递增/maxgap93ms、按相同序号全72帧平均RGB误差1.452/255、最大2.394/255。不是凭按钮文案推断录制成功。
- 保留`capture-v1`，3只鸡原固定.8比例构图过小。改为按场景人数预先选定比例（1排1.7、2排1.2、3排.8），整段不改变比例。`capture-v2/frames/043.png`自查啄食喙未到地面；多鸡位移未锁支撑脚，仍failed。下蛋不能用公鸡代替母鸡；喙/喉/羽毛仍须实际素材。
- `worm-side-v6`使用原连续源v5，体节长度变化与nominal直径平方互补，材料UV仍以rest段身份映射。[蚯蚓液压骨骼研究](https://journals.biologists.com/jeb/article/217/11/1860/12150/Scaling-of-the-hydrostatic-skeleton-in-the)支持伸长变细、缩短变粗的机制；当前幅度为动画假设，不是实测参数，也未实现摩擦锚定/土壤接触。技术volume proxy通过不能等于真实蠕动推进通过。
- 实际UI v6/walk/.25/1.65×/dark/不淡化与固定16帧已看。直身软体伸缩改善原上下摆动；前端外形/完整动作仍未通过。raise/burrow新帧已生成但未看，不继承前一版本验收。

## 2026-10-12 · 世界地基与水脉的一致性

- 发现不同chunk prepared features列表会让无关建筑weight0把前面有效delta覆盖0。现在只处理有效基础，基础优先于river carve，避免feature遍历顺序成为世界规则。
- plannerVersion2独立placement缓存；河源与河道候选段都避让周边9region完整castle/village地基+河半宽。独立stream-v2随机seed不依赖缓存RNG状态或邻region递归。全局IDs/负坐标/缓存逐出/相邻chunk/地基与河交叉回归已记录。
- `examples/development-tools/world-foundation-river-v2.log`24/24技术检查。新河布局改变，旧截图不能证明新地理布局美术通过；3D导出/水脉碰撞/建筑内部玩法分开验。

## 2026-10-12 · 颈根截面不能只锁位置

- 马v14真实graze失败暴露：头颈source下缘平移到neck轴，但截面仍随头90°转动，转出身体后出现横切/长方片。
- `neckMask.anchorOrientation:'body'`可选绑定把根部target设为`neck + rotate(sourcePoint-rootAnchor, body.angle)`，在neckMask权重内混合；权重0颅面刚性映射和默认旧行为保持。默认未全角色开启，需各角色源地标复测。
- `examples/development-tools/neck-parent-orientation-v1.log`31/31技术回归含head±120°、body90°、刚性颅面及真人贴图检查。马源实际graze同姿势视觉仍待复测，不据此宣布颈部修复完成。
- 最新鸡群`capture-v3`冻结实际解码的atlas字节和完整asset，避免同URL源文件更新后记录新hash而画面仍用旧Image。实际停止5帧保留、控件恢复和重录72帧均测；视频6.000577秒、73encoded（末帧hold）、maxgap88ms。`capture-stop-v1`保留取消证据。

### 鸡群场景编排 v3：真实位移、停止与多鸡穿插（2026-10-12）

入口 `/lab/chicken-scene`。旧固定28px来回位移忽略实际骨架单位经过 `design.size × frame.scale × actorScale` 才成为屏幕像素，造成行走支撑脚滑动、待机回滑。现 `chickenSceneFrame` 直接推导步态根位移，停步的 .8–1.0s 保持当时支撑脚世界x；行走→啄食→待机结束后hold，单场景不瞬移回起点。每只以独立开始延迟进入动作；延迟限制在2.4秒内，因此12只每只也会实际参与。首次起步的idle→walk源姿势过渡仍未通过，不能以稳定阶段的锁脚替代。

第一次新录像 `examples/chicken-scenes-v2/capture-v3` 的原帧060发现相向两只鸡头互相穿入。固定构图改同向鸡群，三只整段比例1.6、四只1.25；没有逐帧fit。最新实录 `capture-v4` 有72 PNG、VP9解码73帧(含末帧hold)、5.997910s，CRC/SHA通过；真实源帧026和060已看，旧穿头消除但啄食喙仍明显离地。1–12只全部参与和73相位的源clip包络在固定1280×720安全边界内，仍只计技术验证。实际UI截图 `ui-flock-v3-delay-layout.png`；focused-regression.log 35/35。最新执行编排版本3写入receipt，完整scene含固定构图、身份、相位、朝向，原失败录像全部保留。公母/喙/羽毛新源未完成，不把公鸡加蛋称为完成下蛋。

### 颈根的源边界是斜向（2026-10-12）

共享头颈蒙皮增加可选 `neckMask.startSlopeU`，默认为0。它按源u延迟父躯干权重开始位置，允许后颈与前喉不同锚定深度；根截面方向、颅面刚性和旧默认均有回归。马资产候选由美术 agent 实际独立/极限复测决定启用，不因这条数学规则或测试通过宣布颈部通过。

新鸡源已经落盘：`public/art/chicken-hen-parts-v1.png` 与 `chicken-hen-skin-v1.json`（独立母鸡16件）；`chicken-performance-extras-v1.png/.json`（匹配闭/张喙头、喉部、两羽毛、蛋、巢8件）。根实际查看两张完整源PNG，两个JSON路由200。新源不意味着动作成片通过：母鸡脚底基准7.124px需要独立替换旧公鸡8.13，喙两状态用同像素尺度+eye配准/3px手工估计，巢3/4视角需与场景复测。12只真实UI原生PNG导出 `examples/chicken-scenes-v2/ui-export-12-chickens-phase190.png` 已看，12只完整、相位不同，啄食接地缺口同样保留。

### 2026-10-12 · 鸡专属场景的真实素材与实录候选

`/lab/chicken-scene` 现有鸡群、母鸡下蛋、公鸡打鸣、双鸡格斗掉毛。公鸡v4/母鸡v2分别注册实际喙点、近远足底，不共用旧8.13px基准；最低啄食接触与抬头恢复要分开审核。下蛋先蹲窝（bodyDrop30，固定两足重解IK），蛋单次从身体后方进入窝、旋转躺下、前沿遮挡；旧12px蹲姿仍站在窝外，已实际看见并改。打鸣新闭/开/中间头保留原生aspect并按eye配准，每档独立pixelScale，嘴打开扩大bbox合理，不强制四源bbox相等；新源头颈高差约1.2%与羽毛纹理仍需修。

编排v5/renderer4真实UI录制 `examples/chicken-scenes-v3/{lay,crow,fight}-capture-v2` 保存源atlas不可变byte SHA、skin JSON与全assets、实际每帧nodes和道具canvas坐标。60/36/48 PNG各有一个额外encoded terminal hold，时长5.004316/3.001885/3.998827s；CRC/SHA及全帧视频解码像素MAE最大2.013/255，PTS最大偏差22.667ms。完整影片、逐帧、解码、fullpage UI与失败在qa-report.json。坐窝行为参考 [Extension](https://poultry.extension.org/articles/poultry-behavior/normal-behaviors-of-chickens-in-small-and-backyard-poultry-flocks/)；5秒仅是游戏压缩编排，不冒称真实产蛋时间。

仍failed：母鸡颈部扇形下缘、腿根肉盖与黄杆材质；四档头纹理变化；格斗缺少不同受击反应和爪源，喙接触却掉翅羽目标不一致。起跳用有明确起落的抛物线，曾用升起/落下smooth中间平台形成悬浮，已撤换。羽毛生成时锁住1.3秒的源部位世界坐标，不能每帧跟随当前翅膀重算出生位置，否则离体颗粒仍粘翅。两角色真正相向接触与鸡群同向防穿头是两种编排，不相互借用验收。

### 源UV斜向分层与真实UI性能

马v19实际源鬃点u=.02–.10/v=.57–.70已受躯干权重控制却仍被固定head.end=.70画到前层，形成背上黑条。`partitionSkinLayer` 在同一fullmesh按源v=start+slopeU*u分所有权，保留同一affine映射及重叠区；不再借不同网格横切。v20源layerSplit .48/.5/.03后旧黑条被torso遮住，鬃根硬端仍failed。

只凭负Jacobian细分无法修真实fold，旧12974tri/26–36ms膨胀；仅新layerSplit采用横向32采样及垂直误差细分（容差.4rigpx），降2822tri/8–13ms。1974个实际precision组件中心、6个graze相位与完整warp比较最大误差.17361rigpx；测试预算<4000tri/max误差.25，不能代替连续曲面美术判断。首次全回归发现蚯蚓hydrostat被关键帧fixed length重建丢失端点（full-regression.log），保留原length/体积插值后full-regression-retest.log264/264。

实际UI仍卡的另一根因是只对softSkin启Canvas：马continuousNeck仍每帧巨SVG。现主舞台continuousNeck同用Canvas，16thumb改固定camera Canvas逐RAF生成，版本任务取消防旧角色混入。实际旧3秒timeout→.512秒动作切换、2.2FPS/P95 933.3→13.1FPS/P95 135.4；含加载和后台影响，非稳定60FPS。截图与失败残留在horse-side-v20，不能只用Node耗时宣布高可用。

## 鸡场景编排7/渲染5：实际复测后的新增纠错

固定1280×720三片已实际重新拍摄；[新报告](../examples/chicken-scenes-v4/qa-report.json)和旧v3全部保留。公鸡v4/母鸡v5；三场景60/36/48 PNG，VP9各多1末帧hold，最大RGB MAE2.016/255、时序偏差19ms。273/273技术回归见[实际日志](../examples/chicken-scenes-v4/full-regression.log)。

格斗之前双鸡同步悬空、松直腿、无独立受击，实际UI失败。新版在首次接触后只让受击方后撤/收颈，腾空IK收腿不改变骨长，落地tuck归零；掉轮廓羽从实际颈部接触位置脱落，移除了没有第二次攻防的恢复弹跳，扑翅起止经角度插值收回idle。完整影片与原生帧已看，材质/力度仍failed。

母鸡候选新atlas即使只要求修腿也会改变其余头身1–7px。用`skin.sources`和`tile.source`只消费新腿件，实际decode字节哈希独立冻结、SVG/Canvas明确源身份/原生尺寸，缺失不回退；其它14件继续旧源和旧metadata。正常不透明坐窝1.50s仍发现前胸孤立金黄鳞块和卵状股件，单独源比例改善不能当装配通过。记录真实层关系/折叠关节位置，继续复测。

验证脚本 `node scripts/verify-scene-capture.mjs examples/chicken-scenes-v4/fight-capture-v2` 检查PNG/影片/原图/内嵌配置SHA，实际ffmpeg解码与像素差及时序。ffmpeg新版本用`-fps_mode passthrough`，旧`-vsync`已不可用；保留第一次命令失败，不误说视频故障。技术报告默认not-reviewed，实际审核后另写具体失败。

### 母鸡v6与混合鸡群8的原生成片复测

真实UI坐窝3.25s与起身4.4s确认：新腿羽毛段置于原躯干后层，前胸金黄鳞块与卵状股件消除；源件14个旧映射保持，蛋起身后露出。`examples/chicken-scenes-v4/lay-capture-v2` 60PNG、61视频帧、4.999801s，max RGB MAE2.014318/255。踝部金色结节、腿比例仍failed，旧v5失败源与影片保留。

鸡群新增全母鸡/全公鸡/混合（1–12只），实际足底地面基准线。`mixed-flock-capture-v1` 编排8/渲染6，72PNG、73VP9帧、5.990935s，max RGB MAE2.327899/255、PTS误差8ms。已逐帧看完整表，三只角色分别行走/啄食/抬头，但起步idle→walk缺乏过渡、母鸡踝材质与比例仍失败。电影原图/内嵌skin/完整asset字节SHA与ZIP CRC通过，不能当成美术验收。

### 鸡群起步9：接地须覆盖动作边界

编排8已实际看完整影片，延迟结束仍从idle突切walk。编排9在前.2s补角度过渡，并以idle实测足底y重解首支撑腿原骨长IK；身体根位移从idle足x减当前足x推导，过渡后的匀速和停步均继承同一起步offset。只插关节角仍可能使足底沿圆弧穿地，不能当作锁脚。19/19技术复测含公母两朝向、起步200采样、前后1e-6s边界无突跳、1–12角色完整输出安全范围。实际UI .10s与新影片证据保留在chicken-scenes-v4；腿材质/比例仍需修，不因新起步通过宣称所有美术验收。

新编排9影片 `mixed-flock-capture-v2`：实际正常播放器已播放1280×720，72PNG+73VP9、5.985484s；全部原帧整表已看，max RGB MAE2.290161/255、PTS13.333ms，CRC及源/PNG/视频SHA通过。腿结节/比例与天然材质仍failed。

### 外星人翻滚：姿势数值与真实人体支撑不能相互替代

四组同512×512、anchor256/440、scale1.7候选的全部16帧实际看过，记录在 `examples/human-alien-roll-v8-candidates/receipt.json`。原100°脊柱+25°/75°下巴曲线把头折进腿；curl48虽投影重叠为0，却把后脑当接地轮，仍失败。保留默认v7，候选参数没有注册到生产资产。不能通过放宽“头不接地”测试把低重叠候选算作自然翻滚。诊断角度明确拒绝非有限数字，0°不产生NaN。

实际 imagegen 16格原图两版均1254×1254，不满足整格且第一站姿越过行框；改为单帧后中立v1仍3/4视角，v2改一眼侧面，触地key4却把头放大且最低opaque像素1122，固定地面1199，偏离77px。原源、提示词可恢复程度、所有输入/输出SHA保存在 `examples/alien-direct-roll-v1/generation-history.json`；前三/四次只有历史摘要，明确不伪称完整原始arguments。相同1:1对照 `fixed-source-registration.png` 仅为检视图，不进素材库，不以逐帧auto-fit掩盖差异。

透明预览上的红/黄边须先核alpha。五源RGB红像素存在，但alpha>24的红像素全为0；原始RGB脏数据不等于真实opaque光边。`scripts/audit-alien-roll-source.mjs` 保存原生尺寸、alpha边界、留边、整格可分性与实际地面偏差，并在浅底按alpha正确解码比较。

### 鸡打鸣10：实际音轨与动作同一拍摄时钟

使用 [Filo gèn' 的真实公鸡录音](https://commons.wikimedia.org/wiki/File:Rooster_crowing.ogg)，保存原OGG及SHA；原速截 .94–2.84s、mono48kPCM16、10/20ms首尾fade，未拉伸或改音高，源变换记录 `public/audio/rooster-crow-v1.source.json`。场景.8s开声，2.6–2.8s收喙，运行gain−6dB。声音预览的暂停/拖帧/重播与拍摄分别拥有BufferSource；拍摄只克隆输入音轨，finally停止录制克隆及自己的声源。音轨不可用须报错，禁止悄悄导出静音片。

编排10/render6真实UI拍摄、下载ZIP CRC通过、播放器实际播放与全部36PNG已看。`examples/chicken-scenes-v5/crow-audio-capture-v1`：37VP9+Opus、2.999495s，解码non-silent interval .86–2.43s（RMS>.01）、PNG电影maxMAE1.947907/255、PTS8ms。音轨WAV SHA冻结在同一ZIP，实际音频需从成片解码核验，不凭MIME或按钮声称有声音。人工听觉自然度仍not-listened；腿结节/嘴型下颈材质仍failed。

首次全回归暴露两个实际问题，失败日志保留在 `chicken-scenes-v5/full-regression.log`：native Canvas依赖需显式测试runtime；马源v23组件中心误差.34963rigpx超原.25。保留原阈值，layerSplit纵向细分容差.4→.2修复，不能用增加横向列数掩盖纵向误差。带runtime全回归结果另记后续日志。

### 打鸣声开始前取消拍摄（编排10 / 渲染6）
- 实际 UI 取消导出4PNG、0.298148s视频，含Opus轨但PCM RMS=0；源录音在−6dB下有声期对应场景0.85–2.42s。应记expectedSilent=true而不是音频故障，更不能因有音轨显示“带声音”。已改界面提示并保存 ui-crow-cancel-before-cue-fixed.png。
- 最新完整actual ZIP (5)导出36PNG、37视频帧、3.002010s；非静音期0.87–2.43s，最大PNG/视频RGB MAE1.947907，PTS最大误差23ms。它不同于前轮8ms，不复用更好的旧指标。声音自然度尚未人工听审。
- 原完整回归292/292（full-regression-with-runtime.log），之后编码器构造失败清理新增用例和定点测试25/25（targeted-final-regression-retest.log）。失败首轮和旧输出均保留。
- v11地图终点及自然远景root实际看图：终点盆地与河面连续、城堡墙身恢复；岸坡UV拉伸、方盒城堡和机械植被仍美术失败。

- 本轮后续地图/帧动画及拍摄错误清理改动一起复测：full-regression-final.log 296/296，无skip；QA路径索引17353（当时快照）。技术通过与角色视觉失败分别保留。

### 2026-10-12 鸡动作与外星人翻滚后续自测

- 当前公鸡6/母鸡7改为多源真实腿素材；普通公鸡6颈根遮挡与映射已独立复测，当前格斗编排11/render7收腿→近远脚不同踢爪轨迹→再收腿→1.9秒连续落脚。仅技术回归通过；颈胸明暗界、腿偏细长、格斗接触力度仍美术失败。默认未启用 `chicken-crow-partition-v1` 的三组斜分层候选，root看实际原生图改善不显著，保留未采用证据。
- 格斗 fold-v1 原生候选脚仍主要垂向伸出，fold-v2改为前向出爪后收腿，root实际看0.8/1.0/1.15/1.3/1.5/1.7/1.9等阶段，不声称整场景合格。31项鸡场景与源图针对回归，随后full-regression.log305/305无skip。
- 外星人生产asset8保持原source4原字节与bone长度，目标总躯干旋转扣除局部脊柱弯曲，修复过转后回摆；palms reach through curl、恢复手臂另按世界角连续驱动。42项人形针对回归、原8非roll动作264序列pose未改变。v9–v12候选原图/receipt失败保留；头腿轮廓重叠改善，但团身和起身仍机械，美术failed。
- 同外星人的骨骼37采样帧实际接入帧工具，35个不同PNG，index9/10/11为触地停顿重复画面；不要称37不同姿势。真实UI导出1.234362秒，37PNG+38视频帧(一个终点hold)，PNG对原生解码最大MAE1.127042/255，四源实际字节SHA匹配；直接生图翻滚失败素材仍未注册，不宣称两种已同时美术通过。来源/影片见 human-alien-v8/frame-sequence/browser-frame-tool。
- 地图root实际看v12城堡与河终点图：33真源模块更接近城堡，陡岸明显UV拉伸改善；岸硬折、散点植被、标准GLB缺自定义triplanar仍待修。已安装infinite-map skill是repo符号链接，本轮版本更新同步生效。
- 当前格斗导出首次用下载目录最新文件名误选历史编排7/render5包，保存 chicken-scenes-v6/fight-capture-v1/NOT-CURRENT.json；这份核验不能代表新版。后续下载必须等真实浏览器download事件路径并assert新manifest版本。

### 鸡场景编排11 / 渲染7：实际成片与最大鸡群复测

当前公鸡6/母鸡7的五组真实浏览器视频及逐帧包汇总在 [当轮报告](../examples/chicken-scenes-v6/qa-report.json)。从 `/lab/chicken` 的“鸡群、下蛋、格斗掉毛与打鸣 →”实际点击进入 `/lab/chicken-scene`，保存已加载源图和版本的界面。下蛋60 PNG、格斗48 PNG、打鸣36 PNG，各实际解码比源多一个末帧停留；视频时长分别5.000359、3.994346、2.994031秒，源/PNG/影片SHA核验独立通过。打鸣解码有声期0.87–2.43秒；人工听觉自然度仍未听审。

首次9只混合鸡拍摄虽然有72张正确PNG，却仅编码37个视频帧，证据与 `validation-failure.json` 保留。根因是采样绘制9只角色后，预览回调又完整绘制一次，单帧预算被重复占用。改为直接显示同一不可变采样位图，拍摄期间停止普通舞台重绘及遗留预览声音；不能以源PNG完整或requestFrame调用数量宣称视频完整。

实际重新拍摄9只与12只混合鸡分别取得浏览器download事件的真实文件路径，核对编排11/render7/preview2、公6母7。两片均72 PNG和73编码帧，PTS最大误差4.667ms；原图/影片最大RGB MAE分别2.404328、2.652770/255。12只实际影片5.930352秒，较请求6秒短69.648ms，小于一个12fps周期，保留实测值，不声称精确6秒。全部72源帧整表、正常播放器到结束与原生第37帧已看；1–12数量的独立相位和最大画布分别检查，不复用三只鸡的性能数字。

拍摄预览优化后36/36鸡源、编排、渲染及声音资源定点回归通过；前轮完整305/305日志单独注明执行范围。五组成片均仍美术failed：啄食极限颈折叠、腿黄色结节及细长比例、格斗接触力度与材质未完成。数值、字节和完整编码结果不能覆盖这些视觉缺陷。新知识同时写入 `sprite-art-qa`，全球skill符号链接同步生效。

## UI 实际成像 layout3：规划尺寸与真实组合分别测

当前恐龙套件保持12源PNG及其SHA，不靠再次生图修布局。原生手机740×360、insets16/44/16/44、大字1.35发现：实际暂停按钮仅约30px；组件viewBox缩放让标签继续偏小；主页眉题重叠标题；返回遮住01节点标签。保存baseline和首次浏览器包，再改真实SVG外层命中区最小48、外层字体、横屏弹窗两列、眉题间距和返回位置。每页实际看PNG，不能以plan中的48声明通过。

最终浏览器download事件取得整包(3)，12页/73状态/12源/111清单文件SHA和字节无差异；单页level-select-full-ui.png与整包对应PNG字节相同。预览和单页/整包冻结相同设备尺寸、安全区、文字倍率及源字节，CLI支持同参数。Unicode锁与操作图标改明确SVG路径并实际看状态，属于渲染派生，不是额外imagegen来源。30/30定点回归通过；313/313完整回归执行在最后glyph/key-handler修改之前，不能冒称新全量。root键盘Space暂停/Enter恢复及页面流仅在开发预览实测，未冻结真实游戏世界。

[根QA报告](../examples/ui-suite-art-mobile-v3/qa-report.json)保留当前源码SHA、失败/复测、12页和73状态；长任意文案、物理设备及游戏接入未验收，整体产品仍未通过。


### 2026-10-12 恐龙单骨源与缺图恢复

带膝弯的源图绑定到多段骨链会额外折一次；v13只替换三段腿件，旧头身脚尾保留。动作曾硬编码骨长，已改读实际dimensions；默认328姿势完全一致的验证属于改绑定读取时的v12，不属于后续v13比例修改。32真实关节检视及七动作112帧边界通过不覆盖脚的修长感、厚脚爪、颈尾和跑跳的美术失败。

附加图失败时不能先发布主图缓存；角色全部解码后才发布，错误界面保持切角色和重试可用。文件服务读成功再发200，实际缺源404不应杀死进程。第一次网络失败/第一次恢复失败与真正404恢复成功分别留证，误名截图不能算通过。查看器显示实际消费的多源槽位；连续网格替代的原件不能错误列入。经验已写sprite-art-qa引用，源字节和全QA路径保留。
