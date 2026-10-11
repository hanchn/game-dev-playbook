---
name: keyframe-generation
description: 为 Codex 游戏开发做视频抽帧、真实 imagegen 帧动画与位图序列导出；骨骼关键姿势编辑作为独立分支，记录原视频/图片来源、时序与实际视觉 QA。
---

# 关键帧开发辅助

## 先判断用户说的“关键帧”

- 视频抽帧/逐帧动画：用 `/frame-animation` 或 `scripts/frame-animation-cli.mjs extract`，真实解码本机视频并保留源 SHA、采样时间和原解码 PTS。
- 直接生图帧动画：构造 `imagegen-frame-request`，实际调用内置 `image_gen.imagegen`，保留真实返回图、prompt/tool/SHA 来源；导入图集/图片序列后按时间播放、导出 PNG + 时序 JSON。不能用骨骼姿势 JSON 或骨架渲染冒充生成图片。请求导出尚未生成素材；网页本身不调用生图服务。
- 连续生成视频再抽帧：可在已授权角色动画制作范围内使用 `rh-canvas` 技能；真实图片附件须实际上传/绑定并保存SHA，先核对免费窗口和零价估算，只提交一次，保存taskId并查询存活状态。结果用实际FFprobe时长/分辨率/帧数验收，再进入同一视频抽帧工具。视频原背景保留，不能冒充透明imagegen帧或骨骼渲染。原任务SUCCESS只说明生成完成，不代表运动/脸部/画面注册合格。
- 关节关键姿势：继续下文的骨骼编辑工具 `/keyframe-generator`；局部角度和骨长的数据属于这个分支。

用户要求抽视频或帧动画时，不应默认转成骨骼姿势工具。详见 `tools/animation-lab/docs/frame-animation.md`。使用帧 CLI 的 `extract`、`pack`、`split`、`request`，输出新目录且拒覆盖。逐帧动作、角色一致性与循环接头须看实际 PNG/播放；技术测试不等于美术通过。

```sh
node tools/animation-lab/scripts/frame-animation-cli.mjs extract --input /absolute/path/action.mp4 --fps 8 --start 0 --end 2 --loop --output /absolute/path/action-frames-v1
node tools/animation-lab/scripts/frame-animation-cli.mjs split --input /absolute/path/imagegen-sheet.png --columns 4 --rows 2 --count 8 --fps 8 --receipt /absolute/path/receipt.json --output /absolute/path/imagegen-frames-v1
```

来源记录以真实输出 SHA-256 绑定 `tool/prompt/generatedFile/generatedFileSha256`。用户提供来源声明只能记作声明，未经真实工具调用不能宣称 AI 生成已验证。图集整数分格保留奇数尺寸全部像素，不修复错误图格。视频背景保留，浏览器 seek 在无 mediaTime 时记录 `decodedTime:null`，CLI 使用原始 PTS。记录每个 QA 入口、源哈希、成功/失败及实际截图路径。

生成视频来源使用 `samples[].video` 和独立receipt，浏览器验证实际MP4 SHA后再抽帧，保留原始背景/真实mediaTime/源failed。CLI `extract --video-receipt PATH` 在创建输出前核对原视频SHA/tool/prompt，把已知美术失败传至每张帧图、图集和录像。实际107帧外星人视频全图查看后，仍有远手变形、过频眨眼、视角转身和首末不闭合；不能因纹理比逐张稳定就扩大成全片通过。

浏览器 HTMLVideoElement seek 是近似抽帧，不能保证四舍五入PTS边界对应精确帧。本次真实WebM复测包含边界取上一帧，+5ms内区的一帧仍取上一画面；记录actual decodedTime与实际像素匹配并保留失败证据，不能暗中偏移请求时间。必须严格选择源画面时使用FFmpeg/FFprobe原解码帧索引；未经原生像素比对不声称精确抽帧。请求4秒的视频实际4.458333秒，提示时长也不能替代实测。

## 跑步序列的实物验收

只写“左右交替”不能保证生图执行。先制作代码原生的姿势控制图，明确近侧/远侧颜色、肩→肘→腕链和髋→膝→踝链；控制图只作为生图参考，不充当最终帧动画。身份参考与姿势参考分别声明用途。12–16 个不同姿势需覆盖着地、承重、经过、蹬离、回收、高膝、腾空与落地前过渡，第二半周期互换支撑侧，不只是两种极端姿势重复。

