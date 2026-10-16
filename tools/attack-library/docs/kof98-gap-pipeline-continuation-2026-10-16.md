# KOF98 源参考缺口流水线续跑与校准签名修复（2026-10-16）

关联 Epic：learning-fighter 全 16 角色目标图生产。本文记录本轮把中断的源参考缺口流水线重新跑通的过程、被证实为陈旧的校准字段，以及新增的可见像素校验方法。原始 Native 图、VRAM、调色板、trace 全部保留在本地，不复制进知识库。

## 本轮完成的范围

- 全角色/全动作拆解清单：`docs/kof98-full-decomposition-2026-10-16.md` + `tools/attack-library/data/kof98-decomposition-inventory.json`。16 个选定角色、2004 段已冻结原机观察窗口、集合来源 SHA、逐角色官方部分招式变体/普通候选/必杀尝试与 blocked 计数、以及每族动作仍未关闭的验收门。
- 缺口流水线 16/16 角色串行跑完（observe → export → audit），`r5/artifact-audit.json` 覆盖 16 角色且全部 `artifactAuditPassed=true`。
- 新增校准重推导工具 `scripts/audit-kof98-trusted-calibration.py`，把 5 条 trusted 校准项从各自冻结证据重新推导，并用可见像素校验确认组归属。

### 续跑前后计数（`continuation/progress.json`，基线 212 窗口）

| 计数 | 续跑前 | 续跑后 | 基线 |
|---|---|---|---|
| 历史元数据已恢复 | 82 | **186** | 187 |
| 严格可见像素通过窗口 | 75 | **170** | 212 |
| 原生时间表完整窗口 | 77 | **173** | 212 |
| 剩余元数据窗口 | 105 | **1** | — |
| 剩余严格像素窗口 | 137 | **42** | — |
| 剩余原生时间表窗口 | 135 | **39** | — |

唯一剩下的元数据窗口是 daimon 的 `actions--reactions--stun-ko-attempt`（差 1 个采样）。剩余像素/时间表窗口全部落在带主体归属或多组歧义的窗口上，未用容差豁免。`allMovesComplete` 与 `targetArtworkComplete` 仍为 false。

## 失败：导出被自己的校准登记挡住

上一次流水线停在 mai 的 export，报 `ValueError: Trusted calibration group signature changed`（`kof98-source-reference-v5.py` 的 trusted 分支）。5 条 trusted 项（全部属于 mai）的 `selectedGroupSignature` 在本机任何解码方式下都复现不出来：

- 用冻结 VRAM + `kof98-source-reference-v5.objects()` 解码，选中组 24 个对象，签名 `e83f8293…`；登记值 `f0e81801…`，5 条完全相同。
- 用旧 receipt 的 `bodyObjects`（22 个对象）、按列排序、改属性掩码、换 JSON 键序等变体，均无法得到登记值。因此登记值不是"另一种正确算法"，而是没有可追溯来源的陈旧/占位值。
- 同一批的 `selectedGroupOffset` 反而是可复现的：用 receipt 自己的 `entityNativeScreen` 作原点，5 条全部精确得到登记值 `[-24,-93]`。这证明锚点约定没错，只有签名字段坏掉。

修复不等于"改一个数字让校验通过"。做法是：把签名与偏移一起从**同一份冻结四元组**（VRAM、调色板、原生截图、trace/box-observations）重新推导，并要求组归属先通过独立校验，才写进新登记修订。

## 方法：可见像素校验（不依赖相机约定）

原先无法判断"登记签名"和"现算签名"谁对，因为两者都只是哈希，不能证明选中组真的是原机屏幕上的身体。新增的校验绕开原点约定：按 MAME 硬件行为把每个选中对象画在**它自己的原生列 X** 上（这就是硬件使用的位置），得到绝对屏幕层，再与原截图逐像素比较不透明像素的精确颜色一致率。

mai 实测：

