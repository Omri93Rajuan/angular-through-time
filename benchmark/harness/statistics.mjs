export function quantile(values,p){const a=[...values].sort((x,y)=>x-y);if(!a.length)return null;const n=(a.length-1)*p,i=Math.floor(n);return a[i]+(a[Math.min(i+1,a.length-1)]-a[i])*(n-i);}
export function describe(a){return {n:a.length,median:quantile(a,.5),q1:quantile(a,.25),q3:quantile(a,.75),iqr:a.length?quantile(a,.75)-quantile(a,.25):null,min:a.length?Math.min(...a):null,max:a.length?Math.max(...a):null};}
// Web-vitals session window: at most 5 seconds, with gaps below 1 second.
export function cls(entries){let max=0,sum=0,start=0,last=0;for(const e of entries.filter(e=>!e.hadRecentInput).sort((a,b)=>a.start-b.start)){if(sum && e.start-last<1000 && e.start-start<5000)sum+=e.value;else{start=e.start;sum=e.value;}last=e.start;max=Math.max(max,sum);}return max;}
