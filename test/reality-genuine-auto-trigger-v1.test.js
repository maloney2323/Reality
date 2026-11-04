import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveFrozenFailureSignals} from '../src/reality-genuine-auto-detect-v1.js';
const SHA='a'.repeat(40);
const sample=({path='test/reality-frozen-regressions/general-gap.test.js',
 exitCode=1,absent=true,output}={})=>({
 path,source:Buffer.from('import test from "node:test";\ntest("frozen",()=>{});'),
 exitCode,output:output??"Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/work/src/reality-extensions/provider-scope.mjs'",
 absentModulePaths:absent?['src/reality-extensions/provider-scope.mjs']:[],
});
test('real failed import creates candidate without claiming owner, queue, model or approval',()=>{
 const result=deriveFrozenFailureSignals({tests:[sample()],repositorySha:SHA});
 assert.equal(result.findings.length,1);
 assert.equal(result.status,'AUTOMATIC_CANDIDATES_DETECTED');
 assert.equal(result.findings[0].candidate_module_path,
  'src/reality-extensions/provider-scope.mjs');
 assert.match(result.findings[0].frozen_sha256,/^[a-f0-9]{64}$/);
 for(const name of ['queued_in_governed_capability_queue','model_generated',
  'installation_authorized','original_job_completed','verified_original_work'])
  assert.equal(result.findings[0][name],false);
});
test('green, already installed, unrelated failures never become capability candidates',()=>{
 const result=deriveFrozenFailureSignals({repositorySha:SHA,tests:[
  sample({exitCode:0}),sample({absent:false}),
  sample({output:'not ok 1 - missing approval',absent:true}),
 ]});
 assert.equal(result.findings.length,0);
 assert.equal(result.status,'NO_MISSING_CAPABILITY_CANDIDATES');
});
test('unsafe provider path, foreign source and ambiguous imports cannot be silently promoted',()=>{
 const output="Cannot find module '/work/src/reality-extensions/one.mjs' ERR_MODULE_NOT_FOUND\n"+
  "Cannot find module '/work/src/reality-extensions/two.mjs'";
 const r=deriveFrozenFailureSignals({repositorySha:SHA,tests:[{
  ...sample({output}),absentModulePaths:[
   'src/reality-extensions/one.mjs','src/reality-extensions/two.mjs'],
 }]});
 assert.equal(r.findings.length,0);
 assert.throws(()=>deriveFrozenFailureSignals({repositorySha:SHA,tests:[
  sample({path:'../../private.test.js'})]}),/FROZEN_SOURCE_INPUT_INVALID/);
 assert.throws(()=>deriveFrozenFailureSignals({repositorySha:'wrong',tests:[]}),
  /PINNED_REPOSITORY_AND_TESTS_REQUIRED/);
});

test('signed discovery readback preserves already installed exact original without re-enqueuing',()=>{
 const broker=readFileSync(new URL('../supabase/functions/reality-genuine-capability-auto-admit/index.ts',import.meta.url),'utf8');
 // Both the real check and its diagnostic must accept the existing
 // probationary installation returned by the atomic queue RPC.
 assert.match(broker,/'ISOLATED_INSTALLED_PROBATION'\]\.includes\(receipt\.phase\)/);
 assert.match(broker,/'ISOLATED_INSTALLED_PROBATION'\]\.includes\(receipt\?\.phase\)/);
 assert.match(broker,/if\(receipt\.phase==='PENDING_FROZEN_REPRODUCTION'\)queued\.push\(item\);/);
 assert.match(broker,/else alreadyClaimed\.push\(item\);/);
 assert.doesNotMatch(broker,/case ['"]ISOLATED_INSTALLED_PROBATION['"]:\s*queued\.push/);
});
