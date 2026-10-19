import fs from 'node:fs';
import {balancedOrder} from '../benchmark/harness/order.mjs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {gzipSync, brotliCompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const provenance = {commit: spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim() || null, scriptSha256: createHash('sha256').update(fs.readFileSync('scripts/build.mjs')).digest('hex'), sourceDirty: !!spawnSync('git',['status','--porcelain','--','scripts','v14','v15','v16','v17','v18','v19','v20','v21','v22','benchmark/harness','packages','templates'],{encoding:'utf8'}).stdout.trim()};
const experiment = 'build-' + new Date().toISOString().replaceAll(':', '-');
const matrix = JSON.parse(fs.readFileSync('docs/versions.json'));
const versions = (process.env.VERSIONS || '14,22').split(',').map(Number);
const tracks = (process.env.TRACKS || 'baseline,idiomatic').split(',');
const repetitions = Number(process.env.BUILD_REPS || 1);
if (!Number.isInteger(repetitions) || repetitions < 1 || versions.some(v => !matrix.some(x => x.major === v)) || tracks.some(t => !['baseline', 'idiomatic'].includes(t))) throw Error('Invalid build matrix');
const hash = value => createHash('sha256').update(value).digest('hex');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {stdio: 'inherit', ...options});
  if (result.status !== 0) throw Error(`${command} ${args.join(' ')} failed (${result.status})`);
}
function output(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: 'utf8', ...options});
  if (result.status !== 0) throw Error(`${command} failed: ${result.stderr}`);
  return result.stdout.trim();
}
fs.mkdirSync('benchmark/results/builds', {recursive: true});
fs.mkdirSync('benchmark/results/build-orders', {recursive: true});
function inputHash(cwd) {
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  const inputs=[...walk(path.join(cwd,'src')),...fs.readdirSync(cwd).filter(f=>f.endsWith('.json')).map(f=>path.join(cwd,f))].sort();
  return hash(JSON.stringify(inputs.map(f=>[path.relative(cwd,f),hash(fs.readFileSync(f))])));
}
const environments = new Map();
// Resolve/install outside every timed build. Runtime prefixes never share app dependencies.
for (const v of matrix.filter(v => versions.includes(v.major))) {
  const runtime = path.resolve(`.runtimes/${v.node}`);
  const bin = path.join(runtime, 'node_modules/.bin');
  const npmVersion = v.major === 14 ? '8.19.4' : v.major >= 18 ? '11.6.2' : '10.9.8';
  const npmManifest = path.join(runtime, 'node_modules/npm/package.json');
  if (!fs.existsSync(path.join(bin, 'node')) || !fs.existsSync(npmManifest) || JSON.parse(fs.readFileSync(npmManifest)).version !== npmVersion) {
    run('npm', ['install', '--prefix', runtime, '--no-audit', '--no-fund', `node@${v.node}`, `npm@${npmVersion}`]);
  }
  const env = {...process.env, PATH: bin + path.delimiter + process.env.PATH, NG_CLI_ANALYTICS: 'false', NG_BUILD_MAX_WORKERS: '2'};
  const cwd = path.resolve(`v${v.major}`);
  if (output(path.join(bin, 'node'), ['--version'], {env}) !== 'v' + v.node) throw Error('Node pin mismatch');
  if (output(path.join(bin, 'npm'), ['--version'], {env}) !== npmVersion) throw Error('npm pin mismatch');
  if (!process.env.SKIP_INSTALL) run(path.join(bin, 'npm'), [fs.existsSync(path.join(cwd, 'package-lock.json')) ? 'ci' : 'install', '--no-audit', '--no-fund'], {cwd, env});
  environments.set(v.major, {v, bin, env, cwd, npmVersion, inputSha256:inputHash(cwd)});
}
const base = versions.flatMap(version => tracks.map(track => ({version, track})));
const jobs = balancedOrder(base, repetitions);
fs.writeFileSync(`benchmark/results/build-orders/${experiment}.json`, JSON.stringify(jobs, null, 2));
for (const [orderIndex, job] of jobs.entries()) {
  const {version, track, rep} = job;
  const {v, bin, env, cwd, npmVersion, inputSha256} = environments.get(version);
  if(inputHash(cwd)!==inputSha256)throw Error('Build inputs changed during experiment');
  fs.rmSync(path.join(cwd, 'dist', track), {recursive: true, force: true});
  fs.rmSync(path.join(cwd, '.angular'), {recursive: true, force: true});
  const start = performance.now();
  run(path.join(bin, 'node'), ['node_modules/@angular/cli/bin/ng.js', 'build', track, '--configuration', 'production'], {cwd, env});
  const durationMs = performance.now() - start;
  if(inputHash(cwd)!==inputSha256)throw Error('Build inputs changed during compilation');
  const dir = path.join(cwd, 'dist', track);
  const assets = fs.readdirSync(dir).filter(file => file.endsWith('.js')).map(file => {
    const bytes = fs.readFileSync(path.join(dir, file));
    return {file, bytes: bytes.length, gzip: gzipSync(bytes).length, brotli: brotliCompressSync(bytes).length, sha256: hash(bytes)};
  });
  const result = {
    kind: 'cold-build', experiment, provenance, inputSha256, rep, orderIndex, version, track, durationMs,
    environment: {
      node: v.node, npm: npmVersion, angular: v.angular, cli: v.cli, typescript: v.typescript,
      os: os.release(), platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0].model,
      logicalCpuCount: os.cpus().length, memory: os.totalmem(), maxBuildWorkers: 2,
      commit: provenance.commit
    },
    coldDefinition: 'dist and Angular cache removed; dependencies installed; OS filesystem cache uncontrolled',
    configuration: JSON.parse(fs.readFileSync(path.join(cwd, 'angular.json'))),
    lockfileSha256: hash(fs.readFileSync(path.join(cwd, 'package-lock.json'))),
    builder: '@angular-devkit/build-angular:browser', assets, at: new Date().toISOString()
  };
  fs.writeFileSync(`benchmark/results/builds/${version}-${track}-${Date.now()}.json`, JSON.stringify(result, null, 2));
}
