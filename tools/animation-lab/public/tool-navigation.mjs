const entries=[
  ['http://127.0.0.1:4321/?tab=catalog','街机游戏库','Top100逆向收录进度、原生招式与帧动画'],
  ['/keyframe-animation-test','关键帧动画测试','二维关键姿势与连续位图播放'],
  ['/model-frame-extraction','建模抽帧','混元模型、绑骨与格斗序列帧'],
  ['/pixel-combat','像素招式','原图、角色与招式时间轴'],
  ['/combat-2d','2D 招式演武场','分件角色、物理攻击、元素施法与受击'],
  ['/vfx-tester','技能与特效库','2D / 3D 大招、爆炸、冲击波与导出'],
  ['/lab','角色动画','零件、骨骼与贴图动作'],
  ['/frame-library','帧动画素材库','现成序列、方向、时序与边界检查'],
  ['/frame-animation','帧动画与拍摄','视频抽帧、图片序列、录制与导出'],
  ['/keyframe-generator','2D 骨骼关键帧','姿势编辑与动作时序'],
  ['/skeleton-library-3d','3D 骨骼库','真实模型、蒙皮、关节与动作检查'],
  ['/world-map-2d','海岛 2D 世界','真实2D素材、碰撞与海岛探索'],
  ['/underwater-map','海底地图','海床、岩礁、海草与潜游测试'],
  ['/map-generator','2D / 2.5D 地图','多风格地图与场景导出'],
  ['/map-generator-3d','3D 地图','地形、贴图与三维场景'],
  ['/ui-kit-solution','完整 UI 套图','整套页面、控件与素材'],
  ['/art-qa','美术 QA','检查证据与失败复测']
];
const current=location.pathname;
const active=href=>href==='/vfx-tester'?current.startsWith('/vfx-'):href==='/lab'?(current==='/'||current==='/lab'||current.startsWith('/lab/')):current===href;
const nav=document.createElement('nav');nav.className='studio-global-nav';nav.setAttribute('aria-label','主要功能');
nav.innerHTML='<span class="studio-nav-brand">游戏开发工坊</span><div class="studio-nav-links">'+entries.map(([href,label,description])=>`<a href="${href}" title="${description}"${active(href)?' aria-current="page"':''}>${label}</a>`).join('')+'</div>';
const menu=document.createElement('details');menu.className='studio-nav-menu';menu.innerHTML='<summary>全部功能</summary><div>'+entries.map(([href,label,description])=>`<a href="${href}"><strong>${label}</strong><span>${description}</span></a>`).join('')+'</div>';nav.prepend(menu);
document.body.classList.add('has-global-navigation');document.body.prepend(nav);
