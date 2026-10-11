import {buildIsometricScene} from '/map-isometric-core.mjs';
self.onmessage=({data})=>{try{const begin=performance.now(),scene=buildIsometricScene(data.args);self.postMessage({token:data.token,scene,buildMs:performance.now()-begin});}catch(error){self.postMessage({token:data.token,error:error.message});}};
