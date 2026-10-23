import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const target='research/v2/historical-catalog.json';
if(fs.existsSync(target))throw Error('Historical catalog already frozen; refusing overwrite');
const files=execFileSync('git',['ls-files','benchmark/results'],{encoding:'utf8'}).trim().split('\n');
fs.writeFileSync(target,JSON.stringify({schemaVersion:2,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),labels:{baseline:'legacy controlled',idiomatic:'legacy conservative idiomatic (revision notification, not signal-state architecture)'},policy:'Stored historical labels, raw bytes and experiment IDs are unchanged. Catalog labels are explanatory only.',files:files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))},null,2)+'\n');
