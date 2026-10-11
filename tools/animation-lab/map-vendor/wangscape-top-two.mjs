/** JavaScript port of Wangscape CalculatorTopTwo.cpp. MIT, Copyright (c) 2017 Wangscape.
 * Original C++ and license retained under ./wangscape; see SOURCE-scene.json.
 * Sorting pair<weight,index> descending, epsilon threshold and byte allocation follow source.
 */
export function topTwo(weights,power=3){
 if(!Array.isArray(weights)||weights.length<3||!weights.every(n=>Number.isFinite(n)&&n>=0)||!Number.isFinite(power)||power<=0)throw new TypeError('TopTwo requires at least three nonnegative finite weights and positive power');
 const indexed=weights.map((weight,index)=>({weight,index})).sort((a,b)=>b.weight-a.weight||b.index-a.index),[winner,runner,base]=indexed,margin=winner.weight-base.weight,ratio=margin<=255*Number.EPSILON?1:(runner.weight-base.weight)/margin;
 const share=ratio===1?127:Math.max(0,Math.min(255,Math.trunc(255*Math.pow(ratio,power)/(1+Math.pow(ratio,power)))));
 return{winner:winner.index,runner:runner.index,alpha:255-share,runnerAlpha:share};
}
