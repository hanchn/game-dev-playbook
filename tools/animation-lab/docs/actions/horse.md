当前候选 `horse-side-v24` 新增真实蹄件mini源`horse-hoof-parts-v11.png`仅替v23的5/10，其他14件与骨长保持。蹄壁强银色反光减轻、系部缩短，源高度改变后按近远真实opaque sole校准足底偏移[12.08496,12.08496,11.73571,11.73571]；躯干基准下移4rigpx保持可达，graze颈角114.3避免嘴陷地，未拉伸骨段。96相位idle/walk/run/graze支撑脚源底点都在floor0（<.05rigpx）与40/40相关技术测试通过；**整体美术仍FAILED**，颈折袖、腕飞节帽和腿躯比例仍实际可见。

同4动作浅底16格、run/graze深底与真实Chrome v24 run`.5`/graze`.466667`正常opaque1/1.65已看；jump/rear/tail本版本未审，不继承v23证据。v10源候选反光及系部过长失败未注册，v11源系部仍未严格1/3要求，按候选保存而非假设终稿。路径`examples/horse-side-v24/retest/visual-review.json`。

历史 v23 范围（不能替代v24新蹄验收）：

当前候选 `horse-side-v23` 为原v21骨架/10件源身份加两条多图源：cannon v8（tiles4/9，最早v22注册）和四上段 v9（tiles2/3/7/8）。四上段真实源件使卵状大肌肉减轻，但腕/飞节仍突出帽状、lower相对胸腹细，吃草`.466667`的棕色锐角折袖仍 FAILED。完整7动作浅底各16帧、run/graze深底、8个上/中段独立9相位和实际Chrome v23吃草/快跑已视看；未看的范围单独列出。所有原生帧固定512同机位，没有逐帧fit。

`examples/horse-side-v23/retest/visual-review.json` 保存实际源SHA和失败范围；`ui-{graze-phase0467,run-phase05}-precision02-light.png` 为真实页面正常不透明浅底1.65复测。修复shared layerSplit mesh refineTolerance `.4→.2`，保留`.25 rigpx /4000tri`原验收阈值，1974个源中心×6吃草相位最大误差`.2038278 rigpx`、最高1498tri；38/38技术回归通过，**不改变美术failed**。

新源的袖套/球帽造型不因圆形重叠而自然。原主图蹄端存在镜面板状质感，亦纳入失败项。Jump/rear浅底16格仍有近远腿高度重叠和僵硬L形，未以位移检测接受。四种颈根参数候选仍折叠，全部failed且未注册。普通extend只摆±.40rad，并非标注活动范围验收；另外`limb-stress`是未认可物种角度的诊断压力测试，明确不当作自然动作。

历史 v22 候选（不能替代 v23 新源验收）：

当前候选 `horse-side-v22` 只新增两件 cannon mini atlas：`horse-cannon-parts-v8.png`（SHA `4175a4b91fc1c0b0504e23e6e6aa427d03386d11ef2cadde3cc5fa62516e25f5`），4/9 消费新源，其余14tile与骨长保持v21。实际固定512 idle/walk/run/graze各16帧、近远前后下腿9相位和Chrome v22 .25快跑/.466667吃草已看。细杆与底帽缩窄，但旧腕/飞节大帽、颈根折袖和上下段粗细对比仍 FAILED；36/36技术结果不改视觉结论。记录 `examples/horse-side-v22/retest/visual-review.json`；后续v23已注册四上段mini源v9为候选，但未获整体美术验收。

历史 v21 与 v20 记录（不能作为 v22 新素材验收）：

历史绑定为 `horse-side-v21`，源仍原 `horse-side-parts-v5.png`。v20 黑鬃根刀片在同`.467`浅底1.65实际Chrome复测已消失：v21 `neckMask start=.62/span=.18/startSlopeU=0`，保留body根方向与斜UV分层，未删源像素。`examples/horse-side-v21/ui-graze-phase0467-light-detail.png` 与全身截图已实际审；16idle/graze/walk/run浅底已视看，34/34技术通过。根代理独立确认刀片已修，但颈躯依然像折叠袖套，股胫卵状件、腕/飞节结节仍明显；整马保持FAILED。源ID/SHA及范围见 `retest/visual-review.json`。

# 马 · 当前装配和实际 QA

