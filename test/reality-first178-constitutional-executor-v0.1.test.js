import test from 'node:test';
import assert from 'node:assert/strict';
import {executeFirst178Constitutional}
 from '../src/reality-first178-constitutional-executor-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const conversationId='22222222-2222-4222-8222-222222222222';
const queueId='33333333-3333-4333-8333-333333333333';
const claimId='44444444-4444-4444-8444-444444444444';
const work='work:'+'e'.repeat(32);
const scope={owner_id:owner,goal_id:'user-goal:customer-active',
 original_work_id:work,original_issue_number:178,
 goal_transition_receipt_ref:'55555555-5555-4555-8555-555555555555',
 continuity_root_id:'66666666-6666-4666-8666-666666666666',
 worldline_id:'77777777-7777-4777-8777-777777777777'};
const sha='a'.repeat(40),hash='b'.repeat(64);
const env={VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_REF:'feature/first178-live-single-claim-execution-20261029',
 VERCEL_GIT_COMMIT_SHA:sha,
 REALITY_STANDALONE_OPENAI_API_KEY:'fake-test-provider-secret-not-real',
 REALITY_SEMANTIC_REVIEW_MODEL:'gpt-6',
 REALITY_FIRST178_GITHUB_READ_TOKEN:'mock-only-github-read-token-not-real'};
const session={user_id:owner};
const queue={queue_id:queueId,phase:'QUEUED_DISCOVERY',
 original_work_id:work,goal_id:scope.goal_id,preview_release_sha:sha,
 dispatch_commit_sha:null,dispatched_at:null};
const provider={status:'INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED',
 original_work_id:work,goal_id:scope.goal_id,owner_id:owner,
 run_id:40962921090,evidence_hash:'c'.repeat(64),
 provider_receipt_ref:'github:actions:run:40962921090:job:123760052647'};
