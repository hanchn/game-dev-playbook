# 奶蛙真实 12 帧 v2，失败基线保留

20张实际源变体（包括复用三个真实旧关键姿势和17张新生图）及后续局部修复原PNG、prompt、reference SHA在本目录留档。选中12张按`source-qa.json`顺序，1254²共同源画布；没有逐帧fit或原图像素编辑。

实际网页播放完整0..11两循环、逐帧截图、正常/慢速拍摄均完成。`technical-qa.json`与`validate.mjs`绑定影片/PNG SHA和原解码PTS，正常1.500376秒/12 PNG+13encodedhold，慢速6.001296秒/48 hold PNG+49encodedhold。慢速仍是12张原图。`browser-source-frames.zip`为PNG图集与时序/来源导出。

美术failed：支撑脚1188..1209共21px偏差；摆臂3..7停前过久，2→3和7→8→9过渡跳跃，肌肉比例/头形/高光漂移与11→0接缝。全部12实图、原生深浅contact及实际解码contact已查看，不能因新增12图和技术通过就签收。后续局部改善另存v3，未覆盖这些失败证据。
