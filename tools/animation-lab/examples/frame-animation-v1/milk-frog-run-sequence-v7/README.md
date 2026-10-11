# 奶蛙真实12帧 v7 · 未通过远侧修复

v6基础7远臂竖向经过，8远拳第一次未到横向passing目标，再定点修只下移50px而横移80px要求仍未达成。三张真实imagegen试错源7v9/8v3/8v4与prompt/参考SHA/原始SHA保存；8v3未选，8v4作为明确failed演示，非美术批准。近臂open/远臂curled、两腿永久身份仍保持，8fararm被torso/nearupperthigh部分遮挡但肩肘链准确性未批准。

全12原生素材/实际UI、真实正常与慢速两圈均看。局部7下垂经过有所改善，7→8横向仍跳，8源脚底还从1202变1204（改臂不等于其他像素绝对不变），整体接地19px、材质/头肩轮廓仍failed。下一步应新增明确farshoulder/elbow/wrist的原生控制图辅助，不复用纯精确坐标文字碰运气。

实际技术核验passed：正常3.002344s24PNG+25视频（终点hold），慢11.999339s96PNG+97视频；12真正原始source/96仅hold样本，视频对原生PNG最大RGB MAE2.502928/1.762602 (255标尺)。technical-qa.json记录每样本实际PTS/源索引/SHA与影片路径，source-qa.json明确美术failed。录制和透明PNG完整包均可检查。旧v6/v5失败全部保留。
