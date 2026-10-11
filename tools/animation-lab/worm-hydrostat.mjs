// A kinematic hydrostat, not a soil/friction simulation. Reference:
// Kurth & Kier, JEB 217 (2014), doi:10.1242/jeb.098137.
// Volume proxy length * diameter^2 is constant for each material segment.
// Amplitudes below are adjustable animation assumptions, not measured biology.
export function wormSegmentDimensions({restLength,restWidth,index,count,phase,clip,contraction=0}) {
  if(![restLength,restWidth,index,count,phase,contraction].every(Number.isFinite)||restLength<=0||restWidth<=0||count<2||index<0||index>=count||phase<0||phase>1)throw Error('无效蚯蚓体节参数');
  const moving=['walk','run'].includes(clip),amplitude=clip==='run'?.26:.20;
  const ratio=clip==='contract'?1-.22*contraction:moving?1+amplitude*Math.sin(2*Math.PI*(phase-index/(count-1)*1.15)):clip==='idle'?1+.012*Math.sin(2*Math.PI*phase):1;
  return {length:restLength*ratio,width:restWidth/Math.sqrt(ratio),lengthRatio:ratio,volumeProxy:restLength*restWidth**2};
}
