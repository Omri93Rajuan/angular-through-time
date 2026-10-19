import fs from 'node:fs';
import assert from 'node:assert/strict';
import E from '../../packages/market-fixtures/engine.js';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';
import {launch} from 'chrome-launcher';
import {serve} from '../../scripts/serve.mjs';
import {parity} from './functional.mjs';
import {balancedOrder} from './order.mjs';

const hash = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const provenance = {commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDirty:!!execFileSync('git',['status','--porcelain','--','v14','v15','v16','v17','v18','v19','v20','v21','v22','scripts','benchmark/harness','package.json','package-lock.json'],{encoding:'utf8'}).trim(),harnessSha256:hash('benchmark/harness/lighthouse.mjs'),rootLockfileSha256:hash('package-lock.json')};
const experiment = 'lighthouse-' + new Date().toISOString().replaceAll(':', '-');
const chromePath = process.env.CHROME || '/opt/google/chrome/chrome';
const base = (process.env.VERSIONS || '14,22').split(',').flatMap(version =>
  (process.env.TRACKS || 'baseline,idiomatic').split(',').map(track => ({version: Number(version), track})));
const jobs = balancedOrder(base, Number(process.env.REPS || 3));
fs.mkdirSync('benchmark/results/lighthouse', {recursive: true});
fs.mkdirSync('benchmark/results/lighthouse-orders', {recursive: true});
fs.writeFileSync(`benchmark/results/lighthouse-orders/${experiment}.json`, JSON.stringify(jobs, null, 2));
for (const [orderIndex, job] of jobs.entries()) {
  const {version, track, rep} = job;
  const artifactRoot=`v${version}/dist/${track}`;
  const artifacts=()=>fs.readdirSync(artifactRoot).filter(f=>f.endsWith('.js')).sort().map(file=>({file,sha256:hash(artifactRoot+'/'+file)}));
  const artifactSha256=artifacts();
  const {server, url} = await serve(`v${version}/dist/${track}`);
  let chrome, diagnosticBrowser, diagnosticResult;
  try {
    const browser = await chromium.launch({executablePath: chromePath, headless: true, args: ['--no-sandbox']});
    let functional;
    try {
      const page = await browser.newPage({locale: 'en-US', viewport: {width: 1440, height: 1000}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => window.market);
      functional = await parity(page);
      if (errors.length) throw Error(errors.join('\n'));
    } finally {
      await browser.close();
    }
    // Separate cold browser process for each diagnostic report; same executable throughout.
    chrome = await launch({chromePath, chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']});
    diagnosticBrowser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
    const diagnosticPage=await diagnosticBrowser.newPage();
    const result = diagnosticResult = await lighthouse(url, {
      port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'],
      formFactor: 'desktop', screenEmulation: {mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false},
      throttlingMethod: 'provided'
    }, undefined, diagnosticPage);
    if (result.lhr.runtimeError) throw Error(JSON.stringify(result.lhr.runtimeError));
    const finalState=await diagnosticPage.evaluate(()=>window.market.state());
    assert.equal(finalState.tick,0);assert.equal(finalState.checksum,E.checksum(E.initial()));
    assert.equal(await diagnosticPage.$$eval('tbody tr',rows=>rows.length),5000);
    assert.deepEqual(artifacts(),artifactSha256,'Static artifacts changed during diagnostics');
    const data = {
      experiment, ...job, orderIndex, provenance, artifactSha256, finalState, functional, functionalPassed: true,
      environment: {
        chromePath, chromeSha256: createHash('sha256').update(fs.readFileSync(chromePath)).digest('hex'),
        os: os.release(), cpu: os.cpus()[0].model, node: process.version, commit:provenance.commit,
        lighthouse: JSON.parse(fs.readFileSync('node_modules/lighthouse/package.json')).version
      },
      lhr: result.lhr
    };
    fs.writeFileSync(`benchmark/results/lighthouse/${version}-${track}-${rep}-${Date.now()}.json`, JSON.stringify(data, null, 2));
    console.log(version, track, rep, 'Lighthouse saved');
  } catch (error) {
    fs.mkdirSync('benchmark/results/diagnostic-failures', {recursive: true});
    fs.writeFileSync(`benchmark/results/diagnostic-failures/${experiment}-${version}-${track}-${rep}.json`, JSON.stringify({experiment, ...job, accepted: false, error: String(error), lhr:diagnosticResult?.lhr}, null, 2));
    throw error;
  } finally {
    if (diagnosticBrowser) await diagnosticBrowser.disconnect();
    if (chrome) await chrome.kill();
    await new Promise(resolve => server.close(resolve));
  }
}
