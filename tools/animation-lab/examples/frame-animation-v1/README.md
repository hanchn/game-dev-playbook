# 帧动画工具真实 QA

见 `qa-report.json`。视频为实际 H264 测试片解码，原材料保留；水母与外星人是实际 imagegen 图集。技术路径通过不代表素材美术通过。

`video/` 保存 CLI 和浏览器视频抽帧结果、第一次自动录制失败；`imagegen/` 保存真实原始生图、来源、拆帧、深浅底与浏览器导出。`alien-run-v1/` 保存真实外星人样例 ZIP、前后两次 manual 录制及实际 VP9 视频/PNG/时序，最后 `recording-validation-manual-v2.json` 为通过的录制技术证据。`alien-action-samples/` 保存跳跃、深蹲、弯腰 v2 实际浏览器 ZIP、manifest与SHA核对，素材登记偏移仍待审查。

实际 PNG 截图在 `browser-screenshots/`；对应浏览器命令输出由 Playwright CLI 保存，首次 headed 窗口外部导航导致的无效refs没有算成功。8个Node测试无skip，见 `tests.log`。原始失败素材/录制保留，不覆写为通过。

2026-10-12 更新：`qa-report-v2.json` 和 `frame-tests-v2.log` 是当前 13 项技术检查、独立生图来源顺序、共同变换与共享摄像 helper 的实际记录。`alien-run-single-v5/` 中 v7 基线与 v8 passing 局部修复均保留 failed，不替换旧失败图。当前样例 UI 可选独立12帧的 v7/v8；`browser-v8-capture/recording.webm` 是真正浏览器拍摄，12 PNG +13编码帧（terminal hold），1.333239秒，最大PTS误差6ms，最大视频/PNG RGBMAE1.854/255。源角色身份/比例/脚线与足够运动留边仍失败，技术录像通过不使素材通过。完整 ZIP 与原 source receipt、逐帧问题、自看的深浅/局部/视频解码图均在同目录。
