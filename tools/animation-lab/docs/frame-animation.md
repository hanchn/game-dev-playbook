# 视频抽帧与帧动画

打开 `/frame-animation`。这是独立的位图帧工具；`/keyframe-generator` 仍是关节姿势编辑器。骨骼渲染出来的图片不标记为 AI 生成帧。

网页支持本机视频导入、起止时间、FPS 或指定时间点、图片序列、图集拆帧、逐帧时长、重排与删除、循环/单次预览、透明 PNG 图集和时序 JSON 导出。文件不上传。视频背景保留；抠图与运动补帧不在该工具中。浏览器需能解码视频，失败时使用 FFmpeg CLI。

采样范围为 `[start,end)`，避免循环额外重复最后一帧。指定时间点会排序并拒绝重复；每帧默认保持到下一采样点，末帧保持到范围末尾。最多 128 帧。浏览器记录请求 seek 时间，能获取时记录 `requestVideoFrameCallback.mediaTime`；不能获取时 `decodedTime` 为 null，不能伪称精确时间戳。视频截图最长边最多 512 px；源文件不改。

## FFmpeg CLI

需要 PATH 中的 `ffmpeg` 与 `ffprobe`。不需要 npm 库。输出必须为新目录，既有目录拒绝覆盖。文件名使用进程参数传递，不拼接进 shell。

```sh
node tools/animation-lab/scripts/frame-animation-cli.mjs extract --input /absolute/path/run.mp4 --start 0 --end 2 --fps 8 --cell 256 --columns 4 --padding 12 --loop --output /absolute/path/run-frames-v1
node tools/animation-lab/scripts/frame-animation-cli.mjs extract --input /absolute/path/run.mp4 --start 0 --end 2 --times 0,.15,.35,.6,1.2 --output /absolute/path/selected-v1
node tools/animation-lab/scripts/frame-animation-cli.mjs pack --input /absolute/path/png-directory --fps 8 --output /absolute/path/packed-v1
node tools/animation-lab/scripts/frame-animation-cli.mjs split --input /absolute/path/generated-sheet.png --columns 4 --rows 2 --count 8 --fps 8 --receipt /absolute/path/receipt.json --output /absolute/path/generated-animation-v1
```

CLI 支持最多 600 秒源视频，扫描第一路视频的原始解码时间戳，用 `select` 选择实际帧序号。采样时刻取其所在的源帧，记录 `sourceTime`、归一化 `decodedTime`、原始 `sourcePTS` 与 `sourceIndex`。源 FPS 低于采样 FPS 时可能重复帧，报告 `duplicateSamples`，不编造新画面。每张 PNG 与源视频 SHA-256 均记录；不会改原视频。PNG 导入按文件名数字排序。

## 真实生图路径

网页“生图帧动画”导出请求，或用 CLI：

```sh
node tools/animation-lab/scripts/frame-animation-cli.mjs request --subject '蓝色小水母，统一身份与材质' --action '舒展、收缩、恢复的一次游动脉冲' --count 8 --columns 4 --fps 8 --output /absolute/path/imagegen-request-v1.json
```

Codex 读取 `prompt`，实际调用 `image_gen.imagegen`，`transparent_background:true`。先检查原图，再复制真实返回的 PNG 到项目，保留原图、提示、工具、生成结果路径与 SHA-256。页面不持有 imagegen 接口，导出请求本身没有生成图片。单次图集不能保证角色一致性；失败素材不应自动进入正式角色库。

导入来源记录 JSON 至少包含 `tool`、`prompt`、`generatedFile`、`generatedFileSha256`。SHA 不匹配时 CLI 拒绝，网页标为未验证导入图片。SHA 匹配表示记录绑定输出，不能单凭用户提供的 JSON 证明模型调用。8 帧真实示例在 `examples/frame-animation-v1/imagegen/`，由本次 Codex 内置 imagegen 调用产生；六触手要求与尺度连续性未通过，因此视觉状态保留失败。

生图输出的宽高即使不能整除网格，也按整数像素区间分割，覆盖每个源像素且不重叠；这不会修正生成图布局或越界角色。背景 alpha 保留，不用颜色阈值伪装透明。

## 导出格式

