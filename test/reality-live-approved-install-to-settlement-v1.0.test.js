import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {createLiveGeneralRepairService}
 from '../src/reality-live-approved-install-to-settlement-v1.0.js';
import {
 createGovernedSelfImprovement,acceptGovernedObservation,proposeGovernedCandidate,
} from '../src/reality-governed-self-improvement-spine-v1.0.js';
const h=x=>createHash('sha256').update(x).digest('hex');
const sorted=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(sorted):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])]));
const digest=x=>h(JSON.stringify(sorted(x)));
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const owner=randomUUID(),conversation=randomUUID(),goalReceipt=randomUUID(),
 sourceReceipt=randomUUID(),work='work:'+'c'.repeat(32),
 goal='verified:original-owner-goal',
 branch='feature/reality-install-to-settlement-20261031',base='a'.repeat(40),
 installedSHA='b'.repeat(40), issueNumber=188;
const session={user_id:owner,config:{url}};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-not-a-credential',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 VERCEL_GIT_COMMIT_SHA:base,VERCEL_GIT_COMMIT_REF:branch,
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:'unit-test-github-provider-token-credential'};
const files=[{path:'src/reality-extensions/proof.mjs',content:'export const proof = true;'},
 {path:'test/reality-extensions/proof.test.mjs',content:'import test from "node:test"; test("proof",()=>{});'}];
const artifact=digest(files.map(f=>({path:f.path,content:f.content})));
const proof={independently_verified:true,original_failed_run_id:91,
 original_source_sha:'d'.repeat(40),issue_number:issueNumber,
 candidate_artifact_sha256:artifact,review_commit_sha:base,
 verified_sandbox_run_id:333,model_source_run_id:222,
 frozen_test_sha256:'e'.repeat(64),model_response_id:'resp_real_source',
 files,independent_sandbox:{log_sha256:'f'.repeat(64)}};