逐帧检查实际输出：同一近侧手腕相对髋轴必须出现明显后摆、经过和前摆；同侧肩→肘上臂与髋→膝大腿应检查反相，不能仅凭屈肘手腕/拳头在前方推定上臂正在前摆。旧alien控制02/08近上臂和近大腿同向，说明控制自身也会错；局部跟随控制不能过自然度。远侧臂腿不能第二半周期继续原姿势。手腕像素地标应记录人工定位/可见性；单凭控制图数值、哈希不同、PNG帧数或文字phase不能证明输出跟随姿势。看完整循环与首尾接头、落脚基线、头身比例和细节漂移。失败版本与定点修复版本并存，prompt、身份/控制图/输出SHA、逐帧证据和真实回放路径均登记；最多一轮定点修复后仍失败，就报告具体未满足项，不能自动推广成生产素材。

控制图也必须验收源骨长和IK分支：同一近/远根、各骨段长度固定，双侧膝盖使用一致正确的前向分支；人工随手画四姿势会使腿/臂长度改变。记录数值误差并看实际图，未通过的控制不提交。即使控制通过，不能推定模型一定遵循；源视频全帧另验手指/脚趾数、轮廓、原场景包络和首末姿态。

同一批次失败后可以改变生产方法继续任务：先逐张生成 0/25/50/75% 四个关键姿势，分别带身份与单帧姿势控制；在实际四张近/远臂腿身份、支撑侧交换通过后补经过与腾空中间帧。不能把一轮失败当成用户目标终止，也不能继续重复整格提示碰碰运气。控制图自己也须检查远侧手脚的可见空间；重合的图示会鼓励输出省略远侧肢体。

每次出图使用同一 camera/canvas/角色 scale/pivot/脚底线，先规定最大运动范围和留边。原始图格或独立 PNG 的 alpha>=24 边界检测必须发生在补边/导出变换前，触边的透明角色记失败；alpha<24 的杂点另记，不凭原始透明预览中的 RGB 杂色猜测真实合成边缘。opaque 视频画面贴边不等于角色裁切。整个序列导出、舞台播放与拍摄使用共同 source canvas、scale、offset 和 anchor；异尺寸来源从同一坐标原点补透明，不按每帧人物 alpha 包围盒自动缩放、居中。JSON 保留固定变换、原始尺寸/alpha边界与真实裁切故障，补边不使源图故障自动通过。

对人/拟人角色标定永久近/远腿身份；对四足动物另标近前、远前、近后、远后，按真实物种步态检验抬脚、承重、经过和落地，不照搬人形左右交替。记录脸部/眼睛地标与视线、合乎动作的表情和眨眼，不允许每帧换脸或换眼大小。短跑步周期不强制眨眼；可制作较长 idle 的独立眨眼序列，眼睑开→半闭→闭→开，脸部身份保持。二足奶蛙按用户拟人设定用两腿动作，不能套真实四足蛙步态。实际帧、原视频或可信物种运动来源才是验收依据。

类人角色的持物动作须先有匹配的手部素材/真实帧：张手、握拳、抓握瓶/刀/枪，再逐步做触握、持握、松手和使用动作。不能把松开的手叠一道具当成抓握。检查拇指与其余手指环抱、掌心接触、腕部角度、道具穿插和近远手遮挡；道具与手身份连续。站立、walk、run、jump、punch、squat、bend、roll 及持物组合分别以真实来源帧验收，不一次泛生整套后宣称通过。

逐张定点编辑并不保证未编辑区逐像素一致：本次 phase02/08 passing 手位修对，但头、皮纹与比例同时变化。每次修复必须重新检查全帧注册与身份，不能只看目标关节就签收。混合 v5/v7/v8 文件名会按版本数字排错；有独立来源清单时使用 `pack --sequence-receipt` 按清单明确时间顺序，不靠文件名隐含 phase。

## 骨骼姿势分支

用于当前仓库 `tools/animation-lab` 的真人、外星探索者和动物资产。先读项目需求与 `skills/sprite-art-qa/SKILL.md`。这项工具是 Codex 可调用的开发工具，网页是实际贴图审查界面。

## 生成与编辑

