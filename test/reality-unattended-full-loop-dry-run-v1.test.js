// Unattended original-job integration. ALL provider traffic is simulated,
// including the owner approval, GitHub install, acceptance, and settlement.
// This tests actual orchestration and state-machine code without spending
// a real customer's authority or modifying any live Supabase/GitHub records.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createLiveGeneralRepairService}
 from '../src/reality-live-approved-install-to-settlement-v1.0.js';
import {executeApprovedContinuation}
 from '../scripts/reality-approved-repair-background-worker-v1.mjs';
import {continueGovernedSelfImprovement}
 from '../src/reality-governed-self-improvement-driver-v1.0.js';
import {readOriginalLoopCompletion}
 from '../src/reality-original-loop-completion-proof-v1.0.js';
import {createGovernedSelfImprovement,acceptGovernedObservation,
 proposeGovernedCandidate}
 from '../src/reality-governed-self-improvement-spine-v1.0.js';
const digest=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const hash=x=>digest(JSON.stringify(stable(x)));
const project='hvkfreoagbrphwghjajw';
const url='https://'+project+'.supabase.co';
const original='work:9b9578b3c65427589c4c6da68fe0fc87';
const issueNumber=178;
const installBranch='feature/reality-closed-loop-worker-20261031';
const backgroundBranch='feature/reality-background-continuation-20261031';
const workerSha='a'.repeat(40),baseline='b'.repeat(40);
const installedSha='c'.repeat(40),frozenHash='d'.repeat(64);
const modelRun=41217870164;
const files=[{path:'src/reality-extensions/unattended-proof.mjs',
 content:'export const corrected = true;'},
 {path:'test/reality-extensions/unattended-proof.test.mjs',
 content:'import test from "node:test";test("automated",()=>{});'}];
