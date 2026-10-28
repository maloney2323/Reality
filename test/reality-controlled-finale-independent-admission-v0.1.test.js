import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyControlledFinaleIndependentEvidence,
 CONTROLLED_FINALE_WORK,CONTROLLED_FINALE_SOURCE_SHA256}
 from '../src/reality-controlled-finale-independent-admission-v0.1.js';

const HEAD='757404f5891a0fa73258833ea4a477cb01ae8862';
const BASE='acbc3160ced0525ea73ef4d0184da5fdae50337c';
const API='https://api.github.com/repos/maloney2323/Reality';
const MODULE=readFileSync('finale-candidate/candidate.mjs','utf8');
// Negative tests must never bless fabricated success or a moving branch.
// Success case uses the real SHA-tested module dynamically supplied by CI.
function fixtures(content,sourceSha){
 const name='src/reality-extensions/construction-estimate-approval-gate.mjs';
 const runs=[
  [40715822942,'4f1a3a23fe28d738ccf863754c76234c4d1b1929','failure','Reality Finale - Controlled Live Model Recovery (Noncustomer)'],
  [40716279333,BASE,'success','Reality Finale - Real Model Self-Correction and Independent Retest'],
  [40717353722,HEAD,'success','Reality Finale - Exact Model Candidate Review Installation Readback'],
 ];
 const map=new Map();
 for(const [id,sha,conclusion,nameOfRun] of runs){
  map.set('/actions/runs/'+id,{id,head_sha:sha,name:nameOfRun,
   status:'completed',conclusion,repository:{full_name:'maloney2323/Reality'}});
 }
 map.set('/pulls/152',{
  number:152,state:'open',draft:true,merged:false,
  head:{ref:'review/reality-finale-exact-model-candidate-20261028',sha:HEAD,
   repo:{full_name:'maloney2323/Reality'}},
  base:{ref:'experiment/reality-full-loop-finale-20261028',sha:BASE,
   repo:{full_name:'maloney2323/Reality'}},
  html_url:'https://github.com/maloney2323/Reality/pull/152',
 });
 map.set('/git/ref/heads/experiment/reality-full-loop-finale-20261028',{
  ref:'refs/heads/experiment/reality-full-loop-finale-20261028',object:{sha:BASE},
 });
 map.set('/actions/runs/40716279333/artifacts?per_page=100',{
  total_count:2,artifacts:[
   {id:12829060866,name:'reality-finale-second-real-model-correction',
    digest:'sha256:f60d5d8bea0661521a005c2afbec510141e854e3e52c584ee8b7e2ebcd54d829',
    expired:false,workflow_run:{id:40716279333,head_sha:BASE}},
   {id:12827359427,name:'reality-finale-second-independent-sandbox',
    digest:'sha256:c9c32585e933f6b917e6c668632d39405916e890f28eee81f543aa9a92527e72',
    expired:false,workflow_run:{id:40716279333,head_sha:BASE}},
  ],
 });
 map.set('/contents/'+name+'?ref='+HEAD,{
  type:'file',path:name,encoding:'base64',
  content:Buffer.from(content,'utf8').toString('base64'),
 });
 const fetchImpl=async(input,options)=>{
  assert.equal(options?.method,'GET');
  assert.equal(options?.redirect,'error');
  if(!input.startsWith(API))throw Error('UNEXPECTED_PROVIDER');
  const data=map.get(input.slice(API.length));
  if(!data)return {ok:false,status:404,text:async()=>''};
  return {ok:true,status:200,text:async()=>JSON.stringify(data)};
 };
 return {map,fetchImpl,sourceSha};
}
const ask=({fetchImpl})=>verifyControlledFinaleIndependentEvidence({
 fetchImpl,env:{REALITY_GITHUB_TOKEN:''},
});
test('pinned verifier refuses any non-authentic substituted candidate',async()=>{
 const v=fixtures(MODULE);
 const file=v.map.get('/contents/src/reality-extensions/construction-estimate-approval-gate.mjs?ref='+HEAD);
 file.content=Buffer.from('export function evaluateEstimateRelease(input){return null;}\n').toString('base64');
 await assert.rejects(ask(v),/FINALE_MODEL_GENERATED_SOURCE_CHANGED/);
});
test('PR must remain an unmerged draft with exact tested head',async()=>{
 const v=fixtures(MODULE);
 v.map.get('/pulls/152').draft=false;
 await assert.rejects(ask(v),/FINALE_DRAFT_SCOPE_OR_BASE_MOVED/);
});
test('moving PR base is refused',async()=>{
 const v=fixtures(MODULE);
 v.map.get('/git/ref/heads/experiment/reality-full-loop-finale-20261028').object.sha='a'.repeat(40);
 const result=await ask(v);
 assert.equal(result.state,'REVALIDATION_REQUIRED_BASE_MOVED');
 assert.equal(result.target_base_moved_since_review,true);
 assert.equal(result.installation_authorized,false);
});
test('a forged successful predecessor is refused',async()=>{
 const v=fixtures(MODULE);
 v.map.get('/actions/runs/40715822942').conclusion='success';
 await assert.rejects(ask(v),/FINALE_PINNED_ACTION_RUN_CHANGED/);
});
test('a stolen unrelated model artifact is refused',async()=>{
 const v=fixtures(MODULE);
 v.map.get('/actions/runs/40716279333/artifacts?per_page=100').artifacts[0].digest='sha256:'+('a'.repeat(64));
 await assert.rejects(ask(v),/FINALE_ACTUAL_MODEL_PROOF_ARTIFACT_MISMATCH/);
});
test('a removed or expired artifact is refused',async()=>{
 const v=fixtures(MODULE);
 v.map.get('/actions/runs/40716279333/artifacts?per_page=100').artifacts[0].expired=true;
 await assert.rejects(ask(v),/FINALE_ACTUAL_MODEL_PROOF_ARTIFACT_MISMATCH/);
});
test('a swapped review head is refused even if the source is plausible',async()=>{
 const v=fixtures(MODULE);
 v.map.get('/pulls/152').head.sha='b'.repeat(40);
 await assert.rejects(ask(v),/FINALE_DRAFT_SCOPE_OR_BASE_MOVED/);
});
test('provider errors fail closed, with no optimistic grant',async()=>{
 const v=fixtures(MODULE);
 v.map.delete('/actions/runs/40717353722');
 await assert.rejects(ask(v),/FINALE_GITHUB_READBACK_UNAVAILABLE/);
});
test('known work identifier is distinct from the prior customer job',()=>{
 assert.equal(CONTROLLED_FINALE_WORK,'work:8f71513a2c1955569e84c0e9af0962ec');
 assert.notEqual(CONTROLLED_FINALE_WORK,'work:24cda9611404e9bcb47909976067605c');
 assert.match(CONTROLLED_FINALE_SOURCE_SHA256,/^[0-9a-f]{64}$/);
});
