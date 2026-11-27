import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifySourceBoundTechnicalRecoveryCi as verify}
 from '../src/reality-final-loop-technical-ci-evidence-verifier-v1.js';
const sha=x=>'sha256:'+x.repeat(64);
const source='https://github.com/maloney2323/Reality/pull/307';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const obligation='work:315562fe1bd66b30a48bb9be4f1d162a';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const incident='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const head='ef66038297480f5da9444072e5e79f5c59b27184';
const commit='d81f6c0e64360fc33d3d61668a2c84fc7c4e647b';
const id='reality-final-loop-recovery-case-specs/sample-case.json';
const diag='sha256:336e6cfc1ed67599d5478d32e9a5288034678cde90caa6e6e8f3fba17e365e0f';
const contractProposal={status:'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',read_only:true,
 contract_candidate:{owner_id:owner,shift_id:shift,continuity_root_id:root,
  obligation_id:obligation,source_ref:source,source_revision:head,
  contract_id:sha('a'),ledger_freeze_verified:false}};
const existingCiRoute={status:'RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING',
 owner_id:owner,shift_id:shift,obligation_id:obligation,source_ref:source,
 contract_id:sha('a'),maintenance_id:incident,
 existing_diagnostic_receipt_sha256:diag,
 prior_diagnostic_verified:true,repeat_prior_ci_dispatch_permitted:false,
 original_job_completed:false,installation_authorized:false,production_changed:false};
const db={project:'isolated',strictSecrets:true};
const env={VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated',
 VERCEL_GIT_COMMIT_SHA:commit,
 VERCEL_GIT_COMMIT_REF:'feature/final-loop-governed-qualification-handoff-20261123',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'test-github-token-with-adequate-length'};
