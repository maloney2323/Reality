import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrustedSignedWorkerReleaseControlPlaneAdapters as create,releaseFailureReceipt,requestReleaseProviderJson,verifiedVercelDeploymentReadiness,decideProviderRecoveryContinuation}
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
 }),/RELEASE_CONTROL_PROVIDER_READ_OR_EFFECT_UNAVAILABLE/);
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

test('provider read errors retain actual status, operation and bounded next action without secrets',async()=>{
 const cases=[[401,'AUTHENTICATION_REJECTED','VERIFY_BOUND_PROVIDER_CREDENTIAL'],
 [403,'ACCESS_DENIED','VERIFY_PROVIDER_TOKEN_SCOPE_AND_RESOURCE_ACCESS'],
 [404,'RESOURCE_NOT_FOUND_OR_HIDDEN','VERIFY_RESOURCE_ID_AND_PROVIDER_ACCESS'],
 [429,'RATE_LIMITED','WAIT_FOR_PROVIDER_RATE_LIMIT_RESET'],
 [503,'PROVIDER_SERVER_ERROR','RECHECK_PROVIDER_READ_CONNECTIVITY']];
 for(const [status,classification,next] of cases){
  let bodyRead=false;
  const fetchImpl=async()=>({ok:false,status,json:async()=>{bodyRead=true;return {token:'SECRET_PROVIDER_BODY'}}});
  const adapter=create({env,db,fetchImpl});
  await assert.rejects(()=>adapter.observeAlias(alias),error=>{
   const failure=releaseFailureReceipt(error);
   assert.equal(failure.operation,'VERCEL_ALIAS_READ');
   assert.equal(failure.http_status,status);
   assert.equal(failure.classification,classification);
   assert.equal(failure.next_governed_action,next);
   assert.equal(failure.access_denied,status===403);
   assert.equal(failure.credential_rejected,status===401);
   assert.equal(failure.automatic_replay_permitted,false);
   assert.equal(failure.credential_values_exposed,false);
   assert.equal(adapter.readLastProviderFailure(),failure);
   assert.equal(JSON.stringify(failure).includes('SECRET'),false);
   return true;
  });
  assert.equal(bodyRead,false);
 }
});
test('HTTP success is not a verified identity; only mismatched field names are returned',async()=>{
 const adapter=create({env,db,fetchImpl:async()=>({ok:true,status:200,
  json:async()=>({alias,projectId:'foreign-project',deploymentId:deploymentId,secret:'SECRET_PROVIDER_BODY'})})});
 await assert.rejects(()=>adapter.observeAlias(alias),error=>{
  const f=releaseFailureReceipt(error);
  assert.equal(f.http_status,200);
  assert.equal(f.identity_matches,false);
  assert.deepEqual(f.mismatched_fields,['project_id']);
  assert.equal(f.next_governed_action,'RECONCILE_EXPECTED_PROVIDER_IDENTITY');
  assert.equal(JSON.stringify(f).includes('foreign-project'),false);
  return true;
 });
});
test('provider effect failure never authorizes replay and raw errors are not exposed',async()=>{
 await assert.rejects(()=>requestReleaseProviderJson(async()=>{throw Error('SECRET_PROVIDER_EXCEPTION')},
  'https://example.invalid',{method:'POST'},'VERCEL_ALIAS_ASSIGN'),error=>{
   const f=releaseFailureReceipt(error);
   assert.equal(f.http_status,null);
   assert.equal(f.effect_reconciliation_required,true);
   assert.equal(f.automatic_replay_permitted,false);
   assert.equal(f.next_governed_action,'RECONCILE_EXACT_EFFECT_WITHOUT_REPLAY');
   assert.equal(error.message.includes('SECRET'),false);
   return true;
  });
 await assert.rejects(()=>requestReleaseProviderJson(async()=>{const e=new Error('SECRET');e.name='TimeoutError';throw e},
  'https://example.invalid',{method:'GET'},'SUPABASE_BRANCH_READ'),error=>{
   assert.equal(releaseFailureReceipt(error).classification,'TIMEOUT');return true;
  });
});