```sh
node tools/animation-lab/scripts/keyframe-generator-cli.mjs generate --species human --skin alien --clip run --count 9 --output tools/animation-lab/examples/keyframe-generator/alien-run.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs edit --input tools/animation-lab/examples/keyframe-generator/alien-run.json --edits /tmp/keyframe-edits.json --output tools/animation-lab/examples/keyframe-generator/alien-run-edited.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs validate --input tools/animation-lab/examples/keyframe-generator/alien-run-edited.json --output tools/animation-lab/examples/keyframe-generator/alien-run-check.json
node tools/animation-lab/scripts/keyframe-generator-cli.mjs export --input tools/animation-lab/examples/keyframe-generator/alien-run-edited.json --format json --count 32 --output tools/animation-lab/examples/keyframe-generator/alien-run-poses.json
```

参数 JSON 使用 `sprite-keyframes` schemaVersion 1。`asset` 记录角色、皮肤、来源资产和图集；`frames` 时间从 0 到 1，递增且唯一，包含父级局部坐标/角度（弧度）及固定骨长。详见 `tools/animation-lab/docs/keyframe-generator.md`。外星人用 `--species human --skin alien`，其他角色用对应物种标识。

编辑 JSON 是数组，例如：

```json
[
  {"op":"rotate","keyIndex":2,"partId":"arm-0-upper","degrees":-15},
  {"op":"insert","time":0.35},
  {"op":"easing","keyIndex":2,"value":"ease-out"},
  {"op":"close-loop"}
]
```

`rotate` 是角度增量；父关节变动时下游跟随。`translate` 只修改整体位移，不改变骨长。`close-loop` 复制起始姿势到结束端点，随后须看完整循环自然度。禁止通过改 `length` 拉伸骨段填缝。当前资产骨长改变后，旧时间轴验证会失败，应重新采样后迁移编辑。

## Codex 工具接口

可直接调用 `keyframes_create`、`keyframes_edit`、`keyframes_validate`、`keyframes_sample`；参数与 CLI 使用同一 JSON 格式，详见使用文档接口表。`applyKeyframeEdits` 返回新时间轴，不修改调用方入参。

## 导出与检查

`validate` 验证层级、有限数字、当前骨长并采样检查接头及循环端点。通过退出 0，数值质量未通过退出 2，输入错误退出 1。该报告视觉状态始终 `not-reviewed`，不能作为美术通过。

`export --format json` 输出可用于游戏引擎的角色局部节点姿势、固定 fps 与时长。`--format svg` 导出嵌入当前真实贴图的固定 512 px 帧图集；网页 `/keyframe-generator` 可导出透明 PNG 与同名姿势清单。检查输出留边，再导入游戏。

独立看正常/慢速播放、每个弯曲极限、深浅背景、接地和循环末首。保留失败和同姿势复测截图；把 QA 路径登记到项目总索引。插值不提供 IK 锁脚、碰撞、物理或解剖修正。编辑结果不能自动升级为角色原有美术 QA 通过。

视频与序列帧网页支持“拍摄动作”：真实 Canvas / MediaRecorder 输出视频，同时按同一时间轴固定 FPS 采样 PNG，并打包视频、单帧、图集和时序。视频编码 PTS 为浏览器 wall-clock，必须实际 FFprobe 检查时长与帧数，并解码核查不同画面与首帧，不能凭导出按钮通过。终止 hold 与固定 PNG 采样分开记录。源素材失败状态与逐帧 QA 必须传到录制包。内置外星人生成动作样例由真实 imagegen 来源 SHA 绑定；待审查/失败仍可演示，但不能升级为游戏素材通过。

原项目已有帧可以作为真实播放/拍摄基线，使用 `origin:existing-project` 和 `existing-project-frame` receipt，保留原图 SHA、原 mapping SHA、sourceRect、offset 和共同画布；UI明确“原项目已有帧（非新生成）”。源 cell 的 alpha 触边在裁后补边前检查，本次奶蛙底行9/2/6像素触边被原偏移补边隐藏，必须保留 failed。源 PNG 不改，逐帧独立fit不能治愈裁切。拍摄 fractional FPS 的每帧时间边界须数值测试和实际重录；本次12fps旧最后帧重复source10，保留完整失败包，修复sub-microsecond浮点比较后逐源0..11真实重录通过技术检查。

骨骼蚯蚓 liquid hydrostat 与固定骨长不同：长度随姿势变化，直径按体积约束重建，宽度也须验证，不可仅跳过worm长度测试。固定骨架仍使用原固定骨长检查。

