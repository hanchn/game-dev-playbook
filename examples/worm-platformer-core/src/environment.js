// Spatial seasons are deterministic; temporal weather advances only with game time.
export const BIOMES=[
 {id:'garden',name:'春日花园',season:'春',background:'background',tree:'oak',bird:'bluebird',palette:0,weather:['sun','rain','sun'],wind:22},
 {id:'forest',name:'夏日森林',season:'夏',background:'background-forest',tree:'birch',bird:'robin',palette:1,weather:['sun','rain','wind'],wind:36},
 {id:'waterfall',name:'瀑布幽谷',season:'夏',background:'background-waterfall',tree:'oak',bird:'bluebird',palette:2,weather:['mist','rain','sun'],wind:27},
 {id:'autumn',name:'金秋林地',season:'秋',background:'background-forest',tree:'maple',bird:'robin',palette:3,weather:['wind','sun','rain'],wind:52},
 {id:'snow',name:'冬日雪林',season:'冬',background:'background-snow',tree:'birch',bird:'bluebird',palette:4,weather:['snow','sun','snow'],wind:18},
 {id:'desert',name:'沙漠绿洲',season:'旱季',background:'background-desert',tree:'oak',bird:'sparrow',palette:5,weather:['sun','wind','sun'],wind:42}
];
export const REGION_CHUNKS=3,WEATHER_SECONDS=35;
export function biomeAt(index){return BIOMES[Math.floor(Math.max(0,index)/REGION_CHUNKS)%BIOMES.length]}
export function environmentAt(x,time){const index=Math.floor(x/1024),biome=biomeAt(index),cycle=Math.floor(time/WEATHER_SECONDS),weather=biome.weather[cycle%biome.weather.length],phase=(time%WEATHER_SECONDS)/WEATHER_SECONDS;return{...biome,weather,cycle,phase,wind:weather==='wind'?biome.wind*1.8:biome.wind,weatherName:{sun:'晴天',rain:'雨天',snow:'雪天',wind:'阵风',mist:'水雾'}[weather],pulse:weather==='wind'&&phase>.35&&phase<.65,waterPulse:biome.id==='waterfall'&&Math.floor(time/18)%2===1}}
// Runtime materials keep anatomy/atlas ownership unchanged across seasonal coats.
export function coatFilter(palette){return ['none','hue-rotate(18deg) saturate(.88)','hue-rotate(38deg) saturate(.9)','hue-rotate(-24deg) saturate(1.12)','saturate(.35) brightness(1.28)','sepia(.55) saturate(.8)'][palette]??'none'}
