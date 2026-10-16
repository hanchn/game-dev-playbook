# KOF98 原版16人招式数据研究

本批次实际落盘7份固定提交源码、2份SNK官方页面、解析脚本、官方部分必杀技结构数据、16人证据矩阵，以及MAME0.289只读共有判定记录器。未修改角色、catalog、registry或已有原ROM。

## 已有可复用实物

- Jesuszilla `mame-rr-scripts` commit `c35f3541b437fc4f1870ffd98e9d89f25e9ecc0e` 的原NeoGeo KOF hitbox viewer；peon2 `fbneo-training-mode` commit `bf3541e1d4f586f76f401617af4fa842447591de` 的同系列解码器。均明确有kof98 profile，是原版模拟器内存结构研究，不是MUGEN状态文件。
- dev-dem `kof-training-mode-FBNeo` commit `132f382294eccf4edd23a00f4f27e0eb83030bc9` training.lua和player/profile/game/hitboxes四份lib。保存来源作比较，未直接加载训练模式；训练模式含写血量/训练行为，不能当只读采集运行。
- 全部原文件字节SHA、版本与来源见source-receipts.json。未以GitHub默认master引用冒充固定版本。
- SNK官方字符1/2页面的37个角色部分必杀技区块已解析为official-selected-moves.json，保留原命令图标路径，未擅自把Wii按键字母重命名为NeoGeo A/B。target16-evidence-matrix.json匹配本次全部16名。官方页省略普通技、投技与招式分支，因此16/16官方部分参考存在，不等于16/16全部招式已恢复。

## 原版可靠字段与边界

来源共有玩家基址0x108100，P2步长0x200；x/y有符号16位分别+0x18/+0x26，朝向+0x31 bit0，active status+0x7C。KOF98 phase0x10B094，cameraX0x10B0CC。判定5字节记录位于+0x90/95/9A/9F/A4，内容id、dx、dy、rx、ry；dx/dy有符号8位；status bits控制激活，attack在bit1条目被原脚本当ghost过滤。ID分类由kof98 profile读取，不把所有非零条目都称伤害框。

kof98-readonly-box-recorder.lua为MAME0.289适配，逐帧写两名玩家原字段与原框偏移/半径；无ROM/RAM写入，无输入、无强制姿势、无无限血。它不包含特殊投技监视、抛射物对象遍历、伤害数值、状态转移表、输入识别逻辑或完整动画表解码。不把box记录数称招式数，也不把status字节称角色动作ID。

## 未恢复部分

这些源码未提供全角色ROM动画指针表、命令状态机、完整动作名称映射、角色ID字段或完整帧时序。训练脚本存在并不代表完整反编译。需要依靠本仓现有原版普通输入菜单/VRAM采集，对每个招式动作保存输入序列、原screen帧号、唯一图像持帧、实际sprite属性/调色板与判定轨迹，再人工对照。固定palette0x10仅已知Kyo范围，不能无验证套全部16人。

原脚本有writebyte清投技标志分支，且训练模式默认含写入；新的只读记录器刻意不移植这些分支。原README/脚本保存研究原件，不建议直接运行原训练脚本冒称普通输入证据。

## 实际工具失败保留

初次MAME探针误用旧API emu.register_stop，0.289该字段nil导致启动异常，失败命令/输出保留probe-command-result-failed-register-stop.json。删除仅用于close的无效hook，改为每60帧flush后复测。当前no-input探针仅用于验证适配脚本可运行和字段有记录；启动/attract不计任何人物玩法或招式通过。