奶蛙逐张四关键探针证明：只给原身份+单骨架仍可在50%复制前景腿，导致近臂/近大腿同向而远腿没有接管支撑。可靠QA须看髋根前后遮挡和永久大腿身份；该失败保留后，以腿身份正确的25%为编辑源，明确“近大腿保持左/后+折小腿，远大腿右/前+落脚”局部纠正。近手open/远手fist身份保持，比只写左右互换清楚。四帧均生成不等于动画完成；相同1254画布仍有contact sole1192/1210地线18px误差，必须failed，不能按每帧底线自动位移隐藏源注册失败。先通过极端关键姿势/接触位后再补承重/经过/蹬离中间帧。

实际奶蛙12帧中间图验收又发现：相邻帧编辑能补足承重/经过/腾空，但“保留双臂”会令3..7手臂在前摆峰值停太久，7→8→9再突然变向；12个不同SHA与phase标签不能证明运动平滑。承重脚必须从接触前方回到髋下再向后蹬离，不能承重帧持续重复前置脚。frame7局部移动远脚后近腿曾退回蹬离，必须全帧复核再修回近腿回收；局部改善不自动通过整片。指定脚底1192的编辑实际把1207抬到1173，反向19px修复又降到1204；原提示精确坐标并非输出精度。保留这些源失败与实际RGBA测量，不靠逐帧fit，头身材质也重验。正常/慢速真实录像均验证PNG与原生视频一致；慢速48采样PNG只是12原始姿势各hold4次，不能宣传48新中间帧。

后续源3/7定点改肩→肘→腕整条链才开始减少过早峰值和延迟回摆，不能只推手腕过髋线。循环末帧可用首帧作原生参考生成落地前小过渡：奶蛙实测11sole1168→0sole1192的24px下降改善末首，但仍重验全身材质。用拍摄循环圈数2把末→首实际录进同一影片，而非单圈影片外拼首末。循环边界也有浮点错误：累计分数帧长可能让整数循环时刻落入末帧，测试要覆盖多圈与前1us，保留原失败再修。2圈24PNG或慢96holdPNG依旧12原生姿势；不能报新增帧数。所有局部改善、其余19px支撑地线失败与材质/3→4/8→9运动跳均分别记录。

骨骼渲染帧使用独立来源 `origin:skeletal-render`；不得套 imagegen 标签。每帧 receipt 的 kind=skeletal-render-frame、tool=renderCanvas、species/skinId/action/frameIndex/phase、实际PNG fileSha256、固定画布/anchor/scale，以及atlas/asset/motion/renderer四类源快照 SHA 均保留。UI 和 CLI pack 实际读取四源字节并核SHA，篡改任一源必须拒收；快照只能证明与声明绑定的字节完整性，不自动证明重渲染等价或美术正确。renderer可为实际模块文本JSON快照以符合本机静态路由。样例明确“骨骼渲染序列（非生图）”，导出与录像保留 failed。实际37采样帧可能仅35不同PNG（支撑hold）；不能称37独立新姿势。30fps分数帧长须保留1000/30ms，不逐帧round到33ms；否则37帧JSON从1233.333误缩至1221ms，必须保留失败包后修复重新真录。此例真实37PNG+38编码帧终点hold、1.234362s、视频/PNG原生MAE最大1.127/255仅技术passed，团身/起身仍failed。证据 tools/animation-lab/examples/human-alien-v8/frame-sequence/browser-frame-tool/。

奶蛙近臂4抬起和9/10弯肘回摆定点源编辑，必须在全loop检查远侧：实际v6近臂改善但FAR curled臂7左后→8右前仍跳过passing，整体failed。不可只测近手路径。10新候选open fingertips与抬起后脚相切，黑描边让纯pinkmask虽分离也可能粘成轮廓；必须原生像素肉眼看透明负空间。10v3只抬forearm/palm修出间隙，原腿身份保持；全部试错prompt/源hash留档。v6仍19pxground/materialfailed，正常/慢速各两圈PNG/video一致性technicalpassed与sourceartfailed分别记录，证据 examples/frame-animation-v1/milk-frog-run-sequence-v6/。

