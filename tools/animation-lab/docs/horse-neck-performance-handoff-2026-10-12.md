# 马颈诊断性能交接（今天停止点）

用户要求今天到这里结束。停止继续迭代，不提交；生产 horse24 及源 PNG、animal-rig、skins、共享 renderer、服务路由均未由本轮改动。

可纳入提交的本轮实现：`equine-neck-path.mjs`、`public/horse-neck-review.{html,mjs,css}`、`test/equine-neck-path.test.mjs`、`scripts/audit-equine-neck-performance.mjs`、`docs/actions/horse.md`、`docs/animal-source-and-joint-qa.md`、本交接、`examples/horse-neck-path-performance-v1/`。该目录包含真正的 PNG、代码字节快照、源/SHA回执和失败记录；不是仅生成规格。前轮 `horse-neck-path-v3` 与动物源 QA 请按各自记录范围纳入，不用本轮新证据替换旧失败。

完成内容：源裁剪与分层缓存、重复 warp 点复用、相同完整网格的 WebGL纹理批绘、转移完整 Float32顶点的两 Worker有序预备队列。最多预备6帧；按24FPS样本的连续索引呈现，实际计数不使用请求数。参考 Canvas 保持默认，GPU候选通过下拉选择。直接舞台与成对导出使用同一全分辨率顶点消费；未修改骨长/素材比例，不减网格或少采帧。

实际验证：7项技术测试通过；与冻结r4映射的100张完整深浅底Canvas RGBA相等，源码在审计中未改（core SHA `df324c09e38fcb78b55d1776b85237c62623cb2c934d0680d8b2af18753db9ab`）。源点误差 .0745302rigpx < .25，源网格2548 <4000。80个GUI关键帧逐一复测确切相位/暂停，五动作第8帧截图已逐张看。当前吃草32PNG导出+4真实源SHA匹配，第8帧实际查看。

真实呈现：正常walk24FPS/P95 98.1ms（1118有序帧），慢放walk24/P95 70.5ms（2376有序帧），慢放graze24/P95 88.6ms（完整193帧，索引0～192，最后phase1），均观察未跳过索引。主线程submit P95小于1ms。它们是工作台实测，不是游戏发布性能验收；平均目标达到但抖动仍失败。

未通过：WebGL与参考Canvas 50张1024×420对照严格RGBA相等失败；最坏平均通道误差 .026663/255，个别边缘通道110，最多17543/1720320通道不同。GPU顶点舍入 .00002622rigpx，源身份维持；AA/过滤差异仍需审，不冒称逐像素相同。整马比例、肩髋模块、腕/飞节、吃草深折支撑腿、jump/rear收腿均美术FAILED。没有注册候选为生产或声明整马通过。

下一轮优先检查：当前 reset 按钮仅赋 phase=0；代码检查发现播放中的 Worker预备计划尚未显式取消，可能重新覆盖起势。此风险未做实际UI复测，不写成已复现或已修。停止指令后不再改实现；恢复时先实测播放中reset/切动作/seek，再修取消语义和交互延迟。还需审Canvas/WebGL边缘及更稳的帧间节拍。GPU候选仅用于诊断，不先升级生产。

总证据：`examples/horse-neck-path-performance-v1/review.json`，其中列出实现字节SHA、源SHA、范围与失败。`native-full-rgba.json`、`actual-80-step-final.json`、`final-walk-{normal,slow}.{json,png}`、`final-graze-slow.{json,png}`、`backend-qa-v3/backend-qa.json`、`graze-r5-export/actual-artifact-check.json` 可直接复核。
