// Server-only final closure circuit for an owner-bound Reality self-upgrade.
// This is an orchestration boundary, NOT an HTTP endpoint or an authority
// issuer. The owner Continuity, approval, GitHub, registry and original-job
// adapters MUST be server-owned independently implemented read/write services.
// No default write adapter exists. Unknown effects are never retried.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {loadAuthenticatedVerifiedUpgradeDraftReceipt}
 from './reality-owner-upgrade-draft-continuity-v0.1.js';
import {verifyUpgradeEvidenceWarrant}
 from './reality-upgrade-evidence-warrant-v0.1.js';
import {verifyIndependentUpgradeDraftCI}
 from './reality-independent-upgrade-ci-readback-v0.1.js';

export const OWNER_BOUND_UPGRADE_CLOSURE_VERSION='reality-owner-bound-upgrade-closure-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const fail=code=>{throw Error(code)};
const matches=(item,scope)=>item?.original_work_id===scope.workId&&
 item?.owner_id===scope.ownerId&&item?.conversation_id===scope.conversationId&&
 item?.goal_revision===scope.goalRevision&&
 item?.candidate_sha256===scope.candidateSha&&
 item?.head_sha===scope.headSha;
const mandatoryPort=(ports,name)=>{
 if(typeof ports?.[name]!=='function')fail('UPGRADE_CLOSURE_ADAPTER_MISSING_'+name);
 return ports[name];
};

// The output can be exposed to a signed-in owner as an approval request,
// but cannot authorize an installation or execute any original job.
export async function prepareOwnerBoundUpgradeClosure({
 session,conversationId,originalWorkId,env=process.env,
 loadTrustedUpgrade=loadAuthenticatedWarrantedUpgrade,
 loadVerifiedDraft=loadAuthenticatedVerifiedUpgradeDraftReceipt,
 ciRunIds,fetchImpl=fetch,
}={}){
 if(env?.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    !validUuid(conversationId)||!WORK.test(String(originalWorkId||''))||
    typeof loadTrustedUpgrade!=='function'||
    typeof loadVerifiedDraft!=='function')
  fail('UPGRADE_CLOSURE_SIGNED_IN_OWNER_SOURCE_REQUIRED');
 const verified=await loadTrustedUpgrade({
  session,conversationId,originalWorkId,env,
 });
 if(verified?.owner_id!==session.user_id||
    verified?.conversation_id!==conversationId||
    verified?.original_work_id!==originalWorkId||
    verified?.persisted_and_reobserved!==true||
    verified?.external_action_authorized!==false||
    verified?.original_job_completed!==false)
  fail('UPGRADE_CLOSURE_VERIFIED_OWNER_CONTINUITY_MISSING');
 const actual=verifyUpgradeEvidenceWarrant({
  warrant:verified.evidence_warrant,
  experiment:verified.verifiedExperiment,
  verifierReceipt:verified.verifierReceipt,
  originalWorkItem:verified.originalWorkItem,
  blockedCheckpointId:verified.blocked_checkpoint_receipt_id,
  goalRevision:verified.goal_revision,
  ownerId:session.user_id,conversationId,
  baseCommitSha:verified.evidence_warrant?.pinned_base_commit_sha,env,
 });
 if(actual.valid!==true||actual.execution_authorized!==false||
    actual.warrant_id!==verified.evidence_warrant_id)
  fail('UPGRADE_CLOSURE_FRESH_SIGNED_WARRANT_REQUIRED');
 // This receipt MUST have been independently persisted and reconstructed
 // after a prior owner-authorized, one-time GitHub draft PR dispatch.
 const draft=await loadVerifiedDraft({session,conversationId,originalWorkId,env});
 if(draft?.owner_id!==session.user_id||
    draft?.conversation_id!==conversationId||
    draft?.original_work_id!==originalWorkId||
    draft?.goal_revision!==verified.goal_revision||
    draft?.candidate_sha256!==actual.candidate_sha256||
    draft?.verification_hash!==verified.verifiedExperiment?.verification_hash||
    draft?.warrant_id!==actual.warrant_id||
    draft?.durably_recorded!==true||draft?.independently_reobserved!==true||
    draft?.draft_pr_verified!==true||
    draft?.reservation_status!=='VERIFIED'||
    draft?.production_merge_authorized!==false||
    draft?.capability_installed!==false||
    draft?.original_job_completed!==false||
    draft?.pinned_base_sha!==verified.evidence_warrant.pinned_base_commit_sha)
  fail('UPGRADE_CLOSURE_DURABLE_EXACT_DRAFT_REQUIRED');
 const ci=await verifyIndependentUpgradeDraftCI({
  originalWorkId,prNumber:draft.github_pr_number,
  expectedHeadSha:draft.github_commit_sha,
  expectedBranch:draft.github_branch,
  pinnedBaseSha:draft.pinned_base_sha,
  requiredRunIds:ciRunIds,fetchImpl,
 });
 if(ci?.state!=='EXACT_DRAFT_PR_CI_VERIFIED_PROMOTION_STILL_BLOCKED'||
    ci.independent_github_readback!==true||
    ci.promotion_authorized!==false||
    ci.original_job_completed!==false)
  fail('UPGRADE_CLOSURE_INDEPENDENT_CI_NOT_VERIFIED');
 return Object.freeze({
  version:OWNER_BOUND_UPGRADE_CLOSURE_VERSION,
  state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
  owner_id:session.user_id,conversation_id:conversationId,
  original_work_id:originalWorkId,
  original_goal_id:verified.original_goal_id,
  goal_revision:verified.goal_revision,
  continuity_root_id:verified.originalWorkItem.continuity_root_id,
  worldline_id:verified.originalWorkItem.worldline_id,
  capability_id:verified.verifiedExperiment.capability_id,
  candidate_sha256:actual.candidate_sha256,
  verified_experiment_hash:verified.verifiedExperiment.verification_hash,
  warrant_id:actual.warrant_id,
  github_pr_number:draft.github_pr_number,
  github_pr_url:ci.pull_request_url,
  github_branch:draft.github_branch,
  github_head_sha:ci.tested_head_sha,
  pinned_base_sha:draft.pinned_base_sha,
  verified_ci_runs:ci.required_workflows,
  customer_installation_authorized:false,
  capability_installed:false,
  original_job_resumed:false,
  original_job_completed:false,
 });
}

