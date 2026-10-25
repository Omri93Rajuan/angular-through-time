import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

export const RESEARCH_GENERATED_FILE_COUNT = 218;
export const LEGACY_GENERATED_FILE_COUNT = 118;
const components = ['AssetRow','Chart','Details','Shell','Summary','Table','Toolbar'];
const lexical=(a,b)=>a===b?0:a<b?-1:1;

export function normalizeRepoPath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function researchVariants(version) {
  return ['idiomatic-v2','portable-default',...(version === 22 ? ['m4-zone','idiomatic-v2-diagnostic'] : [])];
}

export function expectedResearchGeneratedFiles() {
  const files = [];
  for (let version = 14; version <= 22; version++) {
    files.push(`v${version}/src/research/index.html`, `v${version}/research.angular.json`);
    for (const variant of researchVariants(version)) {
      files.push(`v${version}/src/research/${variant}/main.ts`);
      files.push(...components.map(component => `v${version}/src/research/${variant}/${component}.html`));
      files.push(`v${version}/tsconfig.${variant}.json`, `research/v2/${version}-${variant}.json`);
    }
  }
  assert.equal(files.length, RESEARCH_GENERATED_FILE_COUNT);
  return files.sort();
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes:true})
    .sort((a,b) => lexical(a.name,b.name))
    .flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}

export function collectResearchGeneratedFiles(base) {
  const files = [];
  for (let version = 14; version <= 22; version++) {
    const versionRoot = path.join(base, `v${version}`);
    files.push(...walk(path.join(versionRoot, 'src', 'research')));
    for (const name of fs.existsSync(versionRoot) ? fs.readdirSync(versionRoot).sort() : []) {
      if (name === 'research.angular.json' || /^tsconfig\.(idiomatic-v2|portable-default|m4-zone|idiomatic-v2-diagnostic)\.json$/.test(name)) {
        files.push(path.join(versionRoot, name));
      }
    }
  }
  const manifestRoot = path.join(base, 'research', 'v2');
  for (const name of fs.existsSync(manifestRoot) ? fs.readdirSync(manifestRoot).sort() : []) {
    if (/^\d+-.+\.json$/.test(name)) files.push(path.join(manifestRoot, name));
  }
  return files.map(file => normalizeRepoPath(path.relative(base, file))).sort();
}

export function assertExactFileSet(actual, expected = expectedResearchGeneratedFiles()) {
  const normalized = actual.map(normalizeRepoPath);
  assert.equal(new Set(normalized).size, normalized.length, 'Generated file enumeration contains duplicates');
  const actualSet = new Set(normalized), expectedSet = new Set(expected);
  const missing = expected.filter(file => !actualSet.has(file));
  const unexpected = normalized.filter(file => !expectedSet.has(file));
  assert.deepEqual({missing,unexpected}, {missing:[],unexpected:[]}, 'Research generated file set differs from the declared 218-file contract');
}

export const normalizeEol = value => value.replaceAll('\r\n', '\n');

export function expectedLegacyGeneratedFiles() {
  const files=['docs/versions.json'];
  for(let version=14;version<=22;version++){
    const root=`v${version}`;
    files.push(`${root}/.nvmrc`,`${root}/angular.json`,`${root}/package.json`,`${root}/tsconfig.json`,`${root}/src/engine.js`,`${root}/src/index.html`,`${root}/src/styles.css`);
    for(const track of ['baseline','idiomatic'])files.push(`${root}/src/${track}.html`,`${root}/src/${track}.ts`,`${root}/tsconfig.${track}.json`);
  }
  assert.equal(files.length,LEGACY_GENERATED_FILE_COUNT);return files.sort();
}

export function collectLegacyGeneratedFiles(base) {
  const files=[];
  for(let version=14;version<=22;version++)files.push(...walk(path.join(base,`v${version}`)));
  files.push(...walk(path.join(base,'docs')));
  return files.map(file=>normalizeRepoPath(path.relative(base,file))).sort();
}
