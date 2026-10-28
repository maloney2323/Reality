// Reuses Reality's actual signed-in goal-bound action approval and atomic
// database reservation. NO grant is generated from a user/model JSON claim.
// The exact stages have different work fingerprints and single-use policies.
// This is server-only; no HTTP route can dispatch it without a trusted plan.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {bindWorkToAuthenticatedGoal}
 from './reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof}
 from './reality-personal-work-grounding-proof-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {reserveAuthenticatedPersonalExecution}
 from './reality-personal-execution-reservation-service-v0.1.js';
import {createSingleUseExecutionReservationStore}
 from './reality-single-use-execution-reservation-v0.1.js';
import {fingerprintApprovedWorkItem}
 from './reality-authority-v1.0.js';
import {evaluateGoalExecutionBoundary}
 from './reality-goal-execution-boundary-v0.1.js';

export const OWNER_UPGRADE_STAGE_AUTHORITY_VERSION='reality-owner-upgrade-stage-authority-v0.1';
const REPO='maloney2323/Reality',BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK=/^work:[a-f0-9]{32}$/,SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code)};
function assertScope({session,conversationId,scope,plan,stage,installed,env}){
 if(env?.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(scope?.workId||''))||
    scope.ownerId!==session.user_id||
    scope.conversationId!==conversationId||
    plan?.state!=='AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION'||
    plan.owner_id!==session.user_id||plan.conversation_id!==conversationId||
    plan.original_work_id!==scope.workId||
    plan.original_goal_id==null||
    plan.goal_revision!==scope.goalRevision||
    plan.candidate_sha256!==scope.candidateSha||
    plan.github_head_sha!==scope.headSha||
    plan.pinned_base_sha!==scope.pinnedBaseSha||
    scope.base!==BASE||plan.github_pr_number!==scope.githubPrNumber||
    !SHA.test(String(scope.headSha||''))||
    !SHA.test(String(scope.pinnedBaseSha||''))||
    !HASH.test(String(scope.candidateSha||''))||
    !['INSTALL','RESUME'].includes(stage))
  fail('UPGRADE_STAGE_AUTHORITY_EXACT_OWNER_SCOPE_REQUIRED');
 if(stage==='RESUME'&&(
    installed?.original_work_id!==scope.workId||
    installed?.candidate_sha256!==scope.candidateSha||
    installed?.independent!==true||
    installed?.installed!==true||
    installed?.exact_candidate_files_verified!==true||
    installed?.production_deployment_performed!==false||
    !SHA.test(String(installed?.merge_commit_sha||''))))
  fail('UPGRADE_STAGE_AUTHORITY_INDEPENDENT_INSTALL_REQUIRED');
}
export function exactOwnerUpgradeStageWorkItem({session,scope,plan,stage,installed,env}={}){
 assertScope({session,conversationId:scope?.conversationId,scope,plan,stage,installed,env});
 const data={
  repository:REPO,base_ref:BASE,
  original_work_id:scope.workId,original_goal_id:plan.original_goal_id,
  goal_revision:scope.goalRevision,capability_id:plan.capability_id,
  candidate_sha256:scope.candidateSha,head_sha:scope.headSha,
  github_pr_number:scope.githubPrNumber,
  verified_warrant_id:plan.warrant_id,
 };
 if(stage==='RESUME')data.verified_install_commit_sha=installed.merge_commit_sha;
 const item=Object.freeze({
  work_item_id:scope.workId,workflow_id:'workflow:'+scope.workId,
  connector:'github',
  operation:stage==='INSTALL'?'install_exact_verified_upgrade':'resume_original_work',
  action:stage==='INSTALL'?
   'Install the exact verified capability into the isolated preview branch only':
   'Resume the originally authorized work after independently verified capability activation',
  inputs:Object.freeze(data),resource:REPO,
  consequential:true,status:'AWAITING_AUTHORIZATION',
 });
 if(evaluateGoalExecutionBoundary({workItem:item}).status==='BLOCKED')
  fail('UPGRADE_STAGE_AUTHORITY_EXECUTION_BOUNDARY_REJECTED');
 return item;
}
export async function prepareOwnerUpgradeStageApproval({
 session,conversationId,scope,plan,stage,installed,env=process.env,
 readGoal=readFreshPersonalGoalState,
 issueProof=issuePersonalWorkGroundingProof,
}={}){
 const workItem=exactOwnerUpgradeStageWorkItem({
  session,scope,plan,stage,installed,env,
 });
 if(conversationId!==scope.conversationId)fail('UPGRADE_STAGE_AUTHORITY_CONVERSATION_MISMATCH');
 const fresh=await readGoal({session,conversationId,env});
 if(fresh?.principal_id!==session.user_id||
    fresh?.conversation_id!==conversationId||
    fresh?.state?.active_goal?.goal_id!==plan.original_goal_id||
    fresh?.state?.active_goal?.last_transition_receipt_id!==plan.goal_revision||
    fresh?.state?.active_goal?.user_confirmed!==true||
    fresh?.state?.active_goal?.status!=='ACTIVE')
  fail('UPGRADE_STAGE_AUTHORITY_ORIGINAL_GOAL_NOT_CURRENT');
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:fresh.state,
  serverVerifiedPrincipalId:session.user_id,
 });
 if(binding.status!=='BOUND_FOR_FRESHNESS_CHECK'||
    binding.goal_id!==plan.original_goal_id||
    binding.goal_transition_receipt_id!==plan.goal_revision)
  fail('UPGRADE_STAGE_AUTHORITY_BOUND_GOAL_UNVERIFIED');
 const proof=issueProof({binding,conversationId,principalId:session.user_id,env});
 return Object.freeze({
  state:'AWAITING_EXACT_STAGE_OWNER_APPROVAL',
  stage,work_item:workItem,grounding_proof:proof,
  work_fingerprint:fingerprintApprovedWorkItem(workItem),
  original_work_id:scope.workId,
  external_action_authorized:false,external_action_performed:false,
  separate_stage_approval_required:true,
 });
}
async function consume({stage,session,scope,plan,installed,env,
 prepare=prepareOwnerUpgradeStageApproval,reserve=reserveAuthenticatedPersonalExecution}){
 // Validate the immutable owner/goal/candidate scope before reading any
 // optional injected trusted service or attempting atomic reservation.
 assertScope({session,conversationId:scope?.conversationId,scope,plan,stage,installed,env});
 // Preparer reconstructs the current signed-in owner's goal and issues a
 // NON-authorizing work binding. Reserved execution separately reloads a
 // previously recorded explicit action approval for this exact fingerprint.
 const a=await prepare({session,conversationId:scope.conversationId,
  scope,plan,stage,installed,env});
 const expected=exactOwnerUpgradeStageWorkItem({session,scope,plan,stage,installed,env});
 if(a?.state!=='AWAITING_EXACT_STAGE_OWNER_APPROVAL'||
    a.stage!==stage||a.original_work_id!==scope.workId||
    a.work_fingerprint!==fingerprintApprovedWorkItem(expected)||
    fingerprintApprovedWorkItem(a.work_item)!==a.work_fingerprint||
    !a.grounding_proof||
    a.external_action_authorized!==false)
  fail('UPGRADE_STAGE_AUTHORITY_FRESH_APPROVAL_BINDING_REQUIRED');
 const reserved=await reserve({session,conversationId:scope.conversationId,
  workItem:expected,groundingProof:a.grounding_proof,env});
 if(reserved?.status!=='SINGLE_USE_RESERVED_PENDING_DISPATCH'||
    reserved?.work_item_fingerprint!==a.work_fingerprint||
    !validUuid(reserved?.reservation_id)||
    reserved?.internal?.reservation?.status!=='RESERVED_NOT_DISPATCHED'||
    typeof reserved?.internal?.store?.begin!=='function'||
    typeof reserved?.internal?.store?.settle!=='function'||
    reserved?.internal?.serverFreshGoalAdmission?.principal_id!==session.user_id||
    reserved?.internal?.serverFreshGoalAdmission?.conversation_id!==scope.conversationId||
    reserved?.internal?.serverFreshGoalAdmission?.work_item_fingerprint!==a.work_fingerprint||
    reserved?.internal?.authorization?.authorized!==true)
  fail('UPGRADE_STAGE_AUTHORITY_DURABLE_ATOMIC_RESERVATION_REQUIRED');
 const consumed=await reserved.internal.store.begin({reservationId:reserved.reservation_id});
 if(consumed?.status!=='DISPATCHING'||consumed?.single_use_claim_consumed!==true||
    consumed?.reservation_id!==reserved.reservation_id)
  fail('UPGRADE_STAGE_AUTHORITY_ONE_TIME_CLAIM_NOT_CONSUMED');
 return Object.freeze({
  original_work_id:scope.workId,owner_id:session.user_id,
  conversation_id:scope.conversationId,goal_revision:scope.goalRevision,
  candidate_sha256:scope.candidateSha,head_sha:scope.headSha,
  github_pr_number:scope.githubPrNumber,
  grant_id:reserved.reservation_id,
  status:'CONSUMED_ONCE',
  authorized_by:session.user_id,
  operation:stage==='INSTALL'?'github:install_exact_verified_upgrade':'resume_original_work',
  original_goal_id:plan.original_goal_id,
  repository:REPO,base_ref:BASE,
  promotion_only:stage==='INSTALL',
  separate_from_draft_authorization:stage==='INSTALL',
  separate_from_install_authorization:stage==='RESUME',
  work_fingerprint:a.work_fingerprint,
  execution_reservation_settlement_pending:true,
 });
}
export async function consumeOwnerUpgradeInstallGrant(args={}){
 return consume({...args,stage:'INSTALL'});
}
export async function consumeOwnerUpgradeResumeGrant(args={}){
 return consume({...args,stage:'RESUME'});
}

