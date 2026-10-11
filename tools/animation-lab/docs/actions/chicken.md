# 鸡 · 当前公鸡 v6 / 母鸡 v7（整鸡美术仍失败）

公鸡v6仅修改普通连续颈根配方：源图字节、16件precision mask不变，tile1 neckRoot [.55,.90]，neckMask start.70/span.18，源UV `.60+.30u` 斜向分层，根在body后/头在body前。脸和喙刚性映射不变，腿骨长、足底接触和所有其他源映射不动。默认站立/行走的羽毛袖套明显收回胸部；同8walk/16peck原生浅底与Chrome两相位正常不透明已审，见`examples/chicken-rooster-neck-v6/visual-review.json`。

65/65相关技术检查通过，历史失败日志保留；原测试硬编码neck.opacity=0已改为真实头/根同tile1+mask，根在body之后、头在body之前的源归属契约。**peck7/15颈背尖折仍失败；小黄hock和细長腿比例仍失败；打鸣extras颈源的横明暗边不由此普通neck配方修复。** 此版本冻结供四类场景重新拍摄，不回写已完成rooster5/hen7的历史证据。新片编排/渲染版本由root独立验，不能继承前面的编排10/render6旧截图结论。

# 鸡 · 公鸡 v5 / 母鸡 v7 局部腿材质实测

当前默认公鸡 `chicken-side-v5`，母鸡 `chicken-hen-side-v7`。只替换 tiles2/3：羽毛胫段取实际新源 `chicken-leg-parts-v4.png` 左件，鳞片跗跖取 `chicken-leg-parts-v5.png` 右件。新图左件在再次编辑中漂移，未使用；v4右件球帽失败，也未使用。其余14件、头颈与原始公母爪源完全保留；近远足底偏移未动。新源都重新precision扫描，两件 atlas 使用 `sourceTileIndex`，不能沿用16件 atlas的索引。

公鸡近腿upper2.8/lower2.7/foot2.6改为body3后的真实父遮挡。新腿保持源原生横纵比例，没有以visualWidth拉宽藏接缝。`examples/chicken-leg-source-v5/registration-baseline` 保留上次素材元数据；技术测试逐字段断言其余14件相同、新源hash和精确mask一致、轴点为实际不透明材料、支撑爪继续落到真实floor。63/63通过见 `technical-tests.log`，这不代表美术通过。

实际Chrome `rooster5/hen7/编排10/渲染6` 正常不透明整页已检查：crow1.50；lay1.50、3.25、4.40；fight1.50、2.10；全母鸡3只flock1.50。截图与逐项结论在 `examples/chicken-leg-source-v5/visual-review.json`。母鸡固定8walk/16peck、upper隔离9与3hen1.5原生图已看；公鸡walk8/run8/lower隔离9已看。历史失败源与图不覆盖。

**仍 FAILED：小金黄色hock结节、腿身偏细长；crow颈胸明暗硬边、啄食颈部袖套轮廓；格斗腾空姿势及接触强度需要自然动作复测。** 胸腹大斜羽毛腿块已消除，下杆端帽减小，局部改善不等于整鸡验收。未检查的dark整组、连续慢放和新录制影片保持未审状态。

# 鸡 · 真正公母素材与场景 QA

默认公鸡 `chicken-side-v4` 使用 `chicken-side-parts-v3.png`；母鸡 `createAsset('chicken',{sex:'hen'})` 为 `chicken-hen-side-v6`，基础14件使用 `chicken-hen-parts-v1.png` ；腿上/下段通过 `skin.sources.hen-leg-material` 使用真实新源 `chicken-hen-parts-v3.png` 和独立精确 mask，保持原14件字节和映射。元数据为 `chicken-hen`，短尾、小冠、无距。母鸡下蛋不能用公鸡贴一个蛋冒充。

