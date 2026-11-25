import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrustedSignedWorkerReleaseControlPlaneAdapters as create}
 from '../src/reality-governed-signed-worker-control-plane-adapters-v1.js';
const sha='a'.repeat(40),oldSha='b'.repeat(40);
const project='abcdefghijklmnopqrst';
const url='https://'+project+'.supabase.co/';
const alias='reality-governed-worker-preview.vercel.app';
const oldHost='reality-git-maintenance-preview.vercel.app';
const deploymentId='dpl_abcd1234567890',oldDeployment='dpl_bcde1234567890';
const branch='feature/qualified-signed-shift';
const env={
 VERCEL_ENV:'preview',
 REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED:'true',
 REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED:'true',
 REALITY_RELEASE_CONTROL_DB_PROJECT_REF:project,
 REALITY_VERIFIED_GITHUB_REPOSITORY:'example-org/example-repo',
 REALITY_VERIFIED_VERCEL_PROJECT_ID:'prj_testrelease12345',
 REALITY_VERIFIED_VERCEL_TEAM_ID:'team_testrelease12345',
 REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN:'x'.repeat(36),
 REALITY_SIGNED_WORKER_CRON_JOB_ID:'7',
 REALITY_SIGNED_WORKER_STABLE_ALIAS:alias,
 REALITY_SIGNED_WORKER_TARGET_DEPLOYMENT_ID:deploymentId,
 REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA:sha,
 REALITY_SIGNED_WORKER_TARGET_RELEASE_REF:branch
};
const db={strictSecrets:true,secretKey:'z'.repeat(36),url,project};
const schedule={status:'GOVERNED_RELEASE_CRON_SCHEDULE_READ_ONLY',
 job_id:7,provider:'SUPABASE_PG_CRON',active:true,host:oldHost,
 method:'POST',endpoint_path:'/api/reality/governed-employee-shift-worker',
 schedule:'*/5 * * * *',credential_values_exposed:false};