test('Vercel readiness follows the documented field and fails closed on contradictions',()=>{
 for(const [value,expected] of [
  [{readyState:'READY'},'READY'],[{state:'READY'},'READY'],
  [{state:'READY',readyState:'READY'},'READY'],
  [{readyState:'BUILDING'},'BUILDING'],[{readyState:'ERROR'},'ERROR'],
  [{state:'READY',readyState:'BUILDING'},null],
  [{state:'ERROR',readyState:'READY'},null],
  [{state:'READY',readyState:null},null],[{},null],[null,null],
  [{readyState:'ready'},null],[{readyState:true},null]
 ])assert.equal(verifiedVercelDeploymentReadiness(value),expected);
});
test('active alias verification accepts documented readyState, rejects non-ready or conflicting fields',async()=>{
 for(const [readiness,accepted] of [
  [{readyState:'READY'},true],[{state:'READY'},true],
  [{readyState:'READY',state:'READY'},true],[{},false],
  [{readyState:'BUILDING'},false],[{readyState:'ERROR'},false],
  [{readyState:'READY',state:'ERROR'},false]
 ]){
  let reads=0;
  const adapter=create({env,db,fetchImpl:async address=>{
   reads++;const data=String(address).includes('/v4/aliases/')?
    {alias,projectId:env.REALITY_VERIFIED_VERCEL_PROJECT_ID,deploymentId}:
    {id:deploymentId,project:{id:env.REALITY_VERIFIED_VERCEL_PROJECT_ID},target:null,
     meta:{githubOrg:'example-org',githubRepo:'example-repo',githubCommitSha:sha,githubCommitRef:branch},...readiness};
   return {ok:true,status:200,json:async()=>data};
  }});
  if(accepted)assert.equal((await adapter.observeAlias(alias)).resolved_release_sha,sha);
  else await assert.rejects(()=>adapter.observeAlias(alias),e=>{
   assert.deepEqual(releaseFailureReceipt(e).mismatched_fields,['ready_state']);return true;
  });
  assert.equal(reads,2);
 }
});

test('GitHub provider renewal routing is cause-aware, fail-closed and secret-free',async()=>{
 const cases=[
  [401,{},true,'BOUND_CREDENTIAL_REJECTED_CAUSE_UNVERIFIED','VERIFY_ISSUER_SCOPE_AND_RENEWAL_AUTHORITY'],
  [401,{},false,'ANONYMOUS_READ_REJECTED','VERIFY_EXPLICIT_READ_POLICY'],
  [403,{'x-github-sso':'required; url=https://example.invalid/secret-material'},true,'ORGANIZATION_SSO_AUTHORIZATION_REQUIRED','REQUEST_EXACT_REAUTHORIZATION'],
  [403,{'x-ratelimit-remaining':'0'},true,'PROVIDER_RATE_LIMIT_OBSERVED','SUSPEND_UNTIL_PROVIDER_RECHECK'],
  [429,{},true,'PROVIDER_RATE_LIMIT_OBSERVED','SUSPEND_UNTIL_PROVIDER_RECHECK'],
  [403,{},true,'RESOURCE_ACCESS_OR_SCOPE_UNVERIFIED','VERIFY_REPOSITORY_PERMISSION_AND_SSO'],
  [404,{},true,'RESOURCE_ACCESS_OR_SCOPE_UNVERIFIED','VERIFY_REPOSITORY_PERMISSION_AND_SSO'],
  [503,{},true,'PROVIDER_SERVER_FAILURE','SUSPEND_UNTIL_PROVIDER_RECHECK']
 ];
 for(const [status,headers,auth,cause,route] of cases){
  let count=0;
  const fetchImpl=async()=>{count++;return {ok:false,status,headers:new Headers(headers),json:async()=>{throw Error('body must not be read')}}};
  try{
   await requestReleaseProviderJson(fetchImpl,'https://api.github.com/repos/example-org/example-repo/actions/runs/1',
    {method:'GET',headers:auth?{Authorization:'Bearer secret-material'}:{}},'GITHUB_LIFECYCLE_CI_READ');
   assert.fail('must fail');
  }catch(e){
   const receipt=releaseFailureReceipt(e);
   assert.equal(receipt.connection_recovery.cause,cause);
   assert.equal(receipt.connection_recovery.route,route);
   const eligibility={
    BOUND_CREDENTIAL_REJECTED_CAUSE_UNVERIFIED:'REQUIRES_VERIFIED_ISSUER_CAUSE_AND_AUTHORITY',
    ORGANIZATION_SSO_AUTHORIZATION_REQUIRED:'REAUTHORIZATION_ONLY',
    RESOURCE_ACCESS_OR_SCOPE_UNVERIFIED:'SCOPE_OR_AUTHORITY_REVIEW_ONLY'
   }[cause]??'NO_CREDENTIAL_REPLACEMENT';
   assert.equal(receipt.connection_recovery.renewal_eligibility,eligibility);
   assert.equal(receipt.connection_recovery.evidence_signal,
    cause==='ORGANIZATION_SSO_AUTHORIZATION_REQUIRED'?'HTTP_STATUS_AND_SSO_REQUIRED_HEADER':
    headers['x-ratelimit-remaining']==='0'?'HTTP_STATUS_AND_RATE_LIMIT_REMAINING_ZERO':'HTTP_STATUS');
   assert.equal(receipt.connection_recovery.renewal_permitted,false);
   assert.equal(receipt.connection_recovery.automatic_retry_permitted,false);
   assert.equal(receipt.connection_recovery.preserve_current_binding,true);
   assert.equal(receipt.connection_recovery.effect_replay_permitted,false);
   assert.equal(JSON.stringify(receipt).includes('secret-material'),false);
   assert.equal(count,1);
  }
 }
});

