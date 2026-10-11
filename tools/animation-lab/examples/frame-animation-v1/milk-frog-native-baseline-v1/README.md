# 原奶蛙帧基线（非新生成）

素材来自 catch-milk-frog 原 v15/v16 PNG 与 src/frog-gait.json。共同580×540画布，无逐帧独立fit、无素材修图。/frame-animation 可选择「奶蛙 · 原项目已有6帧 v15」与「奶蛙 · 原项目已有12帧 v15-v16」。

- browser-v15-capture/recording.webm：原6帧/6fps实际UI录制，1.000789s/7编码画面（含一次terminal hold）。
- browser-v15-v16-capture/recording.webm：原12帧/12fps实际UI复测录制；实测在technical-qa.json，12 PNG +13编码画面含hold。
- browser-v15[-v16]-frames.zip：透明PNG、sheet、JSON及原sourceRect/offset/SHA。
- source-qa.json：实际原帧深浅背景与真实视频解码图的失败美术结论。
- technical-qa.json：视频/PNG SHA、编码PTS/逐帧源身份及MAE；两样例技术通过，源美术仍failed。
- rounding-failed-baseline：旧12fps最后一张重复source10的完整失败录像、PNG、报告；fixed frameAtTime浮点边界后同源重录。
- frame-tests.log/v2：来源分支14项、浮点边界复测15项；keyframe-hydrostat-tests.log：蚯蚓修复19项。

原底行sourceRect y519的3张图有alpha>=24触边9/2/6px；原画布offset后边界为0，不能据此签收。近手open/fist跳变、近臂换方向缺平滑过渡、face/body outline变化仍未通过。原12帧提供已有中间姿势，并不宣称所有动作/手势/眨眼素材完成。
