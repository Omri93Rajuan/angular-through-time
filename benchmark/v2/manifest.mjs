import assert from 'node:assert/strict';
export function validateManifest(m){
 assert.equal(m.schemaVersion,2);assert.ok(['idiomatic-v2','matched-v1','default-cli-v1'].includes(m.track));
 for(const key of ['architectureRevision','experiment','treatment','state','publication','equality','selectors','changeDetection','flow','scheduler','builder','recipe','delivery'])assert.ok(typeof m[key]==='string'&&m[key].length,key);
 assert.ok(Number.isInteger(m.version.major)&&m.version.major>=14&&m.version.major<=22);
 assert.equal(m.componentGraph.length,7);assert.equal(typeof m.diagnostic,'boolean');
 if(m.state.includes('signal'))assert.ok(m.version.major>=17,'Only stable Signals');
 if(m.flow==='@for/@if')assert.ok(m.version.major>=18,'Only stable built-in flow');
 if(m.scheduler==='zoneless')assert.ok(m.version.major>=20,'Only stable zoneless');
 assert.equal(m.delivery,'serial-lossless');return m;
}
