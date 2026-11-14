import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const file=readFileSync(new URL('../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',import.meta.url),'utf8');
const priorDeno=globalThis.Deno;
globalThis.Deno={serve:()=>{}};
const {stageOrObserve}=await import('data:text/javascript;base64,'+
 Buffer.from(file+'\nexport {stageOrObserve};').toString('base64'));
globalThis.Deno=priorDeno;

const GITHUB='https://api.github.com/repos/maloney2323/Reality';
const DATABASE='https://hvkfreoagbrphwghjajw.supabase.co/rest/v1/rpc/';
const originalWorkId='work:'+'a'.repeat(32);
const shiftId='9460cfff-937a-4105-9093-2e41ab39a950';
const originalOwner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const head='5'.repeat(40),baseSha='4'.repeat(40);
const baseBranch='reality/test-isolated-owner-preview';
const target='src/reality-riley-service-original-runtime-v1.js';
const workflow='.github/workflows/reality-riley-auto-corrective-candidate-proof.yml';
const candidateBranch='reality/riley/auto-corrective-'+originalWorkId.slice(5);
const before='const handoff = outcome.capability_response ? "valid" : "missing";';
const after='const handoff = outcome.capability_response && typeof outcome.capability_response === "object" ? "valid" : "missing";';
const baseline='// original strict owner and goal verification\n'+
 '// immutable source evidence must be checked before writes\n'.repeat(5)+before+'\n';
