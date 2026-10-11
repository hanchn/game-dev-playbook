# 奶蛙真实 12 帧跑步 v3

网页 `/frame-animation` 选择「奶蛙 · 真实12帧跑步 v3（承重改善，仍待修）」。来源为真正逐张 `image_gen.imagegen` PNG，包含承重、经过、蹬离、腾空、落地；不是骨骼栅格或复制四极端。共同1254×1254源画布，无逐帧fit。v3只替换第7帧局部修复，v2影片、原帧、失败记录完整保留。

实际正常与慢速播放均查看所有0..11两循环，并截图每帧。拍摄出真实WebM、同期PNG、图集与JSON：

- 正常：`browser-normal-capture/recording.webm`，1.501171秒、12 PNG、13 encoded帧（含终止hold）。
- 慢速：`browser-slow-capture/recording.webm`，5.999832秒、48采样PNG、49 encoded帧（含终止hold）。每张原帧500ms，8fps拍摄因此各重复四次，仍只有12个原生姿势。
- 导出：`browser-source-frames.zip`；每帧真实source SHA和生图receipt、共同变换、failed状态保留。
- `technical-qa.json` / `validate.mjs`：真实FFprobe/原生解码与PNG像素核对，正常最大RGB MAE2.551/255，慢速1.763/255；15项frame工具测试通过，见`frame-tests.log`。

**美术仍失败**，详见`source-qa.json`和深浅原生contact、actualUI截图、正常/慢速解码contact、腿部3倍局部。v7修复远脚回到髋下、近小腿回收，支撑脚范围从21px降至19px，但接地线未统一。3..7摆臂停在前方太久，7→8→9仍跳；头形、高光、肌肉体积与末首轮廓变化未通过。短跑循环没有独立眨眼轨道，不强制1.5秒内眨眼，也不称脸部动画完成。

额外失败尝试保存在v2目录：7v6近腿退回蹬离、2v4抬脚过头、2v5反向修复又过头。只写像素坐标不能使模型精准执行；不能把prompt坐标或receipt.phase当实际动作证明。
