import {png} from '../../skills/sprite-animation-production/scripts/read-png.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {presets,createAsset,validateAsset,runTests,analyzePerformance,generateAnimation} from './game-core.mjs';
import {arthropodMotions} from './arthropod-rig.mjs';
import {flexMotions} from './flex-rig.mjs';
import {motionInfo} from './animal-rig.mjs';
import {humanClips} from './human-actions.mjs';
import {spriteSheet as legacySheet} from './core.mjs';
import {skinnedSheet} from './skin-renderer.mjs';
import {mapOperation} from './infinite-map.mjs';
import {studioMapOperation} from './scripts/studio-map-adapter.mjs';
import {createTimeline,validateTimeline,applyKeyframeEdits,inspectTimeline,exportFrames} from './keyframe-generator-core.mjs';
import {planUiSuite,validateUiPlan,renderUiComponent,planLayout} from './ui-kit-planner.mjs';
export async function saveSpriteEvidence({asset,clip,dataUrl}){
 validateAsset(asset);if(!/^[a-z0-9-]+$/.test(asset.id)||!asset.clips.includes(clip)||clip==='extend')throw Error('无效导出资产或动作');
 const report=runTests(asset,{clip});if(!report.passed)throw Error('本动作技术检查未通过');
 if(typeof dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl))throw Error('需要 PNG 数据');
 const bytes=Buffer.from(dataUrl.split(',')[1],'base64');if(bytes.length>6_000_000||bytes.toString('hex',0,8)!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==2048||bytes.readUInt32BE(20)!==2048)throw Error('需要 2048×2048 PNG');
 const {w,pixels}=png(bytes);for(let frame=0;frame<16;frame++){const ox=frame%4*512,oy=Math.floor(frame/4)*512;let empty=true;for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(pixels[((oy+y)*w+ox+x)*4+3]>128){empty=false;if(x<3||y<3||x>508||y>508)throw Error(`${clip} 第 ${frame+1} 帧超出透明留边；请降低整体比例或调整画布`);}if(empty)throw Error('导出有空白帧');}
 const skins=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'),'utf8')),skin=asset.skin??skins[asset.rendering.skinKey??asset.species],folder=path.join(root,'examples',asset.id);await fs.mkdir(folder,{recursive:true});
 await fs.writeFile(path.join(folder,clip+'.png'),bytes);await fs.writeFile(path.join(folder,clip+'-frames.json'),JSON.stringify({...skinnedSheet(asset,{...skin,href:skin.atlas},{clip}).manifest,format:'png',image:clip+'.png'},null,2));await fs.writeFile(path.join(folder,clip+'-animation.json'),JSON.stringify(generateAnimation(asset,{clip}),null,2));await fs.writeFile(path.join(folder,clip+'-qa.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(folder,'asset.json'),JSON.stringify({...asset,skin},null,2));
 return {saved:true,clip,folder};
}
export const root=path.dirname(fileURLToPath(import.meta.url));
const store=path.join(root,'data');
const clips=[...new Set([...Object.keys(humanClips),...Object.keys(motionInfo),...Object.keys(flexMotions),...Object.keys(arthropodMotions)])];
const pointSchema={type:'object',properties:{x:{type:'integer'},y:{type:'integer'}},required:['x','y'],additionalProperties:false};
const ruleSchema={anyOf:[{type:'string',maxLength:1000},{type:'object',properties:{description:{type:'string',maxLength:1000},event:{type:'string'},condition:{}},required:['description'],additionalProperties:false}]};
const timelineSchema={type:'object',description:'sprite-keyframes schemaVersion 1，使用当前角色版本'};
const developmentDefinitions=[
 {name:'game_plan',description:'按已有游戏 brief 形成关联玩法、架构、场景、角色和 UI 的制作计划，状态为 planned',inputSchema:{type:'object',properties:{brief:{type:'object'}},required:['brief'],additionalProperties:false}},
 {name:'ui_suite_from_game',description:'继承已生成游戏计划的核心玩法、目标、失败规则和明确 HUD，形成相连 UI 方案；不支持的引擎/玩法需扩展',inputSchema:{type:'object',properties:{plan:{type:'object'}},required:['plan'],additionalProperties:false}},
 {name:'world_generate',description:'可复现无限分块世界数据及限定区域通行检查；不证明游戏目标可达',inputSchema:{type:'object',properties:{operation:{type:'string',enum:['tile','chunk','region','validate']},config:{type:'object',properties:{seed:{type:'string',minLength:1,maxLength:160},scale:{type:'number',minimum:48,maximum:768},seaLevel:{type:'number',minimum:.2,maximum:.62},roughness:{type:'number',minimum:0,maximum:1},vegetation:{type:'number',minimum:0,maximum:1}},additionalProperties:false},point:pointSchema,chunk:pointSchema,spawn:pointSchema,region:{type:'object',properties:{x:{type:'integer'},y:{type:'integer'},width:{type:'integer',minimum:1},height:{type:'integer',minimum:1}},required:['x','y','width','height'],additionalProperties:false}},required:['operation'],additionalProperties:false}},
 {name:'studio_world_generate',description:'调用本地 game-asset-studio 原地图实现的确定性块或 Tiled 数据适配',inputSchema:{type:'object',properties:{operation:{type:'string',enum:['chunk','tiled']},world_id:{type:'string'},seed:{type:'integer'},chunk_x:{type:'integer',minimum:-1000000,maximum:1000000},chunk_y:{type:'integer',minimum:-1000000,maximum:1000000},chunk_size:{type:'integer',minimum:16,maximum:128},environment_id:{type:'string'}},required:['operation'],additionalProperties:false}},
 {name:'keyframes_create',description:'从当前角色动作采样 FK 关键帧，视觉待检查',inputSchema:{type:'object',properties:{species:{type:'string',enum:presets.map(x=>x.id)},skin:{type:'string',enum:['classic','alien']},clip:{type:'string',enum:clips},count:{type:'integer',minimum:2,maximum:65}},required:['species'],additionalProperties:false}},
 {name:'keyframes_edit',description:'编辑局部关节、根位移和时间；返回新时间轴并保持当前骨长',inputSchema:{type:'object',properties:{timeline:timelineSchema,edits:{type:'array',maxItems:256,items:{type:'object'}}},required:['timeline','edits'],additionalProperties:false}},
 {name:'keyframes_validate',description:'采样验证骨长、接头和循环位置/角度；不替代美术或接地 QA',inputSchema:{type:'object',properties:{timeline:timelineSchema,samples:{type:'integer',minimum:2,maximum:513}},required:['timeline'],additionalProperties:false}},
 {name:'keyframes_sample',description:'导出已验证格式的关键帧动画姿势数据，角色局部像素坐标',inputSchema:{type:'object',properties:{timeline:timelineSchema,count:{type:'integer',minimum:2,maximum:120}},required:['timeline'],additionalProperties:false}},
 {name:'ui_suite_plan',description:'由名称与核心循环生成完整 UI 页面、状态、tokens、素材生产清单与 QA 方案',inputSchema:{type:'object',properties:{brief:{type:'object',properties:{name:{type:'string',maxLength:100},coreLoop:{type:'string',maxLength:500},objective:ruleSchema,failure:ruleSchema,hud:{type:'array',maxItems:20,items:{type:'object',properties:{id:{type:'string'},label:{type:'string'},path:{type:'string'},event:{type:'string'},format:{type:'string'},feedback:{type:'string'},critical:{type:'boolean'}},required:['id','label','path','event'],additionalProperties:false}},genre:{type:'string',enum:['platformer','runner','puzzle','action','rpg','idle','card']},orientation:{type:'string',enum:['landscape','portrait']},input:{type:'string',enum:['touch','keyboard','gamepad','mixed']},engine:{type:'string',enum:['phaser','godot']},theme:{type:'string',enum:['jungle','candy','space','paper']},progression:{type:'string',enum:['levels','endless','single-session']},audience:{type:'string',maxLength:200},artStyle:{type:'string',maxLength:300},productionKit:{type:'string',maxLength:100},sessionMinutes:{type:'number',minimum:.5,maximum:120},references:{type:'array',maxItems:20,items:{type:'object'}}},required:['name','coreLoop'],additionalProperties:false}},required:['brief'],additionalProperties:false}},
 {name:'ui_suite_validate',description:'检查 UI 方案结构与素材状态，返回真实失败项',inputSchema:{type:'object',properties:{plan:{type:'object'}},required:['plan'],additionalProperties:false}},
 {name:'ui_suite_component',description:'输出独立 SVG UI 组件状态；默认不烘焙动态文字',inputSchema:{type:'object',properties:{plan:{type:'object'},id:{type:'string'},state:{type:'string'},options:{type:'object',properties:{label:{type:['string','null']},value:{type:'number'},includeText:{type:'boolean'}},additionalProperties:false}},required:['plan','id'],additionalProperties:false}},
 {name:'ui_suite_layout',description:'计算实际视口与安全区的 UI 布局',inputSchema:{type:'object',properties:{plan:{type:'object'},viewport:{type:'object',properties:{width:{type:'number'},height:{type:'number'},insets:{type:'array',minItems:4,maxItems:4,items:{type:'number'}},textScale:{type:'number'}},required:['width','height'],additionalProperties:false}},required:['plan','viewport'],additionalProperties:false}}
];
function timelineAsset(timeline){if(!timeline?.asset?.species)throw Error('关键帧缺少角色来源');const asset=createAsset(timeline.asset.species,{skin:timeline.asset.skin??undefined});if(timeline.asset.id!==asset.id||timeline.asset.atlas!==asset.rendering.atlas)throw Error('关键帧源角色版本已变化，请重新采样或迁移');validateTimeline(asset,timeline);return asset;}
export const definitions=[...developmentDefinitions,
 {name:'asset_catalog',description:'列出角色零件资产类型',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'asset_create',description:'生成角色的正交侧面贴图骨架与物种专属多动作设计',inputSchema:{type:'object',properties:{species:{type:'string',enum:presets.map(x=>x.id)},options:{type:'object',properties:{skin:{type:'string',enum:['classic','alien']},color:{type:'string'},size:{type:'number'},stride:{type:'number'}},additionalProperties:false}},required:['species'],additionalProperties:false}},
 {name:'animation_test',description:'检查角色资产的零件、局部组合或完整动作；不替代人工视觉验收',inputSchema:{type:'object',properties:{asset:{type:'object'},options:{type:'object',properties:{scope:{type:'string',enum:['component','subassembly','character']},partId:{type:'string'},clip:{type:'string',enum:clips},fault:{type:'string',enum:['none','phase','slide','stretch','seam','frozen']}},additionalProperties:false}},required:['asset'],additionalProperties:false}},
 {name:'animation_generate',description:'导出角色局部坐标的骨骼动画采样帧与根运动数据',inputSchema:{type:'object',properties:{asset:{type:'object'},options:{type:'object',properties:{scope:{type:'string',enum:['component','subassembly','character']},partId:{type:'string'},clip:{type:'string',enum:clips},frames:{type:'integer',minimum:4,maximum:120},fps:{type:'number',minimum:1,maximum:120}},additionalProperties:false}},required:['asset'],additionalProperties:false}},
 {name:'sprite_generate',description:'导出固定画布 SVG 序列帧及帧元数据',inputSchema:{type:'object',properties:{asset:{type:'object'},options:{type:'object',properties:{scope:{type:'string',enum:['component','subassembly','character']},partId:{type:'string'},frames:{type:'integer',minimum:4,maximum:64},columns:{type:'integer',minimum:1,maximum:16},clip:{type:'string',enum:clips}},additionalProperties:false}},required:['asset'],additionalProperties:false}},
 {name:'performance_analyze',description:'从实测帧耗时分析 FPS、P95 和超预算帧',inputSchema:{type:'object',properties:{samples:{type:'array',items:{type:'number'}},target:{type:'number'}},required:['samples'],additionalProperties:false}},
 {name:'knowledge_save',description:'保存资产、自动检查证据和经验备注；视觉状态保持待验收',inputSchema:{type:'object',properties:{asset:{type:'object'},options:{type:'object'},note:{type:'string',maxLength:4000}},required:['asset'],additionalProperties:false}},
 {name:'knowledge_list',description:'读取已沉淀的资产及验收记录',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
export async function callTool(name,args={}){
 switch(name){
 case 'game_plan':return (await import('./game-plan.mjs')).createGamePlan(args.brief);
 case 'ui_suite_from_game':return planUiSuite((await import('./game-plan.mjs')).gamePlanUiBrief(args.plan));
 case 'world_generate':return mapOperation(args);
 case 'studio_world_generate':return studioMapOperation(args);
 case 'keyframes_create':return createTimeline(createAsset(args.species,{skin:args.skin}),{clip:args.clip,count:args.count});
 case 'keyframes_edit':return applyKeyframeEdits(timelineAsset(args.timeline),args.timeline,args.edits);
 case 'keyframes_validate':return inspectTimeline(timelineAsset(args.timeline),args.timeline,{samples:args.samples});
 case 'keyframes_sample':return exportFrames(timelineAsset(args.timeline),args.timeline,{count:args.count});
 case 'ui_suite_plan':return planUiSuite(args.brief);
 case 'ui_suite_validate':return validateUiPlan(args.plan);
 case 'ui_suite_component':return {format:'svg',svg:renderUiComponent(args.plan,args.id,args.state,args.options),visual:'not-reviewed'};
 case 'ui_suite_layout':return planLayout(args.plan,args.viewport);
 case 'asset_catalog':return presets;
 case 'asset_create':return createAsset(args.species,args.options);
 case 'animation_test':return runTests(args.asset,args.options);
 case 'animation_generate':return generateAnimation(args.asset,args.options);
 case 'sprite_generate':{validateAsset(args.asset);if(!args.asset.rendering)return legacySheet(args.asset,args.options);const skins=JSON.parse(await fs.readFile(path.join(root,'public/art/skins.json'),'utf8')),skin=args.asset.skin??skins[args.asset.rendering.skinKey??args.asset.species];if(!skin)throw Error('贴图未准备');skin.href='data:image/png;base64,'+(await fs.readFile(path.join(root,'public/art',path.basename(skin.atlas??args.asset.rendering.atlas)))).toString('base64');if(skin.grips){skin.grips={...skin.grips,href:'data:image/png;base64,'+(await fs.readFile(path.join(root,'public/art',path.basename(skin.grips.atlas)))).toString('base64')};}return skinnedSheet(args.asset,skin,args.options);}
 case 'performance_analyze':return analyzePerformance(args.samples,args.target);
 case 'knowledge_save':{
 const asset=validateAsset(args.asset),note=args.note??'';if(typeof note!=='string'||note.length>4000)throw Error('经验备注不得超过 4000 字');
 const report=runTests(asset,args.options);const record={id:randomUUID(),asset,report,note,createdAt:new Date().toISOString(),status:report.passed?'technical-passed':'rejected',visualStatus:'pending'};
 await fs.mkdir(store,{recursive:true});await fs.writeFile(path.join(store,record.id+'.json'),JSON.stringify(record,null,2),{flag:'wx'});return record;
 }
 case 'knowledge_list':{
 await fs.mkdir(store,{recursive:true});const files=(await fs.readdir(store)).filter(x=>x.endsWith('.json'));const records=[];for(const file of files){try{records.push(JSON.parse(await fs.readFile(path.join(store,file),'utf8')));}catch{records.push({id:file,status:'corrupt',note:'无法读取此记录'});}}return records.sort((a,b)=>(b.createdAt??'').localeCompare(a.createdAt??''));
 }
 default:throw Error('未知工具');
 }
}