历史 `horse-side-v20`，源图 `public/art/horse-side-parts-v5.png`，仍未通过整体美术验收。前肢肩→肘→腕→球节、后肢髋→膝→飞节→球节使用独立素材；系部和蹄复合在脚端。连续头颈保留刚性颅面，低头动作独立驱动颈与头。尾毛使用原生图像比例。

旧 v7 的最低嘴距地 44.57px 是历史失败，已由后续颈部骨架与源头颈装配修正。当前 v20 的极限低头嘴接近地面，源根按斜 UV 分层遮在身体后；旧鬃毛根竖刺和横背条已经改善，但鬃根仍是硬斜端点，腿下段的球形帽、颜色差和拼件感仍 failed。

`examples/horse-side-v20/retest` 保存原生 512×512 完整动作帧；contactsheet 会把每帧放大检视，不能用它判断相邻帧角色比例变化。该批次在共享网格性能调整前生成。最新真实 Chrome 固定 graze 08/16（phase .4667）证据：

- `ui-graze-phase0467-new-mesh-{dark,light-detail}.png`：共享网格调整后，旧 SVG 舞台。
- `ui-graze-phase0467-canvas-light-detail.png`：Canvas 舞台同相位，轮廓与旧图一致，硬斜端点仍存在。
- `ui-graze-new-mesh-performance-fullpage.png`：旧舞台正常播放后 2.2FPS / P95 933.3ms。
- `ui-graze-canvas-performance-fullpage.png`：Canvas 舞台及分批缩略帧后 13.1FPS / P95 135.4ms。

这些是浏览器工作台累计帧间隔，含首次缩略帧/动作切换和后台环境；不证明目标游戏稳定帧率。1.65×近景围绕工作台中心缩放，蹄或嘴可能出检视边界，不能当作原生导出裁切失败。

`examples/horse-side-v4/baseline` 和 v5～v19 失败保留。技术骨长、层级和单件隔离通过不改变上述视觉状态。