`animation.json` 使用 `sprite-frame-animation` schemaVersion 1。`sheet` 指定 PNG 尺寸、SHA、列/行与留边；`frames` 含图集 `rect`、实际 `contentRect`、原尺寸、播放 `timeMs/durationMs`、来源时间或来源 `sourceRect`。PNG 与 JSON 同时导出，浏览器可能要求允许多文件下载。整段使用同一最大原画布、原点、缩放、offset 和 anchor；异尺寸原帧从同一坐标原点补透明再以共同变换导出，不对每个人体包围盒单独 fit/居中。`sheet.fixedTransform` 记录共同画布、名义比例、实际像素比例与最大0.5px栅格取整。舞台与拍摄也使用共同范围。原始单帧保持原字节，导出不修复原图裁切。背景选项只影响检查界面，不烘焙到普通 PNG。

原透明 PNG 在补边前按 alpha>=24 检查 `pixelBounds`，轮廓触边自动保留 failed；opaque 视频画面贴边不作为角色裁切。极低 alpha 杂点另记，不能从透明预览 RGB 杂色猜测实际深浅合成的轮廓问题。原始视频画面与时序保留，不进行背景分割。来源 receipt 的逐帧状态/说明传递到时间轴与导出，但 receipt 只是来源声明，不使整体动画自动通过。

`visualQA` 初始为 `not-reviewed`。时间正确、透明度正确和图集可读属于技术验证；身份连续、足部接地、近远肢体交替、动作合理、循环接头需要美术验收。测试素材 `video/source.mp4` 是 FFmpeg 的合成运动色块测试视频，用于验证解码顺序，不是真人或角色美术证据。

## QA 路径

`examples/frame-animation-v1/qa-report.json` 记录真实视频、浏览器、真实生图来源及失败。`test/frame-animation.test.mjs` 覆盖半开采样、时间重复拒绝、逐帧时序、整数分格、原解码帧像素比对、PNG 透明留边及拒绝覆盖。CLI 与浏览器结果都保留在示例目录；浏览器截图原件在 `output/playwright/frame-animation-qa/`。

## 拍摄当前动作

“拍摄动作”用真实 `Canvas.captureStream(0)` / `requestFrame` / `MediaRecorder` 录制当前位图时间轴。拍摄 FPS 决定固定时间点的 PNG 采样，背景选项烘焙进视频与拍摄 PNG；原始透明帧仍可用普通图集/ZIP导出保留 alpha。最多 60 秒、128 张 PNG，视频优先 VP9/VP8 WebM，浏览器只支持 MP4 时使用 MP4。拍摄包包含 `recording.webm` 或 `recording.mp4`、所有 PNG、图集和 JSON。编码 PTS 使用浏览器实际 wall-clock，不承诺离线 CFR 精度；终止 hold 帧记录在编码说明里，不额外添加循环末尾 PNG。

导出 ZIP 使用无依赖的 ZIP store，PNG 已压缩，含完整单帧/图集/时序和 QA。CLI 增加 `--zip` 输出 `animation.zip`。点击当前帧“有问题/本帧已检查”并记录说明，再导出逐帧 QA；局部逐帧检查不能自动升级整体循环为通过。源素材未通过状态会保留到导出与录制包。

内置样例从 `public/frame-animation-samples.json` 读取；素材仅使用同源 `/frame-animation-assets/`，按实际 SHA 验证来源记录。外星人样例来自真实 imagegen 输出，失败版本保留明确说明。样例身份、动作、材料连续性由美术 QA 单独记录，工具可用不代表素材合格。

## 外星人跑步生产复测

`examples/frame-animation-v1/alien-run-controlled-v3/` 保存12帧控制图、首轮v3和唯一一次整图定点修复v4的prompt/来源及实物深浅图。v4仍失败：第2帧近臂提前前摆，第1/4/12的远侧手轮廓缺失，05–08鞋底与09–12头顶触分格边界。失败样例在网页中可以选择，明确标注未通过；实际播放访问全部12帧并下载ZIP与逐帧QA，技术可用不使素材通过。

`examples/frame-animation-v1/alien-run-single-v5/` 改为每个姿势一次真实imagegen。先检查0/25/50/75%四个独立PNG，再补中间帧；75%首版把近腿大号外侧裤袋放到后伸腿，单张修复v6后才与前抬近腿一致。控制图是代码原生指导，不作为最终成片。所有原始输出、prompt、SHA、局部姿势与全片身份/注册的未通过状态分别记录，不依靠每帧自动缩放隐藏故障。