远臂源定点修也会失效：奶蛙v7 7fist430→550下垂过渡，但8提示fist移到915实际仍995，修复left80仅输出down50，且arm-only提示仍使sole1202→1204。必须核输出而非提示目标，far7→8横向跳仍failed。保留首轮+定点修真实原图/来源/UI/影片，下一轮改用farshoulder/elbow/wrist整链控制图；不能称仅手部y移动就是远臂passing合格。12source真录24normal/96slow采样仍不新增原生帧。证据 examples/frame-animation-v1/milk-frog-run-sequence-v7/。

完整远臂数学控制也不能替代输出验收：奶蛙独立12相位固定肩根、225+225骨长、屈肘60..100°，冻结/同相/根漂移/断腕故障拒收；角度是拟人风格化设计，引用跑步摆臂研究不能称为测量动作。正弦轨迹7个不同上臂姿势对应12时间相位，也不能称12种胳膊姿势。真实phase8首轮仍把肘/腕留在极后位置，定点修复又改坏近张手且丢失独立远拳，二者failed留档未换入loop。参考图中不一致的near红链可能诱导模型改原角色，后续far局部请求用far-only整链控制，但仍检查所有肢体身份和原画布，不能只看蓝链数值。证据 examples/frame-animation-v1/milk-frog-arm-control-v1/。

远臂far-only控制和自然独立整臂参考仍不能保证模型跟随：实际奶蛙v7/v8探针 near 张手保住，far拳仍落在右侧974/985，而目标腕698795；独立整臂本身居中放大，原注册也失败。必须登记源图与控制的整个肩/肘/腕不符；不得用“漂亮、两只手可见”批准passing，也不得代码缩放拼入原帧假称直接生图。远肩遮挡让像素测量不确定，设计650430锚不能称源真实解剖测量。native色域辅助阈值须根据实际RGBA查验，旧g<165未提取出>1000px区域的方案记invalid，新的r-g>30/b>g*.9域仅辅助人工手地标，不作为自动美术passed。

对控制还要做原源耦合审计：奶蛙原12帧完整近/远髋膝踝、肩肘腕人工标签显示8号near大腿front/near上臂back，但far大腿back，独立正弦far上臂也back，控制自己错。该控制数学通过但gait failed，暂停新imagegen；不能把650430根或698795腕当作自然真值。原0/1/8..11远肩遮挡、1远膝遮挡，保存null而非想象出链，不凭拳/脚横向推上臂/大腿方向。原生QA覆盖source-labels.json/md、source-08-joint-overlay.png与每source-NN-chains图，SHA脚本核原图字节不变；这些仅QA标注不可当新生成帧。

隐藏肩根可做源比例条件可达性排除，但不能把条件区间变成测量真值：奶蛙源2..7手工2D投影上臂117.7..146.0、前臂71.1..106.9，far肩相对near偏移X-125..-100/Y-20..30；不沿用225+225。phase8 near肩635400推断far box510380..535430，额外根±40/两段各+40/腕±20的明确生产一致性模型，现有腕955620最短距离382.75、最大reach332.92，超49.83px。独立所有端点±20px更宽最坏情况则不能排除，旧±35..60不确定性不可称确定生理异常。report有敏感性与全部隐藏相位reach；候选127.6+78.5/肩偏移[-120,-2.5]和70°phase8上臂前摆只是提案，与后支撑far腿反相，允许躯干/near臂遮住拳，不为每帧显眼把手推到远处。源投影长度变化不等于真实骨长变化，解剖枢轴也未唯一恢复。证据 examples/frame-animation-v1/milk-frog-far-reach-v1/；root复核前不新生图。

允许正确遮挡的单帧探针实际有效：奶蛙8以源比例127.6+78.5/肩偏移[-120,-2.5]与腿时相前摆提案生成一次，旧右侧过远拳移除、far拳全遮挡，near open主形保持。全遮不自动判缺肢，但也无法测被隐藏链是否遵循，所以不能把删除拳等同完整骨链验收。输出新增后颈/后肩cap、非编辑区RGB/alpha轮廓漂移，严格不变仍failed。7→新8→原9原生和真实UI/movie对照暴露9大拳重新突现、材质跳，局部修不能完整loop passed。只新增单帧/3帧probe样例，不改既有12包；normal3PNG+4编码0.376631s、slow12holdPNG+13编码1.500386s，原生3姿势而非12新图。证据 examples/frame-animation-v1/milk-frog-far-occlusion-probe-v1/，实际prompt/参考/输出SHA及3x局部、逐decodePNG/视频技术QA保留。
