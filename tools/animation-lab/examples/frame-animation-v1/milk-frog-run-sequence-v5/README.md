# 奶蛙真实12帧 v5

仅9/10源替换v4，真实imagegen局部源编辑、原生1254画布不改像素/不逐帧fit。9v2弯肘回摆避免从passing突然全伸展到x200；10v2手脚轮廓相切拒收，10v3实看透明间隙修复后选择。全部原生图片、prompt/参考SHA/源SHA/失败receipt留档。

源素材仍failed：支撑地线19px误差；3→4过快抬臂及4/5/6峰值停留、头肩/材质轮廓变形，专用facialtrack未生成。完整原图深浅背景、实际UI12帧及原生影片两圈24个source位置已看，source-qa.json详录，不能把技术passed升级为美术passed。

正常2圈实际2.999878s、24PNG+25encoded（终点hold）；慢速2圈11.999719s、96PNG+97encoded，96是12姿势各hold4次再循环。每PNG与真实解码影片 MAE 最大正常2.498661/255、慢1.762602/255，actual SHA与chronology通过，technical-qa.json留存。透明12原PNG包browser-source-frames.zip，真实影片browser-{normal,slow}-capture/recording.webm。旧v4/v3/v2及失败10v2均保留。
