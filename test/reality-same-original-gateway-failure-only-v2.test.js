import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../supabase/functions/reality-riley-auto-corrective-ci-v1/index.ts',import.meta.url),'utf8');
const savedDeno=globalThis.Deno;
globalThis.Deno={serve:()=>{}};
const {stageOrObserve}=await import('data:text/javascript;base64,'+
 Buffer.from(src+'\nexport {stageOrObserve};').toString('base64'));
globalThis.Deno=savedDeno;
const repo='https://api.github.com/repos/maloney2323/Reality';
const db='https://hvkfreoagbrphwghjajw.supabase.co/rest/v1/rpc/';
const original='work:'+'a'.repeat(32);
const attempt='11111111-2222-4333-8444-555555555555';
const shift='22222222-3333-4444-8555-666666666666';
const owner='33333333-4444-4555-8666-777777777777';
const base='reality/test-owner-signed-preview',baseSha='b'.repeat(40),head='a'.repeat(40);
const branch='reality/riley/auto-corrective-'+original.slice(5)+'-a2';
const sourcePath='src/reality-riley-service-original-runtime-v1.js';
const frozenWorkflow='.github/workflows/reality-riley-auto-corrective-candidate-proof.yml';
const gatewayWorkflow='.github/workflows/reality-governed-openai-gateway-isolated-20261108.yml';
const find='const actualHandoff = outcome?.capability_response === true;';
const replace='const actualHandoff = outcome?.capability_response?.status === "READY";';
const baseline='// Same-owner source verification required\n'.repeat(8)+find+'\n';
const patched=baseline.replace(find,replace);
const digest=s=>'sha256:'+createHash('sha256').update(s).digest('hex');
const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const file=(s,path)=>({path,encoding:'base64',size:Buffer.byteLength(s),
 content:Buffer.from(s).toString('base64'),sha:blob(s)});
const claim={status:'SAME_ORIGINAL_RECOVERY_CANDIDATE_READY_FOR_CI',
 attempt_id:attempt,attempt_number:2,
 original_work_id:original,shift_id:shift,owner_id:owner,
 source_ref:'https://github.com/maloney2323/Reality/issues/87',
 source_path:sourcePath,source_commit_sha:baseSha,source_blob_sha:blob(baseline),
 model_response_id:'resp_test_003',proposed_sha256:digest(patched),
 find,replace,installation_authorized:false,original_job_completed:false,
 production_changed:false};
