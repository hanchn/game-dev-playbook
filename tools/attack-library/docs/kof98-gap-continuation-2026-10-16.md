# KOF98 源参考缺口续作（2026-10-16）

关联 Epic：learning-fighter 全16角色目标图生产。知识库交付原机参照；私有游戏线程负责目标角色图生成及接入。原机源证据、原生透明图、动作语义和目标图验收分别记录。

## 基线与当前进度

首交 r2+r3 覆盖16角色、2004观察窗口，仍有212个窗口缺口：187缺同帧相机/朝向/自动动画计数等元数据、25普通窗口存在主体归属/调色板/原屏比较问题。2004窗口不是完整招式数量。基线不可变见 `../data/research/kof98-source-reference-audit-20261016/first-delivery-next-evidence.json`。

动态进度以 `../data/research/kof98-source-reference-audit-20261016/continuation/progress.json` 为准。它分别计数元数据恢复、严格可见像素通过、原生时间表完成；不把屏外VRAM几何计为截图像素证明。独立被投、拆投、完整出场、时间到、完整败退上下文不在212基线中，另行观察。

## 串行复现与不可变交付

- `scripts/kof98-gap-pipeline.py` 逐角色 observe → export → artifact audit；同一时刻只运行一个原机采集/主体生产角色。独立QA只读已完成角色。
- `scripts/kof98-gap-observe.py` 复用原始普通菜单与招式输入，添加只读同帧camera/facing/auto/59.185606060843Hz及1792字节RAM。新画面、新trace、新VRAM、新palette一起保存，绝不把新元数据贴到旧截图。
- 有效新捕获在 `data/research/kof98-gap-observations-20261016-r4-headless/`。旧 `...-r4/` 第一Robert启动失败留存：默认SDL无显示设备，exit255且无有效trace。子进程设置 `SDL_VIDEODRIVER=dummy` / `SDL_AUDIODRIVER=dummy` 后有效，不需改变系统配置。
- 最终续作覆盖层为 `data/research/kof98-source-reference-20261016-r5/`，合并顺序 r2 → r3 → r5；r4仅调试失败版本，不导入。
- 每clip记录源文件SHA、PNG原生尺寸/alpha边界、pivot/offset、每tick根位移、持帧、源drawing映射和生产器SHA；冻结生产器/审核登记表按SHA保存。已有receipt不覆盖。

## 已确认的质量陷阱

1. Robert超杀缺失706帧由palette19造成；原屏人物实际存在。12个新窗口5064刷新在声明比较范围全部通过。palette254为地面反射，不能并入身体。
2. King两MAX窗口各5帧完全在屏幕上方。原生图和entity-camera坐标可从同次VRAM/RAM重建，严格像素gate仍false。必须保留offscreen-native-vram-only标签。其他窗口出现相同drawing不自动证明这些源tick的截图。
3. Benimaru早期236C单帧为palette18；新超杀4窗共96帧为palette43。逐帧原屏/相邻code、attr、zoom证实，后续需要按角色和源帧限定修订，不能全角色开放palette43或把缺图说成不可见。
4. Kyo部分MAX真实闪光为palette20/21。大面积palette38火焰与身体混合另需主体归属证据，不能把全组火焰当人体。
5. Athena恢复动作13刷新经原屏/全palette/角色code核实确实未绘P1。登记表匹配确切snapshot/VRAM/实体/镜头/朝向SHA。保留visibilityFrames、真实roots、null image，不借邻帧、不做透明占位PNG，不从消失推断无敌状态。
6. 分身/残影/飞扇不能依据最后group选择身体。确切source签名+原点例外审核可选真身体；Mai可信seed还锁定exactAnchorOnly；Athena实体坐标先于VRAM跃迁时保留大pivot，不能吸附脚底。
7. Daimon旧stun/KO尝试tick4342仍有1个固定层像素不符(7,92)。临近VRAM/fixedpalette不能证明扫描线drawsource；保持失败，未以容差豁免。
8. 0x1081EC只是旧字段timerRaw，已见HUD49但该word为0，不认定回合倒计时地址；0x10817C仅原始box状态，不是已恢复招式enum。
9. 新observer结构完整也不证明指令成功。审计要求ordinary结束条件、完整observe0..319、trace/样本集同run匹配，拒绝KO/timeout/截断；legacy Kyo301帧须独立适配与validator。
10. Robert/King较早r5每刷新省略autoAnimationCounter/observedRefreshHz/gamePhaseRaw导出字段，原始新trace完整。后续用新修订补齐，不能说原数据缺失或篡改既有receipt。

## 验证与限制

审计脚本 `scripts/audit-kof98-source-reference.py --source-hashes` 同时校验PNG、drawing/持帧、每刷新元数据和源文件SHA。追加变异测试拒绝absence登记表调换、零可见像素伪通过、KO/timeout/截断/假尾帧及新receipt调换。报告在continuation目录。

语义层中的招式实际触发、全部招式分支、被投/拆投、判定框、状态转移、取消窗口和命中停顿须有各自证据；所有原生图通过也不自动关闭语义任务。当前仍在执行，不声明Epic完成或目标角色图全部完成。