解剖参考：[UMN 前肢](https://pressbooks.umn.edu/largeanimalanatomy/chapter/thoracic-limb-forelimb/) / [UMN 后肢](https://pressbooks.umn.edu/largeanimalanatomy/chapter/pelvic-limb/)。二维装配没有生物仿真验收。

## 颈中心线路径候选（生产仍 v24，未注册）

`equine-neck-path.mjs` 提供纯函数 `createEquineNeckPath` 与显式命令候选 `buildEquineNeckCommandCandidate`。后一函数接收当前 `commands()`、当前骨节点、源 `root/middle/join` UV 和 `layerSplit`，仅返回替换 head/neck 的 `list`；其余部件引用、源 PNG、骨长、当前资产与皮肤不变。用 `drawCanvas(...,{commandList:list})` 单独离线审核，未在生产渲染器启用。

实际源 `horse-side-parts-v5.png` 的候选中心线估计为 root `[.31,.93]`、middle `[.39,.62]`、头颈骨性连接 `[.50,.32]`；最后一点不冒称已测定的 anatomical poll。先前 body 朝向根切线在低头极限形成急弯；`examples/horse-neck-path-v2` 源点误差最大 1.0977 rigpx，超过原 .25 阈值，保留失败。v3 使用实际 neck 骨方向的根切线、连续二次源中心线、弧长采样和源端截面精确切分，独立 source-center 精度诊断 5 动作 × 16 相位最大 .07453 rigpx、2548 三角形；4 个独立约束测试通过。阈值仍 .25 rigpx / 小于 4000 三角形。

`examples/horse-neck-path-v3/suite/{graze,walk,run,jump,rear}-16-{light,dark}.png` 十张固定 512×420 单格、不逐帧 fit 的真实 Canvas 16格已实际看过，详见同目录上一级 `visual-review.json` 和源/资产快照。低头薄三角袖套减轻，但喉下块、鬃边台阶仍在；前后腿下段与腕/飞节结节、近远腿区分、跳跃收腿和扬蹄仍失败。此原生批次完成时 UI/慢速/导出尚未审，后续范围如下；生产仍未升级。

### neck-path-v3 实际浏览器与导出复测

入口 `/lab/horse-neck-review` 左侧生产 horse24、右侧显式诊断候选，固定 1024×420 双视图，四张实际 PNG 的字节/SHA 与完整绑定快照随导出保留。五动作正常与 .25 倍均实际拍摄，80 个逐帧按钮验证确切相位和暂停状态。五套每套 32 PNG 导出源身份通过；当前 `r4-identical-halves` 的候选 phase0 与捕获右半帧逐 RGBA 相等。先前外层平移导致边缘最多 15 色阶差的失败保留，不能拿几何相同冒充像素相同。

十套实际 MediaRecorder 视频和 PNG 已保存，每套视频 N+1 末尾 hold 帧，但 24–64ms 时间戳抖动仍失败。`scripts/encode-equine-neck-capture.mjs` 校验实际源和 PNG SHA 后将这些 PNG 按 12FPS 编成十段 `fixed-12fps.mp4`；精确帧数、最大 PTS 误差 .0000003334s 通过，末尾按一帧量化，不伪装请求时长完全相等，也不把这些 FFmpeg 影片冒称原浏览器影片已修好。十套最新 r4 接触图均实际看过，全部美术 FAILED。

证据与失败范围集中在 `examples/horse-neck-path-v3/browser-visual-review.json`；实际图 `browser/r4-graze-phase0467-light.png`、五动作 `*-step07.png`，正常/慢速影片及 receipt 在 `browser/<clip>-<speed>x-r4-capture/`。缓存后 Chrome 当前行走仍只有正常 6FPS/P95 200.1ms、慢速 7FPS/P95 202.0ms，性能仍未验收。五项 core 测试通过（新增缓存不可被返回值污染测试），精度预算保持原阈值。

根代理独立实看同 .4667：薄三角局部改善，但肩髋鼓包、躯干与腿比例、粗细骤变仍机械。对照[真实马侧面吃草照片](https://www.publicdomainpictures.net/en/view-image.php?image=131189&picture=horses)实际观察，前腿伸展支撑、后飞节温和弯曲、颈部宽连续下降；当前通过深折前腿压低身体凑嘴触地仍不合理。单张照片仅作姿态参照，不当成通用品种尺寸。上述局部改善与技术证据均不接受整马，不启用候选为生产默认。

### 诊断页纹理提交与 Worker 性能候选

当前入口保持 Canvas 参考默认，可在“纹理绘制”选择 WebGL 批绘候选。独立 `buildEquineReviewBaseCommands` 缓存源裁剪和重复 warp 点，仍保留生产 `.2px` 自适应行以及每个三角的原矩阵；`buildEquineNeckCommandCandidate` 缓存源分区，`packEquineReviewVertices` 转移完整顶点到批绘接口。没有修改动物 recipe、共享 renderer 或源 PNG。

最初实际阶段数据：姿势低于 .4ms，生产 commands 10–51ms、候选 12–72ms、两侧 Canvas 绘制各约 6–20ms。仅缓存或仅 WebGL 未够：8、12、13FPS 的失败均保留。双 Worker 仅预备最多六个固定24FPS样本，按连续索引呈现；主线程只提交纹理组和顶点，计数来自真正完成的画面。最终实测正常 walk 平均24FPS/P95 98.1ms、慢放24/P95 70.5ms；慢速 graze 完整193帧（索引0～192、结束phase1）平均24/P95 88.6ms。主线程提交P95不到1ms，但整体帧间抖动仍未达到理想24FPS节拍，不能宣传稳定游戏60FPS或完整性能通过。

`examples/horse-neck-path-performance-v1/review.json` 汇总所有实际路径和代码字节快照。7项测试通过；新 Canvas 映射与冻结r4参考100张完整深浅底 RGBA 相等，源点最大 .07453rigpx/2548源三角不变。GPU浮点顶点误差最大 .00002622rigpx；50张1024×420 WebGL与Canvas对照仍有AA/过滤差异（最坏平均 .026663/255、个别通道110），严格像素相等 FAILED，因此参考路径保持可用并默认。

最终80个关键帧操作逐一确认相位/暂停，五张实际 UI 第8帧均已看；当前 WebGL 吃草导出32PNG+4源的SHA全部匹配，实际第8帧已看。路径 `actual-80-step-final.json`、`*-step07-final.png`、`final-walk-{normal,slow}.{json,png}`、`final-graze-slow.{json,png}`、`backend-qa-v3/backend-qa.json`、`graze-r5-export/actual-artifact-check.json`。马比例、模块状肩髋、腕飞节和吃草支撑仍美术 FAILED，性能改善不覆盖这些问题。
