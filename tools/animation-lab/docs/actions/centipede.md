# 百足虫 · 零件与动作设计

## 零件设计

十对腿有稳定索引，首版躯干为整体，尚未细拆体节。

| ID | 零件 | 父级 | 角度范围（°） |
| --- | --- | --- | --- |
| body | 躯干 | root | 静态 / 脚端 |
| head | 头部 | body | 静态 / 脚端 |
| leg-0-upper | 近侧第 1 腿 · 上段 | body | -110～110 |
| leg-0-lower | 近侧第 1 腿 · 下段 | leg-0-upper | 0～155 |
| leg-0-foot | 近侧第 1 腿 · 脚端 | leg-0-lower | 静态 / 脚端 |
| leg-1-upper | 远侧第 1 腿 · 上段 | body | -110～110 |
| leg-1-lower | 远侧第 1 腿 · 下段 | leg-1-upper | 0～155 |
| leg-1-foot | 远侧第 1 腿 · 脚端 | leg-1-lower | 静态 / 脚端 |
| leg-2-upper | 近侧第 2 腿 · 上段 | body | -110～110 |
| leg-2-lower | 近侧第 2 腿 · 下段 | leg-2-upper | 0～155 |
| leg-2-foot | 近侧第 2 腿 · 脚端 | leg-2-lower | 静态 / 脚端 |
| leg-3-upper | 远侧第 2 腿 · 上段 | body | -110～110 |
| leg-3-lower | 远侧第 2 腿 · 下段 | leg-3-upper | 0～155 |
| leg-3-foot | 远侧第 2 腿 · 脚端 | leg-3-lower | 静态 / 脚端 |
| leg-4-upper | 近侧第 3 腿 · 上段 | body | -110～110 |
| leg-4-lower | 近侧第 3 腿 · 下段 | leg-4-upper | 0～155 |
| leg-4-foot | 近侧第 3 腿 · 脚端 | leg-4-lower | 静态 / 脚端 |
| leg-5-upper | 远侧第 3 腿 · 上段 | body | -110～110 |
| leg-5-lower | 远侧第 3 腿 · 下段 | leg-5-upper | 0～155 |
| leg-5-foot | 远侧第 3 腿 · 脚端 | leg-5-lower | 静态 / 脚端 |
| leg-6-upper | 近侧第 4 腿 · 上段 | body | -110～110 |
| leg-6-lower | 近侧第 4 腿 · 下段 | leg-6-upper | 0～155 |
| leg-6-foot | 近侧第 4 腿 · 脚端 | leg-6-lower | 静态 / 脚端 |
| leg-7-upper | 远侧第 4 腿 · 上段 | body | -110～110 |
| leg-7-lower | 远侧第 4 腿 · 下段 | leg-7-upper | 0～155 |
| leg-7-foot | 远侧第 4 腿 · 脚端 | leg-7-lower | 静态 / 脚端 |
| leg-8-upper | 近侧第 5 腿 · 上段 | body | -110～110 |
| leg-8-lower | 近侧第 5 腿 · 下段 | leg-8-upper | 0～155 |
| leg-8-foot | 近侧第 5 腿 · 脚端 | leg-8-lower | 静态 / 脚端 |
| leg-9-upper | 远侧第 5 腿 · 上段 | body | -110～110 |
| leg-9-lower | 远侧第 5 腿 · 下段 | leg-9-upper | 0～155 |
| leg-9-foot | 远侧第 5 腿 · 脚端 | leg-9-lower | 静态 / 脚端 |
| leg-10-upper | 近侧第 6 腿 · 上段 | body | -110～110 |
| leg-10-lower | 近侧第 6 腿 · 下段 | leg-10-upper | 0～155 |
| leg-10-foot | 近侧第 6 腿 · 脚端 | leg-10-lower | 静态 / 脚端 |
| leg-11-upper | 远侧第 6 腿 · 上段 | body | -110～110 |
| leg-11-lower | 远侧第 6 腿 · 下段 | leg-11-upper | 0～155 |
| leg-11-foot | 远侧第 6 腿 · 脚端 | leg-11-lower | 静态 / 脚端 |
| leg-12-upper | 近侧第 7 腿 · 上段 | body | -110～110 |
| leg-12-lower | 近侧第 7 腿 · 下段 | leg-12-upper | 0～155 |
| leg-12-foot | 近侧第 7 腿 · 脚端 | leg-12-lower | 静态 / 脚端 |
| leg-13-upper | 远侧第 7 腿 · 上段 | body | -110～110 |
| leg-13-lower | 远侧第 7 腿 · 下段 | leg-13-upper | 0～155 |
| leg-13-foot | 远侧第 7 腿 · 脚端 | leg-13-lower | 静态 / 脚端 |
| leg-14-upper | 近侧第 8 腿 · 上段 | body | -110～110 |
| leg-14-lower | 近侧第 8 腿 · 下段 | leg-14-upper | 0～155 |
| leg-14-foot | 近侧第 8 腿 · 脚端 | leg-14-lower | 静态 / 脚端 |
| leg-15-upper | 远侧第 8 腿 · 上段 | body | -110～110 |
| leg-15-lower | 远侧第 8 腿 · 下段 | leg-15-upper | 0～155 |
| leg-15-foot | 远侧第 8 腿 · 脚端 | leg-15-lower | 静态 / 脚端 |
| leg-16-upper | 近侧第 9 腿 · 上段 | body | -110～110 |
| leg-16-lower | 近侧第 9 腿 · 下段 | leg-16-upper | 0～155 |
| leg-16-foot | 近侧第 9 腿 · 脚端 | leg-16-lower | 静态 / 脚端 |
| leg-17-upper | 远侧第 9 腿 · 上段 | body | -110～110 |
| leg-17-lower | 远侧第 9 腿 · 下段 | leg-17-upper | 0～155 |
| leg-17-foot | 远侧第 9 腿 · 脚端 | leg-17-lower | 静态 / 脚端 |
| leg-18-upper | 近侧第 10 腿 · 上段 | body | -110～110 |
| leg-18-lower | 近侧第 10 腿 · 下段 | leg-18-upper | 0～155 |
| leg-18-foot | 近侧第 10 腿 · 脚端 | leg-18-lower | 静态 / 脚端 |
| leg-19-upper | 远侧第 10 腿 · 上段 | body | -110～110 |
| leg-19-lower | 远侧第 10 腿 · 下段 | leg-19-upper | 0～155 |
| leg-19-foot | 远侧第 10 腿 · 脚端 | leg-19-lower | 静态 / 脚端 |

## 拆解与组装

爆炸演示把各零件从装配位置展开，用虚线指明父级连接；合并返回原位置。拆解参数与动画数据分离。先选单腿或单节，再显示其子树，最后显示完整角色。

## 当前动作

- 单配件：固定根部，1秒周期收拢→伸展→收回，正常速度和0.25倍速播放。
- 完整动作：同一对腿反相，相邻腿对延迟0.12周期；持续波状推进。
- 画布：512×512；锚点：(256,260)；图集16帧，不复制周期末帧。
- 原型来源：参数化二维零件，无外部图像。

## 分层验收

检查每条腿都有动作，不允许复制同相；在爆炸图核对20条腿与每条三件结构。

单件、局部子树与完整角色分别保留报告。所有检查65个采样点；静态件只检查结构。正常预设通过不表示正式美术动作验收完成。

## 待实现的动作

后续：触角、转弯和节段躯干；逐对测试腿根外展，先定义关节再增加腿数。

## 视觉验收

检查零件重叠、形体比例、近远侧身份、正常速度自然度及目标场景适配。当前视觉状态 pending，不能自动批准。
