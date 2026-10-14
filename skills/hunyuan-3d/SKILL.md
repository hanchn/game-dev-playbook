---
name: hunyuan-3d
description: 通过腾讯混元3D官网会话上传本地多视角图片、提交建模任务、查询状态并导出模型。用于 hunyuan.tencent.com 官网建模操作，不用于腾讯云API。
---

使用 `scripts/hunyuan.mjs`（Node 22+）执行官网接口；实际登录会话来自用户明确提供的同源请求认证（例如最小 HAR），不读取其他网站的凭据。接口依据官网公开前端，首次运行应确认当前契约，详见 [接口参考](references/api-contract.md)。

凭据、原始响应和带签名URL保存在项目外 `~/.codex/hunyuan-3d/`，权限0600。模型与脱敏任务状态保存在项目 `assets/models/Vxx/`。不要将 HAR、Cookie、临时COS密钥、私有任务缓存复制进项目或日志。会话失效时重新登录并导入，不回显秘密。

CLI：

```bash
node SKILL_PATH/scripts/hunyuan.mjs import-session --har /PRIVATE/session.har
node SKILL_PATH/scripts/hunyuan.mjs quota
node SKILL_PATH/scripts/hunyuan.mjs create --root PROJECT --vehicle V01 --face-count 1500000
node SKILL_PATH/scripts/hunyuan.mjs upload --root PROJECT --vehicle V01
node SKILL_PATH/scripts/hunyuan.mjs submit --root PROJECT --vehicle V01
node SKILL_PATH/scripts/hunyuan.mjs status --root PROJECT --vehicle V01
node SKILL_PATH/scripts/hunyuan.mjs download --root PROJECT --vehicle V01 --format fbx
```

`SKILL_PATH`为本技能绝对目录；`PROJECT`为项目绝对路径，需有 `docs/vehicle-catalog.json`，vehicles条目包含id、name、views（key、file）。八图使用front、rear、left、right、front_left_45、front_right_45、top、bottom；原始图片必须一致姿态且通过项目队列校验和视觉检查。`create`仅创建本地草稿，输出明确 `remoteSubmitted:false`，不能说已开始云端建模。`upload`上传COS并审核，八图通过后才可submit。

首次安装COS依赖：`npm install --prefix ~/.codex/hunyuan-3d-runtime cos-nodejs-sdk-v5 --no-audit --no-fund`。不将运行时依赖放进项目。可用 `--session /PRIVATE/session.json`覆盖会话路径。

建模提交会消耗账号额度，按用户授权的车辆范围执行；`submit`只发一次，写入uncertain标记后再请求。失败或超时不要自动再次提交；先在官网或已知任务列表核对是否已创建，确定后再人工修复状态。已提交车辆拒绝重复提交。执行顺序遵循用户要求，单车锁防止重复操作。用户要求串行时，每款拿到creationsId后即可处理下一款，完成提交后统一查询；不额外要求先等第一款云端模型success。

默认流程提交任务并记录及查询状态，不自动下载、导出或转换模型。只有用户明确要求下载文件时才执行`download`；用户授权建模或保存skill不等同于下载授权。

状态查询单次执行，可间隔轮询，不持续占用多分钟工具调用。云端task和每个result资产均需成功才算完成。明确请求下载后，下载优先FBX；如果只有OBJ(zip)/GLB，则使用真实resourceConvert接口，遵循当前账号额外转换额度约束；不默认重拓扑。下载响应若为zip会保留`.fbx.zip`，不要把压缩包宣称原始FBX。核对文件格式、大小与模型可打开性后再报告建模完成。用户已授权推远程时再由正常Git工作流提交模型及脱敏状态。

2026-10-14已实测V01：用户主动提供同源Network请求，经最小HAR导入后，8图COS上传和审核、签名提交及状态查询成功。creationsId为`9ad6bb90-633f-4621-90c9-ed03dbbbc556`，最终detail任务与result[0]资产均`success`，模型生成完成；FBX转换下载尚未执行或验证。当前按用户“不用等结果，直接串行执行”处理首批。`quota`的GET planCreditInfo实测HTTP500，未知返回单位或界面20额度不得宣称为API确认剩余20次。

下面为本项目验证案例，其他项目的范围按用户请求确定。当前项目首批manifest范围固定为`V01,V09,V04,V03,V29,V36,V35,V41,V05,V02`，只处理这10款，不自动扩展其他车型。每款八图审核通过后提交一次，拿任务ID即进入下一款，之后统一查询；默认不下载。

V01最终验证：assetId=`6073ec13-de9d-4a65-980d-938eb035f765`，taskId=`r_48a9c747c79d11f1b8a542e09608524f`；响应含glb、obj、mtl、geometryGlb、textureGlb等格式字段，不在文档记录URL。V09/V04/V03/V05/V02也已提交。V05第一次submit HTTP429、当次无creationsId，经真实任务列表核对未创建并记录证据后，冷却后新的一次提交成功；原因未知，不按配额不足推断。未执行下载或转换。
