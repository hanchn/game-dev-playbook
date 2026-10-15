# 2D / 2.5D 动画、招式与场景库

运行：`python3 tools/attack-library/server.py`，打开 http://127.0.0.1:4321/ 。
首次克隆需安装 Git LFS 并运行 `git lfs pull`，否则图像文件只是指针。

## 当前内容与界限

- 按游戏切换角色，配对强制同一来源系列。未导入游戏明确标记，不能计入可用资源。
- 拳皇改编：草薙京、二阶堂红丸、东丈、金家藩、琼、薇丝、矢吹真吾、坂崎良。街霸改编：春丽、肯、古烈。这些来自 Jmorphman 的 MUGEN 角色，**不是某代原版 ROM 的完整还原**。
- 原始 SFF v1 PCX / SFF v2 LZ5、RLE8、PNG 解码，AIR 帧时长、翻转、偏移和轴心保留。缺失精灵引用的整个动画段排除。原始编号和碰撞数据记录在 `data/arcade-*-import.json`；当前没有执行这些碰撞框。
- `data/arcade-fx.json` 为各角色原生 AIR 特效及可静态解析的 Explod / AnimElem 触发。完整 CNS、Helper、条件分支、连招与战斗 AI 尚未模拟。自动对打是动画演示控制器；测试伤害、击退和命中停顿为预览反馈，不能当作原作战斗数值。
- PotS 改编拳皇98中国场景、街霸II朱雀城：保留 DEF 原文、分层、平铺、动画、速度、视差参数。目前固定镜头，parallax 几何变形与 BG 控制器尚未执行。
- Empress Pokémon 2D Arena 1.0.0：原作182条招式配置与效果代码，角色只提供其原包 learnset；角色配置数包含形态，不能等同独立物种数。Showdown954条补充数据不冒充此游戏的招式数。
- Flare、PVGames、Foozle 等其它系列保留各自原生方向与动作。基础 GameArt2D 卡通为补充候选，用户不认可其画风，不作为精选质量标准。
- 街机 Top100 采用 Bitvint 编辑榜单，来源与抓取日期写入 `data/arcade-top100.json`。目录100项不意味着素材已完成；部分项目为3D游戏，不能伪称已有2D帧资产。用户另点名的三国战纪、吞食天地、兰博、茶杯头列为补充范围。

## 操作

点击场景获得焦点。A/D 或 WASD 控制角色A，方向键控制角色B；侧视角色不会伪造上下朝向。W播放实际跳跃（素材提供时）。J普攻，K重击，1–4 / QERF技能；大招按钮直接播放该角色的超必杀。开启自动对打后，双方接近并轮换普攻、必杀与超必杀，关闭后恢复手动测试。

动作缺失时不拿其它动作替代。单角色系列只显示同角色对练，不冒充双角色素材。

## 导出格式

完整角色包接口 `/export?character=arcade-kyo`：PNG图集 + character.json。
`clips` 为动作到逐帧数组，左右用原生右向加镜像；`rect-clips` 为动作到方向到逐帧数组；`grid-clips` 为动作到方向到图集参数。`x/y/w/h`为裁切像素，`anchor`为脚底轴心，`duration`为秒。骨骼资源与作者GIF预览不能冒充已经烘焙完成的精灵动画。

## 复现与验证

源下载包仅保存在忽略的 `output/attack-library/` 中，不能把临时下载令牌或网页会话提交到仓库。
导入：`scripts/import-sff.py --kyo` 或 `--pack Benimaru`；默认源文件路径见脚本。随后执行 `pack-arcade-atlases.py` 压图集。`import-arcade-fx.py` 导入原生特效；`import-kof-stage.py` / `--sf` 导入场景。

`validate-library.py` 检查资源路径、裁切范围与时间；`audit-pixels.py` 检查可选动作是否存在非透明帧。这些检查不能代替视觉确认。重新导入可能覆盖手工整理的招式名称，需重新执行相应整理并检查数据差异；不要并行运行会改写同一 manifest 的导入脚本。
