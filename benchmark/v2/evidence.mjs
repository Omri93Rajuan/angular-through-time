import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

export const HISTORICAL_RESULTS_TREE = 'dad8f757b1ae481b24796ca57e1dadb03238742c';
export const EVIDENCE_CATALOG = 'research/v2/evidence-catalog.json';
const classifications = new Map([
  ['retrospective-baseline', false],
  ['acquisition-time-seal', true]
]);
const lexical=(a,b)=>a===b?0:a<b?-1:1;

export const posixPath = value => value.replaceAll('\\','/').replace(/^\.\//,'');
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function walkFiles(directory) {
  assert.ok(fs.existsSync(directory), `Expected evidence directory is missing: ${directory}`);
  return fs.readdirSync(directory,{withFileTypes:true})
    .sort((a,b)=>lexical(a.name,b.name))
    .flatMap(entry => {
      const target=path.join(directory,entry.name);
      if(entry.isDirectory())return walkFiles(target);
      assert.ok(entry.isFile(),`Evidence may contain only regular files: ${target}`);
      return [target];
    });
}

export function assertExactPaths(actual, expected, label='evidence') {
  const a=actual.map(posixPath).sort(),e=expected.map(posixPath).sort();
  assert.equal(new Set(a).size,a.length,`${label} contains duplicate paths`);
  assert.deepEqual(a,e,`${label} file set changed`);
}

export function validateEvidenceCatalog(catalog) {
  assert.equal(catalog.schemaVersion,1);
  assert.equal(typeof catalog.policy,'string');assert.ok(catalog.policy.includes('retrospective'));
  assert.ok(Array.isArray(catalog.entries));
  const ids=new Set(),roots=new Set();
  for(const entry of catalog.entries){
    assert.equal(typeof entry.id,'string');assert.ok(!ids.has(entry.id),`Duplicate evidence id: ${entry.id}`);ids.add(entry.id);
    assert.match(entry.root,/^benchmark\/results-v2\/pilots\/[^/]+$/);assert.ok(!roots.has(entry.root),`Duplicate evidence root: ${entry.root}`);roots.add(entry.root);
    assert.equal(entry.id,path.posix.basename(entry.root));
    assert.ok(classifications.has(entry.classification),`Unknown evidence classification: ${entry.classification}`);
    assert.equal(entry.acquisitionSealed,classifications.get(entry.classification));
    if(entry.classification==='retrospective-baseline')assert.equal(entry.sealedAt,undefined,'Retrospective evidence must not claim an acquisition timestamp');
    else assert.match(entry.sealedAt,/^\d{4}-\d\d-\d\dT/);
    assert.equal(typeof entry.sourceCommit,'string');assert.match(entry.sourceCommit,/^[0-9a-f]{40}$/);
    assert.ok(Array.isArray(entry.files)&&entry.files.length>0,`No evidence files for ${entry.id}`);
    const names=entry.files.map(file=>file.path);assert.deepEqual(names,[...names].sort(lexical),`${entry.id} catalog paths must be sorted`);
    for(const file of entry.files){assert.equal(posixPath(file.path),file.path);assert.ok(!file.path.startsWith('../'));assert.match(file.sha256,/^[0-9a-f]{64}$/);}
  }
  return catalog;
}

export function verifyEvidenceEntry(entry,{listPaths,readBytes}) {
  const expected=entry.files.map(file=>file.path);
  assertExactPaths(listPaths,expected,entry.id);
  for(const file of entry.files)assert.equal(digest(readBytes(file.path)),file.sha256,`Evidence bytes changed: ${entry.root}/${file.path}`);
}

function gitBytes(revision,file,cwd=process.cwd()){return execFileSync('git',['show',`${revision}:${file}`],{cwd,maxBuffer:100*1024*1024});}

export function verifyEvidenceCatalog(catalog,{workspace=process.cwd(),revision='HEAD'}={}) {
  validateEvidenceCatalog(catalog);
  const pilotRoot=path.join(workspace,'benchmark','results-v2','pilots');
  const entries=fs.readdirSync(pilotRoot,{withFileTypes:true}).sort((a,b)=>lexical(a.name,b.name));
  for(const entry of entries)assert.ok(entry.isDirectory(),`Unexpected non-directory pilot evidence: ${entry.name}`);
  const roots=entries.map(entry=>`benchmark/results-v2/pilots/${entry.name}`);
  assertExactPaths(roots,catalog.entries.map(entry=>entry.root),'pilot evidence catalog');
  for(const entry of catalog.entries){
    const absoluteRoot=path.join(workspace,...entry.root.split('/'));
    const names=walkFiles(absoluteRoot).map(file=>posixPath(path.relative(absoluteRoot,file)));
    if(entry.classification==='retrospective-baseline'){
      const clean=spawnSync('git',['diff','--quiet',revision,'--',entry.root],{cwd:workspace});
      assert.equal(clean.status,0,`Retrospective evidence has uncommitted changes: ${entry.root}`);
      verifyEvidenceEntry(entry,{listPaths:names,readBytes:name=>gitBytes(revision,`${entry.root}/${name}`,workspace)});
    }else verifyEvidenceEntry(entry,{listPaths:names,readBytes:name=>fs.readFileSync(path.join(absoluteRoot,...name.split('/')))});
  }
}

export function assertCatalogAppendOnly(current,previous) {
  validateEvidenceCatalog(current);validateEvidenceCatalog(previous);
  assert.equal(current.policy,previous.policy,'Evidence catalog policy changed');
  assert.ok(current.entries.length>=previous.entries.length,'Evidence catalog entries were removed');
  assert.deepEqual(current.entries.slice(0,previous.entries.length),previous.entries,'Existing evidence catalog entries were changed or reordered');
}

export function verifyHistoricalEvidence({workspace=process.cwd(),revision='HEAD'}={}) {
  const tree=execFileSync('git',['rev-parse',`${revision}:benchmark/results`],{cwd:workspace,encoding:'utf8'}).trim();
  assert.equal(tree,HISTORICAL_RESULTS_TREE,'Historical evidence tree changed');
  const catalog=JSON.parse(gitBytes(revision,'research/v2/historical-catalog.json',workspace));
  assert.equal(catalog.files.length,325);
  for(const item of catalog.files)assert.equal(digest(gitBytes(revision,item.file,workspace)),item.sha256,`Historical Git blob changed: ${item.file}`);
  const clean=spawnSync('git',['diff','--quiet',revision,'--','benchmark/results'],{cwd:workspace});
  assert.equal(clean.status,0,'Historical evidence has uncommitted changes');
  return {tree,files:catalog.files.length};
}

export function sealEvidenceDirectory(directory,{catalogFile=EVIDENCE_CATALOG,now=()=>new Date().toISOString()}={}) {
  const root=posixPath(directory);assert.match(root,/^benchmark\/results-v2\/pilots\/[^/]+$/);
  const catalog=validateEvidenceCatalog(JSON.parse(fs.readFileSync(catalogFile)));
  assert.ok(!catalog.entries.some(entry=>entry.root===root),`Evidence directory is already cataloged: ${root}`);
  const metadata=JSON.parse(fs.readFileSync(path.join(directory,'metadata.json')));
  assert.equal(metadata.kind,'pilot');assert.equal(metadata.protocol.confirmatoryApproved,false,'This Phase 1 sealer must not seal a confirmatory campaign');
  const files=walkFiles(directory).map(file=>({path:posixPath(path.relative(directory,file)),sha256:digest(fs.readFileSync(file))}));
  catalog.entries.push({id:path.posix.basename(root),root,classification:'acquisition-time-seal',acquisitionSealed:true,sealedAt:now(),sourceCommit:metadata.environment.commit,files});
  fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n');
  return catalog.entries.at(-1);
}