function fixture({config={},cron=schedule,wrongProject=false,
 wrongSha=false,failWrite=false}={}){
 const calls=[];
 const fetchImpl=async(address,options)=>{
  const url=String(address),method=options.method;
  calls.push({url,method,body:options.body});
  if(url.includes('/rest/v1/rpc/reality_read_governed_worker_release_schedule_v1'))
   return {ok:true,json:async()=>cron};
  if(url.includes('/rest/v1/rpc/reality_read_governed_signed_worker_release_approval_v1'))
   return {ok:true,json:async()=>({status:'EXACT_PREVIEW_RELEASE_OWNER_APPROVED'})};
  if(url.includes('/rest/v1/rpc/reality_prepare_governed_signed_worker_release_v1')){
   const p=JSON.parse(options.body);
   return {ok:true,json:async()=>({status:'SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED',
    owner_id:p.p_owner_id,shift_id:p.p_shift_id,release_sha:p.p_release_sha,
    release_ref:p.p_release_ref,scheduled_alias:p.p_scheduled_alias,
    capability_key:p.p_capability_key,request_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',
    proposal_fingerprint:'sha256:'+'c'.repeat(64),owner_approval_granted:false,
    release_changed:false,original_job_completed:false})};
  }
  if(url.includes('/rest/v1/rpc/reality_claim_governed_signed_worker_release_v1'))
   return {ok:true,json:async()=>({status:'EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED'})};
  if(url.includes('/v4/aliases/'))
   return {ok:true,json:async()=>({alias:decodeURIComponent(url.split('/v4/aliases/')[1].split('?')[0]),
    deploymentId:url.includes(encodeURIComponent(oldHost))?oldDeployment:deploymentId,
    projectId:wrongProject?'prj_otherrelease99999':env.REALITY_VERIFIED_VERCEL_PROJECT_ID})};
  if(url.includes('/v13/deployments/')){
   const old=url.includes(oldDeployment);
   return {ok:true,json:async()=>({id:old?oldDeployment:deploymentId,
    project:{id:env.REALITY_VERIFIED_VERCEL_PROJECT_ID},
    state:'READY',target:null,
    meta:{githubOrg:'example-org',githubRepo:'example-repo',
     githubCommitSha:old?oldSha:wrongSha?oldSha:sha,
     githubCommitRef:old?'repair/older-worker':branch}})};
  }
  if(method==='POST'&&url.includes('/v2/deployments/')){
   if(failWrite)throw Error('ambiguous provider timeout');
   return {ok:true,json:async()=>({alias})};
  }
  throw Error('UNEXPECTED_PROVIDER_ROUTE');
 };
 return {adapter:create({env:{...env,...config},db,fetchImpl}),
  calls,fetchImpl};
}
test('missing server credential or exact trusted project fails before network calls',()=>{
 const f=fixture({config:{REALITY_VERIFIED_VERCEL_RELEASE_API_TOKEN:''}});
 assert.equal(f.adapter.ready,false);
 assert.equal(f.adapter.status,'RELEASE_CONTROL_TRUSTED_PROVIDER_CONFIG_NOT_READY');
 assert.equal(f.calls.length,0);
});
test('read-only scheduled worker verification uses DB and current Vercel identity',async()=>{
 const f=fixture();
 const v=await f.adapter.readSchedule();
 assert.equal(v.status,'GOVERNED_SCHEDULE_INDEPENDENTLY_READ');
 assert.equal(v.host,oldHost);
 assert.equal(v.branch_automanaged,true);
 assert.equal(v.dedicated_stable_release_alias,false);
 assert.equal(v.signed_worker_target_verified,true);
 assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
 assert.ok(f.calls.every(x=>!x.url.includes(db.secretKey)));
 assert.ok(f.calls[0].url.startsWith(url+'rest/v1/rpc/'));
});
test('a mismatched Vercel project cannot certify the scheduler',async()=>{
 const f=fixture({wrongProject:true});
 await assert.rejects(()=>f.adapter.readSchedule(),/RELEASE_ALIAS_PROJECT_BINDING_UNVERIFIED/);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,0);
});
test('one-use claim is DB service only and rejects a different release',async()=>{
 const f=fixture();
 const a={owner_id:'a'.repeat(8)+'-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  release_sha:sha,release_ref:branch,
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  scheduled_alias:alias,
  previous_release_sha:oldSha,previous_release_ref:'repair/older-worker',
  independent_ci_run_id:2001};
 assert.equal((await f.adapter.claimApprovedRelease(a)).status,
  'EXACT_SIGNED_CAPABILITY_DELIVERY_CLAIMED');
 await assert.rejects(()=>f.adapter.claimApprovedRelease({...a,release_sha:oldSha}),
  /RELEASE_OWNER_CLAIM_EXACT_INPUT_UNVERIFIED/);
 assert.equal(f.calls.filter(x=>x.url.includes('reality_claim_governed')).length,1);
});
test('approved provider assignment checks deployment SHA before exactly one POST',async()=>{
 const f=fixture();
 const args={alias,release_sha:sha,release_ref:branch,
  owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  claim_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc'};
 const r=await f.adapter.assignAlias(args);
 assert.equal(r.release_sha,sha);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,1);
 const broken=fixture({wrongSha:true});
 await assert.rejects(()=>broken.adapter.assignAlias(args),
  /RELEASE_PROVIDER_PINNED_DEPLOYMENT_DRIFT/);
 assert.equal(broken.calls.filter(x=>x.url.includes('/v2/deployments/')).length,0);
});
test('ambiguous provider result is never automatically retried',async()=>{
 const f=fixture({failWrite:true});
 await assert.rejects(()=>f.adapter.assignAlias({
  alias,release_sha:sha,release_ref:branch,
  owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  claim_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc'
 }),/ambiguous provider timeout/);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,1);
});

