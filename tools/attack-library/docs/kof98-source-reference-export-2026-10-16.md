# KOF98 原机参照导出与缺口

服务对象是 `street-fighter-naifrog-2d/experiments/learning-fighter`（4371）。知识库只保存原机参照、方法与证据；目标角色图片仍在私有游戏仓库，由游戏接入任务生成和验收。本轮不采用昨日固定四源／十二帧方法。

## 固定范围与交接

仅当前原作16人。串行顺序：Robert、King、Vice、Benimaru，然后 Kyo、Daimon、Joe、Ryo、Mai、Athena、Terry、Kim、Andy、Shingo、Leona、Iori。目标映射和当前需求快照在 `data/research/kof98-source-reference-audit-20261016/brief.json`、`requirements.json`。审计与原生提取分别由舰队中的独立任务承担；提取进程同时只处理一个角色。

接入任务为 `01a1442e-e6d2-7306-98ce-9e510888e020`。它读取知识库后自行复制到游戏项目；本任务不跨项目写入、不生成目标角色图。

交付根：`data/research/kof98-source-reference-20261016-r2/`。各角色 `manifest.json` 只在整角色本轮处理结束后生成；`clips/<collection>--<sourceClipID>.json` 与同名 JPG 分别是逐窗收据和独立图接触表。PNG 路径均相对交付根。已写出的逐窗收据不覆盖；后续修复使用新修订目录。角色 manifest 是汇总入口，不能据目录已存在判断交付完成。

## 现有原画与真实缺口

本轮只读清点快照中，四个索引合计1979个输入观察窗口、415703次刷新引用：actions 978、author 350、meter 171、edges 480。它们包含准备、重复动作、不同按钮、连携、条件失败与观察片段，不能相加称为1979招，也不是415703张独立人物图。

350个author计划候选均已有捕获ID。旧队列中大门连携、雅典娜空中超杀／水晶射击、取消、京／庵按住松开等“待采”描述已有后续原画，不应重复采集。当前actions／meter索引与旧总审计SHA不同，必须使用冻结索引逐ID核对。

尚未建立可复用完整P1专门窗口的上下文：被投、拆投、完整入场、time-over、完整败北表现。这不等于所有留存画面都没有该动作；应先查相同原角色的完整P1／P2片段，不能拿别的P2受害者、选角静帧或一个KO受击窗代替。胜利、眩晕、倒地起身、防御取消已有探针，应复用并检验成功条件。

全16角色的完整实际动作总数仍未知。author的具名输入尝试、edges的腾空／朝向／HP窄状态证据、meter的自然充气／低血观察，分别保留原声明，不能升级为招式、取消或命中逻辑全部验收。

## 可复现导出

使用已有本地 KOF98 NGM-2420、MAME0.289 原机截图、只读RAM／VRAM／调色板。没有新下载ROM、运行新对局或修改游戏内存。

```sh
python3 tools/attack-library/scripts/kof98-source-reference.py --characters robert
python3 tools/attack-library/scripts/audit-kof98-source-reference.py tools/attack-library/data/research/kof98-source-reference-20261016-r2 --characters robert --source-hashes
```

默认全16角色，严格串行；`--collections` 和 `--clip-pattern` 可先交付单个缺口。先在新 `/tmp` 输出目录试验修复，再封存新修订。不要覆盖已交付图片，不在另一个线程并行写同一角色。

`provenance.json` 固定原ROM ZIP SHA、精确观测时间基59.185606060843Hz、生产脚本冻结副本与MAME渲染器来源。普通／边界trace保留精确Hz；author／meter旧索引小数可能截断为59.185606，保留其原值，播放使用本版本的精确观测时间基，不能当成60fps或60张独立图。

每个clip包括：

- `frames`：按原图及原点合并的连续持帧元素；不跨不同原点合并，不补间。
- `roots`：逐刷新实体减镜头、再减首刷新位置的位移。腾空高度和镜头变化保留，不能把所有脚贴地。
- `perRefresh`：原屏路径／SHA、native screenFrame、sourceTick、phaseTick、RAM实体worldXY、cameraX、facing、VRAM／调色板SHA、绘制对象、每刷新原点及像素结果。
- `drawings`：原生分辨率RGBA裁图、包含尺寸的RGBA哈希、PNG SHA、alpha边界／边距；观察画布及裁图原点由渲染注册推导，不是原作者画布或恢复的骨骼。
- `parentCaptures`：父trace、实际Lua、输入／招式配置、捕获收据哈希；原索引元信息单列，动作语义没有证据则保留pending。

图像按裁图像素去重，位置和持帧仍逐元素保存。同一像素图的不同pivot不能丢失。`sourceDrawingID` 指观测到的原生RGBA图，不宣称恢复了作者原始绘画图号；源画面已含朝向时，不将镜像渲染数量称为新增作者绘画。

worldXY保留旧记录的有符号16位RAM整数读数；没有采集的小数寄存器、cameraY和完整物理状态不补造。原屏Y裁剪16像素的约定、实际VRAM位置和每刷新pivot共同保留原显示位置，不能把它称为已恢复整套原作世界坐标／碰撞系统。

