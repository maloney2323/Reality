import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generateOneSignedMaintenanceRepairCandidate,generateOneSignedMaintenanceFrozenTestDraft,classifySignedModelProviderFailure} from
 '../src/reality-signed-maintenance-repair-model-candidate-v1.js';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const run='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const maint='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const req='bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const sha='a'.repeat(40),treeSha='b'.repeat(40);
const path='src/reality-shift-business-qualification-review-v1.js';
const source='// Original signed business qualification worker\n'
 +'export function guardSignedQualifiedWork(){\n'
 +'  return {original_execution_admitted:false,validation_required:true};\n}\n'
 +'// source ending with the actual deterministic guard for the original job\n'
 +'// frozen independent source baseline is retained and the model may not change shift authority\n'
 +'// this extra comment keeps this test fixture above the pinned Github minimum source size\n';
const buf=Buffer.from(source);
const blob=createHash('sha1').update('blob '+buf.length+'\0')
 .update(buf).digest('hex');
const hash=x=>'sha256:'+x.repeat(64);
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:'https://hvkfreoagbrphwghjajw.supabase.co',
 secretKey:'local-fixture-service-key-unused'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 VERCEL_GIT_COMMIT_SHA:sha,
 OPENAI_API_KEY:'fixture-REALITY-OPENAI-CREDENTIAL-never-sent',
 REALITY_OPENAI_MODEL:'gpt-5.4'};
const claim={
 status:'EXISTING_SIGNED_MAINTENANCE_MODEL_CANDIDATE_LEASED',
 maintenance_id:maint,owner_id:owner,shift_id:shift,request_id:req,
 release_sha:sha,source_ref:'https://github.com/maloney2323/Reality/pull/307',
 source_handoff_sha256:hash('1'),independent_baseline_receipt_sha256:hash('2'),
 independent_diagnostic_receipt_sha256:hash('3'),source_epoch_receipt_sha256:hash('4'),
 original_work_id:'work:315562fe1bd66b30a48bb9be4f1d162a',
 maintenance_kind:'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 historical_failure_kind:'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
 model_invocation_authorized:true,independent_frozen_red_verified:false,
 independent_ci_verified:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,new_shift_started:false};
