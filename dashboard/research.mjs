const byId=id=>document.getElementById(id),fields=['experiment','version','track','acceptance'];
const number=n=>n==null?'Unavailable':n.toFixed(2);
try{
 const response=await fetch('../benchmark/results-v2/summary.json');if(!response.ok)throw Error(`Summary HTTP ${response.status}`);const data=await response.json();
 if(data.schemaVersion!==2||data.errors.length)throw Error('Summary failed research audit');
 for(const field of fields.slice(0,3))for(const value of [...new Set(data.rows.map(r=>r[field]))].sort()){
  const option=document.createElement('option');option.value=String(value);option.textContent=String(value);byId(field).append(option);
 }
 function render(){
  const rows=data.rows.filter(r=>fields.every(f=>!byId(f).value||String(f==='acceptance'?r.accepted:r[f])===byId(f).value));
  byId('status').textContent=`${rows.length} attempts · ${rows.filter(r=>r.accepted).length} accepted · ${data.historicalFilesVerified} historical files verified unchanged`;
  byId('runs').replaceChildren();for(const row of rows){
   const tr=document.createElement('tr');
   for(const value of [`${row.version} / ${row.track}`,row.rep,number(row.statistics?.p50),number(row.statistics?.p95),row.lateUpdates??'Unavailable']){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}
   const td=document.createElement('td'),a=document.createElement('a');a.href='../'+row.file;a.textContent=row.accepted?'Accepted':'Rejected / incomplete';if(!row.accepted)td.className='failure';td.append(a);if(row.error)td.title=row.error;tr.append(td);byId('runs').append(tr);
  }
  byId('native-builds').replaceChildren();for(const row of data.nativeBuilds.filter(r=>!byId('version').value||String(r.version)===byId('version').value)){
   const tr=document.createElement('tr');for(const value of [`${row.version} / ${row.cache}`,row.builder,number(row.durationMs),row.emittedJSBytes??'Unavailable']){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}const td=document.createElement('td'),a=document.createElement('a');a.href='../'+row.file;a.textContent=row.accepted?(row.timingEligible?'Pilot build':'Compiled; timing excluded'):'Failed';td.append(a);tr.append(td);byId('native-builds').append(tr);
  }
  byId('pairs').replaceChildren();for(const pair of data.pairs.filter(p=>!byId('experiment').value||p.experiment===byId('experiment').value)){
   const p=document.createElement('p');p.textContent=`${pair.variants.join(' → ')}: ${number(pair.estimate)} ms; 95% exploratory interval ${pair.interval?pair.interval.map(number).join(' to ')+' ms':'unavailable'}; ${pair.n} complete blocks; ${pair.missingBlocks} missing. Experiment ${pair.experiment}.`;byId('pairs').append(p);
  }
 }
 fields.forEach(f=>byId(f).addEventListener('change',render));render();
}catch(error){byId('status').textContent=`Evidence unavailable: ${error.message}`;byId('status').className='failure';}