test('owner release approval is independently read via exact service RPC',async()=>{
 const f=fixture();
 const a=await f.adapter.readApprovedRelease({
  owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  release_sha:sha,scheduled_alias:alias,
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET'
 });
 assert.equal(a.status,'EXACT_PREVIEW_RELEASE_OWNER_APPROVED');
 assert.equal(f.calls.filter(x=>x.url.includes('release_approval_v1')).length,1);
 await assert.rejects(()=>f.adapter.readApprovedRelease({
  owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  shift_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  release_sha:oldSha,scheduled_alias:alias,
  capability_key:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET'
 }),/SIGNED_RELEASE_APPROVAL_READ_SCOPE_UNVERIFIED/);
});

test('existing release preparation creates only the exact owner packet, no activation claim or provider write',async()=>{
 const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 const capability='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET';
 const f=fixture({config:{REALITY_SIGNED_WORKER_RELEASE_OWNER_ID:owner,
  REALITY_SIGNED_WORKER_RELEASE_SHIFT_ID:shift,REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY:capability}});
 const qualification={status:'QUALIFIED_EXACT_ISOLATED_SIGNED_WORKER_RELEASE_READ_ONLY',
  read_only:true,owner_approval_granted:false,release_activated:false,production_changed:false,
  branch_project_ref:project,provider_deployment_id:deploymentId,
  provider_release_proof_sha256:'sha256:'+'a'.repeat(64),
  independent_isolation_proof_sha256:'sha256:'+'b'.repeat(64),
  candidate:{sha,branch,shift_id:shift,capability_key:capability,scheduled_alias:alias,
   operating_lane:'NORMAL_SIGNED_SHIFT',source_staging_only:false,
   isolated_database_independently_verified:true,preview_only:true,
   environment:'ISOLATED_PREVIEW',production_changed:false},
  ci:{status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:sha,independently_verified:true,
   test_source_pinned:true,run_id:2004}};
 const input={qualification,schedule:{status:'GOVERNED_SCHEDULE_INDEPENDENTLY_READ',
  job_id:7,host:alias,dedicated_stable_release_alias:true,branch_automanaged:false,
  signed_worker_target_verified:true},
  currentAlias:{provider:'VERCEL',independently_observed:true,project_verified:true,
   preview_only:true,alias,resolved_release_sha:oldSha,resolved_branch:'repair/older-worker'}};
 const r=await f.adapter.prepareExactRelease(input);
 assert.equal(r.status,'SIGNED_RELEASE_EXACT_OWNER_PACKET_PREPARED');
 assert.equal(r.owner_approval_granted,false);
 assert.equal(f.calls.length,1);
 assert.match(f.calls[0].url,/reality_prepare_governed_signed_worker_release_v1$/);
 assert.equal(JSON.parse(f.calls[0].body).p_previous_release_sha,oldSha);
 for(const bad of [{...input,qualification:{...qualification,branch_project_ref:'anotherproject1234567'}},
  {...input,schedule:{...input.schedule,branch_automanaged:true}},
  {...input,qualification:{...qualification,ci:{...qualification.ci,independently_verified:false}}}]){
  await assert.rejects(()=>f.adapter.prepareExactRelease(bad),/RELEASE_PREPARATION_EXACT_INDEPENDENT_SCOPE_UNVERIFIED/);
 }
 assert.equal(f.calls.length,1);
});

