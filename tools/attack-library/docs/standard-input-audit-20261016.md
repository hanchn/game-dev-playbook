# EmulatorJS 4.2.3 输入只读审计

范围：standard-play.mjs 与本机固定4.2.3源码。未操作其他人的游戏标签，未修改游戏、核心或共享wrapper。源码观察不等于KOV对局验收。

- GameManager.js:248–291：simulateInput(player,index,value) 对普通0–23编号直接透传原生simulate_input。没有加减1或键码转换。emulator.js:3300/3345原键盘控制循环player 0..3；wrapper的player=0正确。
- wrapper 2=Select/Coin、3=Start，KOV配置也如此；原键盘与外层按钮调用相同编号。已观察到CREDIT1说明至少一次Coin真实到达核心，不能因此判定Start或玩法通过。
- emulator.js:1072将键盘事件绑定到elements.parent，不是window/document；1073–1075仅在点击游戏内时focus。点击外层投币/开始按钮后焦点仍可在外层，随后native5/1不会经过原keyChange。实际重试应先点击游戏画面，再按原键；不能把外层按钮的焦点问题归因于ROM。
- standard-play.mjs当前blur监听会立即释放所有pressed。原库1077的blur仅为注释，没有对应主动清输入。当前日志只记录down，不记录up、blur、pointercancel或实际持续时间；所以player-input日志不能证明一个按键保持140ms。
- 按钮释放使用setTimeout按wall-clock计算。在隐藏/后台页面、模拟器暂停或未运行帧期间，down与up可能都发生在核心下一次运行之前。这是代码允许的机制，不是本次已证实根因。延长wall-clock到1.2秒仍不能证明实际核心采样过输入。
- 外层Enter/Space keydown会begin/end，随后浏览器合成detail0 click又begin/end，可能重复重启同一按键的计时；应只保留一种键盘激活路径。

建议root下一次最小诊断：增加input-up/reason/heldMs、visibilitychange/blur日志，并显示document.visibilityState和原emulator.paused；原游戏窗口获得焦点时再测5/1。外层控制可改为持续按住，明确在前台按下/松开。不要修改Coin/Start编号或强行注入游戏状态。若需要按render-frame脉冲，也只能称浏览器rAF帧而非模拟器实际采样帧。

没有证据表明游戏手柄轮询持续清零外部输入；gamepad.js只对变化dispatch buttonup。没有证据表明player应改为1。