const artifact=hash(files);
const executor='github:actions:run:600001:job:600002',outcomeHash=digest('provider:original:'+executor);
const sourceId=randomUUID(),checkpointId=randomUUID(),outcomeId=randomUUID();
const reservationId=randomUUID(),leaseId=randomUUID();
const owner=randomUUID(),conversation=randomUUID(),transition=randomUUID();
const goal='verified:unattended:original-owner-goal';
const root='root:isolated:simulated',worldline='worldline:isolated:simulated';
const session={user_id:owner,config:{url}};
const env={
 GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',
 GITHUB_REPOSITORY:'maloney2323/Reality',
 GITHUB_REF:'refs/heads/'+backgroundBranch,GITHUB_SHA:workerSha,
 REALITY_BACKGROUND_REPAIR_WORKER_ENABLED:'true',
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:installBranch,
 VERCEL_GIT_COMMIT_SHA:workerSha,
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 SUPABASE_SERVICE_ROLE_KEY:'synthetic-not-a-real-supabase-secret-value',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'synthetic-not-a-real-github-token-value',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_synthetic_fixture',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'synthetic-session-seal-for-test-only',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'synthetic-not-a-real-supabase-secret-value',
};
const source={
 event_id:sourceId,
 entity_type:'personal_first_self_upgrade_customer_work',
 event_kind:'WORK',epistemic_status:'OBSERVED',
 continuity_root_id:root,worldline_id:worldline,
 provenance:{principal_id:owner,conversation_id:conversation},
 payload:{original_work_id:original,issue_number:178,original_goal_id:goal,
  goal_transition_receipt_ref:transition,
  installation_authorized:false,original_job_completed:false},
};
const scope={owner_id:owner,goal_id:goal,original_work_id:original,
 goal_transition_receipt_ref:transition,
 goal_evidence_ref:'supabase:simulated:owner-message',
 continuity_root_id:root,worldline_id:worldline,
 target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:non-production-synthetic-policy'};
const verified=async ({scope_hash,receipt})=>({
 verified:true,independent_provider_readback:true,
 original_work_id:original,scope_hash,
 evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
 attestation_ref:'simulated:independent-provider-readback',
});
async function initialState(){
 let current=createGovernedSelfImprovement({scope});
 const common=(kind,extra={})=>({
  kind,owner_id:owner,goal_id:goal,original_work_id:original,
  continuity_root_id:root,worldline_id:worldline,
  evidence_ref:'simulated:independent:'+kind,
  evidence_hash:digest('simulated-evidence:'+kind),...extra,
 });
 current=await acceptGovernedObservation(current,common('GAP_CONFIRMED',{
  capability_id:'reality:missing-original-provider-evidence',
  failure_refs:['github:issue/178','github:actions/runs/40962921090'],
  verification_suite_ref:'frozen:sha256:'+frozenHash,
 }),{verifyProvider:verified});
 current=proposeGovernedCandidate(current,{
  files,rationale:'Simulated model source requires independent validation',
  verification_plan_ref:'simulated:frozen:regression',
  model_response_ref:'resp_simulated_no_live_model_output',
 });
 assert.equal(current.candidate.artifact_hash,artifact);
 current=await acceptGovernedObservation(current,common('SANDBOX_VERIFIED',{
  artifact_hash:artifact,independent_tests_passed:true,
  frozen_regression_passed:true,governance_preserved:true,
  verifier_run_ref:'github:actions:run:'+modelRun,
 }),{verifyProvider:verified});
 assert.equal(current.phase,'AWAITING_OWNER_APPROVAL');
 return current;
}
function factory({simulatedApproval=true,simulatedAcceptance=true}={}){
 let state,approval=null,queue=null,installCount=0,dispatchCount=0;
 let acceptanceChecks=0,settlementCount=0;
 const audit=[];
 const proof={independently_verified:true,original_failed_run_id:40962921090,
  original_source_sha:baseline,issue_number:issueNumber,
  candidate_artifact_sha256:artifact,review_commit_sha:baseline,
  verified_sandbox_run_id:modelRun,model_source_run_id:41217180993,
  frozen_test_sha256:frozenHash,model_response_id:'resp_simulated',
  files,independent_sandbox:{log_sha256:digest('simulated-sandbox')}};
 const listWork=async()=>({jobs:[{
  original_work_id:original,issue_url:'https://github.com/maloney2323/Reality/issues/178',
  state:'REAL_SOURCE_BACKED_REPAIR_PENDING',goal_still_current:true,
  job_completed:false,original_provider_failed_run_id:proof.original_failed_run_id,
  original_source_sha:proof.original_source_sha,
  frozen_test_path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
  frozen_test_sha256:proof.frozen_test_sha256,
  source_receipt_id:sourceId,conversation_id:conversation,
 }]});
 const readGoal=async()=>({principal_id:owner,conversation_id:conversation,
  state:{active_goal_id:goal,active_goal:{goal_id:goal,
   status:'ACTIVE',user_confirmed:true,
   last_transition_receipt_id:transition}}});
 const checkpointFactory=()=>({
  readLatestCheckpoint:async()=>({state,
   checkpoint_receipt_id:checkpointId,independent_readback_verified:true}),
  persistCheckpoint:async next=>{
   state=next;
   audit.push('CONSTITUTIONAL_CHECKPOINT_'+state.phase);
   return {persisted:true,independent_readback_verified:true,
    checkpoint_receipt_id:checkpointId,checkpoint_hash:next.head_hash,
    original_work_id:original};
  },
  readCheckpoint:async next=>({persisted:true,
   independent_readback_verified:next.head_hash===state.head_hash,
   checkpoint_receipt_id:checkpointId,checkpoint_hash:next.head_hash,
   original_work_id:original}),
 });
 const response=(data,ok=true)=>({ok,json:async()=>data});
 const provider=async (target,opts={})=>{
  const parsed=new URL(target);
  if(parsed.origin==='https://api.github.com'){
   assert.equal(opts.method,'GET');
   assert.ok(parsed.pathname.endsWith('/git/ref/heads/'+installBranch));
   return response({object:{sha:baseline}});
  }
  assert.equal(parsed.origin,url,'No network access to live providers');
  if(parsed.pathname==='/rest/v1/universe_events'){
   assert.equal(opts.method,'GET');
   const type=parsed.searchParams.get('entity_type');
   if(type?.startsWith('in.'))return response([source]);
   if(type==='eq.reality_generic_verified_original_work_outcome')
    return response(approval?.status==='SETTLED'?[{
     event_id:outcomeId,entity_type:'reality_generic_verified_original_work_outcome',
     event_kind:'OBSERVATION',epistemic_status:'VERIFIED',
     continuity_root_id:root,worldline_id:worldline,
     payload:{owner_id:owner,original_work_id:original,outcome:'SUCCEEDED',
      independent_outcome_verified:true,production_changed:false,
      installed_artifact_hash:artifact,installed_commit_sha:installedSha,
      original_executor_run_ref:executor},
    }]:[]);
   if(type==='eq.reality_general_constitutional_checkpoint')
    return response(approval?.status==='SETTLED'?[{
     event_id:checkpointId,entity_type:'reality_general_constitutional_checkpoint',
     event_kind:'WORK',epistemic_status:'OBSERVED',
     continuity_root_id:root,worldline_id:worldline,
     payload:{owner_id:owner,original_work_id:original,
      constitutional_phase:'SETTLED',original_job_completed:true,
      driver_state:{phase:'SETTLED',candidate:{artifact_hash:artifact},
       settlement:{settlement_receipt_ref:'supabase:universe_events:'+outcomeId}}},
    }]:[]);
   throw Error('UNEXPECTED_SIMULATED_DB_READ '+type);
  }
  assert.ok(parsed.pathname.startsWith('/rest/v1/rpc/'));
  const name=parsed.pathname.split('/').at(-1);
  const body=JSON.parse(opts.body||'{}');
  if(name==='reality_read_general_repair_progress_v2')
   return response(approval?{...approval}: {status:'NOT_APPROVED'});
  if(name==='reality_authorize_general_repair_install_v2'){
   assert.equal(body.p_owner_id,owner);
   assert.equal(body.p_original_work_id,original);
   assert.equal(body.p_candidate_hash,artifact);
   assert.equal(body.p_frozen_test_sha256,frozenHash);
   if(!simulatedApproval)throw Error('NO_OWNER_APPROVAL');
   audit.push('SIMULATED_OWNER_AUTHORIZED_EXACT_ARTIFACT');
   approval={status:'RESERVED',reservation_id:reservationId,
    owner_id:owner,conversation_id:conversation,
    original_work_id:original,original_work_event_id:sourceId,
    goal_id:goal,goal_transition_event_id:transition,
    candidate_hash:artifact,frozen_test_sha256:frozenHash,
    checkpoint_hash:body.p_checkpoint_hash,
    checkpoint_receipt_id:checkpointId,
    review_commit_sha:baseline,verifier_run_id:modelRun,
    consumed_once:false,install_branch:null,installed_commit_sha:null};
   return response({...approval});
  }
  if(name==='reality_claim_general_repair_install_v1'){
   assert.equal(body.p_reservation_id,reservationId);
   assert.equal(approval?.status,'RESERVED');
   audit.push('SINGLE_USE_OWNER_APPROVAL_CLAIMED');
   approval.status='CLAIMED';approval.consumed_once=true;
   return response({claimed:true,consumed_once:true,reservation_id:reservationId});
  }
  if(name==='reality_enqueue_approved_repair_continuation_v1'){
   assert.equal(approval?.status,'CLAIMED');
   assert.equal(body.p_original_work_id,original);
   assert.equal(body.p_reservation_id,reservationId);
   queue={status:'PENDING',owner_id:owner,conversation_id:conversation,
    reservation_id:reservationId,original_work_id:original,
    candidate_hash:artifact,issue_number:178,install_branch:body.p_install_branch};
   audit.push('DURABLE_BACKGROUND_WORK_QUEUED');
   return response({queued:true,status:'PENDING',reservation_id:reservationId,
    original_work_id:original,installation_authorized:true,
    production_changed:false});
  }
  if(name==='reality_mark_general_repair_installed_v1'){
   assert.equal(body.p_commit_sha,installedSha);
   assert.equal(approval?.status,'CLAIMED');
   approval.status='INSTALLED';approval.installed_commit_sha=installedSha;
   approval.install_branch=installBranch;
   audit.push('SYNTHETIC_PREVIEW_SOURCE_INSTALLED');
   return response({verified:true,installed_commit_sha:installedSha});
  }
  if(name==='reality_mark_general_repair_settled_v1'){
   assert.equal(approval?.status,'INSTALLED');
   assert.equal(body.p_original_outcome_event_id,outcomeId);
   assert.equal(body.p_final_checkpoint_event_id,checkpointId);
   approval.status='SETTLED';
   audit.push('SIMULATED_DURABLE_SETTLEMENT_RECONCILED');
   return response({status:'SETTLED',reservation_id:reservationId,
    original_work_id:original,installed_commit_sha:installedSha,
    original_outcome_receipt_ref:'supabase:universe_events:'+outcomeId,
    independent_outcome_verified:true,original_job_completed:true,
    production_changed:false});
  }
  throw Error('UNEXPECTED_DB_RPC_'+name);
 };
 const verifierFactory=()=>({
  inspectInstalled:async({installed})=>{
   assert.equal(installed.original_work_id,original);
   assert.equal(installed.installed_commit_sha,installedSha);
   assert.equal(installed.artifact_hash,artifact);
   return {verified:true,independent_provider_readback:true};
  },
  observeOriginalRun:async ({originalWorkId,installedCommitSha})=>{
   acceptanceChecks++;
   assert.equal(originalWorkId,original);
   assert.equal(installedCommitSha,installedSha);
   if(!simulatedAcceptance)return {
    status:'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE',
    complete:false,original_work_id:original,production_changed:false};
   audit.push('SIMULATED_INDEPENDENT_ORIGINAL_FROZEN_ACCEPTANCE');
   return {status:'VERIFIED_ORIGINAL_INSTALLED_WORK',
    complete:true,independent_provider_readback:true,
    original_frozen_tests_passed:true,governance_tests_passed:true,
    original_work_id:original,installed_commit_sha:installedSha,
    original_work_run_ref:executor,evidence_hash:outcomeHash,
    observed_outcome:'SUCCEEDED',real_execution_observed:true,
    production_changed:false,provider_run_id:600001,provider_job_id:600002};
  },
 });
 const installer=async({ticket,candidate,approval:receipt,verifyOwnerApproval})=>{
  installCount++;
  assert.equal(installCount,1,'single simulated installation');
  assert.equal(ticket.original_work_id,original);
  assert.equal(candidate.artifact_hash,artifact);
  assert.equal(receipt.kind,'PROMOTION_AUTHORIZED');
  const verified=await verifyOwnerApproval({
   original_work_id:original,artifact_hash:artifact,
   reservation_ref:receipt.reservation_ref});
  assert.equal(verified.verified,true);
  assert.equal(verified.consumed_once,true);
  return {kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',
   original_work_id:original,owner_id:owner,goal_id:goal,
   artifact_hash:artifact,installed_commit_sha:installedSha,
   installed_branch:installBranch,
   provider_bytes_readback_verified:true,
   provider_source_files:files.map(f=>f.path),
   production_changed:false};
 };
 const continuation=async ({state:given,persistCheckpoint})=>{
  const common=(kind,rest={})=>({
   kind,owner_id:owner,goal_id:goal,original_work_id:original,
   continuity_root_id:root,worldline_id:worldline,
   evidence_ref:'simulated:evidence:'+kind,
   evidence_hash:digest('simulated:'+kind),...rest});
  return continueGovernedSelfImprovement({
   state:given,maxTransitions:4,
   adapters:{
    persistCheckpoint,
    verifyIndependentReceipt:verified,
    registerAndReobserve:async ctx=>{
     assert.equal(ctx.phase,'PROMOTION_AUTHORIZED');
     audit.push('SIMULATED_CAPABILITY_REGISTERED');
     return common('CAPABILITY_REGISTERED',{
      artifact_hash:artifact,
      authorization_ref:given.promotion_authorization.evidence_ref,
      status:'ACTIVE',verified:true,registry_receipt_ref:
       'supabase:universe_capabilities:'+randomUUID(),
      target_worldline_id:worldline,installed_commit_sha:installedSha});
    },
    resumeOriginalWork:async ctx=>{
     assert.equal(ctx.phase,'CAPABILITY_REGISTERED');
     audit.push('SIMULATED_ORIGINAL_JOB_RESUMED');
     return common('ORIGINAL_JOB_RESUMED',{
      registration_ref:ctx.registration.registry_receipt_ref,
      real_execution_observed:true,executor_run_ref:executor,
      independent_provider_readback:true,evidence_hash:outcomeHash,
      installed_commit_sha:installedSha,
     });
    },
    settleAndReobserve:async ctx=>{
     assert.equal(ctx.phase,'ORIGINAL_JOB_RESUMED');
     assert.equal(ctx.resumption.executor_run_ref,executor);
     settlementCount++;
     audit.push('SIMULATED_ORIGINAL_JOB_SETTLED');
     return common('ORIGINAL_JOB_SETTLED',{
      resumption_ref:executor,
      settlement_receipt_ref:'supabase:universe_events:'+outcomeId,
      durable_settlement_readback:true,
      independent_outcome_verified:true});
    },
   },
  });
 };
 const buildService=(sess=session,runtime=env)=>
  createLiveGeneralRepairService({session:sess,env:runtime,
   fetchImpl:provider,listWork,readGoal,
   readCandidate:async()=>proof,
   checkpointFactory,verifierFactory,installer,continuation,
   dispatchApproved:async req=>{
    dispatchCount++;assert.equal(req.originalWorkId,original);
    assert.equal(req.candidateHash,artifact);
    assert.equal(req.reservationId,reservationId);
    audit.push('SIMULATED_INERT_GITHUB_DISPATCH');
    return {dispatched:true,production_changed:false,
     worker_workflow_url:'https://github.com/maloney2323/Reality/actions/workflows/reality-approved-repair-background-v1.yml'};
   }});
 const call=async(runtime,name,input)=>{
  if(name==='reality_lease_exact_approved_repair_v2'){
   if(queue?.status!=='PENDING')return {status:'NO_APPROVED_WORK'};
   assert.equal(input.p_reservation_id,reservationId);
   assert.equal(input.p_install_branch,installBranch);
   queue.status='LEASED';
   audit.push('BACKGROUND_WORKER_LEASED_EXACT_OWNER_WORK');
   return {status:'EXACT_OWNER_APPROVED_WORK_LEASED',reservation_id:reservationId,
    lease_id:leaseId,owner_id:owner,conversation_id:conversation,
    original_work_id:original,candidate_hash:artifact,
    install_branch:installBranch,issue_number:178,attempts:1};
  }
  if(name==='reality_reconcile_approved_repair_continuation_v1'){
   assert.equal(input.p_reservation_id,reservationId);
   assert.equal(input.p_lease_id,leaseId);
   assert.equal(queue?.status,'LEASED');
   assert.equal(input.p_status,approval.status==='SETTLED'?'SETTLED':'PENDING');
   queue.status=input.p_status;
   audit.push('BACKGROUND_WORKER_RECONCILED_'+input.p_status);
   return {status:input.p_status,reservation_id:reservationId,
    original_work_id:original,
    original_job_completed:input.p_status==='SETTLED',
    production_changed:false};
  }
  throw Error('UNEXPECTED_PRIVATE_WORKER_CALL_'+name);
 };
 const runWorker=async()=>executeApprovedContinuation({
  env,request:{reservation_id:reservationId,
   original_work_id:original,candidate_hash:artifact,
   issue_number:178,install_branch:installBranch},
  checkoutSha:workerSha,call,serviceFactory:({session:s,env:e})=>buildService(s,e),
  wait:async()=>{},maxChecks:1,
 });
 const readLabel=async()=>readOriginalLoopCompletion({
  session,originalWorkId:original,env,fetchImpl:provider,
  createVerifier:()=>({observeOriginalRun:
   async({originalWorkId,installedCommitSha,expectedFrozenSha})=>{
    assert.equal(originalWorkId,original);
    assert.equal(installedCommitSha,installedSha);
    assert.equal(expectedFrozenSha,frozenHash);
    return {complete:simulatedAcceptance,
     status:simulatedAcceptance?'VERIFIED_ORIGINAL_INSTALLED_WORK':
      'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE',
     original_work_id:original,installed_commit_sha:installedSha,
     original_work_run_ref:executor,
     independent_provider_readback:true,
     original_frozen_tests_passed:true,governance_tests_passed:true};
   }}),
 });
 return {init:async()=>{state=await initialState()},
  buildService,runWorker,readLabel,approval:()=>approval,queue:()=>queue,
  audit,counts:()=>({installCount,dispatchCount,acceptanceChecks,settlementCount}),
  waitingHash:()=>state.head_hash};
}
test('UNATTENDED DRY RUN: synthetic approval -> exact queue -> background worker -> original job -> independent settlement -> LOOP COMPLETE',async()=>{
 const f=factory();
 await f.init();
 const before=await f.readLabel();
 assert.equal(before.loop_complete,false);
 assert.equal(before.original_job_completed,false);
 const first=await f.buildService().ownerApproveAndQueue({
  originalWorkId:original,issueNumber,
  expectedArtifactHash:artifact,expectedCheckpointHash:f.waitingHash()});
 assert.equal(first.status,'OWNER_APPROVED_BACKGROUND_CONTINUATION_DISPATCHED');
 assert.equal(first.original_work_id,original);
 assert.equal(first.owner_approval_consumed,true);
 assert.equal(first.installed,false);
 assert.equal(f.approval().status,'CLAIMED');
 assert.equal(f.queue().status,'PENDING');
 const continued=await f.runWorker();
 assert.equal(continued.status,'ORIGINAL_JOB_INDEPENDENTLY_SETTLED');
 assert.equal(continued.original_work_id,original);
 assert.equal(continued.original_job_completed,true);
 assert.equal(continued.production_changed,false);
 assert.equal(continued.settlement_receipt_ref,
  'supabase:universe_events:'+outcomeId);
 assert.equal(f.queue().status,'SETTLED');
 assert.equal(f.approval().status,'SETTLED');
 const label=await f.readLabel();
 assert.equal(label.status,'LOOP_COMPLETE_VERIFIED');
 assert.equal(label.loop_complete,true);
 assert.equal(label.original_job_completed,true);
 assert.equal(label.settlement_receipt_ref,continued.settlement_receipt_ref);
 assert.equal(label.original_work_id,original);
 assert.deepEqual(f.counts(),{
  installCount:1,dispatchCount:1,
  acceptanceChecks:1,settlementCount:1});
 for(const step of [
  'SIMULATED_OWNER_AUTHORIZED_EXACT_ARTIFACT',
  'SINGLE_USE_OWNER_APPROVAL_CLAIMED',
  'DURABLE_BACKGROUND_WORK_QUEUED',
  'SIMULATED_INERT_GITHUB_DISPATCH',
  'BACKGROUND_WORKER_LEASED_EXACT_OWNER_WORK',
  'SYNTHETIC_PREVIEW_SOURCE_INSTALLED',
  'SIMULATED_INDEPENDENT_ORIGINAL_FROZEN_ACCEPTANCE',
  'SIMULATED_CAPABILITY_REGISTERED',
  'SIMULATED_ORIGINAL_JOB_RESUMED',
  'SIMULATED_ORIGINAL_JOB_SETTLED',
  'SIMULATED_DURABLE_SETTLEMENT_RECONCILED',
  'BACKGROUND_WORKER_RECONCILED_SETTLED',
 ])assert.ok(f.audit.includes(step),'required exact stage '+step);
 console.log('AUTOMATED_SIMULATED_FULL_LOOP',JSON.stringify({
  test:'UNATTENDED_PROVIDER_SIMULATION_NOT_LIVE_INSTALL',
  original_work_id:original,ui_button_pressed:false,
  real_owner_approval_consumed:false,
  live_database_written:false,real_github_install_performed:false,
  simulated_loop_complete:true,simulated_receipt_verified:true,
  verified_stages:f.audit,
 }));
});
test('UNATTENDED DRY RUN: no customer approval -> worker cannot install or settle',async()=>{
 const f=factory();await f.init();
 const first=await f.runWorker();
 assert.equal(first.status,'NO_ATOMICALLY_APPROVED_WORK');
 assert.equal(first.original_job_completed,false);
 assert.equal(f.approval(),null);
 assert.equal(f.queue(),null);
 assert.equal(f.counts().installCount,0);
});
test('UNATTENDED DRY RUN: no independent installed acceptance -> no settlement badge',async()=>{
 const f=factory({simulatedAcceptance:false});await f.init();
 await f.buildService().ownerApproveAndQueue({
  originalWorkId:original,issueNumber,
  expectedArtifactHash:artifact,expectedCheckpointHash:f.waitingHash()});
 const later=await f.runWorker();
 assert.equal(later.original_job_completed,false);
 assert.equal(later.status,'DURABLE_PENDING_REQUIRES_FUTURE_WORKER_WAKEUP');
 assert.equal(f.queue().status,'PENDING');
 assert.equal(f.counts().settlementCount,0);
 const label=await f.readLabel();
 assert.equal(label.loop_complete,false);
 assert.equal(label.original_job_completed,false);
});
