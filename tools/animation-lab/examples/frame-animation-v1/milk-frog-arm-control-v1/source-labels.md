# 原生12相位肢体归属与控制审计

暂停新 imagegen，先以原始 PNG 观察对齐。下面是手工近似关节点，不是动捕，也不是最终生成素材。近侧永久粗前景腿/张手，远侧永久后景腿/握拳；肩肘髋膝遮挡者保留未知。每行仍为源美术 failed，方向对应图像向右前进。±70px 的 passing/uncertain 区域避免把手工中心误差当严格运动结论。

| 相位 | 腿时相观察 | 近上臂 S→E | 近大腿 H→K | 远上臂 S→E | 远大腿 H→K |
|---|---|---|---|---|---|
| 0/12 | near contact / far folded recovery | back (-190px) | front (+200px) | hidden/unknown | back (-90px) |
| 1/12 | near load / far recovery crossing | back (-175px) | front (+170px) | hidden/unknown | hidden/unknown |
| 2/12 | near mid-support / far forward passing | passing/uncertain (10px) | passing/uncertain (50px) | passing/uncertain (-70px) | front (+185px) |
| 3/12 | near back takeoff / far reaching | passing/uncertain (55px) | back (-130px) | back (-115px) | front (+240px) |
| 4/12 | flight A / near folded back / far forward | front (+85px) | back (-115px) | back (-115px) | front (+190px) |
| 5/12 | far prelanding / near folded back | front (+95px) | back (-125px) | back (-105px) | front (+190px) |
| 6/12 | far contact / near back recovery | front (+95px) | back (-90px) | back (-105px) | front (+170px) |
| 7/12 | far load / near vertical recovery | passing/uncertain (25px) | passing/uncertain (0px) | passing/uncertain (-25px) | front (+120px) |
| 8/12 | far late-support back / near high-forward passing | back (-120px) | front (+210px) | hidden/unknown | back (-125px) |
| 9/12 | far back takeoff / near high-forward recovery | back (-180px) | front (+245px) | hidden/unknown | back (-125px) |
| 10/12 | flight B / near forward / far folded back | back (-195px) | front (+250px) | hidden/unknown | back (-140px) |
| 11/12 | near prelanding / far folded back | back (-190px) | front (+200px) | hidden/unknown | back (-90px) |

各链原生1254坐标（?hidden 不补出虚假的根/肘/膝）：

| 相位 | 近肩→肘→腕 | 远肩→肘→腕 | 近髋→膝→踝 | 远髋→膝→踝 |
|---|---|---|---|---|
| 0/12 | 625,390 → 435,445 → 280,535 | ?hidden → 935,645 → 1020,570 | 665,750 → 865,905 → 965,1095 | 630,780 → 540,905 → 320,820 |
| 1/12 | 640,405 → 465,480 → 530,575 | ?hidden → ?hidden → 885,620 | 700,755 → 870,900 → 920,1090 | 655,765 → ?hidden → 605,800 |
| 2/12 | 660,400 → 670,545 → 795,665 | 535,400 → 465,495 → 425,555 | 685,750 → 735,880 → 765,1080 | 720,755 → 905,800 → 1000,945 |
| 3/12 | 665,410 → 720,550 → 875,655 | 545,390 → 430,480 → 385,540 | 645,730 → 515,920 → 305,1035 | 730,755 → 970,785 → 1015,980 |
| 4/12 | 675,410 → 760,550 → 935,635 | 550,390 → 435,460 → 370,510 | 645,725 → 530,845 → 430,755 | 735,755 → 925,855 → 1030,1010 |
| 5/12 | 670,405 → 765,530 → 940,580 | 555,400 → 450,470 → 395,515 | 645,730 → 520,865 → 410,765 | 735,765 → 925,885 → 1040,1050 |
| 6/12 | 655,405 → 750,530 → 925,575 | 535,415 → 430,490 → 360,560 | 655,735 → 565,915 → 390,815 | 735,775 → 905,920 → 985,1090 |
| 7/12 | 640,410 → 665,555 → 800,670 | 540,440 → 515,555 → 535,660 | 665,710 → 665,840 → 585,945 | 720,775 → 840,905 → 850,1085 |
| 8/12 | 635,400 → 515,505 → 600,570 | ?hidden → ?hidden → 955,620 | 690,710 → 900,745 → 925,890 | 665,765 → 540,895 → 490,1050 |
| 9/12 | 630,400 → 450,535 → 510,630 | ?hidden → 960,635 → 1045,560 | 700,710 → 945,720 → 785,865 | 665,765 → 540,905 → 340,1020 |
| 10/12 | 640,385 → 445,395 → 395,445 | ?hidden → 960,635 → 1040,560 | 700,715 → 950,850 → 1055,1025 | 640,760 → 500,850 → 320,735 |
| 11/12 | 625,390 → 435,445 → 280,535 | ?hidden → 935,645 → 1020,570 | 665,750 → 865,900 → 965,1065 | 630,780 → 540,895 → 320,815 |