## 像素与人物归属门禁

沿用本地已验证的Neo Geo C-ROM图块位面解码，再按实际VRAM顺序重建。公式依据 [MAME0.289渲染器](https://github.com/mamedev/mame/blob/mame0289/src/mame/snk/neogeo_spr.cpp)。固定HUD文字层读取本地原ROM `242-s1.s1`，按实际tilemap、调色板、低高半字节顺序重建；不再用矩形区域排除人物脚或头。

主体可见像素与原屏比较；后绘精灵、固定层覆盖处独立比较其合成像素。缩放遮挡尚未支持时明确不通过，不能把P2／特效整块遮掉当通过。原屏外人物像素来自VRAM重建，不能声称截图逐像素直接证明了不可见部分。

像素门禁只证明“选中的候选像素”正确。删除所有身体图块只留一块真实tile，仍可能零像素误差，因此它不能证明角色完整、部位归属或动作语义。`visualAnatomy: pending`、`allMovesComplete: false` 必须保留，后续对独立图做身体归属检查。

同色palette16有时含高跳残影，多组轨迹叠加虽与原屏正确，却不是单人体姿势。独立目检发现Robert末批高跳约22张此类组合；尤其 `super-forward/back`、`hyper-forward/back` 不可直接给imagegen当单人体姿势。先保留原组合证据，主实体／残影另分层并复核后才能作为出图参照。

## 已发现并修复的失败

1. 旧HUD矩形排除导致无法独立确认脚部像素。新增真实ROM固定层重建后，Robert空中A从7/110变为110/110，前向长跳85/85，不靠扩大排除区域通过。
2. r1曾用 `groupY < entityY` 排除倒影；低姿态倒影根Y=215、实体Y=216时会混入PNG。r2按相同图块code／属性、相反Y翻转识别早绘反射组。Robert蹲A由102/110变为110/110、蹲D107/110变为110/110、扫堂恢复231/240变为240/240；r1保留作失败证据。
3. 升龙身体越过屏幕顶部时，9位Y坐标回卷，旧筛选误判无人物。r2把回卷位置还原为负Y并在实体相对画布中重建；Robert623C／D均131/131。
4. 初版artifact audit只展开image／pivot，未检查持帧起始tick、aggregate pass或producerSHA。独立QA用 `/tmp` 变异副本复现；修订audit现已拒绝错误firstSourceTick／hold.sourceTick／nativeFrame、全0脚本SHA、将失败胜利窗伪称通过三类错误。

Robert首个r2整角色快照：119窗，107透明序列，280全局独立PNG；106整窗通过像素比较，19747/24821刷新通过。12个meter窗口缺镜头／朝向字段，1个胜利窗口有10个缩放遮挡样本未过。该统计仍不代表人物形体、全部招式或游戏逻辑已通过。

## 预览与验证边界

[本地参照预览](http://127.0.0.1:4321/kof-source-reference.html?character=robert&clip=actions--locomotion--crouch-rise)：原屏／透明候选并排，按原屏位置播放，支持正常、1/4、逐刷新、独立PNG和原始收据。已在用户电脑Chrome核对Robert蹲起：sourceTick2980→2981正确步进，1/4播放前进，tick2995蹲姿注册在实体原点。

`artifact-audit.json` 检验真实PNG、精确hold展开、连续原屏时间、逐刷新实体／镜头位移、门禁汇总、生产者及父源哈希；使用 `--source-hashes` 时重新核验每个引用原屏／VRAM／palette。原图原点不是判定框，重复持帧不是hitstop；命中停顿、状态、取消和具名招式成功仍需单独证据。

本轮未提交或推送；未关闭Epic。存在其他任务的未提交文件，只交付本次明确新增文件及源数据，不改动他人批次。

完整逐刷新JSON和原生PNG是本地大型证据目录，已加入本项目`.gitignore`；精简的`data/kof98-source-reference-delivery.json`、脚本、QA元数据和本方法记录单独保存，避免其他任务收尾时把数GB原画证据误加入提交。

## r3 分层修订与未注册参照

r2全16角色导出结束后，另起严格串行的`kof98-source-reference-v3.py`。r3位于`data/research/kof98-source-reference-20261016-r3/`，仅含有问题窗口的覆盖收据。接入时以r2角色manifest为底，按clip.id覆盖r3；只读r3会漏掉已经通过的普通动作。两个修订的PNG路径各自相对所属修订根，不能混用。

r3同时读取palette16与实际闪色palette17，按原VRAM图块签名和已观察的单人体相对实体位置选择主体，残影／独立技能特效保留原屏证据。候选注册残差仅用于判断归属，不能拿来移动图块、原点或root。存在并列候选则阻塞；不采用“永远取最后一组”的规则，Vice Decider最后一组是摆动线而非身体。13个精确原帧例外经过原屏、单组图、同窗相邻帧复核，固定snapshot／VRAM SHA及签名登记在`body-ownership-reviewed.json`。

缩放遮挡依本地原机zoomY ROM和硬件水平删除表逐列重建，不缩放PNG冒充原帧。Robert胜利窗原先失败的缩放样本修复；高跳tick3322为原屏多残影、透明参照仅一个完整主体，pivot[27,134]及root[-25,-63]保留原观察值。Benimaru 236A tick2936恢复palette17人体。首3角色45个r3窗口的实际PNG／持帧／源文件哈希审计通过，不代表45窗全部具有可注册完整序列。

旧meter无cameraX／facing时，透明图及持帧进入`unregisteredFrames`，保存绝对`nativeDrawingBounds`，`pivot`、`offset`、`roots`均为null；普通`frames`为空。缺失或归属不明的刷新仍留在`perRefresh`并记录问题，不假造图补齐。`sourceDrawingPixelGatePassed`只表示该张图在原屏中的可验证像素一致，与已注册的`pixelGatePassed`分开。部分超杀窗仍缺图，不能把已有独立PNG视为全序列通过。

原生预览新增“原机组合候选／主体分层参照”切换。已在用户Chrome实际验证r3 Robert高跳tick3322→3323逐刷新步进及1/4播放；并排原屏保留残影，右侧只有主体。四角色可查看对照图为`data/research/kof98-source-reference-audit-20261016/visual/r3-first-four-review.jpg`。

本轮最新冻结索引合计2004个观察窗口、428271次刷新引用。角色数为16，观察窗总数与独立图片数、可确认招式数仍分别统计。最终逐角色状态以精简交付索引及对应artifact-audit为准。

全r2原屏／VRAM／palette哈希核验完成，原始核验记录另存`r2/raw-source-audit.json`。独立QA随后强化ID、offset和空角色门禁：9个变异全部拒绝、2个正常对照通过、5个目录选择用例通过。新版全r2契约审计检出Athena `actions--ground-recovery-ab-v2--receive-sweep-recovery-AB` 的旧partial hold跨越缺图刷新（2922起3tick覆盖2924空图等）；原窗已标不完整，但部分hold仍不应使用。r3合并增加nativeFrame连续条件并重建该窗，必须按覆盖关系接收。r2失败收据保持不可变，不将原始哈希通过写作完整时序契约通过。其余15个r2角色新版契约审计通过。

## 全16角色最终导出清点

以下为r2底包加r3覆盖后的候选统计；“完整窗口候选”仍不等于人物解剖、招式成功或游戏状态全部验收。

| 原角色 | 目标角色 | 观察窗 | 去重RGBA裁图 | 完整注册单主体像素候选窗 |
|---|---|---:|---:|---:|
| robert | horse | 119 | 276 | 107 |
| king | cow | 114 | 249 | 106 |
| vice | fishing_expert | 118 | 377 | 110 |
| benimaru | weasel | 121 | 311 | 112 |
| kyo | naifrog | 143 | 356 | 123 |
| daimon | bull | 132 | 299 | 118 |
| joe | kangaroo | 149 | 262 | 139 |
| ryo | boar | 118 | 301 | 106 |
| mai | fox | 128 | 327 | 110 |
| athena | cat | 141 | 275 | 109 |
| terry | dog | 115 | 272 | 106 |
| kim | toad | 122 | 331 | 110 |
| andy | fish | 121 | 310 | 111 |
| shingo | rat | 114 | 310 | 105 |
| leona | tech_scarf_woman | 129 | 489 | 113 |
| iori | paul | 120 | 381 | 107 |

合计2004窗／428271次刷新引用／5126个按角色去重的RGBA裁图，1792个完整注册单主体像素候选窗，212个待补证据窗口。308个r3覆盖窗口严格按16角色串行执行；实际日志哈希与角色连续段见`data/research/kof98-source-reference-audit-20261016/serial-execution.json`。

逐clip缺口与源收据入口：`data/kof98-source-reference-next-evidence.json`。其中187个meter窗缺历史镜头／朝向等字段；没有完整未注册超杀窗可宣称通过。现有图像级通过刷新引用415084次、未产出人物图刷新引用13122次，均保留原屏和问题，不能填为重复上一姿势。

完整被投、拆投、入场、time-over和败北仍需专门原角色P1证据；完整动作总数、判定框、状态／取消／hitstop仍未验收。目标角色图由游戏接入任务继续生成，本任务的原机图不计为目标角色成图。

最终r3审计已完成：16角色、308个覆盖窗口全部产物契约通过，且所有引用原屏／VRAM／palette哈希重新核验通过。r2底包加r3覆盖后的2004个有效收据全部通过契约检查。验收快照见`data/research/kof98-source-reference-audit-20261016/final-acceptance.json`；图层缺口、图像级通过及完整时序候选仍按上述边界分别记录。

r2原生候选5309张已覆盖16角色的一轮只读接触表目检。末批Vice371张中22张高跳多身体、6张身体加独立绿色FX组合，另21张为单一原生精灵内部的弧线／速度笔触，不能据此剪掉原画线条。问题图均有drawingID→窗口／tick映射，原PNG及manifest哈希保持不变。该清点不把r3全部解剖、任意完整窗口或目标角色美术标为通过。
