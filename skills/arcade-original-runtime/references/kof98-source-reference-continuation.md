# KOF98 源参考续跑：校准签名与可见像素校验

仅适用于当前 MAME0.289 / KOF98 原版 ROM 与 `scripts/kof98-{gap-observe,gap-pipeline,source-reference-v5,audit-kof98-source-reference}.py` 这一代工具链。项目细节记录在 `tools/attack-library/docs/kof98-gap-continuation-2026-10-16.md` 与 `.../kof98-gap-pipeline-continuation-2026-10-16.md`。

- 串行是硬约束：同一时刻只跑一个原机观察/导出。`serial-pipeline.lock` 为排他锁；锁残留时要先确认原进程已退出，不要直接删锁后并发启动 MAME。
- 原机采集统一设 `SDL_VIDEODRIVER=dummy`、`SDL_AUDIODRIVER=dummy`。默认 SDL 无显示设备会 exit 255 且没有有效 trace；这不是数据缺失。
- **校准登记必须能从它自己冻结的 VRAM 复现**。签名与偏移是同一把钥匙的两半：只改签名、或只改偏移让校验通过，等于伪造校准。发现登记值与冻结证据不符时，先重推导再决定是否写新修订，旧文件保留为被取代证据。
- 偏移的原点约定是 `[p1x - cameraX, p1y - 16]`；旧 receipt 里的 `entityNativeScreen` 与之等价。签名只覆盖组内图块，不含原点，所以签名错了不一定是组选错了。
- **画面验证要比哈希更有说服力**。按 MAME 硬件行为把选中对象画在各自的原生列 X 上得到绝对屏幕层，再与原截图比不透明像素的精确颜色一致率：真身体通常 >0.94，残影约 0.76，错位组 <0.5。这能判"这一组是不是屏幕上的身体"，且不依赖任何相机约定。
- 一致率不足 1.0 的缺口来自后绘层/HUD 遮挡。保留逐像素计数，不设容差豁免、不四舍五入成通过。
- 旧动作批次（`kof98-author-*`、部分 `kof98-actions-*`）的 trace 没有 `cameraX`，相机在同 tick 的 `box-observations.jsonl`。相机只读：两处都没有就记 `failed-trace-without-camera`，不许推断或给默认值。
- 缺口重观察是**独立新抓取**，tick 号与旧批次不同源；`vramSHA256`/`snapshotSHA256` 不跨批次通用。不要把新渲染的元数据贴到旧截图上，也不要反过来。
- 判读进度只看 `data/research/kof98-source-reference-audit-20261016/continuation/progress.json`：元数据恢复、严格可见像素、原生时间表三项分开计数。屏外 VRAM 几何不能计入截图像素证明。
- 窗口数不是招式数。全部窗口像素通过也不自动关闭招式触发、判定框、取消窗口与命中停顿。
