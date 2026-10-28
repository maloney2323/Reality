// Exact-source, authenticated and at-most-once self-upgrade draft-PR dispatch.
// Reuses Reality's EXISTING goal-bound authority, single-use Postgres lease,
// governed execution engine, sandbox-proof contract and self-build controller.
// No public route is connected until loadTrustedUpgrade loads an independently
// verified, owner-scoped SANDBOX_VERIFIED event from durable Continuity.
// Never trust a proposal, owner approval, lease or experiment from HTTP JSON.
import {createHash} from 'node:crypto';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {fingerprintApprovedWorkItem}
 from './reality-authority-v1.0.js';
import {reserveAuthenticatedPersonalExecution}
 from './reality-personal-execution-reservation-service-v0.1.js';
import {executeAuthorizedWork}
 from './reality-governed-execution-engine-v0.1.js';
import {prepareGovernedAutonomousUpgrade,executeGovernedAutonomousUpgradeDraft}
 from './reality-governed-autonomous-upgrade-orchestrator-v0.1.js';
import {githubGet,githubWrite}
 from './reality-connector-github-v1.0.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {verifyUpgradeEvidenceWarrant}
 from './reality-upgrade-evidence-warrant-v0.1.js';
import {assertUpgradeBaseReady}
 from './reality-upgrade-base-readiness-v0.1.js';
import {saveOwnerUpgradeDraftReceipt}
 from './reality-owner-upgrade-draft-continuity-v0.1.js';

export const GOVERNED_UPGRADE_DISPATCH_VERSION='reality-governed-upgrade-dispatch-v0.1';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK=/^work:[a-f0-9]{32}$/,SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error(code)};
const sha=value=>createHash('sha256').update(value).digest('hex');

export function exactGovernedUpgradeWorkItem(plan,{warrant}={}){
 if(plan?.state!=='AWAITING_EXACT_DRAFT_PR_AUTHORIZATION'||
    !WORK.test(String(plan.original_work_id||''))||
    !/^build:[a-f0-9]{32}$/.test(String(plan.proposal?.build_id||''))||
    !/^[a-f0-9]{64}$/.test(String(plan.verified_candidate_hash||''))||
    !/^[a-f0-9]{64}$/.test(String(plan.verified_experiment_hash||''))||
    plan.proposal.base_ref!==BASE||
    plan.proposal.production_merge_permitted!==false)
  fail('UPGRADE_EXACT_WORK_ITEM_SOURCE_REQUIRED');
 return Object.freeze({
  work_item_id:plan.original_work_id,
  workflow_id:'workflow:'+plan.original_work_id,
  connector:'github',
  operation:'create_isolated_upgrade_pr',
  action:'Create a reviewed draft PR for an independently verified missing capability',
  inputs:Object.freeze({
   repository:REPO,base_ref:BASE,
   build_id:plan.proposal.build_id,
   candidate_hash:plan.verified_candidate_hash,
   verification_hash:plan.verified_experiment_hash,
   evidence_warrant_id:warrant?.warrant_id||null,
   evidence_warrant_sha256:warrant?.warrant_id?.startsWith('warrant:')?
    warrant.warrant_id.slice('warrant:'.length):null,
   original_continuity_root_id:plan.continuity_root_id,
   original_worldline_id:plan.worldline_id,
   candidate_paths:plan.proposal.files.map(x=>x.path),
   draft:true,production_merge_permitted:false,
  }),
  resource:REPO,
  consequential:true,
  authority_required:['EXACT_SIGNED_IN_USER_WORK_APPROVAL','SEPARATE_EXECUTION_CONFIRMATION'],
  status:'READY',
 });
}