const patch={
 find:'  return {original_execution_admitted:false,validation_required:true};',
 replace:'  return {original_execution_admitted:false,validation_required:true,repair_candidate_only:true};',
 reason:'Preserves governance while proposing a separately tested source change.'
};
const result={
 status:'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED',
 maintenance_id:maint,owner_id:owner,shift_id:shift,source_path:path,
 candidate_receipt_sha256:hash('7'),
 model_generated:true,independent_frozen_red_verified:false,
 independent_ci_verified:false,repair_executed:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,new_shift_started:false
};
const provider={
 source_ref:claim.source_ref,source_title:'Source handoff is blocked',
 source_body:'Read-only original review found no executable original claims',
 provider_proof_sha256:hash('8'),checked_at:new Date().toISOString()
};
function scenario({
 leased=claim,recovered=null,revised=null,selectedPath=path,patchBody=patch,
 recorded=result,changedSource=false,throwProvider=false
}={}){
 const calls=[],modelCalls=[],urls=[];
 const fetchImpl=async(url,opts={})=>{
  urls.push({url,method:opts.method||'GET'});
  if(throwProvider)throw Error('PROVIDER_DOWN');
  if(url.includes('/functions/v1/reality-signed-maintenance-repair-source-broker-v1')){
   const body=JSON.parse(opts.body);
   assert.equal(body.maintenance_id,maint);
   assert.equal(body.request_id,req);
   assert.equal(body.release_sha,sha);
   const base={ok:true,maintenance_id:maint,request_id:req,
    release_sha:sha,source_read_only:true,
    independent_frozen_red_verified:false,independent_ci_verified:false,
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_shift_started:false};
   return {ok:true,json:async()=>body.mode==='manifest'?
    {...base,status:'SIGNED_MAINTENANCE_SOURCE_MANIFEST_VERIFIED',
     source_tree_sha:treeSha,worker_source_blob_sha:'c'.repeat(40),
     runtime_imports_count:1,files:[{path,sha:blob,size:buf.length}]}:
    {...base,status:'SIGNED_MAINTENANCE_SOURCE_FILE_VERIFIED',
     path,sha:blob,size:buf.length,encoding:'base64',
     source_tree_sha:treeSha,content:buf.toString('base64')}};
  }
  if(url==='https://api.openai.com/v1/responses'){
   const request=JSON.parse(opts.body);
   modelCalls.push(request);
   const which=modelCalls.length===1?'target':'patch';
   return {ok:true,json:async()=>({
    status:'completed',id:which==='target'?'resp_target_AAAAA':'resp_patch_BBBBB',
    output_text:JSON.stringify(which==='target'?
     {path:selectedPath,reason:'Signed case-specific source correction target'}:
     patchBody)
   })};
  }
  throw Error('UNAUTHORIZED_PROVIDER_'+url);
 };
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_claim_signed_maintenance_repair_candidate_v1')
   return leased;
  if(name==='reality_recover_signed_maintenance_repair_candidate_source_v1')
   return recovered||{
    status:'NO_SIGNED_MAINTENANCE_SOURCE_RECOVERY_READY',
    model_invocation_authorized:false,
    installation_authorized:false,production_changed:false,
    original_job_completed:false,new_shift_started:false};
  if(name==='reality_revise_signed_offtarget_maintenance_candidate_v1')
   return revised||{
    status:'NO_SIGNED_OFFTARGET_MODEL_REVISION_READY',
    model_invocation_authorized:false,
    installation_authorized:false,production_changed:false,
    original_job_completed:false,new_shift_started:false};
  if(name==='reality_record_signed_maintenance_repair_candidate_v1')
   return {...recorded,proposed_source_sha256:args.p_proposed_source_sha256};
  if(name==='reality_mark_signed_maintenance_repair_candidate_unverified_v1')
   return {status:'MAINTENANCE_REPAIR_MODEL_CANDIDATE_NOT_VERIFIED'};
  throw Error('UNAUTHORIZED_RPC_'+name);
 };
 const readSource=async()=>({...provider,
  provider_proof_sha256:changedSource?hash('9'):provider.provider_proof_sha256});
 return {
  calls,modelCalls,urls,
  run:()=>generateOneSignedMaintenanceRepairCandidate({
   db,env,shiftId:shift,workerRunId:run,fetchImpl,call,readSource
  })
 };
}
test('existing warrant produces a real pinned model patch proposal, not a test pass or installation',async()=>{
 const f=scenario();const r=await f.run();
 assert.equal(r.status,'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED');
 assert.equal(r.model_generated,true);
 assert.equal(r.original_work_id,claim.original_work_id);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.independent_frozen_red_verified,false);
 assert.equal(r.independent_ci_verified,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.production_changed,false);
 assert.equal(f.modelCalls.length,2);
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_claim_signed_maintenance_repair_candidate_v1',
  'reality_record_signed_maintenance_repair_candidate_v1'
 ]);
 assert.deepEqual(f.urls.filter(x=>x.method==='POST').map(x=>x.url),[
  db.url+'/functions/v1/reality-signed-maintenance-repair-source-broker-v1',
  'https://api.openai.com/v1/responses',
  db.url+'/functions/v1/reality-signed-maintenance-repair-source-broker-v1',
  'https://api.openai.com/v1/responses']);
 assert.equal(f.calls[1].args.p_source_path,path);
 assert.equal(f.calls[1].args.p_candidate_patch.find,patch.find);
});
test('a signed existing source has no duplicate model invocation on reload/wake',async()=>{
 const f=scenario({leased:{status:
  'SIGNED_MAINTENANCE_MODEL_CANDIDATE_ALREADY_CLAIMED_NO_REPLAY',
  maintenance_id:maint,model_invocation_authorized:false,
  installation_authorized:false,production_changed:false,
  original_job_completed:false,new_shift_started:false}});
 const r=await f.run();
 assert.equal(r.model_generated,false);
 assert.equal(f.modelCalls.length,0);
 assert.equal(f.calls.length,1);
});
test('model cannot select unpinned source or inflate completion',async()=>{
 for(const options of [
  {selectedPath:'src/../scripts/evil.js'},
  {selectedPath:'src/nonexistent.js'},
  {recorded:{...result,independent_ci_verified:true}},
  {recorded:{...result,original_job_completed:true}},
  {patchBody:{...patch,find:'NONEXISTENT UNIQUE SOURCE BLOCK FORGERY'}},
 ]) {
  const f=scenario(options);const r=await f.run();
  assert.equal(r.status,'SIGNED_MAINTENANCE_MODEL_CANDIDATE_NOT_VERIFIED');
  assert.equal(r.model_generated,false);
  assert.equal(r.original_job_completed,false);
  assert.equal(f.calls.at(-1).name,
   'reality_mark_signed_maintenance_repair_candidate_unverified_v1');
 }
});
test('provider unavailable never mints success or replays a consumed claim',async()=>{
 const f=scenario({throwProvider:true});const r=await f.run();
 assert.equal(r.model_generated,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(f.calls.at(-1).name,
  'reality_mark_signed_maintenance_repair_candidate_unverified_v1');
});
test('SQL enforces exact signed worker, immutable source, one model claim, and prohibits self-approval',()=>{
 const sql=readFileSync(new URL(
 '../supabase/migrations/20261120133000_signed_maintenance_repair_candidate_stage_v1.sql',
 import.meta.url),'utf8');
 for(const fragment of [
  "current_user<>'service_role'",
  "w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'",
  "w.state='ACTIVE'",
  "run.status='STARTED'",
  "pulse.last_worker_status='WAKE_RECEIVED'",
  "m.independent_frozen_test_receipt_sha256 is null",
  "not exists(select 1 from reality_internal.owner_maintenance_repair_candidates_v1",
  "on conflict(maintenance_id) do nothing",
  "model_response_id","revoke all on function"
 ])assert.ok(sql.includes(fragment),fragment);
 assert.doesNotMatch(sql,/net\.http_post|insert into reality_internal\.governed_employee_shifts_v1/);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/generateOneSignedMaintenanceRepairCandidate\(\{/);
 assert.match(worker,/signed_maintenance_repair_model_candidate:signedMaintenanceRepairModelCandidate/);
});

test('a corrected pinned release retries only through the one-use signed history-preserving recovery',async()=>{
 const f=scenario({
  leased:{status:'NO_SIGNED_MAINTENANCE_REPAIR_CANDIDATE_READY',
   model_invocation_authorized:false,installation_authorized:false,
   original_job_completed:false,production_changed:false,new_shift_started:false},
  recovered:{...claim,recovery_attempts:1,old_failed_attempt_preserved:true}
 });
 const r=await f.run();
 assert.equal(r.status,'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED');
 assert.equal(r.independent_ci_verified,false);
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_claim_signed_maintenance_repair_candidate_v1',
  'reality_recover_signed_maintenance_repair_candidate_source_v1',
  'reality_record_signed_maintenance_repair_candidate_v1']);
});
test('no eligible new or recoverable original produces no model call or external mutation',async()=>{
 const f=scenario({leased:{
  status:'NO_SIGNED_MAINTENANCE_REPAIR_CANDIDATE_READY',
  model_invocation_authorized:false,installation_authorized:false,
  production_changed:false,original_job_completed:false,new_shift_started:false}});
 const r=await f.run();
 assert.equal(r.model_generated,false);
 assert.equal(f.modelCalls.length,0);
 assert.equal(f.calls.length,3);
 assert.equal(r.status,'NO_SIGNED_OFFTARGET_MODEL_REVISION_READY');
});
test('source broker reuses existing credential without exposing it to preview or anonymous clients',()=>{
 const broker=readFileSync(new URL(
 '../supabase/functions/reality-signed-maintenance-repair-source-broker-v1/index.ts',
 import.meta.url),'utf8');
 for(const term of [
  'REALITY_GITHUB_BROKER_TOKEN',
  "workerPath='api/reality/governed-employee-shift-worker.js'",
  'await gitBlobSha(workerBytes)',
  'eligible=files.filter',
  "same(req.headers.get('apikey')||'',c.key)",
  "reality_read_signed_maintenance_repair_source_scope_v1",
  "scope.source_read_authorized!==true",
  "FILE.test(b.target_path",
  "await gitBlobSha(data)!==match.sha"
 ])assert.ok(broker.includes(term),term);
 assert.doesNotMatch(broker,/method:'PUT'|method:'PATCH'|method:'DELETE'|\/git\/refs\/heads/);
 const scope=readFileSync(new URL(
 '../supabase/migrations/20261120140500_signed_maintenance_source_broker_scope_v1.sql',
 import.meta.url),'utf8');
 assert.match(scope,/current_user<>'service_role'/);
 assert.match(scope,/c.state='CLAIMED'/);
 assert.match(scope,/c.release_sha=p_release_sha/);
 assert.match(scope,/w.state='ACTIVE'/);
 assert.match(scope,/revoke all on function/);
 const recovery=readFileSync(new URL(
 '../supabase/migrations/20261120143000_signed_maintenance_model_bounded_source_recovery_v1.sql',
 import.meta.url),'utf8');
 assert.match(recovery,/original_failure_reason/);
 assert.match(recovery,/c.recovery_attempts=0/);
 assert.match(recovery,/c.release_sha<>p_release_sha/);
 assert.match(recovery,/for update of c skip locked/);
 assert.match(recovery,/recovery_attempts=1/);
 assert.match(recovery,/revoke all on function/);
 assert.doesNotMatch(recovery,/update reality_internal\.governed_employee_shifts_v1/);
});

