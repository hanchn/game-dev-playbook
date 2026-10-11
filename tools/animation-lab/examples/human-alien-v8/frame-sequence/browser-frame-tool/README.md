# 外星人骨骼翻滚 v8 · 帧工具实测

本目录是实际骨骼渲染序列成片，非 imagegen 生图。公开样例 `alien-roll-skeleton-v8`，37采样 PNG，35个不同源SHA（9/10/11为同像素支撑停顿）。原单次动作1.2s加结束姿势1/30s，固定512画布；录制仅使用共同缩放0.953125和offset12,12。

技术检查通过：四类源快照与37实际源PNG独立SHA核验；真实浏览器播放/透明PNG包/Canvas MediaRecorder录制；30fps、37捕获PNG+1视频终点hold、FFprobe实际1.234362s；37项原生解码 RGB MAE最大1.127042/255。未强称35/37为不同新生成素材。完整报告见 technical-qa.json；所有原生UI截图、解码影片和分页图集留存。

美术仍 failed：中段团身/直臂僵硬、起身机械，近远肢体可见性及物理支撑不能由技术通过推出。所有37 actual UI及movie分页已看，详细按源索引记录在visual-qa.json。

早期rounded-duration-baseline.zip及同目录保留：采样30fps各帧误round为33ms导致JSON总时长1221ms，未作为合格时序证据。修正为分数ms，重新实际录制browser-capture.zip；源码测试新增37/30秒总时长检查。