来源：[Jesuszilla原仓](https://github.com/Jesuszilla/mame-rr-scripts)、[peon2原仓](https://github.com/peon2/fbneo-training-mode)、[dev-dem原仓](https://github.com/dev-dem/kof-training-mode-FBNeo)、[SNK官方1](https://game.snk-corp.co.jp/event/virtual-console/kof98/index_kof98-chara1_j.html)、[SNK官方2](https://game.snk-corp.co.jp/event/virtual-console/kof98/index_kof98-chara2_j.html)。

复测MAME原进程exit0，10秒无输入启动得到592条有效JSON记录。启动RAM自检阶段出现0x55/0xAA填充值，所以该阶段的非零box条目不是有效角色判定，不拿非零数量证明解码成功；实际战斗必须按phase和原游戏画面二次验证。另一次缓冲输出在进程退出时仅落部分记录，保留不完整文件；记录器已setvbuf('no')，新592行全部JSON解析通过。未与root的实际普通输入采集混用。

## 追加16人普通输入采集清单

`executable-move-checklist.json` 为16人共155个官方部分招式按钮变体；每条保存官方原命令图标、方向串、右朝可用P1方向field序列、按钮、近身/空中/能量条件和观察窗口。3帧方向、70帧蓄力、90帧观察均为实验采集设置，不是原ROM输入宽容窗口。Wii1/2/A/B至NeoGeo A/B/C/D是独立控制器适配，仍需实际出招姿态确认。Joe Hurricane实际motion为41236，脚本断言防止错填236。

另外每人列stand-far/stand-close/crouch/jump-neutral/jump-forward各ABCD、近身C/D投技候选与P2重攻击受击设置，共368条明确未确认候选。这些是覆盖测试点，不冒称命名招式已恢复；近/远距离、投技成立、空中能否出招必须实测。重受击由P2真正击中并观察血量/击退，不靠写RAM强置受击状态。

SNK主页面已保存并SHA记录，支持ADVANCED真实气槽存量与EXTRA蓄气/MAX条件。超必杀气不够应记blocked-not-tested；不能用普通拳替代后标通过。全表仍明确缺完整普攻名称、特殊技、全投技、派生链、未列必杀/超必杀、MAX变体/命中与取消条件及逐招原生帧表。原SNK手册扫描PDF实际下载403，浏览器读取超大小限制，失败记入来源收据，未将搜索摘要当已取得完整手册。

## 原始作者扩展表（新独立文件，不改155清单schema）

新取得NEO Encyclopedia《The Unofficial SNK Neo Geo Games Encyclopedia of Moves & Codes》原版KOF98招式页PDF实物，5,892,241字节/17页，原打印日期03/01/04、作者站sindoni.altervista.org。它属于非官方原始作者游戏研究，保留来源身份，不冒称SNK资料或ROM动作表。SuperCombo/GameFAQs本次下载实际403，未放弃原始作者证据，也未把403页面当出招表。

`author-guide-extended-checklist.json` 包含16人231条版面动作行，其中228条有名、3条名称未解析（Terry页3底部多串HCF，Leona/Kim的跨行派生）；未解析行保留并不自动执行。覆盖命名投技、特殊技、必杀、派生、超必杀与DM/SDM条件说明。简单动作生成segmentCandidates，复杂多按钮/可选方向保留原token并阻断自动扁平化。派生有parent动作/空中/近身等原始文字前置条件；仅有局部segment不代表完整连招计划。

`decode-encyclopedia-layout.py` 解析PDF嵌入图片：按Indexed/Gray颜色表还原RGB、精确像素SHA匹配实际看过的符号表；动作方向有整串48px及更宽图像，不能只识别单箭头。原PDF内inline原始图像竖向方向与最终画面相反，符号预览必须flip到实际页面方向。已真实看渲染page02，核对Kyo跳↓C、↘D、236A、63214派生、2141236超必杀等。命令符号和PDF原版面全部保留；不将图片OCR猜测当确定命令。布局异常行/部分变体仍需要人工复核，231行不等于231个完整唯一招式。

`official-author-command-comparison.json` 对每位角色逐条保留155官方按钮变体与作者表是否存在相同motion/button；日文名与罗马字名尚未全部人工对齐，故相同motion不能直接证明同名招式。未匹配是复核队列，不擅自裁决官方/作者任一方错误。作者表比官方简表更广，但仍不证明所有普通技、MAX视觉变体/取消/命中分支均完整；fullOriginalMovesetVerified保持false。