| 项 | 对象 | 不透明像素 | 精确一致率 |
|---|---|---|---|
| guard-cancel-ab-back-charged-v5 | 24 | 2272 | 0.9476 |
| guard-cancel-ab-forward-charged-v7 | 24 | 2272 | 0.9476 |
| guard-cancel-cd-charged-v5 | 24 | 2272 | 0.9476 |
| author-06-236-A | 24 | 2272 | 0.9872 |
| author-06-236-C | 24 | 2272 | 0.9982 |

对照：同帧 group290 只有 397 个不透明像素（不可能是身体）、group275 一致率 0.764（残影）、group100 一致率 0.443（错位）。因此"选中组 = 屏幕上身体"是可判定的，不需要靠看一眼。

不足 1.0 的差值来自被后绘层/HUD 遮挡的像素，不是把容差当豁免：报告保留每个像素计数与一致率，不四舍五入成"通过"。

## 新登记修订与文件边界

- `r4-body-ownership-reviewed.json`（v1）**不改动**，作为被取代的证据保留。
- 新增 `r4-body-ownership-reviewed-v2.json`：5 条 trusted 项写入重推导后的 `selectedGroupSignature`、`selectedGroupOffset` 与 `calibrationDerivation`（原点约定、解码器/签名脚本 SHA、冻结 VRAM/截图/trace SHA、审阅图路径与 SHA、被取代的旧值）。导出器默认改读 v2，并新增 `--manual-registry` 显式指定。
- 审计报告与逐项三联审阅图在 `data/research/kof98-source-reference-audit-20261016/calibration-audit/`。

## 仍然存在的边界与陷阱

1. **跨批次 VRAM 不通用**。trusted 项登记的 `vramSHA256` 指向旧的 `kof98-actions-20261016` 抓取；后续"缺口重观察"是另一次独立抓取，tick 号不同源。v5 在 trusted 分支里按 `sourceFrameImage` 所在目录读 VRAM 并比对哈希，因此同一份登记在两种批次里不是同一把钥匙。实测后果：mai 的 5 条 trusted 入口在 9203 帧里只命中 1 帧 `exact-native-frame-visually-reviewed`，其余 5 帧落到 `manual-review-native-file-or-group-hash-mismatch`（`pending`），另有 1346 帧仍由 catalog 正常解析。这不是把哈希放宽的理由，下一步应让手工帧改成按"冻结来源 provenance + 组签名"匹配，而不是拿新观察的 VRAM 哈希去对旧登记者。
2. **旧动作批次 trace 没有 cameraX**。`kof98-author-20261016` 与部分 `kof98-actions-20261016` 的 trace 只有 `p1x/p1y/face/input`，相机在 `box-observations.jsonl` 的同 tick 记录里。相机只读、不推断、不给默认值；两处都缺就记为 `failed-trace-without-camera`。
3. **签名相等只说明同一组图块**，不说明招式触发、命中或时序。窗口计数不是招式数。
4. **不改 RAM 取气槽**。36 个超必杀继续 `blocked`，用"自然气槽"以外的办法取得会污染整条证据链。
5. **流水线必须串行**。同一时刻只允许一个原机采集/主体生产角色；`serial-pipeline.lock` 是排他锁，残留锁要确认进程真的结束了再处理。

## 复现

```sh
python3 tools/attack-library/scripts/audit-kof98-trusted-calibration.py
python3 tools/attack-library/scripts/kof98-gap-pipeline.py --characters mai
python3 tools/attack-library/scripts/kof98-gap-pipeline.py --characters athena terry kim andy shingo leona iori
python3 tools/attack-library/scripts/kof98-decompose-inventory.py
python3 tools/attack-library/scripts/kof98-gap-pipeline.py --progress-only
```

动态计数以 `data/research/kof98-source-reference-audit-20261016/continuation/progress.json` 为准；本文表格是 2026-10-16 16/16 跑完时的快照。`allMovesComplete` 与 `targetArtworkComplete` 仍为 false。