test('an independently rejected off-target source may be replaced ONCE, without new original or installation',async()=>{
 const f=scenario({
  leased:{status:'NO_SIGNED_MAINTENANCE_REPAIR_CANDIDATE_READY',
   model_invocation_authorized:false,installation_authorized:false,
   original_job_completed:false,production_changed:false,new_shift_started:false},
  revised:{...claim,target_revision_attempts:1,
   old_failed_offtarget_candidate_preserved:true}
 });
 const r=await f.run();
 assert.equal(r.status,'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED');
 assert.equal(r.model_generated,true);
 assert.equal(r.independent_ci_verified,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.new_shift_started,false);
 assert.equal(f.calls[2].name,'reality_revise_signed_offtarget_maintenance_candidate_v1');
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_claim_signed_maintenance_repair_candidate_v1',
  'reality_recover_signed_maintenance_repair_candidate_source_v1',
  'reality_revise_signed_offtarget_maintenance_candidate_v1',
  'reality_record_signed_maintenance_repair_candidate_v1'
 ]);
});
test('SQL preserves rejected model patch and independent off-target review before any new model lease',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120160000_signed_maintenance_offtarget_candidate_revision_v1.sql',
  import.meta.url),'utf8');
 for(const term of [
  "current_user<>'service_role'",
  "rv.target_in_worker_graph=false",
  "rv.verdict='OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY'",
  "rv.review_receipt_sha256~'^sha256:[a-f0-9]{64}$'",
  "c.target_revision_attempts=0",
  "c.release_sha<>p_release_sha",
  "rejected_candidate_patch",
  "rejected_model_response_id",
  "independent_reviewer_receipt_sha256",
  "for update of c skip locked",
  "target_revision_attempts=1",
  "on conflict(maintenance_id,original_model_request_id) do nothing",
  "revoke all on function public.reality_revise_signed_offtarget_maintenance_candidate_v1"
 ])assert.ok(sql.includes(term),term);
 assert.doesNotMatch(sql,/net\\.http_post|insert into reality_internal\\.governed_employee_shifts_v1/);
});