近远足分别 tile4/tile9，以当前透明源 alpha≥24 的真实足底点求偏移。公鸡为 8.0876 / 8.0581，母鸡为 7.0878 / 7.6512 世界单位；它们不同，不能沿用旧统一踝长度。啄食 .30～.52 为接地段，母鸡真实喙点 [695,126] 到世界 floor=0；.61 已是抬头恢复，喙离地合理。

母鸡 v2 在坐窝 1.50s 颈羽横底披到胸背；v3 把斜源根分到身体后，但前喉像小围巾悬空；v4 把下颈连接中心从 [.35,.90] 改 [.55,.90]，保持头颅与喙刚性映射、足底偏移不变，前喉收回胸部。颈根 layer2 在 body3 后，源 UV 分层为 `.60+.30u`，有 .03 重叠。没有修改 PNG 像素。

同一 renderer4 的固定场景证据：`examples/chicken-hen-side-v2/neck-baseline`、v3 的 `neck-retest`、v4 的 `neck-retest`。v4 原生 lay1.50 已视看，固定相机16 peck浅底整组已视看；真实 UI `ui-lay-1500-fullpage.png` 验证母鸡v4 / 编排v5 / 渲染v4 / 暂停1.50s。**颈根改善不代表整角色通过：腿根黄杆/肉罩和体羽材质仍不自然，其他完整动作与慢速播放仍待逐项验收。**

`chicken-performance-extras-v1.png` 实际包含配准闭/张嘴头颈、喉部两态、长短羽毛、蛋和窝。`chicken-crow-intermediates-v1.png` 实际有 1/3 与 2/3 张嘴源；新源相对原源拟合高度仍有1.2%变化，必须实际四态播放验脸，不能声称像素身份完全不变。母鸡张嘴候选 tile12 未完成同眼配准，不直接用于状态切换。

源图、精确 mask、生成 prompt/原始路径/SHA、候选状态记录在 `examples/chicken-source-v4`。新图逐个重扫透明组件，不继承旧 mask。`/lab/chicken-scene` 已有多只鸡、母鸡下蛋、公鸡打鸣和双鸡格斗掉毛的实际入口；场景实现由独立 renderer 管理，其接触、嘴型和羽毛质量仍需单独验收。

母鸡 v5 已使用实际新腿上/下件：源上段有羽毛→鳞过渡，下段从旧92×272的大球帽杆改58×268的纤细跗跖。imagegen编辑整个atlas时其余件发生1～7px漂移，因此它们没有注册：以多图源只消费2/3，14旧件完整保留；prompt、原始工具文件和两次真实job均在 `examples/chicken-hen-leg-source-v2/generation-jobs.json`。v5 正常坐窝1.50s仍出现胸前黄鳞孤块与卵羽垫，明确FAILED，证据不覆盖。

v6 修正真实身体层级：蹲姿髋降低后关节折回体羽内部，近侧upper2.8/lower2.7/foot2.6均在body3后；远侧保持其后层。没有改变腿骨长、足底或脸部映射。9相位四腿独立检查和walk展示新源暴露形态；不能仅用坐窝遮挡证明素材合理。实际Chrome母鸡v6/编排v7/渲染v5，正常不透明暂停0、1.50、3.25、4.40s已视看，截图位于 `examples/chicken-hen-side-v6/leg-retest/ui-*-fullpage.png`。同相位原生PNG、14源件锁定与43/43技术检查也保留。

固定地线的8idle、8walk、16peck整组在 `examples/chicken-hen-side-v6/ground-retest`，已实际查看浅底整组：支撑爪贴地，啄食.333/.400/.467喙触地，恢复离地；不是每帧fit缩放。v6胸前贴块已改善，站立同投影的金色关节仍偏显眼、腿身比例较纤长，整角色美术仍FAILED，完整慢放与其余动作未验收。逐项范围与双源SHA记录于 `leg-retest/visual-review.json`。

公母 UI 入口随后新增编排v8，全母鸡3只在实际Chrome0.40/2.10s已审；`ui-three-hens-{0400,2100}-fullpage.png` 是v8证据，前面lay截图保持v7身份。不能把新编排版本写回旧片。
