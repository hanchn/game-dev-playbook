# 混元3D官网八视角接口静态研究

核查日期：2026-10-14。主要依据腾讯官网公开HTML及静态JavaScript；未读取浏览器登录凭证。文末另记录无登录态的直接HTTP检查，以及首套浏览器上传观察。下列为前端实现契约，**不是完整建模实测成功报告或公开稳定API承诺**。首次账号实测应对照实际请求与响应确认。

## 官方来源与定位

- [创作页](https://3d.hunyuan.tencent.com/creation)：HTML直接引用以下静态资源。
- [主bundle](https://cdn-3d-prod.hunyuan.tencent.com/public/index__0ae1922cd34342abbea4.js)：模块3320（模型枚举、八视角tag）、19031（场景枚举）、14733（默认图片限制）、38455（业务HTTP方法）、47436（请求签名）、56777（COS上传）、91786（HTTP客户端）。模块19031编号由3320导入得出，场景枚举可直接搜索 `basicModelV2`。
- [创作页bundle](https://cdn-3d-prod.hunyuan.tencent.com/public/pages-create__f6417ba4ca02b2ee0fd5.js)：搜索 `onSideBarMultImageGenerate`、`basicModelV2Generate`、`sourceResource`、`convertResult`。模块4811为任务列表接口。
- [资产页bundle](https://cdn-3d-prod.hunyuan.tencent.com/public/pages-assets__911209cb8562b5da4854.js)：任务列表轮询与重新生成参数。
- [工具bundle](https://cdn-3d-prod.hunyuan.tencent.com/public/utils__7b1b67dea4cd1f30e421.js)：模块3793导出HmacSHA256；69956导出Hex编码。
- [运行时bundle](https://cdn-3d-prod.hunyuan.tencent.com/public/runtime__6ffb212b35f3149bd519.js)：提供动态chunk名称和CDN基址。

下载文件的SHA-256（作为本次观察版本定位）：

| bundle | SHA-256 |
|---|---|
| index | `6b5ab27287b14e188d671788ba25fcde37f781551f284093becdd3f0855198c9` |
| pages-create | `9af8f3d7ea71b3cdf2cafd6eb979299f92d89c38e16d978976ea82963507b511` |
| pages-assets | `cc558ae45163da368c4a4a4c6d8ed159084c0fd9ef2c83190eeca7dcdacbe0b0` |
| utils | `20856c215e572ffce6ee2e5fc58c2881d712d4b943007f46d3ef68d1de97f290` |
| runtime | `1d0f0505865824e65e0f61530e8b215a90acfb23d31c0476fe249538c98ab1d1` |

## 八视角对应关系

官网新上传组件文案支持最少2张、最多8张，正面必填。旧组件翻译中仍存在2–4张文案，不能据此将新流程缩水到4张。八视角枚举在当前主bundle确实存在。

| 项目key | 官网内部key | HTTP `imageTagList` 项 |
|---|---|---|
| front | front | frontView |
| rear | back | rearView |
| left | left | leftView |
| right | right | rightView |
| front_left_45 | leftFront | frontLeftView |
| front_right_45 | rightFront | frontRightView |
| bottom | bottom | bottomView |
| top | top | topView |

页面默认对象的顺序为front、back、left、right、leftFront、rightFront、bottom、top。提交回调同时遍历URL对象构建图片列表与tag列表；两列表按索引一一对应。执行器可以采用其他明确顺序，但必须保持URL与tag同步，不能使用队列key直接替代官网tag。

## 上传与审核

HTTP客户端基址为同源 `/`，带Cookie（withCredentials），JSON默认请求头包含 `x-source: web`、`x-product: hunyuan3d`。这里是官网业务接口，与腾讯云产品API不同。

1. `POST https://3d.hunyuan.tencent.com/api/3d/resource/genUploadInfo`，JSON字段 `fileName` 为实际文件名。
2. 前端读取响应data中的 `bucketName`、`region`、`location`、`resourceUrl`、`encryptTmpSecretId`、`encryptTmpSecretKey`、`encryptToken`、`startTime`、`expiredTime`。
3. COS SDK通过 `putObject` 上传文件字节，Bucket取bucketName、Region取region、Key取location、Body取File。授权回调将响应中的临时字段映射到TmpSecretId、TmpSecretKey、SecurityToken、StartTime、ExpiredTime，且ScopeLimit为true；非内部环境启用加速与HTTPS。V01实测中CLI将这些字段按该映射交给cos-nodejs-sdk-v5，八张图片均成功上传；不能仅因字段名含encrypt就假设是明文或自己解密。临时字段不应写入项目或日志。
4. 上传成功后的业务URL取 `resourceUrl`，不是猜测拼接的COS地址。
5. `POST /api/3d/resource/review`，字段为sceneType=`playGround3D-2.0`、text为空字符串、resourceType=`image`、resourceUrl为上传结果。前端将响应data.code等于0判断为通过，其他code展示data.msg。

默认上传组件14733的配置支持PNG/JPG/JPEG/WEBP、SIZE=10、MAX_WIDTH=4096、MIN_WIDTH=128、MAX_ASPECT_RATIO=1.2。这是前端默认配置，其他功能有不同限制；未实测后端限制或每项具体计算语义。

## 建模提交

`POST /api/3d/creations/generations`，该调用开启签名拦截器。重要区别：回调内部名 `multImageList` **在发送前转换为HTTP字段 `imageList`**；不能直接发送前者。

从V3.1八视角路径确定的字段：

| 字段 | 值或来源 |
|---|---|
| sceneType | `playGround3D-2.0` |
| count | 1 |
| modelType | `multiView2ModelV3.1` |
| title | 页面该多视角路径使用空字符串 |
| style | 多图时清空为字符串 `""` |
| imageList | 八张上传成功并审核通过的resourceUrl，顺序与tags对应 |
| imageTagList | 上表八个官网tag，顺序与URLs对应 |
| enableLowPoly | false |
| faceCount | 页面选择值，枚举中包含1500000、1000000、500000、50000等；需匹配实际选项 |
| enable_pbr | 只有页面isPBR为true时添加true，其他情况不发送 |

固定姿态多视角路径isTpose为false，因此发送器不添加enableScaleStandardization。`strictMode` 仅存在内部回调入参，发送器没有复制它，不能当作已证实HTTP字段。V3.5还可能发送tex_res、seam_less、tex_fmt；本次八视角V3.1方案不需要猜测这些字段。返回data.creationsId被前端用于后续查询。

## 签名算法（公开前端代码）

模块91786仅对axios `params` 调用47436签名函数，正文JSON不参与该层签名。47436在原params副本中加入timestamp（Unix秒整数）和nonce（16位随机ASCII大小写字母/数字）；滤掉null、undefined、空字符串值；按key的JavaScript localeCompare排序；value用JavaScript String转换；将各 `key=value` 用 `&` 连接。随后用HmacSHA256生成小写Hex，加入query字段sign。

该模块的静态签名材料来自**公开bundle常量**，不是用户登录密钥。若执行器需要复刻应从当前47436模块读取算法，不把会话Cookie混入。算法先对两个16字节数组逐位XOR，再按每位指定数量左循环移位8位，按指定索引重排，截取首个零字节之前部分，通过TextDecoder生成HMAC key。CLI已在离线环境与官网模块47436执行结果对照，固定输入的签名一致；V01账号实测提交已返回creationsId，服务器接受CLI签名。索引排序与字符串转换应保持JS语义；仅含nonce与timestamp的请求可直接按nonce、timestamp顺序构造。

首个浏览器请求需核对是否还存在其他请求拦截器、设备字段或会话上下文；Cookie登录与该公开静态签名是不同机制。

## 任务查询与下载

- `GET /api/3d/creations/detail?creationsId=<id>`：前端详细轮询使用该接口。
- `POST /api/3d/creations/list`：轮询body包含creationsIdList数组，响应data.creations为任务集合。界面状态枚举为wait、processing、success、fail；页面还对result中的资产分别判断状态，不能仅见列表出现就认为完成。
- 模型下载直接读取资产的 `urlResult` 对应格式链接（如glb、obj等），用返回URL下载；没有证据支持自行拼接一个download接口。
- 需要格式转换且目标链接不存在时，`POST /api/3d/creations/resourceConvert`，body包括sourceResource数组（对象字段format和url）与targetFormatList数组，返回data.convertResult数组，各项url供下载。前端源格式选择可能为zip、fbx、glb；必须依据实际资产字段而定。
- 另有 `POST /api/3d/creations/retopologize`，参数creationsId、assetId、topology_format、download_format，结果data.result_url。它涉及额外拓扑处理，不应为获取原始模型默认调用。

现已取得V01真实任务ID与状态响应，八图上传、审核、创建并启动任务、查询已验证。V01生成success已确认，尚未确认导出文件可打开性、转换消耗、并发上限和模型质量。其他车辆应依照用户授权范围执行，队列生成器只负责图片就绪快照。

## 独立创建记录、FBX导出与下载的追加核查

**独立远端创建资产：在本次已检查的图生3D和资产页请求链中，没有找到先创建空模型记录、再向其上传并提交的独立接口。** 当前证据是上传预授权生成COS对象位置，上传与审核完成后直接generations创建任务并返回creationsId，后续结果内出现assetId。genUploadInfo只是上传授权，不代表远端模型已创建；本地draft也不代表远端创建。执行器可以分别暴露本地准备、上传、提交、查询、转换、下载命令，但远端创建若采用generations，其语义应明确为“创建并启动生成任务”。如果需要不启动生成的真正远端空记录接口，须从实际站点操作继续找证据，不能发明 `/create` 或 `/assets/create`。

补查了运行时公布的[静态资源上传页bundle](https://cdn-3d-prod.hunyuan.tencent.com/public/pages-asset-upload__b965880d53d8df20626a.js)。其路径名虽有asset-upload，但页面处理是直接COS上传与浏览器localStorage保存uploadedFiles，并未包含一个远端模型资产创建HTTP接口。因此这个工具页也不能被作为远端建模资产创建的证据。本研究不使用该工具页内环境配置或其中任何密钥材料。

FBX在创作页导出选项中明确存在（与GLB、OBJ、STL、USDZ等并列），请求格式值为小写 `fbx`。精确下载链为：

1. 选中目标资产，先检查 `boneBindingData.fbx` 或 `urlResult.fbx`。如果已有链接，直接下载该URL。不同界面场景可能改用styleItem.urlData、actionDrivenDataMap或boneBindingData，对普通生成车辆优先普通urlResult路径。
2. FBX没有直链时，按实际可用源格式调用 `/api/3d/creations/resourceConvert`。普通资产有 `urlResult.obj` 时，前端把其作为**zip**源而非format=`obj`；没有obj时使用 `urlResult.glb` 且format=`glb`。存在骨骼绑定数据时，优先boneBindingData.fbx且源format=`fbx`。这一区分须保留，不能凭文件字段名猜源格式。
3. JSON请求的sourceResource数组包含实际源链接与上一步format，targetFormatList为单元素数组 `fbx`。返回data.convertResult首项url是待下载结果。前端等待这个POST返回，随后直接触发下载；已检查代码没有显示独立转换任务ID、转换状态查询或轮询接口，不能凭空实现 `convert/status`。
4. 下载函数通过隐藏a标签的href赋值为返回URL，设置download并点击；另一处旧下载函数使用iframe。已检查代码没有为下载URL生成一个新的官网query签名，也未提供下载预签名接口。链接是否本身携带COS签名/有效期、是否需Cookie、实际响应是FBX还是包含贴图的压缩包，都需要实际响应核实。执行器必须原样使用返回URL，不能去掉已有query或给它强加generations的sign。
5. `/retopologize` 是另一条改变拓扑的导出路径：请求creationsId、assetId、topology_format、download_format，返回data.result_url。获取普通FBX不应默认走它，避免额外处理和未知消耗。

执行器应区分HTTP成功、拿到下载URL、真正下载完成与文件格式校验。FBX落盘后可核对文件非空与FBX二进制头或ASCII头，ZIP则核对归档有效性及其中是否含FBX；不能只将任意响应改名 `.fbx` 当作成功。未拿到真实转换响应之前，文档和任务状态应写“接口已发现，未实测”，不写“FBX已生成”。

## 实际观察与验证边界

2026-10-14直接HTTP检查，未带Cookie，也未提交建模：

| 操作 | 结果 |
|---|---|
| GET `/api/3d/config` | HTTP 200，JSON顶层直接含promptExamples、modelExamples、generalConfig等；服务端没有必然的data封装，前端的response.data是Axios响应属性 |
| POST `/api/3d/resource/genUploadInfo`，body `{fileName:"V01_front.png"}` | HTTP 401，error.code为`999`，message为`web cookie user is empty` |
| POST `/api/3d/quotainfo`，body `{}` | 同上，证明登录Cookie是业务接口的必要条件 |

浏览器页面曾显示20额度，这只是界面观察，不能当作API确认的剩余次数。早期原生文件选择器测试只有部分视角成功，未作为本次正式任务输入。早期 `chrome://inspect/#pages` 入口被自动浏览器URL安全策略拒绝，此受阻入口未被绕过。

随后用户主动打开Network并复制单个同源 `creations/list` 请求为cURL，通过系统TextEdit安全保存到项目外。执行器将此明确提供的请求解析为最小同源HAR并导入0600凭据文件；没有抓取其他网站会话。原请求重放获得HTTP 200。这一合法认证来源已解决早期缺会话限制。

2026-10-14，V01真实账号CLI实测：

| 操作 | 结果 |
|---|---|
| `import-session` | 最小同源HAR导入成功；凭据仅保存在项目外0600文件 |
| `upload` | 全部8张图片COS上传及review通过，8/8 |
| `submit` | 返回creationsId `9ad6bb90-633f-4621-90c9-ed03dbbbc556`，已创建并启动远端生成任务 |
| `status` | 首次查询`wait`，最终查询任务及result资产均`success`，assetId `6073ec13-de9d-4a65-980d-938eb035f765`；modelType=`multiView2ModelV3.1`、isMultiView=true、八项imageTagList对应正确、costType=`quota` |
| 模型生成成功 | detail任务status及result[0].status均success；V01模型生成完成 |
| FBX转换与下载 | 未调用、未实测 |
| 后续车辆 | 按用户最新指令串行上传与提交中；准确任务ID和状态以项目任务文件为准 |

实测状态与脱敏任务ID可以保存项目；Cookie、原cURL、HAR、临时上传密钥和带签名URL不应进入项目或Git。

## 额度接口与CLI验证

当前公开主bundle模块38455分别提供两个不同的接口：

- `POST /api/3d/quotainfo`：前端导出`rH`，接收调用方JSON参数，用于额度信息查询，具体返回单位须账号实测。无Cookie直接HTTP检查得到401。
- `GET /api/3d/planCreditInfo`：前端导出`tI`，不发送JSON正文，用于当前套餐/积分信息。CLI的`quota`采用此接口，当前登录账号实测HTTP 500；两者不是同一endpoint的别名，不能将其中一个检查成功替代另一个。CLI返回脱敏原始字段，不把未知单位换算为可生成车型数。

仓库CLI与个人安装技能已通过skill结构校验。离线验证覆盖公开bundle签名一致性、八张不同图的草稿校验、认证HAR同源筛选/0600权限、敏感字段与URL查询脱敏、提交和转换未知结果防重试，以及FBX/ZIP内容校验。持久测试入口为`node --test skills/hunyuan-3d/tests/*.test.mjs`。V01真实上传、提交、查询及模型生成success已通过，离线验证仍不能代替尚未执行的FBX下载测试。ZIP校验范围是中央目录结构与目标格式扩展名，不包含解压后逐个FBX的完整内容校验。

## 当前批次执行政策

用户最新指令为“不用等结果，直接串行执行”。首批固定范围为 `V01,V09,V04,V03,V29,V36,V35,V41,V05,V02`，不自动扩大到其他车型。每款本地草稿、八图上传与审核通过后只提交一次；成功拿到creationsId即可执行下一款，不等待前一款云端模型生成success，再统一查询已提交任务。V01的上传与签名提交已实测通过，V01最终已success，但该结果不是串行下一款提交的必要前提。

遇到提交结果未知、认证失效或配额拒绝，应保留状态并核对，不自动重复可能收费的请求。草稿、上传成功、任务ID和最终模型success分别记录。默认不执行下载、导出或转换；本次串行指令没有改变此边界。

## 最终实测补充

V01 detail API任务status与result[0]资产status均为`success`。creationsId为`9ad6bb90-633f-4621-90c9-ed03dbbbc556`，assetId为`6073ec13-de9d-4a65-980d-938eb035f765`，taskId为`r_48a9c747c79d11f1b8a542e09608524f`。响应提供格式字段 `glb`、`obj`、`mtl`、`geometryGlb`、`textureGlb` 等，只记录字段名，不保存下载URL到此文档。没有执行下载或格式转换；生成success不等同于已导出FBX或已验证模型可打开性。

后续V09、V04、V03也已API提交。V05第一次八图upload成功后submit得到HTTP429，当次未取得creationsId。list total从142增加到146，符合已创建4个任务；V05尝试之后查询没有发现对应候选任务。429的具体原因未知，可能涉及限流或并发，不能认定为配额不足，当次不能声称V05已创建。后续核对及新的成功提交见下一节，避免自动重复收费请求。


### 首批追加提交观察

已按用户最新要求采用串行API提交，不等待上一款生成结果。V01、V09、V04、V03、V05、V02均已取得唯一creationsId；V01已确认任务与资产双success，其余最近一次状态为processing或wait。状态以项目`assets/models/Vxx/state.json`为准。

V05第一次提交收到HTTP 429，脚本留下submission_uncertain并停止。之后使用已捕获的真实同源creations/list请求只读核对：totalCount为146（原142+已创建4款），V05尝试时间之后没有候选任务。记录核对证据并将草稿恢复uploaded，冷却后一次新的提交取得唯一任务编号；没有重复云任务。HTTP 429原因未由服务端明确说明，不能据此断定额度用尽。后续提交保守拉开时间，仅作为本次操作的限流应对，并非宣称官方固定频率限制。

没有执行download、resourceConvert或retopologize。仅返回格式信息与建模成功，不代表FBX已下载或模型几何质量已经人工验收。
