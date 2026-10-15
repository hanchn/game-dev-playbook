const entries=[
  ['/keyframe-animation-test','关键帧动画测试','二维关键姿势与连续位图播放'],
  ['/model-frame-extraction','建模抽帧','模型、绑骨与格斗序列帧'],
  ['/lab','角色动画','零件、骨骼与贴图动作'],
  ['/frame-animation','帧动画与拍摄','视频抽帧、图片序列、录制与导出'],
  ['/keyframe-generator','骨骼关键帧','姿势编辑与动作时序'],
  ['/map-generator','2D / 2.5D 地图','多风格地图与场景导出'],
  ['/map-generator-3d','3D 地图','地形、贴图与三维场景'],
  ['/ui-kit-solution','完整 UI 套图','整套页面、控件与素材'],
  ['/art-qa','美术 QA','检查证据与失败复测']
];
const current=location.pathname;
const active=href=>href==='/lab'?(current==='/'||current==='/lab'||current.startsWith('/lab/')):current===href;
const nav=document.createElement('nav');nav.className='studio-global-nav';nav.setAttribute('aria-label','主要功能');
nav.innerHTML='<span class="studio-nav-brand">游戏开发工坊</span><div class="studio-nav-links">'+entries.map(([href,label,description])=>`<a href="${href}" title="${description}"${active(href)?' aria-current="page"':''}>${label}</a>`).join('')+'</div>';
document.body.classList.add('has-global-navigation');document.body.prepend(nav);
