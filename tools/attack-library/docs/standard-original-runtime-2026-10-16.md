# 原街机本地运行与学习证据（2026-10-16）

入口：`http://127.0.0.1:4321/?tab=catalog`。标准模式提供街霸冠军版、拳皇98、合金弹头、三国战纪原游戏；“全部街机 · 本地窗口标准模式”打开 `/native-play.html`，支持全榜校验和本地MAME窗口。宝可梦Empress用原Node/Web引擎独立运行4369，不是ROM模拟。

## 当前可证实的范围

|层级|本次证据|
|---|---|
|来源与原包|100榜单标题保留，观察100个来源页面；98个原ROM、33个父/BIOS/device ZIP实际下载，CRC/SHA/原成员收据保留|
|无需ROM|MAME0.289原驱动声明Pong/Breakout无ROM和磁盘需求，不伪造空ZIP，不把源网站无链接误判成不可运行|
|版本匹配|官方Homebrew MAME0.289安装成功；独立set-verification报告当前99/100依赖通过；Dragon’sLair尚缺完整CHD，下载另记|
|浏览器原玩法|SF2CE、KOF98、MSlug、KOV四款真实投币、开始、原场景/对局、受控移动及至少一种攻击通过基础冒烟测试|
|原生窗口入口|网页实际启动Pac-Man进程并经自己的停止入口结束；ROM校验通过。原生窗口的逐款视觉/输入验收仍未完成|
|原版素材逆向|已有SSF2T只读原帧研究；本次新增100原驱动输入、屏幕、ROM/BIOS/磁盘元数据，不将它们称完整游戏反编译|

四款浏览器验收详见 `data/research/standard-play-qa-20261016/qa-summary.json` 和45文件SHA索引。MSlug观察的是投弹，尚未逐招验证射击；SF只证明出拳姿势，未把未观察的命中写成通过。未测完整招式、整场通关、双人、手柄与长期稳定。`runtimeVerified` 在这里明确仅表示基础玩法冒烟；`fullGameVerified` 和 `reverseEngineeringComplete` 仍为false。验收overlay独立于下载清单，避免重新扫描覆盖实测。

## 实际失败和修复

- EmulatorJS4.2.3 `setupKeys`遍历四名玩家；只配0/1会启动前异常。显式补四张独立控制映射，避免上游修改配置时污染原registry。
- 默认BIOS解压为散文件，但FBNeo需要原ZIP。直接externalFiles写ArrayBuffer又被当前上游FS接口拒绝，留下真实0字节文件；文件“存在”不能算成功。派生容器把完整原BIOS ZIP作为成员，通过目录解压分支写入Uint8Array，原ZIP逐字节一致，实际FS大小正确。
- MAME与FBNeo的PGM BIOS并非相同集合。当前FBNeo还需ddp3_bios.u37和bios.u42；保留原MAME包，另存固定来源/提交的完整FBNeo包，对照CRC，实际KOV成功。
- 外层按钮Enter默认激活会被模拟器键盘preventDefault阻断；在按钮自身处理Enter/Space。鼠标短点击可能在一帧前已松开；保证最小按压时长，支持持续按住，记录down/up/heldMs、visibility与blur释放。
- 原EJS工具栏的暂停在本次自动操作中不稳定；新增外层暂停/继续按钮，调用原官方pause/play接口并记录状态。每次截图后冻结，防止工具间思考期间CPU把角色打败。
- 后台页可能黑屏/节流。一次只测试一个可见核心，避免把演示AI、选人倒计时自动选择、位置因CPU推挤改变误称玩家操作。
- KOV原版默认3枚币一份信用，`1/3`不是投币无效。补提示，保留原游戏规则。
- 不同系统按钮用途不同。NeoGeo四键与街霸六键分别标注，MSlug投弹不标“轻拳”；未观察的按键强度/招式继续保留待验收。

## 复现和证据边界

```sh
python3 tools/attack-library/server.py
python3 tools/attack-library/scripts/import-emulatorjs-standard.py
python3 tools/attack-library/scripts/prepare-standard-games.py
python3 tools/attack-library/scripts/audit-standard-games.py
python3 tools/attack-library/scripts/inventory-top100-local-runtimes.py
python3 tools/attack-library/scripts/acquire-observed-arcade-candidates.py --acquire pacman,galaga
python3 tools/attack-library/scripts/package-derived-arcade-runtime.py
python3 tools/attack-library/scripts/audit-top100-mame.py --metadata
node --test tools/attack-library/tests/*.test.mjs
python3 -m unittest discover -s tools/attack-library/tests -p 'test_native_runtime.py'
```

原ROM与派生运行资产保留本地，提交代码、固定来源、SHA、参数与证据。MAME窗口启动API只收全榜ID白名单，固定no-shell argv，loopback同源、JSON体积限制、先验证再启动，只停止本启动器自己的进程；6项mock边界测试和实际启动/停止路径分开记录。此处不是通用远程命令服务。

学习机器人已独立创建：**拳皇动作学习机器人 · 奶蛙验证**。来源是原《拳皇98》的动作/精灵图/持帧表，奶蛙只是应用对象。学习原生尺寸、地面锚点、透明边距、位移、独特姿势/重复持帧、启动/收招与hit-stop，再自行制作奶蛙资源实测。MUGEN改编素材不冒称原版时序；屏幕60Hz不等于每秒60张独立角色图。

官方参考：[EmulatorJS固定版本](https://github.com/EmulatorJS/EmulatorJS/releases/tag/v4.2.3)、[核心列表](https://emulatorjs.org/docs4devs/cores/)、[FBNeo集合与映射说明](https://docs.libretro.com/library/fbneo/)、[MAME](https://www.mamedev.org/)。以保存的版本源码、包和实际运行证据为准。

## 当前批次收敛（用户 2026-10-16 最新指示）

本轮仅接原榜前20款，目录/原生标准入口默认显示20款，每行可跳转对应原生启动器。20款原ROM和MAME依赖均已存在并通过此前校验；后80款既有档案保留，停止新扩展和Dragon’sLair大文件下载。既有街霸冠军版、拳皇、合金弹头、三国战纪、Empress入口保留，不按它们所在原榜排名混算前20覆盖。

新增原生输入实证：`data/research/native-controls-20261016-v1/v2/v3`。v1投币过早，Pac-Man/Galaga未接收；DonkeyKong控制与开场动画重叠。v2延后自检，Pac-Man信用0→1→真实PLAYER ONE/READY，再见分数70→290及方向移动；Galaga信用0→1→0、真关卡、左右移动和射击分数0→50→210。DonkeyKong投币开局和移动已见，首次跳跃复测仍落在介绍动画，跳跃不计通过。Frogger投币开局/方向动作已见，原生截图224×768含非方形像素，派生审阅图明确缩放到224×256，原PNG保留；不把截图宽高当精灵原生尺寸。上述是引擎真实I/O截图，不是人工桌面窗口测试，也不代表前20款全部验收。

复现：`python3 tools/attack-library/scripts/probe-native-standard-games.py --batch UNIQUE-NAME --control-delay 1440 pacman galaga dkong frogger`；批次不得覆盖，记录源码hash、输入字段、输入事件和原始截图。`native-probe-contact.py BATCH`仅生成标注审阅图。完整动作、通关、音频、多人、长期稳定仍待验。
