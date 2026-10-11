# 新奶蛙四关键候选：仍未通过

五次真实 image_gen.imagegen 结果，含50%首版失败与一次定点修复。generation-inputs.json保存完整prompt/实际引用图路径；每张receipt保存真实输出与引用SHA、source alpha bounds。原输出不编辑。

/frame-animation 样例「奶蛙 · 新生成四关键候选（未通过完整循环）」可播放/导出。选用0-v1、1-v1、2-v2、3-v1；2-v1前景腿未交换，留档不选。

browser-frames.zip 是四张透明帧、图集和JSON；browser-capture.zip 含真实MediaRecorder影片、4PNG、图集和时序。browser-capture/recording.webm实测1.000760s、5编码画面含terminal hold，PNG/视频对照最大RGBMAE2.538/255。technical-qa.json通过技术检查，source-qa.json整体美术failed。

本地改善：上臂/同侧大腿反相；近手始终open、远手始终curled；50%修复的近折腿与远接地腿在髋部遮挡层次上可区分。没有红蓝控制线。

未通过：两接触姿势脚底1192/1210差18px，头顶84/92/106/88和轮廓/纹理变化，四极端帧仍明显阶跃且没有承重/经过/蹬离中间帧。未制作眨眼或抓握道具动作集。单原图无触边(最小留边41px)与共同camera变换技术通过，不能代替美术/运动自然度通过。