const spec={
 schema:'reality-final-loop-sourcebound-frozen-recovery-v1',
 source_ref:source,source_head_sha:head,owner_id:owner,shift_id:shift,
 original_work_id:obligation,maintenance_id:incident,continuity_root_id:root,
 independent_prior_ci_diagnostic_receipt_sha256:diag,
 scope:'PR307_LINKED_TECHNICAL_RECOVERY_HANDOFF_ONLY',
 independently_verified_original_customer_admission:false,
 case_specific_original_business_red_proven:false,
 model_generated_verdict_allowed:false,original_job_completed:false,
 installation_authorized:false,production_changed:false,
 description:'test fixture for independent GitHub file content validation '+
 'and other source-bound recovery content verification controls'
};
const buf=Buffer.from(JSON.stringify(spec,null,2));
const gitsha=b=>createHash('sha1').update(Buffer.concat([
 Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
function runtime({run={},jobs={},artifact={},caseSpec=spec,
 sourceBlob=null,unauthorized=false}={}){
 const body=Buffer.from(JSON.stringify(caseSpec,null,2));
 const blob=sourceBlob||gitsha(body);
 const paths=[];
 const headSha=run.head_sha||commit;
 const normalizedRun={
  id:100019,head_sha:headSha,head_branch:env.VERCEL_GIT_COMMIT_REF,
  name:'Reality shared Continuity and independent verifier handoff acceptance',
  path:'.github/workflows/reality-shared-continuity-verifier-handoff-v1.yml',
  repository:{full_name:'maloney2323/Reality'},event:'push',
  status:'completed',conclusion:'success',...run};
 const normalizedJob={
  id:200020,run_id:normalizedRun.id,head_sha:headSha,
  name:'prove-cross-layer-continuity',status:'completed',conclusion:'success',
  steps:[
   {name:'Execute genuine historical RED and corrected GREEN for source-bound technical blocker',conclusion:'success'},
   {name:'Preserve case-specific RED and GREEN proof as CI artifact only',conclusion:'success'}
  ],...jobs};
 const normalizedArtifact={
  id:300030,name:'reality-final-loop-technical-recovery-frozen-red-green',
  digest:sha('f'),expired:false,size_in_bytes:1415,
  workflow_run:{id:normalizedRun.id,head_sha:headSha},...artifact};
 const fetchImpl=async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  assert.ok(opts.headers.authorization.startsWith('Bearer test-github-'));
  const path=new URL(url).pathname;
  paths.push(path);
  if(unauthorized)return {ok:false,status:403};
  let value;
  if(path.endsWith('/runs')&&path.includes('/actions/workflows/')){
   value={workflow_runs:[normalizedRun]};
  }else if(path.endsWith('/contents/reality-final-loop-recovery-case-specs')){
   value=[{type:'file',name:'sample-case.json',path:id,sha:blob}];
  }else if(path.endsWith('/contents/'+id)){
   value={path:id,sha:blob,size:body.length,encoding:'base64',
    content:body.toString('base64')};
  }else if(path.endsWith('/jobs'))value={jobs:[normalizedJob]};
  else if(path.endsWith('/artifacts'))value={artifacts:[normalizedArtifact]};
  else throw Error('unexpected provider request '+path);
  return {ok:true,json:async()=>value};
 };
 return {paths,fetchImpl};
}
const args=(fetchImpl,more={})=>({db,env,contractProposal,existingCiRoute,
 fetchImpl,...more});
test('pinned GitHub success + exact source manifest and artifact create technical observation ONLY',async()=>{
 const r=runtime();
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING');
 assert.equal(result.independent_technical_ci_verified,true);
 assert.equal(result.frozen_technical_red_verified,true);
 assert.equal(result.artifact_content_independently_read,false);
 assert.equal(result.github_artifact_digest,sha('f'));
 assert.equal(result.signed_database_receipt_recorded,false);
 assert.equal(result.obligation_id,obligation);
 assert.equal(result.next_governed_action,
  'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED');
 for(const k of ['original_business_case_red_verified',
  'business_original_warrant_verified','original_job_completed',
  'original_job_claim_admitted','proof_gate_advanced','repair_executed',
  'execution_authorized','external_effect_performed','production_changed']){
  assert.equal(result[k],false,k);
 }
 assert.ok(r.paths.some(x=>x.endsWith('/jobs')));
 assert.ok(r.paths.some(x=>x.endsWith('/artifacts')));
});
test('CI from a different release/commit is not reusable',async()=>{
 const r=runtime({run:{head_sha:'b'.repeat(40)}});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_EXACT_SIGNED_RUN_PENDING');
 assert.equal(result.independent_technical_ci_verified,false);
});
test('spec for sibling PR308 may not certify PR307',async()=>{
 const r=runtime({caseSpec:{...spec,source_ref:
  'https://github.com/maloney2323/Reality/pull/308'}});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_SPEC_NOT_LINKED_TO_CANONICAL_ORIGINAL');
 assert.equal(result.frozen_technical_red_verified,false);
});
test('wrong scope and forged admission fail even with a green Github run',async()=>{
 for(const modifications of [
  {source_head_sha:'a'.repeat(40)},
  {continuity_root_id:'11111111-1111-4111-8111-111111111111'},
  {case_specific_original_business_red_proven:true},
  {independently_verified_original_customer_admission:true},
  {installation_authorized:true},
  {independent_prior_ci_diagnostic_receipt_sha256:sha('a')}
 ]){
  const r=runtime({caseSpec:{...spec,...modifications}});
  const result=await verify(args(r.fetchImpl));
  assert.equal(result.status,'RECOVERY_TECHNICAL_CI_SPEC_NOT_LINKED_TO_CANONICAL_ORIGINAL');
 }
});
test('Git blob hash tampering cannot become verified proof',async()=>{
 const r=runtime({sourceBlob:'f'.repeat(40)});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_CASE_BLOB_HASH_MISMATCH');
 assert.equal(result.independent_technical_ci_verified,false);
});
test('green job without exact frozen worktree test or valid provider artifact rejected',async()=>{
 const variants=[
  {jobs:{steps:[{name:'Execute generic CI',conclusion:'success'}]}},
  {artifact:{digest:'invalid'}},
  {artifact:{expired:true}},
  {artifact:{workflow_run:{id:999,head_sha:commit}}},
  {run:{path:'.github/workflows/other.yml'}}
 ];
 for(const variant of variants){
  const r=runtime(variant);
  const result=await verify(args(r.fetchImpl));
  assert.notEqual(result.status,
   'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING');
  assert.equal(result.independent_technical_ci_verified,false);
 }
});
test('GitHub provider failure becomes reconciliation, not retry or invented success',async()=>{
 const r=runtime({unauthorized:true});
 const result=await verify(args(r.fetchImpl));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_PROVIDER_RECONCILIATION_RETRY_DUE');
 assert.equal(result.external_effect_performed,false);
 assert.equal(result.independent_technical_ci_verified,false);
});
test('missing preview GitHub token gives explicit activation gap without a provider request',async()=>{
 const r=runtime();
 const result=await verify(args(r.fetchImpl,{env:{
  ...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:null}}));
 assert.equal(result.status,
  'RECOVERY_TECHNICAL_CI_PREVIEW_SOURCE_OR_PROVIDER_AUTH_UNAVAILABLE');
 assert.equal(r.paths.length,0);
});
test('wrong original, owner or worker scope fails before a provider call',async()=>{
 const cases=[{...existingCiRoute,source_ref:
   'https://github.com/maloney2323/Reality/pull/308'},
  {...existingCiRoute,contract_id:sha('b')},
  {...existingCiRoute,original_job_completed:true}];
 for(const invalid of cases){
  const r=runtime();
  const result=await verify(args(r.fetchImpl,{existingCiRoute:invalid}));
  assert.equal(result.status,'RECOVERY_TECHNICAL_CI_EXACT_SOURCE_AND_WARRANT_REQUIRED');
  assert.equal(r.paths.length,0);
 }
});

test('terminal evidence readback verifies provider without creating contract, authorization or replay',async()=>{
 const terminalProposal={status:'RECOVERY_EXISTING_TERMINAL_BUILDER_REQUALIFICATION_REQUIRED',read_only:true,contract_candidate:null,previous_attempt_budget_preserved:true,repeat_prior_ci_dispatch_permitted:false,terminal_requalification:{...contractProposal.contract_candidate,qualifier_receipt_sha256:sha('8'),next_qualified_action:'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'}};
 const route={...existingCiRoute,status:'RECOVERY_TERMINAL_EXISTING_CI_DIAGNOSTIC_READBACK_READY',read_only:true,contract_id:null,qualifier_receipt_sha256:sha('8'),previous_attempt_budget_preserved:true,new_attempt_authorized:false};
 const r=runtime();const result=await verify(args(r.fetchImpl,{contractProposal:terminalProposal,existingCiRoute:route}));
 assert.equal(result.status,'RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED');assert.equal(result.independent_technical_ci_verified,true);assert.equal(result.contract_id,null);assert.equal(result.new_attempt_authorized,false);assert.equal(result.previous_attempt_budget_preserved,true);assert.equal(result.proof_gate_advanced,false);assert.equal(result.original_job_completed,false);assert.equal(result.execution_authorized,false);
 for(const invalid of [{...route,new_attempt_authorized:true},{...route,qualifier_receipt_sha256:sha('7')},{...route,contract_id:sha('1')}]){const r=runtime();const v=await verify(args(r.fetchImpl,{contractProposal:terminalProposal,existingCiRoute:invalid}));assert.equal(v.independent_technical_ci_verified,false);assert.equal(r.paths.length,0);}
});

test('existing release CI read credential alone permits exact read-only evidence verification',async()=>{
 const r=runtime();
 const readEnv={...env,REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:null,
  REALITY_GITHUB_TOKEN:null,GITHUB_TOKEN:null,
  REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN:'test-github-release-read-only-token'};
 const seen=[];
 const result=await verify(args(async(url,opts)=>{
  seen.push(opts.headers.authorization);
  assert.equal(opts.method,'GET');
  return r.fetchImpl(url,opts);
 },{env:readEnv}));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING');
 assert.ok(seen.length>0);
 assert.ok(seen.every(x=>x==='Bearer test-github-release-read-only-token'));
 assert.equal(result.execution_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
});
test('configured read credential is preferred and rejection does not fall back to a broader credential',async()=>{
 const r=runtime({unauthorized:true});
 const seen=[];
 const result=await verify(args(async(url,opts)=>{
  seen.push(opts.headers.authorization);
  return r.fetchImpl(url,opts);
 },{env:{...env,REALITY_RELEASE_CONTROL_GITHUB_READ_TOKEN:'test-github-release-read-only-token'}}));
 assert.equal(result.status,'RECOVERY_TECHNICAL_CI_PROVIDER_RECONCILIATION_RETRY_DUE');
 assert.deepEqual(seen,['Bearer test-github-release-read-only-token']);
 assert.equal(result.independent_technical_ci_verified,false);
});


// Actual existing Deno handler + original verifier, with synthetic provider
// responses only. No network, real credentials, ledger writes or dispatch.
test('terminal verifier uses actual governed broker, checks fresh exact scope and never falls back',async()=>{
 const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
 const service='fixture-service-key-not-a-secret',github='test-github-broker-token-not-a-secret';
 const event='11111111-1111-4111-8111-111111111111',worker='22222222-2222-4222-8222-222222222222';
 const claim='33333333-3333-4333-8333-333333333333';
 const terminalProposal={status:'RECOVERY_EXISTING_TERMINAL_BUILDER_REQUALIFICATION_REQUIRED',read_only:true,
  contract_candidate:null,previous_attempt_budget_preserved:true,repeat_prior_ci_dispatch_permitted:false,
  terminal_requalification:{...contractProposal.contract_candidate,qualifier_receipt_sha256:sha('8'),
   next_qualified_action:'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'}};
 const route={...existingCiRoute,status:'RECOVERY_TERMINAL_EXISTING_CI_DIAGNOSTIC_READBACK_READY',read_only:true,
  contract_id:null,qualifier_receipt_sha256:sha('8'),previous_attempt_budget_preserved:true,new_attempt_authorized:false};
 const ctx={status:'TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY',owner_id:owner,shift_id:shift,event_id:event,
  worker_run_id:worker,release_claim_id:claim,running_release_sha:commit,running_release_ref:env.VERCEL_GIT_COMMIT_REF,
  original_work_id:obligation,source_ref:source,frozen_source_head_sha:head,continuity_root_id:root,
  continuity_revision:3,continuity_head_sha256:sha('2'),qualifier_receipt_sha256:sha('8'),
  review_receipt_sha256:sha('3'),investigation_receipt_sha256:sha('4'),read_only:true,
  previous_attempt_budget_preserved:true,new_attempt_authorized:false,replay_authorized:false,
  original_job_completed:false,installation_authorized:false,production_changed:false,execution_authorized:false,
  terminal_history:{remaining_attempts:0,replay_permitted:false,new_attempt_authorized:false,
   maintenance_id:incident,independent_diagnostic_receipt_sha256:diag}};
 let handler;const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;
 globalThis.Deno={env:{get:k=>({SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:service,REALITY_GITHUB_BROKER_TOKEN:github})[k]},
  serve:fn=>{handler=fn}};
 try{
  await import('../supabase/functions/reality-signed-maintenance-repair-source-broker-v1/index.ts');
  assert.equal(typeof handler,'function');
  const brokerEnv={...env,REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
   REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:project,REALITY_RELEASE_GITHUB_CI_READ_MODE:'EXISTING_GOVERNED_BROKER',
   REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'test-github-must-not-be-used'};
  const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  async function exercise({initial=ctx,after=ctx,fixture={},alterResponse=null,deny=false,requestBody=null,auth=true}={}){
   const r=runtime(fixture);let checks=0,brokerCalls=0;
   globalThis.fetch=async(target,opts)=>{
    if(String(target).startsWith(url+'/rest/v1/rpc/')){
     assert.ok(String(target).endsWith('/reality_read_final_loop_terminal_technical_context_v1'));
     assert.deepEqual(JSON.parse(opts.body),{p_shift_id:shift,p_event_id:event,p_worker_run_id:worker});
     assert.equal(opts.headers.authorization,'Bearer '+service);
     return reply(200,++checks===1?initial:after);
    }
    assert.equal(opts.method,'GET');assert.equal(opts.headers.authorization,'Bearer '+github);
    if(deny)return reply(403,{message:'fixture provider denial'});
    return r.fetchImpl(target,opts);
   };
   const result=await verify({db:{project,strictSecrets:true,url,secretKey:service},env:brokerEnv,
    contractProposal:terminalProposal,existingCiRoute:route,terminalContext:ctx,workerRunId:worker,
    fetchImpl:async(target,opts)=>{
     brokerCalls++;assert.equal(target,url+'/functions/v1/reality-signed-maintenance-repair-source-broker-v1');
     assert.equal(opts.method,'POST');
     const request=new Request(target,{...opts,headers:{...opts.headers,apikey:auth?service:'wrong'},body:requestBody?JSON.stringify(requestBody):opts.body});
     const response=await handler(request),value=await response.json();
     assert.ok(!JSON.stringify(value).includes(service));assert.ok(!JSON.stringify(value).includes(github));
     assert.equal(value.original_job_completed,false);assert.equal(value.installation_authorized,false);
     return reply(response.status,alterResponse?alterResponse(value):value);
    }});
   return {result,checks,brokerCalls,paths:r.paths};
  }
  const good=await exercise();
  assert.equal(good.result.status,'RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED');
  assert.equal(good.result.independent_technical_ci_verified,true);assert.equal(good.result.new_attempt_authorized,false);
  assert.equal(good.result.original_job_completed,false);assert.equal(good.result.execution_authorized,false);
  assert.equal(good.checks,2);assert.equal(good.brokerCalls,1);assert.equal(good.paths.length,5);
  for(const bad of [
   {initial:{...ctx,running_release_sha:'a'.repeat(40)}},
   {initial:{...ctx,status:'TERMINAL_TECHNICAL_CONTEXT_UNVERIFIED'}},
   {initial:{...ctx,terminal_history:{...ctx.terminal_history,remaining_attempts:1}}},
   {after:{...ctx,continuity_revision:4}},
   {fixture:{run:{head_sha:'b'.repeat(40)}}},
   {fixture:{sourceBlob:'f'.repeat(40)}},
   {fixture:{artifact:{expired:true}}},
   {fixture:{caseSpec:{...spec,continuity_root_id:'11111111-1111-4111-8111-111111111111'}}},
   {alterResponse:b=>({...b,scope:{...b.scope,owner_id:'11111111-1111-4111-8111-111111111111'}})},
   {deny:true},{auth:false},
   {requestBody:{mode:'terminal_ci',shift_id:shift,event_id:event,worker_run_id:worker,release_sha:commit,target_url:'https://example.invalid'}}
  ]){
   const v=await exercise(bad);
   assert.equal(v.result.independent_technical_ci_verified,false);
   assert.equal(v.result.original_job_completed,false);assert.equal(v.result.execution_authorized,false);
   assert.equal(v.brokerCalls,1);
  }
  const denied=await exercise({deny:true});
  assert.equal(denied.result.broker_failed_operation,'EXACT_WORKFLOW_RUN');
  assert.equal(denied.result.provider_http_status,403);
 }finally{globalThis.fetch=oldFetch;globalThis.Deno=oldDeno;}
});