test('integrated provider recovery contract fails closed across every missing or mismatched proof',()=>{
 const now=1700000000000;
 const h=x=>'sha256:'+x.repeat(64);
 const scope={checkpoint_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',checkpoint_receipt_sha256:h('a'),
  idempotency_key:h('b'),connection_id:'GITHUB_RELEASE_CI_READ:example-org/example-repo',
  owner_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',shift_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',
  original_work_id:'work:'+'d'.repeat(32),continuity_root_id:'dddddddd-dddd-4ddd-dddd-dddddddddddd',
  continuity_revision:3,continuity_head_sha256:h('c')};
 const checkpoint={...scope,status:'PROVIDER_CHECKPOINT_DURABLE_READBACK',current_revision_matches:true,
  receipt_sha256:h('a'),renewal_eligibility:'REQUIRES_VERIFIED_ISSUER_CAUSE_AND_AUTHORITY'};
 const proof=(source,hash,extra={})=>({...scope,source,receipt_sha256:h(hash),independently_verified:true,observed_at_ms:now-1000,...extra});
 const authority=proof('INDEPENDENT_PROVIDER_RENEWAL_AUTHORITY_READBACK','d',{
  cause:'EXPIRED_RENEWABLE_CREDENTIAL',issuer_kind:'GITHUB_APP_INSTALLATION',installation_id:123,
  scope:'EXACT_REPOSITORY_ACTIONS_READ_ONLY',scope_escalation:false,provider_managed_binding_verified:true,
  atomic_pointer_capability_verified:true,obligation_freeze_verified:true,recovery_budget_preserved:true,
  circuit_state:'CLOSED',renewal_attempt_available:true,active_binding_id_sha256:h('e')});
 const lease=proof('INDEPENDENT_PROVIDER_SHADOW_LEASE_READBACK','f',{
  authority_receipt_sha256:authority.receipt_sha256,scope:authority.scope,installation_id:123,
  shadow_only:true,active_binding_id_sha256:h('e'),shadow_binding_id_sha256:h('1'),
  lease_id:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',issuer_run_id:'ffffffff-ffff-4fff-ffff-ffffffffffff',expires_at_ms:now+60000});
 const verification=proof('INDEPENDENT_PROVIDER_SHADOW_VERIFIER_READBACK','2',{
  lease_id:lease.lease_id,lease_receipt_sha256:lease.receipt_sha256,shadow_binding_id_sha256:h('1'),
  exact_repository_and_ci_access_verified:true,no_write_scope_verified:true,
  verifier_run_id:'11111111-1111-4111-8111-111111111111'});
 const activation=proof('INDEPENDENT_PROVIDER_ACTIVE_BINDING_READBACK','3',{
  lease_id:lease.lease_id,verification_receipt_sha256:verification.receipt_sha256,
  previous_binding_id_sha256:h('e'),active_binding_id_sha256:h('1'),atomic_compare_and_swap_verified:true});
 const trigger=proof('INDEPENDENT_EXISTING_GOVERNED_TRIGGER_READBACK','4',{
  activation_receipt_sha256:activation.receipt_sha256,atomic_claim_verified:true,same_original_obligation:true,
  recovery_budget_preserved:true,claim_id:'22222222-2222-4222-8222-222222222222'});
 const settlement=proof('INDEPENDENT_CONTINUITY_RECOVERY_RECONCILIATION','5',{
  trigger_receipt_sha256:trigger.receipt_sha256,claim_id:trigger.claim_id,lifecycle_reconciled:true,
  same_original_continuation_observed:true,duplicate_effect_absent:true,original_job_completed:false});
 const stages=[
  [{checkpoint:{...checkpoint,current_revision_matches:false}},'PROVIDER_RECOVERY_CHECKPOINT_NOT_CURRENT'],
  [{checkpoint:{...checkpoint,renewal_eligibility:'NO_CREDENTIAL_REPLACEMENT'}},'PROVIDER_RECOVERY_NON_RENEWABLE_ROUTE'],
  [{checkpoint},'PROVIDER_RECOVERY_EXACT_AUTHORITY_REQUIRED'],
  [{checkpoint,authority:{...authority,circuit_state:'OPEN'}},'PROVIDER_RECOVERY_EXACT_AUTHORITY_REQUIRED'],
  [{checkpoint,authority},'PROVIDER_RECOVERY_SHADOW_LEASE_REQUIRED'],
  [{checkpoint,authority,lease:{...lease,expires_at_ms:now-1}},'PROVIDER_RECOVERY_SHADOW_LEASE_REQUIRED'],
  [{checkpoint,authority,lease:{...lease,original_work_id:'work:'+'e'.repeat(32)}},'PROVIDER_RECOVERY_SHADOW_LEASE_REQUIRED'],
  [{checkpoint,authority,lease},'PROVIDER_RECOVERY_INDEPENDENT_VERIFICATION_REQUIRED'],
  [{checkpoint,authority,lease,verification:{...verification,verifier_run_id:lease.issuer_run_id}},'PROVIDER_RECOVERY_INDEPENDENT_VERIFICATION_REQUIRED'],
  [{checkpoint,authority,lease,verification},'PROVIDER_RECOVERY_ATOMIC_ACTIVATION_REQUIRED'],
  [{checkpoint,authority,lease,verification,activation:{...activation,atomic_compare_and_swap_verified:false}},'PROVIDER_RECOVERY_ATOMIC_ACTIVATION_REQUIRED'],
  [{checkpoint,authority,lease,verification,activation},'PROVIDER_RECOVERY_EXISTING_TRIGGER_CLAIM_REQUIRED'],
  [{checkpoint,authority,lease,verification,activation,trigger:{...trigger,idempotency_key:h('9')}},'PROVIDER_RECOVERY_EXISTING_TRIGGER_CLAIM_REQUIRED'],
  [{checkpoint,authority,lease,verification,activation,trigger},'PROVIDER_RECOVERY_RECONCILIATION_REQUIRED'],
  [{checkpoint,authority,lease,verification,activation,trigger,settlement},'PROVIDER_RECOVERY_CONTINUATION_RECEIPTS_RECONCILED']
 ];
 for(const [input,status] of stages){
  const r=decideProviderRecoveryContinuation({...input,now});
  assert.equal(r.status,status);
  assert.equal(r.credential_mutation_authorized,false);
  assert.equal(r.dispatch_permitted,false);
  assert.equal(r.original_job_completed,false);
 }
});