const scope={owner_id:owner,goal_id:goal,original_work_id:work,
 goal_transition_receipt_ref:goalReceipt,
 goal_evidence_ref:'supabase:original-owner-message',
 continuity_root_id:'root:verified',worldline_id:'worldline:verified',
 target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:immutable-kernel'};
async function makeState(){
 let state=createGovernedSelfImprovement({scope});
 const evidence=(kind,extra={})=>({
  kind,owner_id:owner,goal_id:goal,original_work_id:work,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  evidence_ref:'github:verified:'+kind,
  evidence_hash:h('real:'+kind),...extra});
 const verifyProvider=async({scope_hash,receipt})=>({
  verified:true,independent_provider_readback:true,
  original_work_id:work,scope_hash,evidence_ref:receipt.evidence_ref,
  evidence_hash:receipt.evidence_hash,attestation_ref:'github:trusted-attestation'});
 state=await acceptGovernedObservation(state,evidence('GAP_CONFIRMED',{
  capability_id:'reality:missing-provider-receipt',
  failure_refs:['github:issue/188','github:actions/runs/91'],
  verification_suite_ref:'frozen:sha256:'+proof.frozen_test_sha256,
 }),{verifyProvider});
 state=proposeGovernedCandidate(state,{
  files,rationale:'Reality generated the missing source',
  verification_plan_ref:'github:verified:frozen',
  model_response_ref:proof.model_response_id});
 assert.equal(state.candidate.artifact_hash,artifact);
 state=await acceptGovernedObservation(state,evidence('SANDBOX_VERIFIED',{
  artifact_hash:artifact,independent_tests_passed:true,
  frozen_regression_passed:true,governance_preserved:true,
  verifier_run_ref:'github:actions:run:333',
 }),{verifyProvider});
 return state;
}
async function fixture(){
 let state=await makeState(),dbRow=null,installCalls=0,postInstallReads=0;
 const waitingHash=state.head_hash;
 const readGoal=async()=>({principal_id:owner,conversation_id:conversation,
  state:{active_goal_id:goal,active_goal:{goal_id:goal,
   status:'ACTIVE',user_confirmed:true,last_transition_receipt_id:goalReceipt}}});
 const checkpointFactory=()=>({
  readLatestCheckpoint:async()=>({state,independent_readback_verified:true,
   checkpoint_receipt_id:sourceReceipt}),
  persistCheckpoint:async next=>{state=next;return {persisted:true,
   independent_readback_verified:true,checkpoint_receipt_id:sourceReceipt,
   checkpoint_hash:next.head_hash,original_work_id:work};},
  readCheckpoint:async next=>({persisted:true,independent_readback_verified:true,
   checkpoint_receipt_id:sourceReceipt,checkpoint_hash:next.head_hash,original_work_id:work}),
 });
 const listWork=async()=>({jobs:[{
  original_work_id:work,issue_url:'https://github.com/maloney2323/Reality/issues/'+issueNumber,
  state:'REAL_SOURCE_BACKED_REPAIR_PENDING',goal_still_current:true,job_completed:false,
  original_provider_failed_run_id:proof.original_failed_run_id,
  original_source_sha:proof.original_source_sha,
  source_receipt_id:sourceReceipt,conversation_id:conversation,
 }]});
 const fetchImpl=async(url,opts={})=>{
  const path=new URL(url).pathname;
  if(url.startsWith('https://api.github.com/')){
   if(opts.method!=='GET'||!path.endsWith('/git/ref/heads/'+branch))
    throw Error('UNEXPECTED_GITHUB_REQUEST');
   return {ok:true,json:async()=>({object:{sha:base}})};
  }
  assert.ok(url.startsWith(urlBase()),url);
  const name=path.split('/').at(-1),body=JSON.parse(opts.body||'{}');
  let response;
  if(name==='reality_read_general_repair_progress_v2')
   response=dbRow||{status:'NOT_APPROVED'};
  else if(name==='reality_authorize_general_repair_install_v2'){
   dbRow={status:'RESERVED',reservation_id:randomUUID(),
    owner_id:owner,conversation_id:conversation,original_work_id:work,
    candidate_hash:artifact,checkpoint_hash:waitingHash,
    review_commit_sha:base,consumed_once:false};
   response={...dbRow};
  }else if(name==='reality_claim_general_repair_install_v1'){
   assert.equal(body.p_candidate_hash,artifact);
   dbRow.status='CLAIMED';dbRow.consumed_once=true;
   response={claimed:true,consumed_once:true,reservation_id:dbRow.reservation_id};
  }else if(name==='reality_mark_general_repair_installed_v1'){
   assert.equal(body.p_commit_sha,installedSHA);
   dbRow.status='INSTALLED';dbRow.installed_commit_sha=installedSHA;
   dbRow.install_branch=branch;
   response={verified:true,installed_commit_sha:installedSHA};
  }else throw Error('UNEXPECTED_DB_RPC_'+name);
  return {ok:true,json:async()=>response};
 };
 const verifierFactory=()=>({
  inspectInstalled:async({installed})=>{
   postInstallReads++;assert.equal(installed.installed_commit_sha,installedSHA);
   return {verified:true,independent_provider_readback:true};
  },
  observeOriginalRun:async()=>({status:'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE',
   complete:false,original_work_id:work,production_changed:false}),
 });
 const installer=async({ticket,candidate,approval,verifyOwnerApproval})=>{
  installCalls++;assert.equal(ticket.original_work_id,work);
  assert.equal(candidate.artifact_hash,artifact);
  assert.equal(approval.kind,'PROMOTION_AUTHORIZED');
  const a=await verifyOwnerApproval({original_work_id:work,
   artifact_hash:artifact,reservation_ref:approval.reservation_ref});
  assert.equal(a.verified,true);
  return {kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',
   original_work_id:work,owner_id:owner,goal_id:goal,
   artifact_hash:artifact,installed_commit_sha:installedSHA,
   installed_branch:branch,provider_bytes_readback_verified:true,
   provider_source_files:files.map(f=>f.path),production_changed:false};
 };
 const svc=createLiveGeneralRepairService({session,env,fetchImpl,
  listWork,readGoal,readCandidate:async()=>proof,checkpointFactory,
  verifierFactory,installer});
 function urlBase(){return url+'/rest/v1/rpc/'}
 return {svc,waitingHash,db:()=>dbRow,installCalls:()=>installCalls,postInstallReads:()=>postInstallReads};
}
test('one explicit owner action atomically claims, installs exact source and only then starts independent job verification',async()=>{
 const f=await fixture();
 const first=await f.svc.ownerApproveAndInstall({originalWorkId:work,issueNumber,
  expectedArtifactHash:artifact,expectedCheckpointHash:f.waitingHash});
 assert.equal(first.status,'INSTALLED_AWAITING_ORIGINAL_INDEPENDENT_ACCEPTANCE');
 assert.equal(first.owner_approval_consumed,true);
 assert.equal(first.original_job_completed,false);
 assert.equal(f.db().status,'INSTALLED');
 assert.equal(f.installCalls(),1);
 const pending=await f.svc.continueAfterInstall({originalWorkId:work,issueNumber});
 assert.equal(pending.original_job_completed,false);
 assert.equal(pending.status,'AWAITING_INDEPENDENT_INSTALLED_ACCEPTANCE');
 assert.equal(f.installCalls(),1,'no new install from continuation');
 const again=await f.svc.ownerApproveAndInstall({originalWorkId:work,issueNumber,
  expectedArtifactHash:artifact,expectedCheckpointHash:f.waitingHash});
 assert.equal(again.original_job_completed,false);
 assert.equal(f.installCalls(),1,'repeated owner click must not create a duplicate GitHub commit');
});
test('without a separately consumed owner approval, even a verified repair cannot continue',async()=>{
 const f=await fixture();
 await assert.rejects(f.svc.continueAfterInstall({originalWorkId:work,issueNumber}),
  /REAL_LIVE_INSTALL_EXPLICIT_OWNER_APPROVAL_REQUIRED/);
 assert.equal(f.installCalls(),0);
});
test('unrelated original work or different reviewed artifact is rejected before provider writes',async()=>{
 const f=await fixture();
 await assert.rejects(f.svc.ownerApproveAndInstall({
  originalWorkId:'work:'+'f'.repeat(32),issueNumber,
  expectedArtifactHash:artifact,expectedCheckpointHash:f.waitingHash,
 }),/REAL_LIVE_INSTALL_ONE_OWNER_VERIFIED_UNFINISHED_ORIGINAL_WORK_REQUIRED/);
 await assert.rejects(f.svc.ownerApproveAndInstall({
  originalWorkId:work,issueNumber,
  expectedArtifactHash:'0'.repeat(64),expectedCheckpointHash:f.waitingHash,
 }),/REAL_LIVE_INSTALL_EXACT_OWNER_REVIEWED_ARTIFACT_CHANGED/);
 assert.equal(f.installCalls(),0);
});
