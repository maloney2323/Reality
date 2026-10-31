// Live, authenticated, owner-approved installation -> original-job settlement.
// One explicit owner action authorizes ONLY the exact model artifact. Follow-up
// continuation is idempotent, reobserves the installed GitHub commit and the
// original frozen job, and never asks an LLM to grant approval.
import {createHash} from 'node:crypto';
import {continuityUuidFromSource} from './reality-continuity-spine-v2.0.js';
import {listAuthenticatedUnfinishedWork}
 from './reality-personal-unfinished-work-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {readExactModelRepairEvidence}
 from './reality-real-verified-repair-readback-v1.0.js';
import {createGeneralConstitutionalCheckpointService}
 from './reality-general-constitutional-checkpoint-v1.0.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {createIndependentInstalledWorkVerifier}
 from './reality-general-installed-work-verifier-v1.0.js';
import {installVerifiedGenericPreviewExtension}
 from './reality-general-isolated-install-v1.0.js';
import {continueExactlyApprovedGeneralRepair}
 from './reality-general-approved-repair-continuation-v1.0.js';
import {createGeneralPreviewCapabilityRegistry}
 from './reality-general-preview-capability-registry-v1.0.js';
import {createGenericVerifiedOriginalWorkSettlement}
 from './reality-general-original-work-settlement-v1.0.js';
