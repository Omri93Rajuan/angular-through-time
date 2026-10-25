import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {assertExactFileSet,collectResearchGeneratedFiles,expectedResearchGeneratedFiles,normalizeEol,RESEARCH_GENERATED_FILE_COUNT} from './generated-research-files.mjs';
const root=process.cwd(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'verify-market-v2-'));
try{
 for(const dir of ['templates','docs'])fs.cpSync(dir,`${scratch}/${dir}`,{recursive:true});
 for(let v=14;v<=22;v++){fs.mkdirSync(`${scratch}/v${v}/src`,{recursive:true});fs.copyFileSync(`v${v}/src/index.html`,`${scratch}/v${v}/src/index.html`);fs.copyFileSync(`v${v}/angular.json`,`${scratch}/v${v}/angular.json`);}
 execFileSync(process.execPath,[`${root}/scripts/generate-research.mjs`],{cwd:scratch});
 const expected=expectedResearchGeneratedFiles(),scratchFiles=collectResearchGeneratedFiles(scratch),workspaceFiles=collectResearchGeneratedFiles(root);
 assertExactFileSet(scratchFiles,expected);assertExactFileSet(workspaceFiles,expected);
 for(const rel of expected){const a=fs.readFileSync(path.join(root,rel),'utf8'),b=fs.readFileSync(path.join(scratch,rel),'utf8');if(rel.endsWith('.json'))assert.deepEqual(JSON.parse(a),JSON.parse(b),rel);else assert.equal(normalizeEol(a),normalizeEol(b),rel);}
 assert.equal(expected.length,RESEARCH_GENERATED_FILE_COUNT);console.log(`${expected.length} research generated files agree; exact file set complete; historical generator untouched.`);
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
