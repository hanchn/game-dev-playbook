// Validate native capture indices without upgrading input delivery into move acceptance.
export const CAPTURE_COLLECTIONS=['actions','author','meter','edges'];
export function normalizeCollection(index,source){
 if(!CAPTURE_COLLECTIONS.includes(source))throw Error('Unknown capture collection');
 const prefix=`data/research/kof98-${source}-20261016/`,characters={};
 if(!index||typeof index.characters!=='object'||Array.isArray(index.characters))throw Error('Missing collection characters');
 for(const [id,entry] of Object.entries(index.characters)){
  if(!/^[a-z0-9]+$/.test(id))throw Error('Invalid collection character');
  const seen=new Set(),clips=[];
  for(const clip of entry.clips||[]){
   if(typeof clip.id!=='string'||seen.has(clip.id))throw Error('Duplicate or missing capture clip');seen.add(clip.id);
   if(clip.captureStatus==='blocked'||!clip.frames?.length)continue;
   if(!(clip.refreshHz>0&&Number.isFinite(clip.refreshHz)))throw Error('Missing native refresh rate');
   let end;
   for(const frame of clip.frames){
    if(typeof frame.image!=='string'||!frame.image.startsWith(prefix)||frame.image.split('/').includes('..'))throw Error('Capture image outside its source collection');
    if(!Number.isInteger(frame.sourceTick)||!Number.isInteger(frame.ticks)||frame.ticks<1||(end!==undefined&&frame.sourceTick!==end))throw Error('Discontinuous captured timeline');
    end=frame.sourceTick+frame.ticks;
   }
   clips.push({...clip,id:source+'/'+clip.id,sourceCollection:source,nativeScene:true,expandedCapture:true,triggerStatus:clip.triggerStatus||'not_verified'});
  }
  characters[id]={clips,blocked:(entry.blocked||[]).filter(b=>!b.delegated),delegated:(entry.blocked||[]).filter(b=>b.delegated),identityVisualVerified:entry.identityVisualVerified===true};
 }
 return {source,characters};
}
export function collectionCharacter(collections,id){
 const clips=[],blocked=[],delegated=[];
 for(const collection of collections){const entry=collection.characters[id];if(!entry)continue;clips.push(...entry.clips);blocked.push(...entry.blocked.map(b=>({...b,sourceCollection:collection.source})));delegated.push(...entry.delegated.map(b=>({...b,sourceCollection:collection.source})));}
 return {clips,blocked,delegated,observed:clips.filter(c=>c.triggerStatus==='observed').length,unverified:clips.filter(c=>c.triggerStatus==='not_verified').length,notObserved:clips.filter(c=>c.triggerStatus==='not_observed').length};
}