// After an explicit and separately recorded owner approval, adapters make
// the actual side effects and independent observations. This must only run
// from trusted server code; never accept a browser-supplied prepared plan.
// Approval to INSTALL is never approval to run the original business action.
export async function executeOwnerBoundUpgradeClosure({
 session,conversationId,originalWorkId,env=process.env,
 prepare=prepareOwnerBoundUpgradeClosure,
 prepareArgs={},ports,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(originalWorkId||''))||
    env?.VERCEL_ENV!=='preview'||typeof prepare!=='function')
  fail('UPGRADE_CLOSURE_TRUSTED_PREVIEW_CONTEXT_REQUIRED');
 const names=['consumeInstallGrant','install','observeInstall',
  'settleInstallGrant','register','readRegistry','readFreshGoal',
  'consumeResumeGrant','resumeOriginal','observeOriginal',
  'settleResumeGrant','appendSettlement','readSettlement'];
 for(const name of names)mandatoryPort(ports,name);
 // Never derive a trusted ready plan from caller JSON. The trusted preparer
 // must re-load owner Continuity and provider evidence immediately.
 const plan=await prepare({...prepareArgs,session,conversationId,originalWorkId,env});
 if(plan?.state!=='AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION'||
    plan.owner_id!==session.user_id||plan.conversation_id!==conversationId||
    plan.original_work_id!==originalWorkId||
    plan.customer_installation_authorized!==false||
    plan.capability_installed!==false||plan.original_job_completed!==false||
    !SHA256.test(String(plan.candidate_sha256||''))||
    !SHA.test(String(plan.github_head_sha||''))||
    !SHA.test(String(plan.pinned_base_sha||''))||
    !Array.isArray(plan.verified_ci_runs)||plan.verified_ci_runs.length!==2)
  fail('UPGRADE_CLOSURE_FRESH_PREPARED_PROOF_REQUIRED');
 const scope=Object.freeze({
  ownerId:session.user_id,conversationId,workId:originalWorkId,
  goalRevision:plan.goal_revision,candidateSha:plan.candidate_sha256,
  headSha:plan.github_head_sha,
  pinnedBaseSha:plan.pinned_base_sha,
  githubPrNumber:plan.github_pr_number,base:BASE,
  continuityRootId:plan.continuity_root_id,worldlineId:plan.worldline_id,
 });
 let attempted=false,phase='INSTALL_GRANT';
 try{
  // Only this trusted storage adapter may validate and ATOMICALLY consume
  // a distinct installation grant; no approval object is supplied by HTTP.
  const grant=await ports.consumeInstallGrant({session,conversationId,plan,scope,env});
  if(!matches(grant,scope)||grant?.status!=='CONSUMED_ONCE'||
     grant?.operation!=='github:install_exact_verified_upgrade'||
     grant?.repository!=='maloney2323/Reality'||
     grant?.base_ref!==BASE||
     grant?.github_pr_number!==plan.github_pr_number||
     grant?.authorized_by!==session.user_id||
     grant?.separate_from_draft_authorization!==true||
     !validUuid(grant?.grant_id)||grant?.promotion_only!==true)
   fail('UPGRADE_CLOSURE_SEPARATE_CONSUMED_INSTALL_GRANT_REQUIRED');
  attempted=true;phase='INSTALL';
  const issued=await ports.install({session,scope,plan,grant,env});
  phase='INSTALL_READBACK';
  const installed=await ports.observeInstall({session,scope,plan,grant,issued,env});
  if(!matches(installed,scope)||installed?.independent!==true||
     installed?.installed!==true||
     installed?.github_pr_number!==plan.github_pr_number||
     installed?.base_ref!==BASE||
     installed?.exact_candidate_files_verified!==true||
     !SHA.test(String(installed?.merge_commit_sha||''))||
     installed?.production_deployment_performed!==false)
   fail('UPGRADE_CLOSURE_INDEPENDENT_INSTALL_READBACK_REQUIRED');
  phase='INSTALL_GRANT_SETTLEMENT';
  const installationLease=await ports.settleInstallGrant({
   session,scope,plan,grant,installed,outcome:'VERIFIED',env,
  });
  if(installationLease?.status!=='VERIFIED'||
     installationLease?.reservation_id!==grant.grant_id||
     installationLease?.durably_settled!==true)
   fail('UPGRADE_CLOSURE_INSTALL_RESERVATION_NOT_DURABLY_SETTLED');
  phase='REGISTRATION';
  await ports.register({session,scope,plan,installed,env});
  phase='REGISTRY_READBACK';
  const active=await ports.readRegistry({session,scope,plan,installed,env});
  if(!matches(active,scope)||active?.registered!==true||
     active?.runtime_active!==true||
     active?.capability_id!==plan.capability_id||
     active?.merge_commit_sha!==installed.merge_commit_sha||
     active?.independently_reobserved!==true)
   fail('UPGRADE_CLOSURE_CAPABILITY_NOT_ACTIVE_OR_VERIFIED');
  phase='FRESH_ORIGINAL_GOAL';
  const goal=await ports.readFreshGoal({session,conversationId,scope,plan,env});
  if(goal?.principal_id!==session.user_id||
     goal?.conversation_id!==conversationId||
     goal?.active_goal_id!==plan.original_goal_id||
     goal?.goal_revision!==plan.goal_revision||
     goal?.active!==true||goal?.user_confirmed!==true||
     goal?.original_job_completed!==false)
   fail('UPGRADE_CLOSURE_ORIGINAL_OWNER_GOAL_CHANGED');
  // A second separately consumed grant must authorize the *original task*
  // against the fresh goal, not reuse the installation grant.
  phase='RESUME_GRANT';
  const resumeGrant=await ports.consumeResumeGrant({session,scope,plan,goal,installed,env});
  if(!matches(resumeGrant,scope)||
     resumeGrant?.status!=='CONSUMED_ONCE'||
     resumeGrant?.operation!=='resume_original_work'||
     resumeGrant?.authorized_by!==session.user_id||
     resumeGrant?.original_goal_id!==plan.original_goal_id||
     !validUuid(resumeGrant?.grant_id)||
     resumeGrant.grant_id===grant.grant_id||
     resumeGrant?.separate_from_install_authorization!==true)
   fail('UPGRADE_CLOSURE_SEPARATE_ORIGINAL_WORK_AUTHORITY_REQUIRED');
  phase='ORIGINAL_EXECUTION';
  const resumed=await ports.resumeOriginal({session,scope,plan,active,goal,resumeGrant,env});
  phase='ORIGINAL_OBSERVATION';
  const outcome=await ports.observeOriginal({
   session,scope,plan,resumed,resumeGrant,env,
  });
  if(!matches(outcome,scope)||outcome?.independent!==true||
     outcome?.original_job_completed!==true||
     outcome?.original_goal_id!==plan.original_goal_id||
     outcome?.work_id!==originalWorkId||
     outcome?.capability_sha256!==plan.candidate_sha256||
     typeof outcome?.execution_receipt_id!=='string'||
     !outcome.execution_receipt_id||
     typeof outcome?.evidence_ref!=='string'||!outcome.evidence_ref)
   fail('UPGRADE_CLOSURE_ORIGINAL_JOB_OBSERVATION_NOT_VERIFIED');
  phase='RESUME_GRANT_SETTLEMENT';
  const originalLease=await ports.settleResumeGrant({
   session,scope,plan,resumeGrant,outcome,outcomeState:'VERIFIED',env,
  });
  if(originalLease?.status!=='VERIFIED'||
     originalLease?.reservation_id!==resumeGrant.grant_id||
     originalLease?.durably_settled!==true)
   fail('UPGRADE_CLOSURE_ORIGINAL_RESERVATION_NOT_DURABLY_SETTLED');
  phase='SETTLEMENT';
  const receipt=await ports.appendSettlement({
   session,scope,plan,installed,active,outcome,env,
  });
  phase='SETTLEMENT_READBACK';
  const saved=await ports.readSettlement({session,scope,plan,receipt,outcome,env});
  if(!matches(saved,scope)||
     saved?.original_goal_id!==plan.original_goal_id||
     saved?.continuity_root_id!==plan.continuity_root_id||
     saved?.worldline_id!==plan.worldline_id||
     saved?.original_job_completed!==true||
     saved?.independently_reobserved!==true||
     saved?.execution_receipt_id!==outcome.execution_receipt_id||
     saved?.evidence_ref!==outcome.evidence_ref||
     saved?.capability_sha256!==plan.candidate_sha256||
     typeof saved?.settlement_receipt_id!=='string'||!saved.settlement_receipt_id)
   fail('UPGRADE_CLOSURE_DURABLE_ORIGINAL_WORK_SETTLEMENT_REQUIRED');
  return Object.freeze({
   version:OWNER_BOUND_UPGRADE_CLOSURE_VERSION,
   status:'ORIGINAL_CUSTOMER_JOB_SETTLED_AFTER_VERIFIED_UPGRADE',
   original_work_id:originalWorkId,
   original_goal_id:plan.original_goal_id,
   capability_id:plan.capability_id,
   installed_commit_sha:installed.merge_commit_sha,
   original_job_execution_receipt_id:outcome.execution_receipt_id,
   settlement_receipt_id:saved.settlement_receipt_id,
   original_job_completed:true,
   independent_install_readback:true,independent_job_readback:true,
   durable_settlement_readback:true,
   installation_reservation_settled:true,
   original_work_reservation_settled:true,
   production_deployment_performed:false,
  });
 }catch(error){
  // Partial effects may have occurred. Never claim completion or retry
  // automatically, even if an adapter says the operation is safe to repeat.
  return Object.freeze({
   version:OWNER_BOUND_UPGRADE_CLOSURE_VERSION,
   status:'UNRESOLVED_NO_AUTOMATIC_RETRY',
   original_work_id:originalWorkId,
   blocked_at:phase,
   blocked_reason:/^UPGRADE_CLOSURE_[A-Z0-9_]+$/.test(String(error?.message||''))?
    error.message:'UPGRADE_CLOSURE_PROVIDER_OR_READBACK_UNCERTAIN',
   external_effect_may_have_occurred:attempted,
   original_job_completed:false,no_automatic_retry:true,
  });
 }
}