function kit(overrides={}){
 const calls=[];let didModel=0,verifiedWrite=false;
 const call=async(_db,name,args)=>{
  calls.push({name,args});
  if(name==='reality_read_governed_build_v1')
   return overrides.queue||queue;
  if(name==='reality_claim_governed_build_178_v1'){
   assert.equal(args.p_owner_id,owner);
   assert.equal(args.p_goal_id,scope.goal_id);
   assert.equal(args.p_original_work_id,work);
   return {claimed:true,claim_id:claimId,queue_id:queueId,
    original_work_id:work,installation_authorized:false};
  }
  if(name==='reality_record_governed_build_178_v1'){
   assert.equal(args.p_claim_id,claimId);
   assert.equal(args.p_original_work_id,work);
   assert.equal(args.p_checkpoint_hash,hash);
   assert.equal(args.p_phase,'AWAITING_OWNER_APPROVAL');
   assert.equal(verifiedWrite,true);
   return {recorded:true,queue_id:queueId,phase:args.p_phase,
    checkpoint_hash:hash,
    checkpoint_receipt_id:args.p_continuity_receipt_id};
  }
  throw Error('UNEXPECTED_DB_OPERATION_'+name);
 };
 const checkpointFactory=()=>({
  persistGap:async()=>({committed:true,receipt_id:'88888888-8888-4888-8888-888888888888'}),
  readBackGap:async()=>({verified:true,evidence_hash:provider.evidence_hash,
   provider_receipt_ref:provider.provider_receipt_ref}),
  persistCheckpoint:async state=>{
   assert.equal(state.scope.original_work_id,work);
   verifiedWrite=true;
   return {persisted:true,independent_readback_verified:true,
    checkpoint_hash:hash,original_work_id:work,
    continuity_receipt_id:'99999999-9999-4999-8999-999999999999'};
  },
 });
 const observer=async({scope:argScope,apiToken})=>{
  assert.equal(argScope.original_work_id,work);
  assert.equal(apiToken,env.REALITY_FIRST178_GITHUB_READ_TOKEN);
  return provider;
 };
 const admitted={proof:'OWNER_SCOPED_PROVIDER_GAP_DURABLY_READ_BACK',
  ticket:{original_work_id:work,goal_id:scope.goal_id},
  original_job_completed:false};
 const claimConfirmedGap=async({persistGap,readBackGap,reobserveProviderEvidence})=>{
  assert.deepEqual(await reobserveProviderEvidence(),provider);
  assert.equal((await persistGap()).committed,true);
  assert.equal((await readBackGap()).verified,true);
  return admitted;
 };
 const liveGeneration=async()=>({
  generateCandidate:async()=>{didModel++;},
  runIsolatedSandbox:async()=>{didModel++;},
 });
 const drive=async({admitted:input,adapters,verifiedGovernanceReleaseSha})=>{
  assert.equal(input,admitted);
  assert.equal(verifiedGovernanceReleaseSha,sha);
  assert.equal(adapters.registerAndReobserve,undefined);
  assert.equal(adapters.resumeOriginalWork,undefined);
  assert.equal(adapters.settleAndReobserve,undefined);
  assert.equal(typeof adapters.generation.generateCandidate,'function');
  assert.equal(typeof adapters.verifyIndependentReceipt,'function');
  await adapters.persistCheckpoint({scope:{original_work_id:work},
   head_hash:hash});
  return {status:'OWNER_APPROVAL_REQUIRED',
   state:{head_hash:hash,scope:{original_work_id:work},
    attempt_count:1,candidate:{artifact_hash:'d'.repeat(64)}},
   installation_authorized:false,capability_installed:false,
   original_job_completed:false};
 };
 return {calls,getModelCalls:()=>didModel,
  options:{session,conversationId,env,call,dbReader:()=>({url:'mock'}),
   scopeReader:async()=>scope,observer,checkpointFactory,
   claimConfirmedGap,liveGeneration,drive,...overrides}};
}
test('one owner-scoped claim resumes identical work and stops at installation approval',async()=>{
 const h=kit();
 const r=await executeFirst178Constitutional(h.options);
 assert.equal(r.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(r.owner_approval_required,true);
 assert.equal(r.original_work_id,work);
 assert.equal(r.checkpoint_hash,hash);
 assert.equal(r.verified_candidate_artifact_hash,'d'.repeat(64));
 assert.equal(r.installation_authorized,false);
 assert.equal(r.capability_installed,false);
 assert.equal(r.original_job_completed,false);
 assert.deepEqual(h.calls.map(x=>x.name),[
  'reality_read_governed_build_v1',
  'reality_claim_governed_build_178_v1',
  'reality_record_governed_build_178_v1']);
});
test('the ONE existing original #178 queue survives worker redeploy without requeue or altering pinned source',async()=>{
 const originalRelease='f57dc3b253824ad1edf5675cf5e6223097d50ff9';
 const recorded={...queue,preview_release_sha:originalRelease};
 const h=kit({queue:recorded});
 const result=await executeFirst178Constitutional(h.options);
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.original_work_id,work);
 const claim=h.calls.find(x=>x.name==='reality_claim_governed_build_178_v1');
 assert.ok(claim);
 assert.equal(claim.args.p_preview_release_sha,originalRelease);
 assert.equal(claim.args.p_original_work_id,work);
 assert.equal(claim.args.p_owner_id,owner);
 assert.equal(h.calls.filter(x=>x.name==='reality_claim_governed_build_178_v1').length,1);
 assert.equal(h.calls.some(x=>x.name==='reality_enqueue_governed_build_v1'),false);
 assert.equal(result.installation_authorized,false);
});
test('queue already running, foreign work or wrong preview can never invoke model',async()=>{
 for(const badQueue of [

  {...queue,original_work_id:'work:'+'b'.repeat(32)},
  {...queue,preview_release_sha:'f'.repeat(40)},
  {...queue,dispatch_commit_sha:'f'.repeat(40)}
 ]){
  const h=kit({queue:badQueue});
  await assert.rejects(executeFirst178Constitutional(h.options),
   /FIRST178_EXECUTION_OWNER_QUEUED_JOB_NOT_EXACTLY_CLAIMABLE/);
  assert.equal(h.calls.length,1);
 }
 const h=kit({env:{...env,VERCEL_ENV:'production'}});
 await assert.rejects(executeFirst178Constitutional(h.options),
  /FIRST178_EXECUTION_ISOLATED_RUNNER_NOT_CONFIGURED/);
 assert.equal(h.calls.length,0);
});
test('claimed original job resumes the only verified gap under exactly one recovery reservation',async()=>{
 const prior={
  phase:'GAP_CONFIRMED',attempt_count:0,head_hash:'c'.repeat(64),
  journal:[{kind:'GAP_CONFIRMED'}],candidate:null,
  scope:{original_work_id:work,goal_id:scope.goal_id},
 };
 const h=kit({
  queue:{...queue,phase:'RUNNING_CONSTITUTIONAL'},
  checkpointFactory:()=>({
   readLatestCheckpoint:async()=>({verified:true,
    original_work_id:work,checkpoint_hash:prior.head_hash,
    continuity_receipt_id:'99999999-9999-4999-8999-999999999999',
    state:prior}),
   persistGap:async()=>({committed:true,receipt_id:'88888888-8888-4888-8888-888888888888'}),
   readBackGap:async()=>({verified:true,evidence_hash:provider.evidence_hash,
    provider_receipt_ref:provider.provider_receipt_ref}),
   persistCheckpoint:async state=>({persisted:true,
    independent_readback_verified:true,checkpoint_hash:hash,
    original_work_id:work,continuity_receipt_id:'99999999-9999-4999-8999-999999999999'}),
  }),
  call:async(_db,name,args)=>{
   h.calls.push({name,args});
   if(name==='reality_read_governed_build_v1')
    return {...queue,phase:'RUNNING_CONSTITUTIONAL'};
   if(name==='reality_reserve_first178_gap_recovery_v1'){
    assert.equal(args.p_original_work_id,work);
    assert.equal(args.p_checkpoint_hash,prior.head_hash);
    return {recovery_reserved:true,
     recovery_reservation_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     claim_id:claimId,original_work_id:work,queue_id:queueId,
     continuity_receipt_id:'99999999-9999-4999-8999-999999999999',
     checkpoint_hash:prior.head_hash,installation_authorized:false};
   }
   if(name==='reality_record_governed_build_178_v1')return {
    recorded:true,phase:'AWAITING_OWNER_APPROVAL',queue_id:queueId,
    checkpoint_hash:hash,
    checkpoint_receipt_id:'99999999-9999-4999-8999-999999999999'};
   throw Error('UNEXPECTED_RECOVERY_RPC_'+name);
  },
  drive:async({resumeState,adapters})=>{
   assert.equal(resumeState,prior);
   const saved=await adapters.persistCheckpoint({
    scope:{original_work_id:work},head_hash:hash});
   assert.equal(saved.persisted,true);
   return {status:'OWNER_APPROVAL_REQUIRED',
    state:{head_hash:hash,scope:{original_work_id:work},
     attempt_count:1,candidate:{artifact_hash:'d'.repeat(64)}},
    installation_authorized:false,capability_installed:false,
    original_job_completed:false};
  },
 });
 const result=await executeFirst178Constitutional(h.options);
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.installation_authorized,false);
 assert.deepEqual(h.calls.map(x=>x.name),[
  'reality_read_governed_build_v1',
  'reality_reserve_first178_gap_recovery_v1',
  'reality_record_governed_build_178_v1']);
 assert.equal(h.calls.some(x=>x.name==='reality_claim_governed_build_178_v1'),false);
});
test('already claimed original #178 verifies existing generated candidate in sandbox only, never reclaims',async()=>{
 const proposal={
  phase:'CANDIDATE_READY',attempt_count:1,head_hash:'c'.repeat(64),
  journal:[{kind:'GAP_CONFIRMED'},{kind:'MODEL_CANDIDATE_PROPOSED'}],
  candidate:{artifact_hash:'d'.repeat(64)},scope:{original_work_id:work,goal_id:scope.goal_id}
 };
 let driveResumed=false;
 const h=kit({
  queue:{...queue,phase:'RUNNING_CONSTITUTIONAL'},
  checkpointFactory:()=>({
   readLatestCheckpoint:async()=>({verified:true,
    original_work_id:work,checkpoint_hash:proposal.head_hash,
    continuity_receipt_id:'99999999-9999-4999-8999-999999999999',
    state:proposal}),
   persistGap:async()=>({committed:true,receipt_id:'88888888-8888-4888-8888-888888888888'}),
   readBackGap:async()=>({verified:true,evidence_hash:provider.evidence_hash,
    provider_receipt_ref:provider.provider_receipt_ref}),
   persistCheckpoint:async()=>({persisted:true,
    independent_readback_verified:true,checkpoint_hash:hash,
    original_work_id:work,
    continuity_receipt_id:'99999999-9999-4999-8999-999999999999'}),
  }),
  call:async(_db,name,args)=>{
   h.calls.push({name,args});
   if(name==='reality_read_governed_build_v1')
    return {...queue,phase:'RUNNING_CONSTITUTIONAL'};
   if(name==='reality_reserve_first178_candidate_sandbox_v1'){
    assert.equal(args.p_candidate_hash,proposal.candidate.artifact_hash);
    assert.equal(args.p_checkpoint_hash,proposal.head_hash);
    return {recovery_reserved:true,
     sandbox_reservation_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     claim_id:claimId,original_work_id:work,queue_id:queueId,
     continuity_receipt_id:'99999999-9999-4999-8999-999999999999',
     checkpoint_hash:proposal.head_hash,
     candidate_hash:proposal.candidate.artifact_hash,
     installation_authorized:false};
   }
   if(name==='reality_record_governed_build_178_v1')return {
    recorded:true,phase:'AWAITING_OWNER_APPROVAL',queue_id:queueId,
    checkpoint_hash:hash,
    checkpoint_receipt_id:'99999999-9999-4999-8999-999999999999'};
   throw Error('UNEXPECTED_CANDIDATE_RPC_'+name);
  },
  drive:async({resumeState,adapters})=>{
   assert.equal(resumeState,proposal);
   driveResumed=true;
   const p=await adapters.persistCheckpoint({
    scope:{original_work_id:work},head_hash:hash});
   assert.equal(p.persisted,true);
   return {status:'OWNER_APPROVAL_REQUIRED',
    state:{head_hash:hash,scope:{original_work_id:work},
     attempt_count:1,candidate:{artifact_hash:'d'.repeat(64)}},
    installation_authorized:false,capability_installed:false,
    original_job_completed:false};
  },
 });
 const result=await executeFirst178Constitutional(h.options);
 assert.equal(driveResumed,true);
 assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.installation_authorized,false);
 assert.deepEqual(h.calls.map(x=>x.name),[
  'reality_read_governed_build_v1',
  'reality_reserve_first178_candidate_sandbox_v1',
  'reality_record_governed_build_178_v1']);
});
test('second model correction or candidate resumes the SAME original work once per verified checkpoint',async()=>{
 for(const phase of ['REPAIR_REQUIRED','CANDIDATE_READY']){
  const proposed={
   phase,attempt_count:phase==='REPAIR_REQUIRED'?1:2,
   head_hash:'c'.repeat(64),
   journal:[{kind:'GAP_CONFIRMED'},{kind:'MODEL_CANDIDATE_PROPOSED'},
    {kind:'SANDBOX_FAILED'}],
   candidate:{artifact_hash:'d'.repeat(64)},
   scope:{original_work_id:work,goal_id:scope.goal_id},
  };
  if(phase==='CANDIDATE_READY')proposed.journal.push({kind:'MODEL_CANDIDATE_PROPOSED'});
  const h=kit({
   queue:{...queue,phase:'RUNNING_CONSTITUTIONAL'},
   checkpointFactory:()=>({
    readLatestCheckpoint:async()=>({verified:true,original_work_id:work,
     checkpoint_hash:proposed.head_hash,
     continuity_receipt_id:'99999999-9999-4999-8999-999999999999',state:proposed}),
    persistGap:async()=>({committed:true,receipt_id:'88888888-8888-4888-8888-888888888888'}),
    readBackGap:async()=>({verified:true,evidence_hash:provider.evidence_hash,
     provider_receipt_ref:provider.provider_receipt_ref}),
    persistCheckpoint:async()=>({persisted:true,
     independent_readback_verified:true,checkpoint_hash:hash,
     original_work_id:work,
     continuity_receipt_id:'99999999-9999-4999-8999-999999999999'}),
   }),
   call:async(_db,name,args)=>{
    h.calls.push({name,args});
    if(name==='reality_read_governed_build_v1')return {...queue,phase:'RUNNING_CONSTITUTIONAL'};
    if(name==='reality_reserve_first178_continuation_step_v1'){
     assert.equal(args.p_phase,phase);
     assert.equal(args.p_attempt_count,proposed.attempt_count);
     assert.equal(args.p_original_work_id,work);
     assert.equal(args.p_checkpoint_hash,proposed.head_hash);
     assert.equal(args.p_checkpoint_receipt_id,'99999999-9999-4999-8999-999999999999');
     return {reserved_once:true,reservation_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      existing_claim_id:claimId,original_work_id:work,queue_id:queueId,
      checkpoint_receipt_id:'99999999-9999-4999-8999-999999999999',
      checkpoint_hash:proposed.head_hash,phase,
      attempt_count:proposed.attempt_count,installation_authorized:false};
    }
    if(name==='reality_record_governed_build_178_v1')return {
     recorded:true,phase:'AWAITING_OWNER_APPROVAL',queue_id:queueId,
     checkpoint_hash:hash,
     checkpoint_receipt_id:'99999999-9999-4999-8999-999999999999'};
    throw Error('UNEXPECTED_STAGE_CALL_'+name);
   },
   drive:async({resumeState,adapters})=>{
    assert.equal(resumeState,proposed);
    await adapters.persistCheckpoint({scope:{original_work_id:work},head_hash:hash});
    return {status:'OWNER_APPROVAL_REQUIRED',
     state:{head_hash:hash,scope:{original_work_id:work},
      candidate:{artifact_hash:'d'.repeat(64)}},
     installation_authorized:false,capability_installed:false,
     original_job_completed:false};
   },
  });
  const result=await executeFirst178Constitutional(h.options);
  assert.equal(result.status,'AWAITING_OWNER_APPROVAL');
  assert.deepEqual(h.calls.map(x=>x.name),[
   'reality_read_governed_build_v1',
   'reality_reserve_first178_continuation_step_v1',
   'reality_record_governed_build_178_v1']);
  assert.equal(h.calls.some(x=>x.name==='reality_claim_governed_build_178_v1'),false);
 }
});
test('claimed original job without independent checkpoint cannot reserve or rerun',async()=>{
 const h=kit({queue:{...queue,phase:'RUNNING_CONSTITUTIONAL'}});
 await assert.rejects(executeFirst178Constitutional(h.options),
  /FIRST178_EXECUTION_DURABLE_RECOVERY_READBACK_UNAVAILABLE/);
 assert.deepEqual(h.calls.map(x=>x.name),['reality_read_governed_build_v1']);
});
test('provider evidence failure stops BEFORE database claim',async()=>{
 const h=kit({observer:async()=>({status:'MODEL_SAYS_VERIFIED'})});
 await assert.rejects(executeFirst178Constitutional(h.options),
  /FIRST178_EXECUTION_PINNED_PROVIDER_GAP_INVALID/);
 assert.deepEqual(h.calls.map(x=>x.name),['reality_read_governed_build_v1']);
});
test('once the unique claim is consumed, a driver failure cannot retry or invent approval',async()=>{
 const h=kit({drive:async()=>{throw Error('INDEPENDENT_SANDBOX_PROVIDER_UNAVAILABLE')}});
 await assert.rejects(executeFirst178Constitutional(h.options),
  /INDEPENDENT_SANDBOX_PROVIDER_UNAVAILABLE/);
 assert.deepEqual(h.calls.map(x=>x.name),[
  'reality_read_governed_build_v1','reality_claim_governed_build_178_v1']);
});