8号原始链证据：`source-08-joint-overlay.png`。原12帧每张也有 `source-NN-chains.png`；这是 QA 标注，不修改公共原图、不导入动画资产。source-integrity.json 保存每原图 SHA，脚本重读前后核字节不变。

主要结论：0/1/8..11 的远肩隐藏，无法凭前方拳头证明整个远上臂正确；2..7 后肩可见约535..555,400..440，稳定肩根不应随换摆跨到右喉/腰。8远大腿向后，而 v1 控制远上臂117.5°也向后，旧独立正弦控制被拒收，不能继续按其698795腕目标生图。肩根设计必须与原视角和完整骨段可达性对齐，现有身体画法与全远臂长度尚不能验证。源1远膝完全遮挡，保留未知，不凭脚在后就说大腿在后。

- 0/12：Far shoulder and proximal upperarm completely occluded; elbow is estimate from visible yellow forearm. Near support front, far recovery back.
- 1/12：Far knee hidden by near thigh; far shoulder/elbow hidden by white belly. Do not infer full opposite upperarm angle or far thigh direction from curled fist/foot alone.
- 2/12：Near arm/thigh near vertical passing; far thigh forward and visible far upperarm back. Visible far shoulder behind/left of near shoulder.
- 3/12：Near thigh back versus slight-front upperarm; far thigh front versus back upperarm. Far thigh partly occluded under near arm but visible knee/front shin.
- 4/12：Near thigh back, near upperarm forward; far thigh forward, far upperarm back. Both soles visibly above shared1192 target.
- 5/12：Far upperarm and curled fist nearly stay at back peak while far leg descends. Holds are not new passing phases.
- 6/12：Far support still clearly forward in this frame; far upperarm back, near arm forward and near thigh back.
- 7/12：Near arm and near thigh both approximately vertical, opposite direction not a binary claim. Far arm approaches vertical but still back; far thigh remains forward. Curled fist hangsdown.
- 8/12：Near upperarm clearly back versus near thigh front. Far thigh is now back, so far upperarm must move FORWARD through near-vertical; old sinusoid far117.5deg BACK conflicts. Far root/elbow hidden; cannot certify upperarm from right-side fist.
- 9/12：Near upperarm back versus near thigh high/front. Far thigh back, far arm should front; source exposes forearm/fist only. Root remains unknown.
- 10/12：Near upperarm back/high, near thigh front. Far thigh back, far forearm/fist near-front peak again; entire upperarm occluded.
- 11/12：Close to frame0 pose but bothfeet airborne; near sole1168->0sole1192 descent24px. Far full chain still hidden.

[Arellano & Kram 2014 原始跑步摆臂研究](https://journals.biologists.com/jeb/article/217/14/2456/12120/The-metabolic-cost-of-human-running-is-swinging) 支持摆臂平衡摆腿角动量原则；此拟人奶蛙没有按真实四足青蛙步态制作，数值不能称论文测量或客观生物认证。局部方向一致仍不等于完整循环、美术材质或接地通过。