test('an unused authority comparison cannot be persisted as a maintenance repair candidate',async()=>{
 const f=scenario({patchBody:{
  find:patch.find,
  replace:'  const sourceMatchesOriginal=claim.source_ref===env.REALITY_ORIGINAL_ISSUE_URL;\n'+patch.find,
  reason:'Proposed authority comparison with no change to the governed decision.'
 }});
 const r=await f.run();
 assert.equal(r.status,'SIGNED_MAINTENANCE_MODEL_CANDIDATE_NOT_VERIFIED');
 assert.equal(r.reason,'SIGNED_MAINTENANCE_MODEL_UNUSED_COMPARISON_ONLY');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(f.modelCalls.length,2);
 assert.deepEqual(f.calls.map(x=>x.name),[
  'reality_claim_signed_maintenance_repair_candidate_v1',
  'reality_mark_signed_maintenance_repair_candidate_unverified_v1'
 ]);
 assert.equal(f.calls[1].args.p_reason,'SIGNED_MAINTENANCE_MODEL_UNUSED_COMPARISON_ONLY');
});
test('a comparison that participates in the changed decision is not rejected by the narrow unused-check guard',async()=>{
 const f=scenario({patchBody:{
  find:patch.find,
  replace:'  const sourceMatchesOriginal=claim.source_ref===env.REALITY_ORIGINAL_ISSUE_URL;\n'+
   '  return {original_execution_admitted:false,validation_required:true,sourceMatchesOriginal};',
  reason:'The new comparison is consumed in the changed output for independent testing.'
 }});
 const r=await f.run();
 assert.equal(r.status,'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED');
 assert.equal(r.independent_ci_verified,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
});


test('both exact qualified actions enter the existing signed builder, with one inert durable result and no CI or install claim',async()=>{
 for(const approved of [true,false]){
  const leased={...claim,status:'SIGNED_FROZEN_TEST_DRAFT_LEASED',source_revision:sha,
   authority_receipt_sha256:hash('1'),
   action:approved?'EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI':'RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE',
   authority_basis:approved?'APPROVED_EXACT_SOURCE_SCOPE':'SIGNED_EXISTING_WARRANT',
   ...(approved?{approved_target_path:path,approved_target_blob_sha:blob}:{})};
  const calls=[],requests=[];
  const call=async(_db,name,args)=>{
   calls.push({name,args});
   if(name==='reality_claim_signed_maintenance_frozen_test_draft_v1')return leased;
   assert.equal(name,'reality_record_signed_maintenance_frozen_test_draft_v1');
   assert.equal(args.p_candidate.state,'DRAFT');
   assert.equal(args.p_candidate.target_blob_sha,blob);
   return {status:'SIGNED_FROZEN_TEST_BUILD_RESULT_RECORDED',maintenance_id:maint,request_id:req,
    draft_state:'DRAFT',receipt_sha256:hash('9'),independent_ci_verified:false,
    installation_authorized:false,original_job_completed:false,production_changed:false};
  };
  const fetchImpl=async(url,opts)=>{
   const b=JSON.parse(opts.body);requests.push({url,b});
   if(url.includes('/functions/v1/')){
    const base={ok:true,maintenance_id:maint,request_id:req,release_sha:sha,
     source_read_only:true,independent_frozen_red_verified:false,independent_ci_verified:false,
     installation_authorized:false,original_job_completed:false,production_changed:false,new_shift_started:false};
    assert.ok(['test_manifest','test_source'].includes(b.mode));
    return {ok:true,json:async()=>b.mode==='test_manifest'?
     {...base,status:'SIGNED_MAINTENANCE_SOURCE_MANIFEST_VERIFIED',source_tree_sha:treeSha,files:[{path,sha:blob,size:buf.length}]}:
     {...base,status:'SIGNED_MAINTENANCE_SOURCE_FILE_VERIFIED',path,sha:blob,size:buf.length,encoding:'base64',content:buf.toString('base64')}};
   }
   assert.equal(url,'https://api.openai.com/v1/responses');
   assert.equal(b.tool_choice,'none');
   return {ok:true,json:async()=>({status:'completed',id:'resp_fixture_1234',output_text:JSON.stringify(
    b.text.format.name==='reality_signed_maintenance_target_candidate'?{path,reason:'Exact runtime qualification module'}:
    {state:'DRAFT',test_source:"import test from 'node:test'; import assert from 'node:assert/strict'; test('preserve authority',()=>assert.equal(false,false));",expected_failure:'Observe exact source failure without changing authorization.'})})};
  };
  const r=await generateOneSignedMaintenanceFrozenTestDraft({db,env,shiftId:shift,workerRunId:run,call,fetchImpl});
  assert.equal(r.status,'SIGNED_FROZEN_TEST_BUILD_RESULT_RECORDED');
  assert.equal(r.model_generated,true);
  assert.equal(r.independent_ci_verified,false);
  assert.equal(r.installation_authorized,false);
  assert.equal(r.original_job_completed,false);
  assert.equal(calls.length,2);
  assert.equal(requests.length,approved?3:4);
 }
});
test('test construction has no model call without an independently leased obligation',async()=>{
 let count=0;
 const r=await generateOneSignedMaintenanceFrozenTestDraft({db,env,shiftId:shift,workerRunId:run,
  call:async()=>({status:'NO_NEW_SIGNED_FROZEN_TEST_DRAFT_READY',model_invocation_authorized:false}),
  fetchImpl:async()=>{count++;throw Error('NO_PROVIDER_CALL')}});
 assert.equal(count,0);
 assert.equal(r.model_generated,false);
});

import {observeSignedBuilderProvider,investigateOneSignedShiftContinuityIncident} from '../src/reality-shift-continuity-auto-investigation-v1.js';

test('provider failures retain bounded status and classification without leaking raw error text',async()=>{
 for(const [status,code,expected] of [[401,'invalid_api_key','AUTH_OR_SECRET_MISSING'],[429,'insufficient_quota','QUOTA_EXHAUSTED'],[429,'rate_limit_exceeded','RATE_LIMIT'],[503,'server_error','TRANSIENT_INFRA'],[400,'invalid_json_schema','MODEL_CONFIG_OR_SCHEMA']]){
  const v=await classifySignedModelProviderFailure({ok:false,status,json:async()=>({error:{code,message:'secret should never be retained'}})});
  assert.equal(v.error_class,expected);
  assert.equal(v.http_status,status);
  assert.equal(v.provider_code,code);
  assert.doesNotMatch(JSON.stringify(v),/secret should never/);
 }
 const unknown=await classifySignedModelProviderFailure(null,{name:'TimeoutError'});
 assert.equal(unknown.error_class,'UNKNOWN_PROVIDER_OUTCOME');
 assert.equal(unknown.transport_failure,'TIMEOUT_OUTCOME_UNKNOWN');
});
test('existing Continuity investigator atomically records a typed diagnostic decision on the original failed attempt',async()=>{
 const incident={status:'SIGNED_BUILDER_FAILURE_INVESTIGATION_CLAIMED',owner_id:owner,shift_id:shift,
  incident_id:maint,maintenance_id:maint,lease_id:req,attempt_count:1,evidence_sha256:hash('1'),
  source_evidence:{schema:'reality-signed-maintenance-builder-failure-v1',maintenance_id:maint,attempt_id:run,
   failure_receipt_sha256:hash('2'),authority_receipt_sha256:hash('3'),observed_state:'PROVIDER_UNVERIFIED',
   investigation_only:true,original_job_completed:false,installation_authorized:false,production_changed:false},
  investigation_only:true,execution_authorized:false,installation_authorized:false,production_changed:false};
 for(const [http,code,expected,state] of [[401,'invalid_api_key','AUTH_OR_SECRET_MISSING','TERMINAL_BOUNDARY'],[429,'insufficient_quota','QUOTA_EXHAUSTED','TERMINAL_BOUNDARY'],[200,null,'PROVIDER_READY','REENTRY_AUTHORIZED']]){
  let probes=0,records=0;
  const result=await investigateOneSignedShiftContinuityIncident({db,env,shiftId:shift,workerRunId:run,
   fetchImpl:async(url,opts)=>{
    probes++;assert.equal(url,'https://api.openai.com/v1/responses');
    const request=JSON.parse(opts.body);assert.equal(request.tool_choice,'none');assert.equal(request.max_output_tokens,128);
    return http===200?{ok:true,status:200,json:async()=>({status:'completed',id:'resp_fixture_1234',output_text:'{"ready":true}'})}:
     {ok:false,status:http,json:async()=>({error:{code,message:'do not retain'}})};
   },
   call:async(_db,name,args)=>{
    if(name==='reality_claim_next_shift_continuity_investigation_v1'){assert.equal(args.p_worker_run_id,run);return incident}
    assert.equal(name,'reality_record_signed_builder_recovery_decision_v1');records++;
    assert.equal(args.p_incident_id,maint);assert.equal(args.p_observation.error_class,expected);
    return {status:'SIGNED_BUILDER_RECOVERY_DECISION_RECORDED',incident_id:maint,maintenance_id:maint,
     recovery_state:state,error_class:expected,receipt_sha256:hash('5'),original_job_completed:false,
     installation_authorized:false,production_changed:false,execution_authorized:false};
   }});
  assert.equal(probes,1);assert.equal(records,1);assert.equal(result.recovery_state,state);
  assert.equal(result.self_repair_proven,false);assert.equal(result.original_job_completed,false);
 }
});
test('recovery migration preserves attempts and uses existing incident admission, bounded leases and explicit boundary',()=>{
 const sql=readFileSync(new URL('../sql/reality-signed-maintenance-builder-recovery-v1.sql',import.meta.url),'utf8');
 for(const term of ["NEW.build_attempt_receipts:=NEW.build_attempt_receipts||","SIGNED_MAINTENANCE_BUILDER_FAILED",
  "recovery_state IN ('READY_FOR_BUILD','REENTRY_AUTHORIZED')","jsonb_array_length(build_attempt_receipts)<3",
  "TERMINAL_BOUNDARY","reality_record_signed_builder_recovery_decision_v1","build_reentry_not_before",
  "FOR UPDATE SKIP LOCKED","p_worker_run_id","INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF"])
  assert.ok(sql.includes(term),term);
 assert.doesNotMatch(sql,/net\.http_post|INSERT INTO reality_internal\.governed_employee_shifts_v1/);
});


test('Final Loop release retains existing frozen builder and incident recovery on the same signed worker',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const boundary=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(worker,/workerStage='SIGNED_MAINTENANCE_FROZEN_TEST_CAPABILITY_BUILD'/);
 assert.match(worker,/if\(strictContinuityCycle\)await requireFreshFinalLoopContinuity\(\)/);
 assert.match(worker,/generateOneSignedMaintenanceFrozenTestDraft\(\{[\s\S]*?workerRunId:actualWorkerRunId/);
 assert.match(worker,/signed_maintenance_frozen_test_build:signedMaintenanceFrozenTestBuild/);
 assert.match(worker,/investigateOneSignedShiftContinuityIncident\(\{[\s\S]*?workerRunId:actualWorkerRunId/);
 for(const rpc of ['claim_signed_maintenance_frozen_test_draft_v1','record_signed_maintenance_frozen_test_draft_v1','record_signed_builder_recovery_decision_v1'])assert.ok(boundary.includes(rpc),rpc);
});