export async function dispatchAuthenticatedGovernedUpgradeDraft({
 session,conversationId,originalWorkId,expectedCandidateHash,
 groundingProof,executionConfirmation,env=process.env,
 loadTrustedUpgrade=loadAuthenticatedWarrantedUpgrade,
 reserve=reserveAuthenticatedPersonalExecution,
 execute=executeAuthorizedWork,
 providerGet=githubGet,providerWrite=githubWrite,
 recordDraft=saveOwnerUpgradeDraftReceipt,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(originalWorkId||''))||
    !/^[a-f0-9]{64}$/.test(String(expectedCandidateHash||''))||
    executionConfirmation!=='EXECUTE_ONE_EXACT_VERIFIED_UPGRADE_DRAFT_PR'||
    typeof loadTrustedUpgrade!=='function')
  fail('UPGRADE_SIGNED_IN_EXACT_CONFIRMATION_AND_SOURCE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_ISOLATED_OWNER_DB_REQUIRED');
 if(typeof env.REALITY_GITHUB_TOKEN!=='string'||!env.REALITY_GITHUB_TOKEN.trim())
  fail('UPGRADE_PREVIEW_GITHUB_WRITE_CREDENTIAL_REQUIRED');
 // loadTrustedUpgrade must reconstruct a Continuity event on the ORIGINAL
 // root/worldline, and independently verify its sandbox/frozen regressions.
 // No HTTP adapter or default source loader is supplied by this module.
 const verified=await loadTrustedUpgrade({session,conversationId,originalWorkId,env});
 const originalWorkItem=verified?.originalWorkItem;
 const verifiedExperiment=verified?.verifiedExperiment;
 if(originalWorkItem?.id!==originalWorkId||
    verified?.owner_id!==session.user_id||
    verified?.conversation_id!==conversationId||
    verified?.persisted_and_reobserved!==true||
    verified?.verified_not_authorized!==true||
    verified?.external_action_authorized!==false||
    verified?.original_job_completed!==false)
  fail('UPGRADE_OWNER_SCOPED_DURABLE_SOURCE_MISSING');
 // The key and verifier receipt are read from owner-scoped durable
 // Continuity, not from user-submitted JSON. Reverify immediately before
 // building a single-use execution policy.
 const warrant=verified.evidence_warrant;
 const attested=verifyUpgradeEvidenceWarrant({
  warrant,experiment:verifiedExperiment,
  verifierReceipt:verified.verifierReceipt,
  originalWorkItem,blockedCheckpointId:verified.blocked_checkpoint_receipt_id,
  goalRevision:verified.goal_revision,ownerId:session.user_id,
  conversationId,baseCommitSha:warrant?.pinned_base_commit_sha,env,
 });
 if(!attested.valid||attested.execution_authorized!==false||
    attested.candidate_sha256!==expectedCandidateHash||
    verified.evidence_warrant_id!==attested.warrant_id)
  fail('UPGRADE_PAYLOAD_TIED_WARRANT_INVALID_OR_EXPIRED');
 const plan=prepareGovernedAutonomousUpgrade({originalWorkItem,verifiedExperiment});
 if(plan.original_work_id!==originalWorkId||
    plan.verified_candidate_hash!==expectedCandidateHash)
  fail('UPGRADE_BROWSER_CONFIRMED_CANDIDATE_CHANGED');
 const workItem=exactGovernedUpgradeWorkItem(plan,{warrant});
 // Every consequential effect must be bound to this work-item fingerprint;
 // source evidence and candidate bytes were re-observed on the server.
 const fp=fingerprintApprovedWorkItem(workItem);
 // Check target branch before reserving the one-time execution claim.
 const branch=await providerGet(ROOT+'/git/ref/heads/'+BASE);
 const pinned=branch?.object?.sha;
 if(branch?.ref!=='refs/heads/'+BASE||!SHA.test(String(pinned||''))||
    pinned!==warrant.pinned_base_commit_sha)
  fail('UPGRADE_GITHUB_BASE_READBACK_REQUIRED');
 // Independent source preflight: never consume authorization if the pinned
 // base cannot run BOTH CI suites for the generated extension files.
 await assertUpgradeBaseReady({providerGet,baseCommitSha:pinned});
 const reserved=await reserve({
  session,conversationId,workItem,groundingProof,env,
 });
 if(reserved?.status!=='SINGLE_USE_RESERVED_PENDING_DISPATCH'||
    reserved.work_item_fingerprint!==fp||
    !validUuid(reserved.reservation_id)||
    reserved.internal?.reservation?.status!=='RESERVED_NOT_DISPATCHED'||
    typeof reserved.internal?.store?.begin!=='function'||
    typeof reserved.internal?.store?.settle!=='function'||
    reserved.internal?.authorization?.authorized!==true||
    reserved.internal?.serverApprovalProof?.work_item_id!==originalWorkId||
    reserved.internal?.serverFreshGoalAdmission?.work_item_fingerprint!==fp||
    reserved.internal?.serverFreshGoalAdmission?.principal_id!==session.user_id||
    reserved.internal?.serverFreshGoalAdmission?.conversation_id!==conversationId)
  fail('UPGRADE_DURABLE_GOAL_BOUND_RESERVATION_UNVERIFIED');
 const policyId=reserved.action_policy_id;
 if(!policyId||policyId!==reserved.internal.serverFreshGoalAdmission.action_policy_id||
    policyId!==reserved.internal.serverApprovalProof.policy_id)
  fail('UPGRADE_EXACT_PERSISTED_POLICY_MISMATCH');
 const policyHash=sha(policyId);
 const ownerApproval=Object.freeze({
  verified_by_server:true,
  original_work_id:originalWorkId,
  approved_build_id:plan.proposal.build_id,
  approved_candidate_hash:plan.verified_candidate_hash,
  operation:'github:create_isolated_upgrade_pr',
  authorization_ref:policyId,
  authorized_by:session.user_id,
  policy_sha:policyHash,
  promotion_authorized:false,
 });
 const singleUseLease=reserved.internal.reservation;
 let confirmedDispatch=null,dispatchAttempted=false,observedDraft=null;
 const reservationStore={
  async begin({reservationId}={}){
   if(dispatchAttempted)fail('UPGRADE_DISPATCH_ALREADY_STARTED_NO_RETRY');
   dispatchAttempted=true;
   const result=await reserved.internal.store.begin({reservationId});
   if(result?.status!=='DISPATCHING'||
      result?.single_use_claim_consumed!==true||
      result.reservation_id!==reserved.reservation_id)
    fail('UPGRADE_ATOMIC_RESERVATION_CONSUMPTION_UNVERIFIED');
   confirmedDispatch=Object.freeze({
    ...result,original_work_id:originalWorkId,
    approved_build_id:plan.proposal.build_id,
    approved_candidate_hash:plan.verified_candidate_hash,
    operation:'github:create_isolated_upgrade_pr',
    repository:REPO,base_ref:BASE,pinned_base_sha:pinned,
    authorization_policy_sha:policyHash,
    production_merge_authorized:false,
   });
   return result;
  },
  settle:args=>reserved.internal.store.settle(args),
 };
 const connector={
  async execute(){
   if(!confirmedDispatch)fail('UPGRADE_EXECUTION_WITHOUT_CONSUMED_RESERVATION');
   observedDraft=await executeGovernedAutonomousUpgradeDraft({
    plan,verifiedExperiment,originalWorkItem,ownerApproval,
    consumedReservation:confirmedDispatch,get:providerGet,write:providerWrite,
   });
   if(observedDraft?.draft_pr_verified!==true||
      observedDraft.original_work_id!==originalWorkId)
    fail('UPGRADE_DRAFT_PR_NOT_VERIFIED');
   return {observation:observedDraft,
    providerExecutionId:observedDraft.github_pr_url};
  },
 };
 const independentVerifier={
  async verify({providerResult}={}){
   const p=providerResult?.observation;
   if(!p||p!==observedDraft||
      !Number.isSafeInteger(p.github_pr_number)||
      !SHA.test(String(p.github_commit_sha||'')))
    fail('UPGRADE_POST_PR_INDEPENDENT_READBACK_REQUIRED');
   // A separate, fresh provider call, after the inner provider's readback.
   const actual=await providerGet(ROOT+'/pulls/'+p.github_pr_number);
   const verified=actual?.number===p.github_pr_number&&
    actual?.head?.sha===p.github_commit_sha&&
    actual?.head?.ref===p.github_branch&&
    actual?.base?.ref===BASE&&
    actual?.draft===true&&actual?.merged===false&&
    actual?.html_url===p.github_pr_url;
   return Object.freeze({
    verified,independent:true,
    verification_id:'reality:upgrade-pr:'+p.github_pr_number+':'+p.github_commit_sha,
    basis:verified?'INDEPENDENT_GITHUB_PR_GET':'GITHUB_PR_READBACK_MISMATCH',
    observedState:verified?'DRAFT_PR_OPEN_WITH_EXACT_COMMIT':'UNVERIFIED',
   });
  },
 };
 let result;
 try{
  result=await execute({
   workItem,workflowId:workItem.workflow_id,
   authorization:reserved.internal.authorization,
   serverApprovalProof:reserved.internal.serverApprovalProof,
   serverFreshGoalAdmission:reserved.internal.serverFreshGoalAdmission,
   serverSingleUseReservation:singleUseLease,
   reservationStore,connector,independentVerifier,
   requestSummary:'One signed-in, exact, verified extension draft PR',
   requestFingerprint:fp,
  });
 }catch{
  // A provider action or reservation may have happened. Do NOT rearm.
  return Object.freeze({status:'UNRESOLVED_NO_RETRY',
   original_work_id:originalWorkId,reservation_id:reserved.reservation_id,
   external_action_may_have_occurred:true,original_job_completed:false,
   no_automatic_retry:true});
 }
 if(result?.status!=='VERIFIED'||result?.outcome?.verified!==true||
    result?.reservation_settlement?.status!=='VERIFIED'||
    observedDraft?.draft_pr_verified!==true)
  return Object.freeze({status:'UNRESOLVED_NO_RETRY',
   original_work_id:originalWorkId,reservation_id:reserved.reservation_id,
   external_action_may_have_occurred:dispatchAttempted,
   original_job_completed:false,no_automatic_retry:true,
   blocked_reason:result?.blocked_reason||'UPGRADE_DURABLE_VERIFICATION_UNRESOLVED'});
 const dispatchProof=Object.freeze({
  status:'DRAFT_PR_VERIFIED_AND_RESERVATION_SETTLED',
  original_work_id:originalWorkId,
  original_continuity_root_id:plan.continuity_root_id,
  original_worldline_id:plan.worldline_id,
  candidate_hash:plan.verified_candidate_hash,
  verification_hash:plan.verified_experiment_hash,
  github_pr_url:observedDraft.github_pr_url,
  github_pr_number:observedDraft.github_pr_number,
  github_commit_sha:observedDraft.github_commit_sha,
  reservation_id:reserved.reservation_id,
  reservation_status:'VERIFIED',
  draft_pr_verified:true,
  provider_action_performed:true,
  independent_post_pr_ci_verified:false,
  capability_promoted:false,
  original_job_resumed:false,
  original_job_completed:false,
  further_promotion_requires_new_authority:true,
  goal_revision:verified.goal_revision,
  warrant_id:verified.evidence_warrant_id,
  pinned_base_sha:pinned,
  github_branch:observedDraft.github_branch,
 });
 try{
  const saved=await recordDraft({
   session,conversationId,originalWorkId,dispatch:dispatchProof,env,
  });
  if(saved?.durably_recorded!==true||saved?.independently_reobserved!==true||
     typeof saved.receipt_id!=='string'||!validUuid(saved.receipt_id)||
     saved.original_work_id!==originalWorkId||
     saved.github_commit_sha!==observedDraft.github_commit_sha||
     saved.candidate_sha256!==plan.verified_candidate_hash)
   fail('UPGRADE_DRAFT_DURABLE_CONTINUITY_READBACK_REQUIRED');
  return Object.freeze({...dispatchProof,
   owner_continuity_draft_receipt_id:saved.receipt_id,
   draft_durably_recorded:true,
   independently_reobserved:true,
  });
 }catch{
  // The GitHub PR and one-time reservation ALREADY exist. No retry.
  return Object.freeze({
   status:'UNRESOLVED_NO_RETRY',original_work_id:originalWorkId,
   github_pr_number:observedDraft.github_pr_number,
   github_pr_url:observedDraft.github_pr_url,
   reservation_id:reserved.reservation_id,
   blocked_reason:'UPGRADE_DRAFT_OWNER_CONTINUITY_NOT_VERIFIED',
   external_action_may_have_occurred:true,
   original_job_completed:false,no_automatic_retry:true,
  });
 }
}
