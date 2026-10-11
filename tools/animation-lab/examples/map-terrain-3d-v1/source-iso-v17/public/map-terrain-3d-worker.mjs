import {TerrainWorld3D} from '/map-terrain-3d.mjs';
let world;
self.onmessage=({data})=>{try{if(data.type==='init'){world=new TerrainWorld3D(data.config);self.postMessage({type:'ready',config:world.config});return;}const start=performance.now(),chunk=world.chunk(data.cx,data.cz,{resolution:32});self.postMessage({type:'chunk',chunk,elapsedMs:performance.now()-start},[chunk.positions.buffer,chunk.normals.buffer,chunk.colors.buffer,chunk.tangents.buffer,chunk.indices.buffer]);}catch(error){self.postMessage({type:'error',message:error.message});}};
