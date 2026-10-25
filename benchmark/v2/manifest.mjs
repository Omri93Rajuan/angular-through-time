import assert from 'node:assert/strict';

const graph=['Shell','Toolbar','Table','AssetRow','Summary','Chart','Details'];
const builder='@angular-devkit/build-angular:browser';

export function validateManifest(m){
 assert.equal(m.schemaVersion,2);assert.ok(['idiomatic-v2','matched-v1','portable-bridge-v1'].includes(m.track));
 for(const key of ['architectureRevision','experiment','treatment','state','publication','equality','selectors','changeDetection','flow','scheduler','builder','recipe','delivery'])assert.ok(typeof m[key]==='string'&&m[key].length,key);
 assert.ok(Number.isInteger(m.version.major)&&m.version.major>=14&&m.version.major<=22);assert.deepEqual(m.componentGraph,graph);assert.equal(typeof m.diagnostic,'boolean');
 assert.equal(m.delivery,'serial-lossless');assert.equal(m.builder,builder);
 const major=m.version.major;
 if(m.treatment==='idiomatic-v2'||m.treatment==='idiomatic-v2-diagnostic'){
  assert.equal(m.track,'idiomatic-v2');assert.equal(m.experiment,'B-runtime');assert.equal(m.recipe,'controlled-webpack-v1');assert.equal(m.architectureRevision,major>=17?'market-components-2':'market-components-1');assert.equal(m.changeDetection,'OnPush');
  assert.equal(m.state,major>=17?'per-entity signal + computed':'immutable publications + dependency-aware imperative selectors');assert.equal(m.flow,major>=18?'@for/@if':'ngFor/ngIf');assert.equal(m.scheduler,major>=20?'zoneless':'zone');assert.equal(m.diagnostic,m.treatment.endsWith('-diagnostic'));if(m.diagnostic)assert.equal(major,22,'Diagnostic replica is declared only for Angular 22');
 }else if(m.treatment==='m4-zone'){
  assert.equal(major,22);assert.equal(m.track,'matched-v1');assert.equal(m.experiment,'M4');assert.equal(m.recipe,'controlled-webpack-v1');assert.equal(m.architectureRevision,'market-components-2');assert.equal(m.changeDetection,'OnPush');assert.equal(m.state,'per-entity signal + computed');assert.equal(m.flow,'@for/@if');assert.equal(m.scheduler,'zone');assert.equal(m.diagnostic,false);
 }else if(m.treatment==='portable-default'){
  assert.equal(m.track,'portable-bridge-v1');assert.equal(m.experiment,'C-source-bridge');assert.equal(m.recipe,'controlled-webpack-portable-bridge-v1');assert.equal(m.architectureRevision,'portable-components-1');assert.equal(m.changeDetection,'framework-default');assert.equal(m.state,'immutable publications + dependency-aware imperative selectors');assert.equal(m.flow,'ngFor/ngIf');assert.equal(m.scheduler,major>=21?'zoneless':'zone');assert.equal(m.diagnostic,false);
 }else assert.fail(`Unknown treatment: ${m.treatment}`);
 return m;
}
