# 拳皇98：16人全动作输入采样与逐招复核

本批接续原版多人基础窗口，继续实际操作原版对局，补通用动作、具名角色招式、自然气血超杀和前置条件。原版角色固定为 Kyo、Benimaru、Joe、Kim、King、Ryo、Vice、Shingo、Iori、Terry、Mai、Athena、Leona、Daimon、Andy、Robert。原版 MAME0.289、ROM SHA 与旧基础收据相同；没有用改编人物代替原作角色。

## 查看与复现

本机入口：`http://127.0.0.1:4321/kof-coverage.html`，内容选择“本轮全动作采样”。全部16人都在角色选择中。刷新按钮读取实际完成批次；选择动作后按原59.185606Hz播放，也可逐刷新检查。准备窗口、失败输入与已观察状态分别标注，派生招式显示前置链。

本轮数据和脚本：

- `data/research/kof98-actions-20261016/`：五类常规输入、预蹲扫倒和系统动作探针；源/批次/失败记录由各批次保存。
- `data/research/kof98-author-20261016/`：原作者表修复后的350个非超杀输入候选，350个唯一候选均已取得连续原画。前招链、弱强、方向替代是输入候选的展开，不等于350种独立招式。近距反击、抓取和空投有另存条件补采。
- `data/research/kof98-meter-20261016/`：EXTRA自然蓄气、自然低血DM/SDM；官方36按钮变体与作者新增变体去重处理。各版本的实际成功、血气条件不足和指令失败分开。
- `data/research/kof98-edges-20261016/`：转身、前后/短跳空中ABCD/CD、下压后跳跃尝试、蹲/空中受击与空防。每人发布30个输入窗口，旧蹲反应被新预蹲版本替代但不删除。
- `data/research/kof98-source-row-fixes-20261016/`：真实原PDF页与跨行修正，冻结的原始OCR/结构提取不改写。
- `data/research/kof98-full-action-qa-20261016/`：打包审计、界面切换与根代理独立视觉复核。

运行各分支 `scripts/kof98-{actions,author,meter,edges}-run.py`；参数见各分支README/脚本。最后运行：

```
python3 tools/attack-library/scripts/audit-kof98-expanded.py
node --test tools/attack-library/tests/kof-collections.test.mjs tools/attack-library/tests/kof-timeline.test.mjs
```

每个真实对局保存实际执行的source.lua、SHA、普通I/O变化、只读trace、screenFrame和原生画面。完整PNG/VRAM/palette/模拟器配置在本机保留并被gitignore隔离，体量为数十GB；远程批次保存源、输入、收据、索引和代表视觉证据。其他机器需要按收据复采原始画面，不能把索引路径存在当资源已交付。

## 发现并修复的真实问题

- 原作者PDF有三处跨行错误：特瑞 Power Charge 为41236+B/D；莉安娜 Gliding Buster 要先 Ground Saber D；金 Ten Sou Zan 要先 Hi En Zan D。页面使用整页看图后的覆盖层，原始抽取保留。
- 双236不留中立时，实际原图只出现普通拳。两个236之间加入3个原生刷新中立后，草薙京无式出现黑闪、火柱和连击，红丸出现雷球。该修复只说明本次输入序列可用，不是引擎最短窗口反编译结果。
- EXTRA模式选择有菜单时序要求，必须看绿色EX。真实ABC蓄气会出现MAXIMUM。自然打到19/21血不自动等于强化超杀；红丸9血对照才出现不同超闪/金橙雷球。
- HUD蓝色“1 ADV”是模式标志，不能当可用气stock。防御取消需要真实攒到stock；之前没有气的取消尝试明确保留为条件失败。
- 同帧短按Down+D曾只得到站立受击。P2先蹲15tick再D，东丈才出现命中→横躺→起身，之后推广16人并另验。
- AB受身必须比较无AB对照，不能把普通起身签为成功。东丈v2在实际落地窗口AB后出现后滚、提前恢复守架，才允许扩展。
- KO后原生命字节可能为251/255。保护停止条件与胜利视觉验收分开；+120/+300可能仍是KO PERFECT，需要继续取得胜利姿势。
- 普通前走不能穿过对手碰撞体，不计转身；P2真实跳过站定P1才取得朝向变化。空投也需要双方真正处于正确空中距离，空中普通拳不能冒充抓摔。
- 并行采样隔离目录、batch锁和唯一原子临时名。SIGTERM可能让MAME正常退出，父runner退出与CSV/条件回执都要检查。旧失败、损坏和不足窗口保留隔离，恢复不覆盖有效批次。

## 实际视觉与界面证据

根代理实看了东丈风柱A/C的起手、风柱和P2受击；草薙京无式与红丸雷光拳的原版超闪/招式画面；东丈转身和完整起落；预蹲轻重受击、空中受击及蓝色空防圆。两张16人反应联系表核对了全部唯一角色的原画面身份；这只证明所查看代表帧的身份/状态，不能扩大为所有动作完整验收。

实际浏览器逐一切换16人、等待各自原帧加载，无错误且没有代播角色；另实播东丈风柱的连续源tick。原表三处更正也在界面逐一查验。精确记录见 `ui-switch.json`、`ui-source-corrections.json` 和视觉联系表。

## 状态边界

`audit.json`给出当前快照的角色、窗口、连续刷新与PNG审计数；`authorCandidateCoverage`给出350候选是否逐ID齐全。它不证明招式身份、完整招式终止、投技目标、格挡成功或强化版本差异。原作者指令候选、实际采样、触发观察、完整透明拆帧、原始判定恢复与游戏战斗逻辑分别记录。本批不把原版全招式完成数虚增。

仍未观察到的动作继续保留明确条件/输入/原图，而不以待机片段、普通攻击、准备动作或改编AIR组冒充。新经验已进入 arcade-original-runtime 技能的版本限定参考。

## 当天收尾快照

按用户最新要求，本日只收尾这16人，其他角色不启动。常规分支完成16人×10组160原版对局，含探针179个采集包219759连续原生帧；三种防御取消45/48观察成功，Vice/Iori/Daimon前AB仍未触发，眩晕未建立。

作者招式350个候选逐ID齐全；51张联系表/350行已实际查看。6项限定触发观察、28项未观察（24空投、Daimon Nekko B/D、King DoubleStrike B/D）、316项保留逐招/阶段核对。超杀分支202批=72官方+76作者新增+14临界血修复+40条件分支；188批有触发观察、4批Athena发射不确定、10批未观察目标（Daimon连续投只首投8批、Kim近空2批）。这些不是原版全招通过数。

完整失败和下一步条件分别见 actions/final-sixteen-matrix.json、author/condition-followup-matrix.json 和 meter/final-receipt.json。14项播放器/采样审计测试通过；技能通过quick_validate。完整原画打包CRC与序列SHA见最终audit.json。