import {acceptGovernedObservation,verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
const fail=x=>{throw Error('REAL_LIVE_INSTALL_'+x)};
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const branch=x=>/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/.test(String(x||''))&&!x.includes('..');
const sorted=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(sorted):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])]));
const hash=x=>createHash('sha256').update(JSON.stringify(sorted(x))).digest('hex');
async function rpc(db,name,input,fetchImpl){
 const response=await fetchImpl(db.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',headers:{
   apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(input),
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)fail('DB_'+name.toUpperCase()+'_HTTP_'+response.status);
 return data;
}
async function githubRef(branchName,env,fetchImpl){
 const token=env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN;
 if(!branch(branchName)||typeof token!=='string'||token.length<25)
  fail('ISOLATED_PROVIDER_WRITE_AUTHORITY_UNAVAILABLE');
 const response=await fetchImpl('https://api.github.com/repos/maloney2323/Reality/git/ref/heads/'+branchName,{
  method:'GET',redirect:'error',cache:'no-store',headers:{
   accept:'application/vnd.github+json',
   authorization:'Bearer '+token,'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-approved-install-v1'}});
 if(!response.ok)fail('GITHUB_SOURCE_REF_UNAVAILABLE');
 const json=await response.json();
 if(!SHA.test(json?.object?.sha))fail('GITHUB_REF_SHA_NOT_VERIFIED');
 return json.object.sha;
}
function installationFromDb(record,scope,proof){
 return Object.freeze({
  kind:'ISOLATED_GITHUB_SOURCE_INSTALLED',
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,
  artifact_hash:proof.candidate_artifact_sha256,
  installed_commit_sha:record.installed_commit_sha,
  installed_branch:record.install_branch,
  installation_authority_ref:'supabase:general-repair-owner-approvals:'+record.reservation_id,
  provider_source_files:proof.files.map(f=>f.path),
  provider_bytes_readback_verified:true,
  capability_registered:false,original_job_completed:false,production_changed:false,
 });
}
export function createLiveGeneralRepairService({
 session,env=process.env,fetchImpl=fetch,
 listWork=listAuthenticatedUnfinishedWork,
 readGoal=readFreshPersonalGoalState,
 readCandidate=readExactModelRepairEvidence,
 checkpointFactory=createGeneralConstitutionalCheckpointService,
 verifierFactory=createIndependentInstalledWorkVerifier,
 installer=installVerifiedGenericPreviewExtension,
 continuation=continueExactlyApprovedGeneralRepair,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !session?.user_id||!UUID.test(session.user_id)||!session.config?.url||
  !SHA.test(env.VERCEL_GIT_COMMIT_SHA)||!branch(env.VERCEL_GIT_COMMIT_REF))
  fail('AUTHENTICATED_ISOLATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||db.url!==session.config.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('OWNER_BOUND_SERVICE_DATABASE_UNAVAILABLE');
 const call=(name,input)=>rpc(db,name,input,fetchImpl);
 const verifier=verifierFactory({env,fetchImpl});
 async function load({originalWorkId,issueNumber,includeCandidate=true}){
  if(!WORK.test(originalWorkId)||!Number.isSafeInteger(issueNumber)||issueNumber<1)
   fail('REVIEWED_ORIGINAL_WORK_REQUIRED');
  const pending=await listWork({session,env});
  const jobs=(pending?.jobs||[]).filter(x=>
   x.original_work_id===originalWorkId&&
   x.issue_url==='https://github.com/maloney2323/Reality/issues/'+issueNumber&&
   x.state==='REAL_SOURCE_BACKED_REPAIR_PENDING'&&
   x.goal_still_current===true&&x.job_completed===false);
  if(jobs.length!==1)fail('ONE_OWNER_VERIFIED_UNFINISHED_ORIGINAL_WORK_REQUIRED');
  const job=jobs[0];
  if(!/^test\/reality-frozen-regressions\/[a-z0-9._/-]+\.test\.js$/.test(
   String(job.frozen_test_path||''))||
   !HASH.test(String(job.frozen_test_sha256||'')))
   fail('ORIGINAL_FROZEN_ACCEPTANCE_SOURCE_MISSING');
  const goal=await readGoal({session,conversationId:job.conversation_id,env});
  if(goal?.principal_id!==session.user_id||
   goal?.conversation_id!==job.conversation_id||
   goal?.state?.active_goal?.status!=='ACTIVE'||
   goal.state.active_goal.user_confirmed!==true||
   goal.state.active_goal.goal_id!==goal.state.active_goal_id)
   fail('CURRENT_ORIGINAL_OWNER_GOAL_CHANGED');
  const checkpoint=checkpointFactory({
   session,conversationId:job.conversation_id,
   originalWorkId,originalWorkEvidenceRef:job.source_receipt_id,db,env});
  const latest=await checkpoint.readLatestCheckpoint();
  if(!latest?.independent_readback_verified||!latest.state)
   fail('DURABLE_CONSTITUTIONAL_CHECKPOINT_MISSING');
  const state=latest.state;
  verifySelfImprovementJournal(state);
  if(state.scope?.owner_id!==session.user_id||
   state.scope.original_work_id!==originalWorkId||
   state.scope.goal_id!==goal.state.active_goal_id||
   state.scope.goal_transition_receipt_ref!==
    goal.state.active_goal.last_transition_receipt_id)
   fail('ORIGINAL_GOAL_OR_CONSTITUTIONAL_SCOPE_CHANGED');
  let proof=null;
  if(includeCandidate){
   const prior=await rpc(db,'reality_read_general_repair_progress_v2',{
    p_owner_id:session.user_id,
    p_conversation_id:job.conversation_id,
    p_original_work_id:originalWorkId,
   },fetchImpl);
   if(prior?.status!=='NOT_APPROVED'&&(
    prior?.owner_id!==session.user_id||
    prior?.original_work_id!==originalWorkId||
    prior?.conversation_id!==job.conversation_id||
    !SHA.test(String(prior?.review_commit_sha||''))))
    fail('EXACT_PRIOR_APPROVED_REVIEW_SOURCE_UNVERIFIED');
   proof=await readCandidate({issueNumber,env,
    sourceCommitSha:prior?.status==='NOT_APPROVED'?null:prior.review_commit_sha});
   if(proof.independently_verified!==true||
     proof.original_failed_run_id!==job.original_provider_failed_run_id||
     proof.original_source_sha!==job.original_source_sha||
     state.candidate?.artifact_hash!==proof.candidate_artifact_sha256||
     proof.frozen_test_sha256!==job.frozen_test_sha256)
    fail('MODEL_SOURCE_ORIGINAL_WORK_MISMATCH');
  }
  return {job,goal,checkpoint,latest,state,proof,db};
 }
 async function record({name,ctx,more={}}){
  return call(name,{
   p_owner_id:session.user_id,
   p_conversation_id:ctx.job.conversation_id,
   p_original_work_id:ctx.job.original_work_id,...more});
 }
 async function progress(ctx){
  const res=await record({name:'reality_read_general_repair_progress_v2',ctx});
  if(res?.status==='NOT_APPROVED')return res;
  if(res?.owner_id!==session.user_id||
   res?.original_work_id!==ctx.job.original_work_id||
   res?.conversation_id!==ctx.job.conversation_id)
   fail('PROVIDER_OWNER_RESERVATION_SCOPE_CHANGED');
  return res;
 }
 async function claimAndPromote(ctx){
  let {state}=ctx;
  if(state.phase!=='AWAITING_OWNER_APPROVAL'&&
   state.phase!=='PROMOTION_AUTHORIZED')
   fail('EXACT_OWNER_INSTALLATION_STAGE_REQUIRED');
  let current=await progress(ctx);
  if(current.status==='NOT_APPROVED'){
   if(state.phase!=='AWAITING_OWNER_APPROVAL')
    fail('MISSING_ORIGINAL_SIGNED_OWNER_APPROVAL');
   const reservation=await record({
    name:'reality_authorize_general_repair_install_v2',ctx,
    more:{
     p_original_work_event_id:ctx.job.source_receipt_id,
     p_candidate_hash:state.candidate.artifact_hash,
     p_frozen_test_sha256:ctx.proof.frozen_test_sha256,
     p_review_commit_sha:ctx.proof.review_commit_sha,
     p_verifier_run_id:ctx.proof.verified_sandbox_run_id,
     p_checkpoint_receipt_id:ctx.latest.checkpoint_receipt_id,
     p_checkpoint_hash:state.head_hash,
    }});
   if(!UUID.test(reservation?.reservation_id)||
    reservation.status!=='RESERVED'||reservation.original_work_id!==
     ctx.job.original_work_id||reservation.candidate_hash!==state.candidate.artifact_hash)
    fail('ATOMIC_OWNER_RESERVATION_NOT_CONFIRMED');
   current=await progress(ctx);
  }
  if(current.candidate_hash!==state.candidate.artifact_hash||
     current.checkpoint_hash!==(state.phase==='AWAITING_OWNER_APPROVAL'?
      state.head_hash:state.journal.find(x=>x.kind==='SANDBOX_VERIFIED')?.event_hash)||
     current.review_commit_sha!==ctx.proof.review_commit_sha)
    fail('EXACT_APPROVED_SOURCE_OR_PRIOR_CHECKPOINT_CHANGED');
  if(current.status==='RESERVED'){
   const claimed=await record({name:'reality_claim_general_repair_install_v1',ctx,
    more:{p_reservation_id:current.reservation_id,
     p_candidate_hash:state.candidate.artifact_hash}});
   if(claimed?.claimed!==true||claimed?.consumed_once!==true||
      claimed.reservation_id!==current.reservation_id)
    fail('ATOMIC_SINGLE_USE_CLAIM_NOT_CONFIRMED');
   current=await progress(ctx);
  }
  if(!['CLAIMED','INSTALLED','SETTLED'].includes(current.status)||
    current.consumed_once!==true)
   fail('OWNER_APPROVAL_NOT_CONSUMED');
  if(state.phase==='AWAITING_OWNER_APPROVAL'){
   const reservationRef='supabase:general-repair-owner-approvals:'+current.reservation_id;
   const evidenceHash=hash({owner_id:session.user_id,
    original_work_id:ctx.job.original_work_id,
    candidate_hash:state.candidate.artifact_hash,
    reservation_id:current.reservation_id,consumed_once:true});
   const receipt={
    kind:'PROMOTION_AUTHORIZED',owner_id:session.user_id,
    goal_id:state.scope.goal_id,original_work_id:state.scope.original_work_id,
    continuity_root_id:state.scope.continuity_root_id,
    worldline_id:state.scope.worldline_id,
    artifact_hash:state.candidate.artifact_hash,
    approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',consumed_once:true,
    reservation_ref:reservationRef,evidence_ref:reservationRef,
    evidence_hash:evidenceHash,
   };
   state=await acceptGovernedObservation(state,receipt,{
    verifyProvider:async ({scope_hash,receipt:observed})=>{
     const updated=await progress(ctx);
     return {verified:updated.consumed_once===true&&
       updated.status!=='RESERVED'&&
       updated.candidate_hash===observed.artifact_hash&&
       updated.reservation_id===current.reservation_id,
      independent_provider_readback:true,original_work_id:ctx.job.original_work_id,
      scope_hash,evidence_ref:observed.evidence_ref,
      evidence_hash:observed.evidence_hash,
      attestation_ref:reservationRef};
    }});
   await ctx.checkpoint.persistCheckpoint(state);
   ctx.latest=await ctx.checkpoint.readLatestCheckpoint();
  }
  if(state.phase!=='PROMOTION_AUTHORIZED')
   fail('CONSTITUTIONAL_PROMOTION_NOT_VERIFIED');
  ctx.state=state;
  return {reservation:current,state};
 }
 async function observeExisting(ctx,recorded){
  if(!SHA.test(recorded?.installed_commit_sha)||
   recorded?.install_branch!==env.VERCEL_GIT_COMMIT_REF)
   fail('PINNED_INSTALLED_COMMIT_REQUIRED');
  const installed=installationFromDb(recorded,ctx.state.scope,ctx.proof);
  await verifier.inspectInstalled({installed,candidate:ctx.state.candidate,
   expectedBaseSha:ctx.proof.review_commit_sha,
   originalWorkId:ctx.job.original_work_id});
  return installed;
 }
 async function install(ctx){
  let current=await progress(ctx);
  if(['INSTALLED','SETTLED'].includes(current.status))
   return observeExisting(ctx,current);
  if(current.status!=='CLAIMED')fail('INSTALLATION_OWNER_CLAIM_NOT_VERIFIED');
  // Recover an installation that completed before its DB write; compare
  // provider parent and ALL approved bytes. Never write it a second time.
  const head=await githubRef(env.VERCEL_GIT_COMMIT_REF,env,fetchImpl);
  let installed;
  if(head!==ctx.proof.review_commit_sha){
   installed=installationFromDb({
    reservation_id:current.reservation_id,
    installed_commit_sha:head,
    install_branch:env.VERCEL_GIT_COMMIT_REF,
   },ctx.state.scope,ctx.proof);
   await verifier.inspectInstalled({installed,candidate:ctx.state.candidate,
    expectedBaseSha:ctx.proof.review_commit_sha,
    originalWorkId:ctx.job.original_work_id});
  }else{
   const ticket={
    owner_id:session.user_id,goal_id:ctx.state.scope.goal_id,
    original_work_id:ctx.job.original_work_id,
    repository_base_sha:ctx.proof.review_commit_sha,
    environment:'ISOLATED_PREVIEW',
   };
   installed=await installer({
    ticket,candidate:ctx.state.candidate,
    sandbox:{...ctx.state.sandbox_receipt,independently_verified:true},
    approval:{...ctx.state.promotion_authorization,
     kind:'PROMOTION_AUTHORIZED'},
    branch:env.VERCEL_GIT_COMMIT_REF,
    writeToken:env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN,
    verifyOwnerApproval:async ({reservation_ref,artifact_hash,original_work_id})=>{
     const checked=await progress(ctx);
     return {verified:checked.consumed_once===true&&
      checked.reservation_id===current.reservation_id&&
      checked.status==='CLAIMED'&&checked.candidate_hash===artifact_hash&&
      checked.original_work_id===original_work_id,
      consumed_once:true,reservation_ref,artifact_hash,
      original_work_id,owner_id:session.user_id,
      target_environment:'ISOLATED_PREVIEW'};
    },fetchImpl,
   });
   await verifier.inspectInstalled({installed,candidate:ctx.state.candidate,
    expectedBaseSha:ctx.proof.review_commit_sha,
    originalWorkId:ctx.job.original_work_id});
  }
  const marked=await record({name:'reality_mark_general_repair_installed_v1',
   ctx,more:{p_reservation_id:current.reservation_id,
    p_candidate_hash:ctx.state.candidate.artifact_hash,
    p_branch:env.VERCEL_GIT_COMMIT_REF,
    p_commit_sha:installed.installed_commit_sha}});
  if(marked?.verified!==true||marked.installed_commit_sha!==installed.installed_commit_sha)
   fail('INSTALLED_SOURCE_DURABLE_STATUS_MISSING');
  return installed;
 }
 async function ownerApproveAndInstall({originalWorkId,issueNumber,expectedArtifactHash,
 expectedCheckpointHash}={}){
  const ctx=await load({originalWorkId,issueNumber});
  if(!HASH.test(expectedArtifactHash)||!HASH.test(expectedCheckpointHash)||
   ctx.state.candidate?.artifact_hash!==expectedArtifactHash||
   ![ctx.state.head_hash,ctx.latest.state.journal.find(x=>x.kind==='SANDBOX_VERIFIED')?.event_hash]
     .includes(expectedCheckpointHash))
   fail('EXACT_OWNER_REVIEWED_ARTIFACT_CHANGED');
  await claimAndPromote(ctx);
  const installed=await install(ctx);
  return Object.freeze({
   status:'INSTALLED_AWAITING_ORIGINAL_INDEPENDENT_ACCEPTANCE',
   original_work_id:ctx.job.original_work_id,
   artifact_hash:ctx.state.candidate.artifact_hash,
   installed_commit_sha:installed.installed_commit_sha,
   installed_branch:installed.installed_branch,
   source_bytes_verified:true,owner_approval_consumed:true,
   original_job_completed:false,production_changed:false,
  });
 }
 async function markDurableSettlement(ctx,state,final){
  const sourceRef=state?.settlement?.settlement_receipt_ref;
  const match=/^supabase:universe_events:([a-f0-9-]{36})$/i.exec(String(sourceRef||''));
  if(!match||!UUID.test(match[1])||!UUID.test(final?.checkpoint_receipt_id)||
     final.independent_readback_verified!==true)
   fail('FINAL_DISTINCT_OUTCOME_AND_CHECKPOINT_REQUIRED');
  const current=await progress(ctx);
  if(!['INSTALLED','SETTLED'].includes(current.status)||
     current.candidate_hash!==state.candidate.artifact_hash)
   fail('SAME_ORIGINAL_INSTALLED_ARTIFACT_REQUIRED');
  const marked=await record({name:'reality_mark_general_repair_settled_v1',
   ctx,more:{
    p_reservation_id:current.reservation_id,
    p_original_outcome_event_id:match[1],
    p_final_checkpoint_event_id:final.checkpoint_receipt_id,
   }});
  if(marked?.status!=='SETTLED'||marked.original_job_completed!==true||
    marked.original_work_id!==ctx.job.original_work_id||
    marked.independent_outcome_verified!==true)
   fail('FINAL_ATOMIC_SETTLEMENT_READBACK_FAILED');
  return marked;
 }
 async function continueAfterInstall({originalWorkId,issueNumber}={}){
  const ctx=await load({originalWorkId,issueNumber});
  const recorded=await progress(ctx);
  if(recorded.status==='NOT_APPROVED'||recorded.consumed_once!==true)
   fail('EXPLICIT_OWNER_APPROVAL_REQUIRED');
  if(ctx.state.phase==='AWAITING_OWNER_APPROVAL')
   await claimAndPromote(ctx);
  if(!['PROMOTION_AUTHORIZED','CAPABILITY_REGISTERED',
   'ORIGINAL_JOB_RESUMED','SETTLED'].includes(ctx.state.phase))
   fail('EXACT_AUTHORIZED_RESUMPTION_PHASE_REQUIRED');
  const stored=await progress(ctx);
  if(stored.status!=='INSTALLED'&&stored.status!=='SETTLED'){
   if(stored.status==='CLAIMED'){
    await install(ctx);
   }else fail('SAVED_INSTALLED_SOURCE_NOT_VERIFIED');
  }
  const installed=await observeExisting(ctx,await progress(ctx));
  const outcome=await verifier.observeOriginalRun({
   installedCommitSha:installed.installed_commit_sha,
   installedBranch:installed.installed_branch,
   originalWorkId:ctx.job.original_work_id,
   expectedFrozenTestPath:ctx.job.frozen_test_path,
   expectedFrozenSha:ctx.proof.frozen_test_sha256,
  });
  if(outcome.complete!==true)return Object.freeze({
   status:outcome.status,original_work_id:ctx.job.original_work_id,
   installed_commit_sha:installed.installed_commit_sha,
   independent_source_readback:true,
   original_job_completed:false,production_changed:false,
  });
  if(ctx.state.phase==='SETTLED'){
   const read=await ctx.checkpoint.readCheckpoint(ctx.state);
   const marked=await markDurableSettlement(ctx,ctx.state,read);
   return Object.freeze({status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
    original_work_id:ctx.job.original_work_id,
    settlement_receipt_ref:marked.original_outcome_receipt_ref,
    independent_readback_verified:true,
    original_job_completed:true,production_changed:false});
  }
  const runAgain=async()=>{
   const observed=await verifier.observeOriginalRun({
    installedCommitSha:installed.installed_commit_sha,
    installedBranch:installed.installed_branch,
    originalWorkId:ctx.job.original_work_id,
    expectedFrozenTestPath:ctx.job.frozen_test_path,
    expectedFrozenSha:ctx.proof.frozen_test_sha256});
   if(observed.complete!==true||observed.evidence_hash!==outcome.evidence_hash||
      observed.installed_commit_sha!==installed.installed_commit_sha)
    fail('ORIGINAL_JOB_PROVIDER_REOBSERVATION_CHANGED');
   return observed;
  };
  const promotion=ctx.state.journal.find(e=>e.kind==='PROMOTION_AUTHORIZED');
  if(!promotion?.event_hash)fail('PERSISTED_CONSTITUTIONAL_PROMOTION_MISSING');
  const promotionCheckpointReceiptId=continuityUuidFromSource(
   'reality:general:constitutional-checkpoint:'+session.user_id+':'+
    ctx.job.conversation_id+':'+ctx.job.original_work_id+':'+promotion.event_hash);
  const approval={...ctx.state.promotion_authorization,
   kind:'PROMOTION_AUTHORIZED',
   checkpoint_receipt_id:promotionCheckpointReceiptId};
  const registry=createGeneralPreviewCapabilityRegistry({
   db,scope:ctx.state.scope,
   artifactHash:ctx.state.candidate.artifact_hash,fetchImpl});
  const acceptance=()=>({
   ...outcome,complete:true,independent_provider_readback:true,
   original_work_id:ctx.job.original_work_id,
   installed_commit_sha:installed.installed_commit_sha,
   source_failure_evidence_sha256:ctx.state.journal.find(x=>x.kind==='GAP_CONFIRMED')?.evidence_hash,
  });
  const executeOriginalWork=async()=>{
   const verified=await runAgain();
   return {kind:'ORIGINAL_JOB_RESUMED',
    original_work_id:ctx.job.original_work_id,owner_id:session.user_id,
    installed_commit_sha:installed.installed_commit_sha,
    independent_provider_readback:true,real_execution_observed:true,
    observed_outcome:'SUCCEEDED',evidence_hash:verified.evidence_hash,
    executor_run_ref:verified.original_work_run_ref,
    production_changed:false};
  };
  const verifyOriginalExecution=async request=>{
   const verified=await runAgain();
   return {verified:verified.original_work_run_ref===request.executor_run_ref&&
      verified.evidence_hash===request.expected_execution_evidence_hash,
     independent_provider_readback:true,original_work_id:ctx.job.original_work_id,
     executor_run_ref:verified.original_work_run_ref,
     evidence_hash:verified.evidence_hash,observed_outcome:'SUCCEEDED'};
  };
  const settle=createGenericVerifiedOriginalWorkSettlement({
   session,scope:ctx.state.scope,db,verifyOriginalExecution});
  const driver=await continuation({
   state:ctx.state,ticket:{
    environment:'ISOLATED_PREVIEW',owner_id:session.user_id,
    goal_id:ctx.state.scope.goal_id,
    original_work_id:ctx.job.original_work_id,
    repository_branch:env.VERCEL_GIT_COMMIT_REF,
    repository_base_sha:ctx.proof.review_commit_sha,
    confirmed_gap_evidence_hash:acceptance().source_failure_evidence_sha256,
    frozen_regression_sha256:ctx.proof.frozen_test_sha256,
   },
   session,db,branch:env.VERCEL_GIT_COMMIT_REF,
   writeToken:env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN,
   conversationId:ctx.job.conversation_id,
   originalWorkEvidenceRef:ctx.job.source_receipt_id,
   promotionCheckpointReceiptId,
   observePreviouslyInstalled:async()=>installed,
   verifyOwnerApproval:async()=>({verified:true,consumed_once:true}),
   verifyFrozenAcceptance:async()=>acceptance(),
   executeOriginalWork,verifyOriginalExecution,
   persistCheckpoint:ctx.checkpoint.persistCheckpoint,
   verifyIndependentReceipt:async ({scope_hash,receipt,registration,resumption})=>{
    let verified=false;
    if(receipt.kind==='CAPABILITY_REGISTERED'){
     const got=await registry.recordAndReadback({
      installed,acceptance:acceptance(),approval});
     verified=got.registry_receipt_ref===receipt.registry_receipt_ref&&got.verified===true;
    }else if(receipt.kind==='ORIGINAL_JOB_RESUMED'){
     const observed=await runAgain();
     verified=observed.original_work_run_ref===receipt.executor_run_ref&&
      observed.evidence_hash===receipt.evidence_hash;
    }else if(receipt.kind==='ORIGINAL_JOB_SETTLED'){
     const observed=await settle.verify({registration,resumption});
     verified=observed.verified===true&&
      observed.settlement_receipt_ref===receipt.settlement_receipt_ref;
    }
    return {verified,independent_provider_readback:verified,
     scope_hash,original_work_id:ctx.job.original_work_id,
     evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
     attestation_ref:'reality:verified:source:'+installed.installed_commit_sha};
   },
   maxTransitions:4,fetchImpl,env,
  });
  if(driver.status!=='ORIGINAL_JOB_INDEPENDENTLY_SETTLED'||
   driver.state?.phase!=='SETTLED')fail('ORIGINAL_JOB_DURABLE_SETTLEMENT_NOT_REACHED');
  const final=await ctx.checkpoint.readCheckpoint(driver.state);
  if(final.independent_readback_verified!==true)
   fail('FINAL_CHECKPOINT_INDEPENDENT_READBACK_MISSING');
  const marked=await markDurableSettlement(ctx,driver.state,final);
  return Object.freeze({
   status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
   original_work_id:ctx.job.original_work_id,
   artifact_hash:ctx.state.candidate.artifact_hash,
   installed_commit_sha:installed.installed_commit_sha,
   original_execution_ref:outcome.original_work_run_ref,
   original_frozen_tests_passed:true,governance_tests_passed:true,
   settlement_receipt_ref:marked.original_outcome_receipt_ref,
   constitutional_checkpoint_receipt_id:final.checkpoint_receipt_id,
   independent_readback_verified:true,
   original_job_completed:true,production_changed:false,
  });
 }
 return Object.freeze({ownerApproveAndInstall,continueAfterInstall});
}
