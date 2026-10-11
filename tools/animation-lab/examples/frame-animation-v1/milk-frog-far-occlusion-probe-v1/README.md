# 第8帧源比例远臂遮挡探针

实际调用一次 image_gen.imagegen。原 native1254 输出 `frame-08-occluded-v1.png`，提示/参考/输出 SHA 在 `generation-input.json` 和 `receipt.json`。控制图是代码原生推断链，127.6+78.5投影段长、源近肩相对偏移[-120,-2.5]，不是解剖测量真值。没有修复重试，也没有改原v7包。

局部可见改善：原8右侧过远的大far拳/前臂消失；near OPEN掌、脸、双腿的主要姿势保住。far完整链现在被near臂/torso遮住，不能因单独拳不可见判缺肢，也不能测其真实S/E/W或宣称完全遵循隐藏控制。原生alpha>=24无触边，bounds417,85,716,1120、最低脚底1204不变；此不等于原19px接地错误修复。

严格保持未通过：整个输出在非编辑区也有像素变化。near hand silhouette IoU0.9996、upperarm0.9976、head0.9958、lowerlegs0.9949；RGB MAE约3.7..4.6/255，不是原图像素完全不变。头顶84→85、下腿右边1131→1132有1px轮廓漂移。此外新增后肩/颈背黄色cap；`before-backneck-3x.png`/`after-backneck-3x.png` 是实际源局部3倍QA，原图未变形或拼进资产。需root美术复核这块变化。

实际原7→新8→原9连续对照，原9超长大远拳仍突然出现，肩/手体积和脸材质还变；不能把单张修复注册成完整12loop通过。`compare-light.png`/`compare-dark.png` 保留before8和真正7/9，`source-qa.json` 记录失败及不能确认的隐藏链。

网页新增独立单帧探针和3帧上下文样例，名称明确未通过/非完整loop。真实UI每帧截图 `ui-context-0..2.png` 已逐张实看；7/9均是现有原生源，8是真实新imagegen，不是骨骼冒充。

已实际录制、FFprobe检查及逐采样PNG/原生视频像素核对：

| 上下文影片 | 时长 | 采样PNG | 编码帧 | 最大RGB MAE/255 |
|---|---:|---:|---:|---:|
| normal | 0.376631秒 | 3 | 4 | 2.5402 |
| slow | 1.500386秒 | 12 | 13 | 1.6562 |

每片只有3个实际原生姿势7/8/9，slow是每姿势4个hold，并非12个新姿势；编码终点hold与PNG采样分开。normal/slow包和原生视频位于 `browser-normal-capture.zip`/`browser-slow-capture.zip` 及解包同名目录。`validate-capture.mjs`/`technical-qa.json` 可复算源SHA、chronology、真实解码PTS、PNG/video差异。movie-normal/slow-contact.png为实际影片帧，不是按源自行拼造影片截图。

技术检查passed，源美术failed；局部遮挡改善供root复核。完整原v7序列、失败QA和正常/慢速两圈影片没有被新探针替换。
