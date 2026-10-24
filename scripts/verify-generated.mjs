import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assertExactFileSet,collectLegacyGeneratedFiles,expectedLegacyGeneratedFiles,LEGACY_GENERATED_FILE_COUNT,normalizeEol} from './generated-research-files.mjs';
const root=process.cwd(),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'angular-through-time-generation-'));
try{
 for(const p of ['templates','packages/market-fixtures'])fs.cpSync(path.join(root,p),path.join(scratch,p),{recursive:true});
 execFileSync(process.execPath,[path.join(root,'scripts/generate.mjs')],{cwd:scratch});
 assert.ok(!fs.existsSync(path.join(scratch,'apps')),'Generator must not recreate the old apps/ directory');
 const expectedFiles=expectedLegacyGeneratedFiles(),scratchFiles=collectLegacyGeneratedFiles(scratch);assertExactFileSet(scratchFiles,expectedFiles);
 for(const relative of expectedFiles){const actual=fs.readFileSync(path.join(root,relative),'utf8'),expected=fs.readFileSync(path.join(scratch,relative),'utf8');if(relative.endsWith('.json'))assert.deepEqual(JSON.parse(actual),JSON.parse(expected),relative);else assert.equal(normalizeEol(actual),normalizeEol(expected),relative);}
 assert.equal(expectedFiles.length,LEGACY_GENERATED_FILE_COUNT);console.log(`${expectedFiles.length} generated files match the exact declared set and a fresh scratch generation; workspace untouched.`);
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
