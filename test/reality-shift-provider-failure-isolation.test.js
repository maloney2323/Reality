import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readProviderSource,isIsolatedOriginalProviderOutage}
 from '../src/reality-governed-employee-shift-worker-v1.js';

const source='https://github.com/maloney2323/Reality/pull/307';
test('a thrown GitHub network failure is fenced as one-job outage, not whole shift',async()=>{
 const err=await readProviderSource(source,{
  fetchImpl:async()=>{throw Error('fetch failed: network connection reset');}
 }).then(()=>null,e=>e);
 assert.equal(err.message,'SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE');
 assert.equal(isIsolatedOriginalProviderOutage(err),true);
});
test('an aborted source provider request is also job-scoped and does not falsely settle',async()=>{
 const err=await readProviderSource(source,{
  fetchImpl:async()=>{throw Object.assign(Error('aborted'),{name:'TimeoutError'});}
 }).then(()=>null,e=>e);
 assert.equal(isIsolatedOriginalProviderOutage(err),true);
 assert.equal(err.message,'SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE');
});
test('GitHub non-OK response remains an isolated outage',async()=>{
 const err=await readProviderSource(source,{
  fetchImpl:async()=>({status:503,ok:false})
 }).then(()=>null,e=>e);
 assert.equal(isIsolatedOriginalProviderOutage(err),true);
});
test('authorization, malformed source, provider identity mismatch remain hard failures',async()=>{
 const bad=await readProviderSource('https://malicious.example/pull/307',{
  fetchImpl:async()=>{throw Error('source check should precede GET')}
 }).then(()=>null,e=>e);
 assert.equal(bad.message,'SHIFT_SOURCE_REF_NOT_ALLOWED');
 assert.equal(isIsolatedOriginalProviderOutage(bad),false);
 const identity=await readProviderSource(source,{
  fetchImpl:async()=>({status:200,ok:true,json:async()=>({
   id:307,html_url:'https://github.com/maloney2323/Reality/pull/308'
  })})
 }).then(()=>null,e=>e);
 assert.equal(identity.message,'SHIFT_GITHUB_IDENTITY_MISMATCH');
 assert.equal(isIsolatedOriginalProviderOutage(identity),false);
});
test('real GitHub 404 preserves observed NOT_FOUND; never fabricates success',async()=>{
 const v=await readProviderSource(source,{fetchImpl:async()=>({status:404,ok:false})});
 assert.equal(v.kind,'GITHUB_SOURCE_READBACK');
 assert.equal(v.provider_status,'NOT_FOUND');
 assert.equal(v.provider_checked,true);
 assert.equal(v.production_changed,false);
});
test('existing worker continues sibling work only for proven job-scoped outage',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(code,/if\(!isIsolatedOriginalProviderOutage\(error\)\)throw error;/);
 assert.match(code,/EXACT_SHIFT_ORIGINAL_TICK_BLOCKED_OTHER_WORK_CONTINUES/);
 const provider=readFileSync(new URL('../src/reality-governed-employee-shift-worker-v1.js',import.meta.url),'utf8');
 assert.match(provider,/catch\{\s*throw Error\('SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE'\);/);
});
