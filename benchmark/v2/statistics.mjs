import {quantile} from '../harness/statistics.mjs';
export function runStatistics(timings) {
 if(!timings.length)return {p50:null,p95:null};
 if(timings.some(t=>!Number.isFinite(t.presentationMs)||t.presentationMs<0))throw Error('Invalid timing');
 return {p50:quantile(timings.map(t=>t.presentationMs),.5),p95:quantile(timings.map(t=>t.presentationMs),.95)};
}
// Percentile bootstrap over paired independent blocks. Exploratory, not a significance test.
export function pairedInterval(pairs,draws=10000){
 if(pairs.length<2)return {n:pairs.length,estimate:pairs.length?pairs[0][1]-pairs[0][0]:null,interval:null,reason:'At least two complete blocks required'};
 if(pairs.some(p=>p.length!==2||p.some(n=>!Number.isFinite(n))))throw Error('Invalid pair');
 const diffs=pairs.map(([a,b])=>b-a),mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
 let seed=14022;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 const means=Array.from({length:draws},()=>mean(diffs.map(()=>diffs[Math.floor(random()*diffs.length)])));
 return {n:pairs.length,estimate:mean(diffs),interval:[quantile(means,.025),quantile(means,.975)],method:'paired block percentile bootstrap; 10000 draws; seed 14022',warning:'Pilot uncertainty is unstable at small n; no confirmatory inference'};
}