const runId=43624145786;
function rig({conclusion='failure',failedStep=true,foreignPR=false}={}){
 const requests=[],origFetch=globalThis.fetch;
 const run={id:runId,head_sha:head,head_branch:branch,status:'completed',
  conclusion,event:'pull_request',name:'Reality — Isolated governed OpenAI gateway proof',
  path:gatewayWorkflow,html_url:'https://github.com/maloney2323/Reality/actions/runs/'+runId};
 const pr={number:301,state:'open',draft:true,head:{
  sha:head,ref:branch,repo:{full_name:foreignPR?'foreign/Reality':'maloney2323/Reality'}},
  base:{ref:base,repo:{full_name:'maloney2323/Reality'}}};
 const frozenTrust='Verify Reality model boundary and original tool-continuation regressions\n'+
  'test/reality-riley-service-original-runtime-v1.test.js\n'+
  'test/reality-riley-full-execution-path-v1.test.js\n';
 globalThis.fetch=async(url,opt={})=>{
  requests.push({url,method:opt.method||'GET',body:opt.body});
  let result;
  if(url.startsWith(db)){
   const kind=url.slice(db.length),body=JSON.parse(opt.body);
   if(kind==='reality_record_same_original_recovery_staging_v2'){
    assert.equal(body.p_attempt_id,attempt);
    assert.equal(body.p_candidate_branch,branch);
    result={status:'SAME_ORIGINAL_RECOVERY_CANDIDATE_STAGED',
     attempt_id:attempt,original_work_id:original,shift_id:shift,
     candidate_commit_sha:head,independent_ci_verified:false,
     installation_authorized:false,original_job_completed:false,
     production_changed:false};
   }else if(kind==='reality_record_same_original_recovery_ci_v2'){
    assert.equal(body.p_attempt_id,attempt);
    assert.equal(body.p_independent_run_id,runId);
    assert.equal(body.p_conclusion,'failure');
    result={status:'SAME_ORIGINAL_RECOVERY_CI_FAILED_NEXT_EVIDENCE_BACKED_ATTEMPT_ELIGIBLE',
     attempt_id:attempt,original_work_id:original,shift_id:shift,ci_conclusion:'failure',
     installation_authorized:false,original_job_completed:false,production_changed:false};
   }else throw Error('UNEXPECTED_RPC_'+kind);
  }else if(url.startsWith(repo)){
   const path=url.slice(repo.length);
   if(path==='/git/ref/heads/'+base)result={ref:'refs/heads/'+base,object:{sha:baseSha}};
   else if(path==='/git/ref/heads/'+branch)
    result={ref:'refs/heads/'+branch,object:{sha:head}};
   else if(path.startsWith('/contents/'+sourcePath+'?ref=')){
    const sha=decodeURIComponent(path.split('?ref=')[1]);
    result=file(sha===head?patched:baseline,sourcePath);
   }else if(path.startsWith('/contents/'+frozenWorkflow+'?ref='))
    result=file('persist-credentials: false\nindependent-corrective-frozen\nnode --test',frozenWorkflow);
   else if(path.startsWith('/contents/'+gatewayWorkflow+'?ref='))
    result=file(frozenTrust,gatewayWorkflow);
   else if(path.startsWith('/actions/runs?branch='))result={workflow_runs:[]};
   else if(path==='/actions/runs?event=pull_request&per_page=100')
    result={workflow_runs:[run]};
   else if(path.startsWith('/pulls?state=open&head='))result=[pr];
   else if(path==='/actions/runs/'+runId)result=run;
   else if(path==='/actions/runs/'+runId+'/jobs?per_page=60')
    result={jobs:[{id:132536155499,run_id:runId,name:'boundary-tests',
     status:'completed',conclusion,steps:[{name:
      'Verify Reality model boundary and original tool-continuation regressions',
       conclusion:failedStep?'failure':'success'}]}]};
   else throw Error('UNEXPECTED_GITHUB_'+path);
  }else throw Error('UNEXPECTED_URL_'+url);
  return new Response(JSON.stringify(result),{status:200,
   headers:{'content-type':'application/json'}});
 };
 return {requests,restore:()=>globalThis.fetch=origFetch};
}
test('same SHA owner PR failing original-job boundary CI rejects attempt 2 and preserves proof',async()=>{
 const m=rig();
 try{
  const result=await (await stageOrObserve(claim,'opaque-github-token',
   base,baseSha,'opaque-service-key',true)).json();
  assert.equal(result.status,'CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN');
  assert.equal(result.independent_ci_verified,true);
  assert.equal(result.attempt_id,attempt);
  assert.equal(result.original_job_completed,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(m.requests.filter(x=>x.url===db+'reality_record_same_original_recovery_ci_v2').length,1);
  assert.equal(m.requests.some(x=>x.method==='POST'&&x.url===repo+'/pulls'),false);
 }finally{m.restore()}
});
test('a green general gateway can NEVER approve the model candidate',async()=>{
 const m=rig({conclusion:'success',failedStep:false});
 try{
  const result=await (await stageOrObserve(claim,'opaque-github-token',
   base,baseSha,'opaque-service-key',true)).json();
  assert.equal(result.status,'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI');
  assert.equal(result.independent_ci_verified,false);
  assert.equal(result.installation_authorized,false);
  assert.equal(m.requests.some(x=>x.url===db+'reality_record_same_original_recovery_ci_v2'),false);
 }finally{m.restore()}
});
test('unrelated failing CI step does not count as original-job failure proof',async()=>{
 const m=rig({failedStep:false});
 try{
  await assert.rejects(stageOrObserve(claim,'opaque-github-token',
   base,baseSha,'opaque-service-key',true),/ORIGINAL_HANDOFF_FAILURE_STEP_NOT_VERIFIED/);
  assert.equal(m.requests.some(x=>x.url===db+'reality_record_same_original_recovery_ci_v2'),false);
 }finally{m.restore()}
});
test('foreign PR cannot supply a negative proof for this owner original',async()=>{
 const m=rig({foreignPR:true});
 try{
  await assert.rejects(stageOrObserve(claim,'opaque-github-token',
   base,baseSha,'opaque-service-key',true),
   /RECOVERY_FOREIGN_OR_DRIFTED_PR_REJECTED_NO_WRITE/);
  assert.equal(m.requests.some(x=>x.url===db+'reality_record_same_original_recovery_ci_v2'),false);
  assert.equal(m.requests.some(x=>x.url===repo+'/pulls'&&x.method==='POST'),false);
 }finally{m.restore()}
});
