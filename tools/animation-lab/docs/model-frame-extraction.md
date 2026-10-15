# 建模抽帧工作台

入口 `/model-frame-extraction`，主导航「建模抽帧」。本地专用资源入口 `/model-frame-assets/` 只读取私有街霸项目 `art/modeling/hunyuan31-20261015`，不把角色图复制进本公开仓库。路径校验使用 realpath，拒绝越界、符号链接逃逸及非媒体扩展。

当前读取 `frames-v6/manifest.json`；v1–v5 为失败实验，不能回退为已完成动作。页面每 5 秒检查清单，未生成时只显示真实标准色模型与源图对照，动作按钮禁用。不能把静态图播放当作已完成动画。

清单约定：`{rigged:true,visualAccepted:false,clips:[{id,label,fps,frames:["frames-v6/idle/001.png"],sheet,contactSheet,video,zip}]}`。所有路径相对固定私有根。只有存在的导出字段才显示对应下载，未验收动作始终标为候选。已接播放、暂停、逐帧、0.25–2倍速、时间轴及实际 PNG 接触表。

验证：Node语法与路径安全测试通过；实际Chrome页面中导航、源角色、真实标准色模型、禁用播放及生成中状态均可见。标准色模型头顶和右侧仍有明显浅色大块，美术未通过；未以技术页面可用替代美术验收。

当前v6为10动作240PNG，支持骨骼GLB下载。静态预览改material-v2/front.png，v1–v5不回退。

## 独立二维关键帧测试

新增主导航「关键帧动画测试」及 `/keyframe-animation-test`。只读取私有 `design-frames-v2/manifest.json` 的实际二维PNG序列；默认12FPS自动播放，可调8/6FPS及0.25倍速、暂停/逐帧与时间轴。原始sheet、接触表及MP4来自清单真实文件。此分支为imagegen二维位图，不是3D渲染，不可掩盖建模抽帧v6的头部/蒙皮拒收状态。