test('read-only direction inspection works before target release or switch permission exists',async()=>{
 const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 const scope={...env,REALITY_GOVERNED_RELEASE_SWITCH_TRIGGER_ENABLED:'false',
  REALITY_SIGNED_CAPABILITY_DELIVERY_ENABLED:'false',REALITY_SIGNED_WORKER_TARGET_RELEASE_SHA:'',
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:project,
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
  REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:owner,REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:shift};
 const f=fixture({cron:{...schedule,host:alias}});
 const calls=[];
 const hash=c=>'sha256:'+c.repeat(64);
 const job={source_step_index:2,source_ref:'https://github.com/maloney2323/Reality/issues/301',
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',phase:'SOURCE_ADMITTED',original_work_id:'work:'+'1'.repeat(32),
  source_proof_sha256:hash('a'),independent_source_proof_verified:true,next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  capability_installation_authorized:false,provider_effect_claimed_by_graph:false,original_job_completed_by_graph:false};
 const raw={status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',owner_id:owner,shift_id:shift,
  plan_fingerprint:hash('c'),completion_bound:true,selected_sources:1,execution_scope_from_owner_warrant_only:true,
  new_job_created:false,installation_authorized:false,original_job_completed_by_graph:false,production_changed:false,jobs:[job]};
 const proof={schema:'reality-final-loop-canonical-proof-readback-v1',status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
  owner_id:owner,shift_id:shift,plan_fingerprint:raw.plan_fingerprint,read_only:true,independent_owner_scope_verified:true,
  owner_acceptance_verified:false,execution_authorized:false,installation_authorized:false,original_job_completed:false,production_changed:false,
  continuity_root_id:shift,continuity_head_sha256:hash('b'),frozen_shift_scope_sha256:hash('d'),revision:3,jobs:[job]};
 const guard={schema:'reality-shared-cross-layer-continuity-handoff-v1',status:'FINAL_LOOP_SHARED_CONTINUITY_CHECKED',
  owner_id:owner,shift_id:shift,continuity_root_id:shift,continuity_head_sha256:hash('b'),frozen_shift_scope_sha256:hash('d'),revision:3,
  handoff_observation_sha256:hash('8'),read_only:true,no_new_executable_authority:true,first_signal_anchor_verified:true,
  worldline_parent_links_verified:true,shift_scope_authority_event_present:true,verified_evidence_event_count:2,unverified_handoffs:0,
  transition_committed:false,executor_invoked:false,execution_authorized:false,installation_authorized:false,original_job_completed:false,production_changed:false,
  obligations:[{source_ref:job.source_ref,original_work_id:job.original_work_id,status:'CONTINUITY_OPEN_PENDING_PROOFS',source_proof_verified:true,
   continuity_identity_verified:true,original_work_universe_event_verified:true,qualifier_digest_verified:true,qualifier_receipt_sha256:hash('9'),
   unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED'],internal_maintenance_independent_frozen_ci_verified:false,
   original_claim_admitted:false,independent_original_outcome_verified:false,universe_return_verified:false,
   executor_authorized_by_observation:false,execution_permitted_by_handoff:false}]};
 let mismatch=false;
 const observed=create({env:scope,db,inspectionOnly:true,fetchImpl:async(address,options)=>{
  calls.push(String(address));
  if(String(address).endsWith('/reality_read_current_shift_execution_graph_v1'))return {ok:true,json:async()=>raw};
  if(String(address).endsWith('/reality_read_current_final_loop_proof_envelope_v1'))return {ok:true,json:async()=>proof};
  if(String(address).endsWith('/reality_read_final_loop_shared_continuity_guard_v1'))return {ok:true,json:async()=>mismatch?{...guard,continuity_head_sha256:hash('e')}:guard};
  return f.fetchImpl(address,options);
 }});
 assert.equal(observed.ready,true);
 assert.equal(observed.read_only,true);
 const r=await observed.readDirection({ownerId:owner,shiftId:shift});
 assert.equal(r.status,'GOVERNED_RELEASE_TARGET_QUALIFICATION_REQUIRED');
 assert.equal(r.authoritative_database,project);
 assert.equal(r.release_activated,false);
 assert.equal(r.target_runtime_database_independently_verified,false);
 await assert.rejects(()=>observed.assignAlias({}),/RELEASE_INSPECTION_MUTATION_FORBIDDEN/);
 assert.equal(f.calls.filter(x=>x.url.includes('/v2/deployments/')).length,0);
 const count=calls.length;
 assert.equal((await observed.readDirection({ownerId:owner,shiftId:owner})).status,'GOVERNED_RELEASE_AUTHORITATIVE_SHIFT_SCOPE_REQUIRED');
 assert.equal(calls.length,count);
 mismatch=true;
 const drift=await observed.readDirection({ownerId:owner,shiftId:shift});
 assert.equal(drift.status,'GOVERNED_RELEASE_CONTINUITY_SCOPE_NOT_VERIFIED');
 assert.equal(drift.release_activated,false);
});