const candidate=baseline.replace(before,after);
const gitSha=text=>{const bytes=Buffer.from(text);return createHash('sha1')
 .update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
const b64=text=>Buffer.from(text).toString('base64');
const contents=(text,path)=>({path,encoding:'base64',size:Buffer.byteLength(text),
 content:b64(text),sha:gitSha(text)});
const c={original_work_id:originalWorkId,shift_id:shiftId,
 owner_id:originalOwner,model_response_id:'resp_testvalidid',
 proposed_sha256:'sha256:'+createHash('sha256').update(candidate).digest('hex'),
 source_blob_sha:gitSha(baseline),source_commit_sha:baseSha,
 source_path:target,find:before,replace:after};
const ci={id:43597941179,head_sha:head,head_branch:candidateBranch,
 event:'pull_request',name:'Reality — Isolated governed OpenAI gateway proof',
 path:'.github/workflows/reality-owner-gateway-test.yml',
 status:'completed',conclusion:'failure',
 html_url:'https://github.com/maloney2323/Reality/actions/runs/43597941179',
 pull_requests:[{head:{sha:head,ref:candidateBranch,repo:{full_name:'maloney2323/Reality'}},
  base:{ref:baseBranch,repo:{full_name:'maloney2323/Reality'}}}]};
const runJobs={jobs:[{id:132456350176,run_id:ci.id,name:'boundary-tests',
 status:'completed',conclusion:'failure',
 steps:[{name:'Verify Reality model boundary and original tool-continuation regressions',
  conclusion:'failure'}]}]};
const logs=[
'not ok 201 - full shift step-six connects existing original to SINGLE claim, real service loader, durable outcome, independent receipt gate',
'not ok 239 - custom trusted original execution uses existing source-backed Reality runner and does not certify settlement',
"actual: 'ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY'",
"expected: 'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF'",
].join('\n');
function installMock({run=ci,log=logs}={}){
 const receipts=[];
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,opts={})=>{
  const u=new URL(url);
  let value;
  if(url.startsWith(DATABASE)){
   const name=u.pathname.split('/').at(-1);
   if(name==='reality_record_riley_auto_corrective_staging_v1'){
    value={status:'SAME_ORIGINAL_CORRECTIVE_CANDIDATE_STAGED_READBACK',
      original_work_id:originalWorkId,shift_id:shiftId,candidate_commit_sha:head,
      independent_ci_verified:false,installation_authorized:false,
      original_job_completed:false,production_changed:false};
   }else if(name==='reality_record_riley_auto_corrective_ci_v1'){
    const body=JSON.parse(opts.body);receipts.push(body);
    value={status:'INDEPENDENT_SAME_ORIGINAL_CORRECTIVE_CI_RECORDED',
      original_work_id:originalWorkId,shift_id:shiftId,
      ci_conclusion:run.conclusion,original_job_completed:false,
      installation_authorized:false,production_changed:false};
   }else throw Error('UNEXPECTED_RPC '+name);
  }else if(url.startsWith(GITHUB)){
   const path=url.slice(GITHUB.length);
   if(path==='/git/ref/heads/'+baseBranch)
    value={ref:'refs/heads/'+baseBranch,object:{sha:baseSha}};
   else if(path==='/git/ref/heads/'+candidateBranch)
    value={ref:'refs/heads/'+candidateBranch,object:{sha:head}};
   else if(path.startsWith('/contents/'+target+'?ref=')){
    const sha=decodeURIComponent(path.split('?ref=')[1]);
    value=contents(sha===head?candidate:baseline,target);
   }else if(path.startsWith('/contents/'+workflow+'?ref='))
    value=contents('persist-credentials: false\nindependent-corrective-frozen\nnode --test',workflow);
   else if(path.startsWith('/actions/runs?branch='))
    value={workflow_runs:[run]};
   else if(path==='/actions/runs/'+run.id)
    value=run;
   else if(path==='/actions/runs/'+run.id+'/jobs?per_page=60')
    value=runJobs;
   else if(path==='/actions/jobs/'+runJobs.jobs[0].id+'/logs')
    return new Response(log,{status:200,headers:{'content-type':'text/plain'}});
   else throw Error('UNEXPECTED_GITHUB_URL '+path);
  }else throw Error('UNEXPECTED_URL '+url);
  return new Response(JSON.stringify(value),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {receipts,restore:()=>{globalThis.fetch=originalFetch}};
}
test('trust-bound exact failed PR run is durably reconciled to SAME original, never installed',async()=>{
 const mock=installMock();
 try{
  const response=await stageOrObserve(c,'opaque-valid-test-token',
   baseBranch,baseSha,'opaque-service-token');
  const result=await response.json();
  assert.equal(result.status,'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN');
  assert.equal(result.independent_ci_verified,true);
  assert.equal(result.original_job_completed,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(mock.receipts.length,1);
  assert.equal(mock.receipts[0].p_original_work_id,originalWorkId);
  assert.equal(mock.receipts[0].p_tested_commit_sha,head);
  assert.equal(mock.receipts[0].p_independent_run_id,ci.id);
  assert.equal(mock.receipts[0].p_conclusion,'failure');
 }finally{mock.restore()}
});
test('unrelated PR source or owner base cannot create a corrective CI receipt',async()=>{
 const mock=installMock({run:{...ci,pull_requests:[{
  head:{sha:head,ref:candidateBranch,repo:{full_name:'malicious/Other'}},
  base:{ref:baseBranch,repo:{full_name:'maloney2323/Reality'}}
 }]}});
 try{
  const result=await (await stageOrObserve(c,'opaque-token',
   baseBranch,baseSha,'service-key')).json();
  assert.equal(result.status,'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI');
  assert.equal(result.independent_ci_verified,false);
  assert.equal(mock.receipts.length,0);
 }finally{mock.restore()}
});
test('a broad green PR build can never substitute for exact passing frozen CI',async()=>{
 const mock=installMock({run:{...ci,conclusion:'success'}});
 try{
  const result=await (await stageOrObserve(c,'opaque-token',
   baseBranch,baseSha,'service-key')).json();
  assert.equal(result.status,'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI');
  assert.equal(mock.receipts.length,0);
 }finally{mock.restore()}
});
test('unrelated CI errors without BOTH frozen continuity failures cannot be recorded',async()=>{
 const mock=installMock({log:'not ok - other test failed'});
 try{
  await assert.rejects(
   stageOrObserve(c,'opaque-token',baseBranch,baseSha,'service-key'),
   /FROZEN_ORIGINAL_HANDOFF_TEST_FAILURE_NOT_REPRODUCED/);
  assert.equal(mock.receipts.length,0);
 }finally{mock.restore()}
});