动作依据需区分实测与艺术控制：本项目控制角度属于人工估计，并非真人动捕。跑步通常使用屈肘摆臂，但肘角可以随速度/跑法改变，不能单一90°规则验收所有人物。依据包括 [Yegian等2019原始跑步实验](https://doi.org/10.1242/jeb.197228) 与 [Kato等1995侧面60fps短跑研究](https://www.jstage.jst.go.jp/article/jcoaching/9/1/9_49/_article/-char/en)。QA要实际观察肩肘腕与对侧腿的顺序、承重/回收/落脚、脸部与视线连续；不能把文字phase或颜色控制图当成实际生图跟随证明。眨眼使用合理的长idle或专用序列，短跑步循环不强制闭眼。


逐张生图的样例可用 `samples[].frames`，每帧有同源 PNG、独立 receipt 和 phase，按数组顺序播放。CLI 使用 `pack --sequence-receipt /absolute/path/all-frames-reviewed.json` 核对每帧 PNG 文件名/SHA/tool/prompt，并按 receipt.frames 明确顺序，不让版本号决定时间。每帧 `sourceProvenance` 与失败 QA 写入时序与录像来源中。

可复用拍摄接口 `public/canvas-sequence-capture.mjs`：`captureCanvasSequence({canvas,duration,fps,drawFrame,shouldCancel,onFrame})`。调用者先冻结角色/场景配置，`drawFrame({context,timeSeconds,index,sample})` 绘制真实场景并返回 phase/source 元数据。helper 返回 movie、真实 canvas 帧与请求/实际时间收据；同一不可变 bitmap 同时保存帧图并 requestFrame，终止时重画末帧 hold。多演员也可以复用，但角色美术状态、实际视频 PTS 和原始图检验仍由调用者验收。

## 真实连续视频样例

`alien-run-video-probe-v1/` 保存 RH 实际生成任务 `2109340337821196290` 的零价估算、唯一提交、状态和下载收据。实物 H264 864×1184、107 帧、4.458333 秒；提示的4秒不能替代实际 FFprobe 时长。原灰背景保留，不能标为透明帧，也不能标成骨骼渲染。原生107帧全部图集查看，另放大全尺寸007/029/092：摆臂和双腿交换改善，仍有远手形变、转身、过频眨眼和未闭环。状态保持 failed。

网页 `samples[].video` 指向安全同源 MP4，使用 SHA 匹配的 receipt 验证工具/提示/实际来源后，调用同一本机视频解码和采样流程。影片生成与视频抽帧是两项真实操作，抽帧不会补足缺失动作或去掉背景。12fps 的54帧实际浏览器播放与ZIP导出证据见 `browser-playback.log`、`technical-qa.json`。CLI 可用 `extract --video-receipt /absolute/path/source-qa.json`，在输出目录创建前核对源视频 SHA 并保留已知失败的来源 QA；54张 PNG 按记录的源序号与原生 FFmpeg 解码PNG字节一致。

浏览器 seek 不能承诺精确源帧序号。真实 WebM 重抽帧测试中，请求落在 FFprobe 四舍五入的 PTS 边界时会返回上一帧；一个加5ms的内区复测仍有一帧返回上一画面。实际媒体时间和像素均按结果记录，失败证据见 `alien-run-single-v5/browser-v8-extract-interior-pixel-matches.json`，没有偷偷偏移用户时间或把错误帧当正确。需要严格抽特定源帧时使用 CLI 的 FFprobe PTS/原始帧序号路径。

奶蛙同角色连续视频 `milk-frog-video-probe-v1/` 真实任务 `2109345232162926593`，H264 1024×1024、107帧、4.458008秒。原2D黄色肌肉白腹绿眼粉色手脚身份保留，实际107帧全图和010/031/048/065全尺寸检查发现passing时远脚/膝/髋糊成块、手指幽灵，源素材 failed。网页可选真实样例，54帧播放/ZIP与CLI原生帧字节验证保留在 `technical-qa.json`；背景仍是原白色opaque。

本次独立12帧基线和 passing 局部修复见 `alien-run-single-v5/all-frames-reviewed-baseline.json`、`all-frames-reviewed-v8.json` 与 `v8-dark/light.png`：双臂双腿交换与 passing 有改善，但原图画面注册、头形/皮纹漂移、部分64px包络不达标仍 failed。alpha>=24 无原边界切断仅证明没有本次阈值的触边；不代表动作自然、比例一致或足部接地通过。

实际奶蛙已有源基线位于 `examples/frame-animation-v1/milk-frog-native-baseline-v1/`：原v15六帧及原v15/v16十二帧、UI全循环/录像/逐帧PNG和技术证明。明确 existing-project provenance，绝不称新生成。源底行触边和hand state/outline变化仍failed。真实12fps录像首次漏末帧浮点边界失败包保留，修复后覆盖0..11。新单张imagegen四关键候选位于 `milk-frog-single-key-v1/`，源50%首次未交换腿失败保留，经定点修复局部交换；四张同1254画布透明、没有控制线，真实影片1.000760秒/4PNG+5encoded含hold。但两接触脚底18px偏移、注册/纹理变化与中间帧未完成，整体仍failed。

新增 `milk-frog-run-sequence-v2/` 与 `milk-frog-run-sequence-v3/` 为真正12个独立姿势的实际生图，补承重/经过/飞行/落地并在网页按全部0..11实播、逐帧截图和正常/慢速拍摄。v3实际正常1.501171秒/12PNG+13encodedhold、慢速5.999832秒/48重复采样PNG+49encodedhold，仍只有12个原始姿势。FFprobe原解码与同期PNG最大RGBMAE2.551/1.763通过技术检查，source仍failed：v3支撑脚1188..1207差19px、摆臂3..7停前过久、7→8→9跳、头/肌肉/高光和首末轮廓变化。v2原21px失败和额外局部编辑回退/过冲均保留，未逐帧fit掩盖。样例可以选择播放/拍摄/导出，不能作为生产美术通过。

v4只替换真实新源3/7/11，近臂肩肘链改前下经过/开始回摆，11脚底1168→首0的1192变落地过渡。网页拍摄新增循环圈数，默认1；选2圈时实际正常3.000991秒/24PNG+25encodedhold，慢速12.000185秒/96holdPNG+97encodedhold，12原姿势不变。真正影片包含10/11/0/1跨循环段，自看/PNG同源像素核查保留。16项技术检查通过（循环fractionalFPS边界旧失败日志也保留），source仍failed：支撑脚19px差、3→4和8→9臂位跳、材质和比例不一致。证据在`milk-frog-run-sequence-v4/`。

骨骼渲染帧使用独立来源 `origin:skeletal-render`；不得套 imagegen 标签。每帧 receipt 的 kind=skeletal-render-frame、tool=renderCanvas、species/skinId/action/frameIndex/phase、实际PNG fileSha256、固定画布/anchor/scale，以及atlas/asset/motion/renderer四类源快照 SHA 均保留。UI 和 CLI pack 实际读取四源字节并核SHA，篡改任一源必须拒收；快照只能证明与声明绑定的字节完整性，不自动证明重渲染等价或美术正确。renderer可为实际模块文本JSON快照以符合本机静态路由。样例明确“骨骼渲染序列（非生图）”，导出与录像保留 failed。实际37采样帧可能仅35不同PNG（支撑hold）；不能称37独立新姿势。30fps分数帧长须保留1000/30ms，不逐帧round到33ms；否则37帧JSON从1233.333误缩至1221ms，必须保留失败包后修复重新真录。此例真实37PNG+38编码帧终点hold、1.234362s、视频/PNG原生MAE最大1.127/255仅技术passed，团身/起身仍failed。证据 tools/animation-lab/examples/human-alien-v8/frame-sequence/browser-frame-tool/。

奶蛙近臂4抬起和9/10弯肘回摆定点源编辑，必须在全loop检查远侧：实际v6近臂改善但FAR curled臂7左后→8右前仍跳过passing，整体failed。不可只测近手路径。10新候选open fingertips与抬起后脚相切，黑描边让纯pinkmask虽分离也可能粘成轮廓；必须原生像素肉眼看透明负空间。10v3只抬forearm/palm修出间隙，原腿身份保持；全部试错prompt/源hash留档。v6仍19pxground/materialfailed，正常/慢速各两圈PNG/video一致性technicalpassed与sourceartfailed分别记录，证据 examples/frame-animation-v1/milk-frog-run-sequence-v6/。

远臂源定点修也会失效：奶蛙v7 7fist430→550下垂过渡，但8提示fist移到915实际仍995，修复left80仅输出down50，且arm-only提示仍使sole1202→1204。必须核输出而非提示目标，far7→8横向跳仍failed。保留首轮+定点修真实原图/来源/UI/影片，下一轮改用farshoulder/elbow/wrist整链控制图；不能称仅手部y移动就是远臂passing合格。12source真录24normal/96slow采样仍不新增原生帧。证据 examples/frame-animation-v1/milk-frog-run-sequence-v7/。
