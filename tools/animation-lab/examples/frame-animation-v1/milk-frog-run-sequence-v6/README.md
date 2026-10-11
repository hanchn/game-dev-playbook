# 奶蛙真实12帧 v6

在v5基础仅4号新增真正imagegen抬臂过渡：原生近臂前臂改为斜向下/前，3低手→4中间→5峰值，腿形与身份保留。9/10真实弯肘回摆和10v2相切拒收→10v3修复承接v5。固定1254画布原字节，不逐帧fit、不补重复帧冒充中间图。

实际正常/慢速两圈通过技术校验：正常3.000543s、24PNG+25encoded（终点hold）；慢11.999571s、96PNG+97encoded，每sourcehold4次非96新素材。12真实源SHA不重复，PNG与原生decoded视频 MAE最大2.500629/1.762602 (255标尺)，technical-qa.json含每采样PTS/索引/SHA/路径。透明原始12PNG与来源打包browser-source-frames.zip，真实影片 browser-normal-capture/recording.webm 与 browser-slow-capture/recording.webm。

完整新4原图、共同范围sourcecontact、实际UI12帧、normal/slow各两圈原生影片逐图看后仍美术failed：接地19px、头肩轮廓和高光材质变化；远侧握拳臂7→8从后方直接跳前方，缺经过帧，不能因为近侧摆臂改善便通过内侧。5/6峰值还停留。下一步为6/7/8/9远臂passing源定点修；source-qa.json记录永久近open/远curled身份和原索引证据。所有v5/v4/旧失败图不覆盖。
