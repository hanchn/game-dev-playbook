# Empress 原游戏本地运行（2026-10-16）

入口：**http://127.0.0.1:4369/**。这是作者原完整客户端与原Node战斗/剧情服务器，不是182招式预览，不是重新实现的通用演武场。

## 实物与启动

历史 `output/attack-library/empress/app.asar` 当前不存在，不能按旧报告假设实物存在。本次重新定位到本机真实原包 `/Users/lemon/Downloads/Empress-Pokemon-Arena-2D-1.0.0-Windows.zip`（328,179,557字节，SHA256 `9d1a756fabac7249f3eba6a1f372bb4ffbe3e12c2152ee91f3d6092b845044c9`）。[作者原发布页](https://omniscye.itch.io/empress-pokemon-2d-arena)在本次读取仍列出1.0.0 Windows/Android及本机原包同名文件。

原ZIP内 `Empress Pokemon Arena 2D 1.0/resources/app.asar` 为296,630,642字节，SHA256 `97a09a00d79eff243993537acd6a2953cfd57bd8f0bbd2c01ca6f1e506ac0e3f`。普通ZIP/ASAR头解析提取12,144文件，包含539份node_modules文件。原始ASAR、逐文件收据和运行目录都保存在gitignored的 `output/local-original-games/empress-1.0.0/`；不把原游戏296MB内容复制进知识库。

```sh
python3 tools/animation-lab/scripts/run-empress-original-20261016.py --port 4369
```

脚本校验作者ZIP和ASAR SHA，拒绝越界路径和不支持的unpacked/link项，保持提取文件原字节，保留全部包内依赖。没有npm安装、没有补写战斗规则。实际执行作者原入口：

```sh
node server/index.cjs --port 4369 --host 127.0.0.1 --save-dir /absolute/output/local-original-games/empress-1.0.0/save
```

注意原server的独立CLI读取 `--port/--host`，不是环境变量PORT；若仅设置env会误开默认3210。根目录由原文件 `__dirname/..` 推导；存档独立于原始提取树。只绑定loopback，不开放局域网。

## Electron边界

静态检查原 package.json 的 main 为 `desktop/main.cjs`，但scripts.start就是 `node server/index.cjs`。原 preload.cjs 只提供 `stadium.getInfo/copyText/setFullscreen`；客户端用 `window.stadium` 判断可用性。浏览器下主游戏/原服务器不需要Electron，桌面专用信息、剪贴板和窗口全屏接口没有假造替代。真实战斗使用原 engine.cjs、rules.cjs、campaign.cjs、story.cjs 与@pkmn/sim。

这只是源码观察与后端运行证据，不冒称REA二进制反编译证据。没有重新安装REA工具。

## 验证证据

- `/`、`/api/health`、`/api/rules`、`/api/campaign`、`/api/story`、`/data/movement.json`、`/api/catalog`、`/combat.mjs`均HTTP200，内容字节SHA见同名JSON与output/http-smoke.json。
- 直接连原 `/ws` 本机协议，经hello判定local=true，发送作者 `watchDemo`，收到原 `battleStart` 和52个 `state` 更新，再leave结束探针。原CPU对战由作者引擎推进，探针没有自写物理/伤害逻辑。这不等于实操玩家测试通过，更不是赢了一场（leave会产生result）。
- 初次探针错误假定消息名为start/snapshot，机械判断失败；实际包是battleStart/state。该仪器失败原日志保留，按实际协议修正后复测通过。
- server/index、engine、rules、campaign、story、client/index、client/app等关键文件SHA与ASAR提取记录一致，未改原规则/入口。
- 健康/协议测试由此子任务完成；真正浏览器选择队伍、键盘移动、攻击、闪避、剧情和视觉试玩由root验收，不在此抢先标记。

复现探针：`node tools/animation-lab/scripts/probe-empress-original-20261016.cjs`。收据 `docs/empress-original-local-2026-10-16.json`。未验证联网私房/跨机WebRTC、原Windows壳与Android原生包，也没有修改其配置。

## 暂停后的连接丢失观察

Root 实际浏览器暂停约11秒时曾出现 `CONNECTION LOST`。随后健康检查仍返回200和版本1.0.0，原Node PID27635仍监听4369，启动session46762仍运行且无错误输出，排除了本次服务进程结束。原版WebSocket每15秒检查alive、发送ping，下一轮未收到pong则terminate；这只是源码机制，当前无服务日志证明本次一定由该超时引起。独立协议探针的leave只处理它自己的连接ID，不关闭其他玩家会话。保留原游戏代码不改，以刷新后重新进入游戏复验。
