# 拳皇98 全角色·全动作拆解清单（2026-10-16）

本清单是**拆解索引**，不是完成度声明。窗口数只代表已冻结的原机观察片段；招式实际触发、原生时序、判定框/有效帧、取消窗口、伤害与命中停顿逐窗口仍未关闭。

- 角色：16 名（用户选定目标集，非全角色表 38 人）
- 原机观察窗口：2004 段
- 引擎：MAME 0.289 / KOF98 NGM2420, 59.185606060843Hz original refresh
- 来源 SHA 与逐角色明细：`tools/attack-library/data/kof98-decomposition-inventory.json`

## 覆盖矩阵

| 角色 | 目标映射 | 观察窗口 | 观察刷新 | 源参考待补窗口 | 官方部分招式变体 | 普通/反应候选 | 已尝试必杀 | 明确 blocked | 全招式清单 |
|---|---|---|---|---|---|---|---|---|---|
| robert | horse | 119 | 24821 | 12 | 10 | 23 | 8 | 2 | 否 |
| king | cow | 114 | 23176 | 8 | 10 | 23 | 8 | 2 | 否 |
| vice | fishing_expert | 118 | 23706 | 8 | 10 | 23 | 8 | 2 | 否 |
| benimaru | weasel | 121 | 23808 | 9 | 10 | 23 | 8 | 2 | 否 |
| kyo | naifrog | 143 | 28898 | 20 | 8 | 23 | 6 | 2 | 否 |
| daimon | bull | 132 | 32613 | 14 | 10 | 23 | 8 | 2 | 否 |
| joe | kangaroo | 149 | 39903 | 10 | 10 | 23 | 8 | 2 | 否 |
| ryo | boar | 118 | 24573 | 12 | 10 | 23 | 6 | 4 | 否 |
| mai | fox | 128 | 26319 | 18 | 10 | 23 | 8 | 2 | 否 |
| athena | cat | 141 | 31752 | 32 | 9 | 23 | 7 | 2 | 否 |
| terry | dog | 115 | 22780 | 9 | 10 | 23 | 6 | 4 | 否 |
| kim | toad | 122 | 25804 | 12 | 10 | 23 | 8 | 2 | 否 |
| andy | fish | 121 | 24143 | 10 | 10 | 23 | 8 | 2 | 否 |
| shingo | rat | 114 | 22919 | 9 | 8 | 23 | 6 | 2 | 否 |
| leona | tech_scarf_woman | 129 | 27697 | 16 | 10 | 23 | 8 | 2 | 否 |
| iori | paul | 120 | 25347 | 13 | 10 | 23 | 8 | 2 | 否 |

`源参考待补窗口` 指 `kof98-source-reference-next-evidence.json` 中的 212 个基线缺口窗口；它与观察窗口不是同一计数，不可相加成招式数。

## 动作族语义

| 动作族 | 已观察内容 | 仍未关闭的验收门 |
|---|---|---|
| air | airborne A/B/C/D + CD | exact air normal identity and landing cancel |
| air-normals-by-jump-direction | air normals repeated per jump direction | exact air normal identity and jump-direction-specific frames |
| author-command-sweep | numbered original command sweep (motion + button + p-index) | real move trigger per command, move identity, native timing |
| desperation-and-max | DM (desperation) and MAX variants observed with charged meter | DM/MAX distinction, hit/whiff, guard and cancel conditions |
| ground-recovery-ab | probe batch | batch-specific validation |
| ground-recovery-ab-v2 | sweep knockdown plus AB ground recovery | recovery input legality and invulnerability frames |
| guard-cancel-ab-back | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-back-charged-daimon-a-v6 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-back-charged-v5 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-back-v2 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-forward | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-forward-charged-daimon-a-v8 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-forward-charged-v5 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-forward-charged-v6 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-forward-charged-v7 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-ab-forward-v2 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-cd | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-cd-charged-daimon-a-v6 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-cd-charged-v3 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-cd-charged-v4 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-cd-charged-v5 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| guard-cancel-cd-v2 | guard cancel into CD / AB variants | actual guard-cancel window and meter cost |
| locomotion | ground movement, turn, crouch transition, jump, roll, taunt | motion trigger per window, exact state durations, landing frames |
| meter-other | metered special observations | meter cost and cancel conditions |
| normals | stood far/near and crouching A/B/C/D + CD | exact normal identity, range split, active frames |
| reaction-variants | air/crouch hurt and air guard variants | hurt state enum, air guard truth, launch direction |
| reactions | guard high/low, light/heavy receive, sweep knockdown rise, stun/KO attempt | guard direction truth, hurt state enum, stun and KO transitions |
| stun-heavy-probe | stun chain probes | stun threshold and escape |
| stun-heavy-probe-v2 | stun chain probes | stun threshold and escape |
| stun-probe | stun chain probes | stun threshold and escape |
| stun-uppercut-long-v2 | stun chain probes | stun threshold and escape |
| stun-uppercut-probe | stun chain probes | stun threshold and escape |
| sweep-recovery | probe batch | batch-specific validation |
| turn-experiment | turn, cross-turn and back-turn experiments | turn legality, cross-up and facing transition |
| victory | round-win attempt and approach | real round-end condition |

## 结构性缺项（官方子集与本批采集都没有覆盖）

- all named normals and their near/far range variants
- command normals (e.g. forward+button moves)
- all normal, command and air throws
- all special follow-up branches and rekkas
- specials and supers absent from the SNK subset
- MAX variants plus hit/whiff/guard/cancel conditions
- actual native timing and complete sprite frame coverage

## 当前硬阻塞

- 36 个超必杀需要**自然气槽**才能观察；拒绝写 RAM 改气槽/血量，因此保留 `blocked`，不用改内存取得，也不拿准备动作冒充招式。
- 源参考缺口流水线中断：8/16 角色已完成 observe→export→audit，剩余 8 角色（mai、athena、terry、kim、andy、shingo、leona、iori）待续；mai 的 trusted calibration 登记与导出器签名不一致，必须先按同一冻结 VRAM 重新推导签名/偏移，不能直接放行。
- 全部 16 人 `moveVariantsVerified=0`、`completeOriginalCharacters=0`；必杀采集只证明输入已投递与原图存在，不证明招式真的触发。

## 复现

```sh
python3 tools/attack-library/scripts/kof98-decompose-inventory.py
```