export async function settleOwnerUpgradeStageGrant({
 stage,session,scope,plan,grant,installed,outcome,env=process.env,
 storeFactory=createSingleUseExecutionReservationStore,
}={}){
 assertScope({session,conversationId:scope?.conversationId,scope,plan,stage,installed,env});
 if(grant?.status!=='CONSUMED_ONCE'||!validUuid(grant.grant_id)||
    grant.owner_id!==session.user_id||
    grant.conversation_id!==scope.conversationId||
    grant.original_work_id!==scope.workId||
    grant.goal_revision!==scope.goalRevision||
    grant.candidate_sha256!==scope.candidateSha||
    grant.head_sha!==scope.headSha||
    grant.github_pr_number!==scope.githubPrNumber||
    grant.authorized_by!==session.user_id||
    grant.operation!==(stage==='INSTALL'?
     'github:install_exact_verified_upgrade':'resume_original_work'))
  fail('UPGRADE_STAGE_SETTLEMENT_CONSUMED_EXACT_GRANT_REQUIRED');
 let evidenceRef;
 if(stage==='INSTALL'){
  if(installed?.independent!==true||
     installed.installed!==true||
     installed.exact_candidate_files_verified!==true||
     installed.production_deployment_performed!==false||
     installed.original_work_id!==scope.workId||
     installed.candidate_sha256!==scope.candidateSha||
     !SHA.test(String(installed.merge_commit_sha||'')))
   fail('UPGRADE_STAGE_SETTLEMENT_INDEPENDENT_INSTALL_MISSING');
  evidenceRef='github-preview-merge:'+installed.merge_commit_sha;
 }else{
  if(outcome?.independent!==true||
     outcome.original_job_completed!==true||
     outcome.original_work_id!==scope.workId||
     outcome.work_id!==scope.workId||
     outcome.owner_id!==session.user_id||
     outcome.conversation_id!==scope.conversationId||
     outcome.goal_revision!==scope.goalRevision||
     outcome.capability_sha256!==scope.candidateSha||
     typeof outcome.execution_receipt_id!=='string'||
     !outcome.execution_receipt_id||outcome.execution_receipt_id.length>170)
   fail('UPGRADE_STAGE_SETTLEMENT_ORIGINAL_JOB_NOT_INDEPENDENT');
  evidenceRef='original-work-verified:'+outcome.execution_receipt_id;
 }
 const store=storeFactory({session,conversationId:scope.conversationId,env});
 if(typeof store?.settle!=='function')
  fail('UPGRADE_STAGE_SETTLEMENT_ATOMIC_STORE_REQUIRED');
 const result=await store.settle({
  reservationId:grant.grant_id,outcome:'VERIFIED',
  verificationReceiptRef:evidenceRef,
 });
 if(result?.reservation_id!==grant.grant_id||result?.status!=='VERIFIED'||
    result.verification_receipt_ref!==evidenceRef)
  fail('UPGRADE_STAGE_SETTLEMENT_DURABLE_PROVIDER_READBACK_REQUIRED');
 return Object.freeze({status:'VERIFIED',
  reservation_id:grant.grant_id,verification_receipt_ref:evidenceRef,
  durably_settled:true,external_action_authority_expended:true,
 });
}
