# 奶蛙真实12帧 v4：摆臂与循环落地局部改善

在 `/frame-animation` 选择「奶蛙 · 真实12帧跑步 v4（摆臂/落地改善，待修）」。只有3、7、11三个实际imagegen新源替换；其他原生PNG继承v3顺序，12个不同姿势，1254²共同原点/画布，无逐帧fit。

新3号肩肘链往下，提前前摆峰值变成经过；新7号近上臂垂下开始回摆，保留远侧承重和近侧回收；新11号从首0作原生参考，实际sole1168，末首到0的sole1192形成24px落地。每张新源完整原生图、实际UI、深浅12图、局部放大和真正影片双圈均已查看；prompt/来源/SHA见`source-manifest.json`和独立receipt。

实际UI正常/慢速双圈拍摄和导出结果：

- `browser-normal-capture/recording.webm`：3.000991秒，24 PNG / 25 encoded（末帧hold另计），原生源0..11重复两圈。
- `browser-slow-capture/recording.webm`：12.000185秒，96 hold PNG / 97 encoded，仍只有12原生姿势，每原帧500ms且8fps拍摄。
- `browser-source-frames.zip`：12个原生PNG的共同变换导出、sheet和时序/来源JSON。
- `technical-qa.json`：真实FFprobe/原解码、影片与同期PNG SHA与RGB检查，最大MAE2.499/1.763（255标度）通过。`movie-loop-boundary-contact.png`是真正一段影片跨源10/11/0/1，不是拼凑首末作为视频。
- `frame-tests.log`：16/16通过。新增三圈fractionalFPS边界检查实际发现cycle边界落入末帧；`frame-tests-loop-failed.log`保留原失败，修复后边界容差1e-7ms，前1us仍正确选末帧。

**美术仍failed**。支撑脚1188..1207差19px没有解决；3→4近臂仍跳，8→9后摆手位仍跨度很大，身体高光、手形/头/肌肉比例变化未通过。新肩肘链与24px落地只算局部改善。独立眨眼/表情轨道尚未生产，不能因短跑没有眨眼就强插一秒闪眼。全部失败版本、未选编辑过冲留档。
