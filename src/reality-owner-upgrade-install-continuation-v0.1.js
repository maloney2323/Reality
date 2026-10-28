// Async-safe continuation of ONE already installed, owner-authorized upgrade.
// Unlike a one-shot merge+CI path this NEVER invokes GitHub merge again.
// A service-role-only readback of the exact settled install lease is required
// before reobserving source bytes, runtime CI, registration, original action,
// and durable original-work settlement. Repeated read-only waits are safe.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {fingerprintApprovedWorkItem}
 from './reality-authority-v1.0.js';
import {exactOwnerUpgradeStageWorkItem}
 from './reality-owner-upgrade-stage-authority-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {loadAuthenticatedVerifiedUpgradeDraftReceipt}
 from './reality-owner-upgrade-draft-continuity-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {connectOwnerGithubUpgradeToClosure}
 from './reality-owner-upgrade-github-live-ports-v0.1.js';

export const OWNER_UPGRADE_INSTALL_CONTINUATION_VERSION='reality-owner-upgrade-install-continuation-v0.1';
const WORK=/^work:[a-f0-9]{32}$/,SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const BASE='experiment/reality-live-durable-adversarial-20261025';
const fail=c=>{throw Error(c)};
function matches(v,s){return v?.original_work_id===s.workId&&
 v?.owner_id===s.ownerId&&v?.conversation_id===s.conversationId&&
 v?.goal_revision===s.goalRevision&&
 v?.candidate_sha256===s.candidateSha&&v?.head_sha===s.headSha}
export async function prepareOwnerInstalledUpgradeContinuation({
 session,conversationId,originalWorkId,env=process.env,
 loadTrusted=loadAuthenticatedWarrantedUpgrade,
 loadDraft=loadAuthenticatedVerifiedUpgradeDraftReceipt,
}={}){
 if(env?.VERCEL_ENV!=='preview'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !WORK.test(String(originalWorkId||'')))
  fail('UPGRADE_CONTINUATION_SIGNED_IN_OWNER_REQUIRED');
 const source=await loadTrusted({session,conversationId,originalWorkId,env});
 const draft=await loadDraft({session,conversationId,originalWorkId,env});
 if(source?.persisted_and_reobserved!==true||
    source.owner_id!==session.user_id||
    source.conversation_id!==conversationId||
    source.original_work_id!==originalWorkId||
    source.original_job_completed!==false||
    source.external_action_authorized!==false||
    draft?.durably_recorded!==true||
    draft.independently_reobserved!==true||
    draft.owner_id!==session.user_id||
    draft.conversation_id!==conversationId||
    draft.original_work_id!==originalWorkId||
    draft.original_goal_id!==source.original_goal_id||
    draft.goal_revision!==source.goal_revision||
    draft.candidate_sha256!==source.candidate_hash||
    draft.verification_hash!==source.verifiedExperiment?.verification_hash||
    draft.warrant_id!==source.evidence_warrant_id||
    draft.pinned_base_sha!==source.evidence_warrant?.pinned_base_commit_sha||
    draft.draft_pr_verified!==true||
    draft.reservation_status!=='VERIFIED'||
    draft.production_merge_authorized!==false||
    draft.capability_installed!==false||
    draft.original_job_completed!==false||
    !Number.isSafeInteger(draft.github_pr_number)||draft.github_pr_number<1||
    !/^reality\/build\/build-[a-f0-9]{32}$/.test(String(draft.github_branch||''))||
    !SHA.test(String(draft.github_commit_sha||''))||
    !SHA.test(String(draft.pinned_base_sha||''))||
    !HASH.test(String(draft.candidate_sha256||'')))
  fail('UPGRADE_CONTINUATION_EXACT_SAVED_OWNER_PROOF_REQUIRED');
 const plan=Object.freeze({
  state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
  owner_id:session.user_id,conversation_id:conversationId,
  original_work_id:originalWorkId,
  original_goal_id:source.original_goal_id,
  goal_revision:source.goal_revision,
  continuity_root_id:source.originalWorkItem?.continuity_root_id,
  worldline_id:source.originalWorkItem?.worldline_id,
  capability_id:source.verifiedExperiment.capability_id,
  candidate_sha256:draft.candidate_sha256,
  warrant_id:source.evidence_warrant_id,
  github_pr_number:draft.github_pr_number,
  github_pr_url:draft.github_pr_url,
  github_branch:draft.github_branch,
  github_head_sha:draft.github_commit_sha,
  pinned_base_sha:draft.pinned_base_sha,
  customer_installation_authorized:false,
  capability_installed:false,original_job_completed:false,
 });
 const scope=Object.freeze({
  ownerId:session.user_id,conversationId,workId:originalWorkId,
  goalRevision:plan.goal_revision,candidateSha:plan.candidate_sha256,
  headSha:plan.github_head_sha,pinnedBaseSha:plan.pinned_base_sha,
  githubPrNumber:plan.github_pr_number,
  continuityRootId:plan.continuity_root_id,worldlineId:plan.worldline_id,
  base:BASE,
 });
 return Object.freeze({plan,scope});
}
export async function readOwnerPreviousVerifiedInstall({
 session,scope,plan,env=process.env,fetchImpl=fetch,
}={}){
 if(env?.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    scope?.ownerId!==session.user_id||
    scope?.conversationId!==plan?.conversation_id||
    scope?.workId!==plan?.original_work_id)
  fail('UPGRADE_CONTINUATION_OWNER_INSTALL_READBACK_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('UPGRADE_CONTINUATION_OWNER_DB_UNVERIFIED');
 const item=exactOwnerUpgradeStageWorkItem({
  session,scope,plan,stage:'INSTALL',env,
 });
 const fingerprint=fingerprintApprovedWorkItem(item);
 const goalRevision=plan.goal_revision;
 if(!validUuid(goalRevision))
  fail('UPGRADE_CONTINUATION_EXACT_GOAL_RECEIPT_REQUIRED');
 const response=await fetchImpl(db.url+
  '/rest/v1/rpc/reality_read_exact_verified_upgrade_install',{
  method:'POST',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({
   p_user_id:session.user_id,p_conversation_id:scope.conversationId,
   p_work_fingerprint:fingerprint,p_goal_id:plan.original_goal_id,
   p_goal_transition_event_id:goalRevision,
  }),
 });
 if(!response?.ok)
  fail('UPGRADE_CONTINUATION_DURABLE_INSTALL_LEASE_UNAVAILABLE');
 const rows=await response.json().catch(()=>null);
 if(!Array.isArray(rows)||rows.length!==1||
    !validUuid(rows[0]?.reservation_id)||
    typeof rows[0]?.action_policy_id!=='string'||
    !rows[0].action_policy_id||
    !SHA.test(String(rows[0].verification_receipt_ref||'').replace('github-preview-merge:',''))||
    !String(rows[0].verification_receipt_ref||'').startsWith('github-preview-merge:')||
    !rows[0].settled_at)
  fail('UPGRADE_CONTINUATION_EXACT_SETTLED_INSTALL_LEASE_MISSING');
 return Object.freeze({
  reservation_id:rows[0].reservation_id,
  merge_commit_sha:rows[0].verification_receipt_ref.slice('github-preview-merge:'.length),
  work_fingerprint:fingerprint,
  settlement_evidence:rows[0].verification_receipt_ref,
  independently_reobserved:true,
 });
}
// This is a separate entry point for when post-merge GitHub Actions become
// green after the original installation request has returned. It does not
// consume another install grant or call the merge endpoint.
export async function continueOwnerUpgradeAfterVerifiedInstall({
 session,conversationId,originalWorkId,env=process.env,
 prepare=prepareOwnerInstalledUpgradeContinuation,
 readInstall=readOwnerPreviousVerifiedInstall,
 connectPorts=connectOwnerGithubUpgradeToClosure,
}={}){
 const {plan,scope}=await prepare({session,conversationId,originalWorkId,env});
 const installLease=await readInstall({session,scope,plan,env});
 const ports=connectPorts();
 const required=['observeInstall','register','readRegistry','readFreshGoal',
  'consumeResumeGrant','resumeOriginal','observeOriginal',
  'settleResumeGrant','appendSettlement','readSettlement'];
 for(const k of required)if(typeof ports?.[k]!=='function')
  fail('UPGRADE_CONTINUATION_MISSING_REAL_ADAPTER_'+k);
 const result={version:OWNER_UPGRADE_INSTALL_CONTINUATION_VERSION,
  original_work_id:originalWorkId,original_job_completed:false,
  installation_replayed:false};
 let stage='INDEPENDENT_INSTALL_RECHECK',externalJobEffect=false;
 try{
  const installed=await ports.observeInstall({
   session,scope,plan,
   issued:{github_pr_number:plan.github_pr_number},env,
  });
  if(!matches(installed,scope)||installed.independent!==true||
     installed.installed!==true||
     installed.exact_candidate_files_verified!==true||
     installed.base_ref!==BASE||
     installed.merge_commit_sha!==installLease.merge_commit_sha||
     installed.production_deployment_performed!==false)
   fail('UPGRADE_CONTINUATION_PRIOR_MERGE_NOT_INDEPENDENTLY_VERIFIED');
  stage='POST_MERGE_ISOLATED_RUNTIME';
  await ports.register({session,scope,plan,installed,env});
  const active=await ports.readRegistry({session,scope,plan,installed,env});
  if(!matches(active,scope)||active.registered!==true||
     active.runtime_active!==true||
     active.capability_id!==plan.capability_id||
     active.merge_commit_sha!==installed.merge_commit_sha||
     active.independently_reobserved!==true||
     active.customer_application_runtime_active!==false)
   fail('UPGRADE_CONTINUATION_EXACT_ACTIVE_ISOLATED_CAPABILITY_MISSING');
  stage='FRESH_ORIGINAL_GOAL';
  const goal=await ports.readFreshGoal({session,conversationId,scope,plan,env});
  if(goal?.principal_id!==session.user_id||
     goal.conversation_id!==conversationId||
     goal.active_goal_id!==plan.original_goal_id||
     goal.goal_revision!==plan.goal_revision||
     goal.active!==true||goal.user_confirmed!==true||
     goal.original_job_completed!==false)
   fail('UPGRADE_CONTINUATION_ORIGINAL_GOAL_CHANGED');
  stage='SEPARATE_ORIGINAL_EXECUTION_GRANT';
  const resumeGrant=await ports.consumeResumeGrant({
   session,scope,plan,goal,installed,env,
  });
  if(!matches(resumeGrant,scope)||
     resumeGrant.status!=='CONSUMED_ONCE'||
     resumeGrant.operation!=='resume_original_work'||
     resumeGrant.original_goal_id!==plan.original_goal_id||
     resumeGrant.authorized_by!==session.user_id||
     resumeGrant.grant_id===installLease.reservation_id||
     resumeGrant.separate_from_install_authorization!==true)
   fail('UPGRADE_CONTINUATION_SEPARATE_RESUME_GRANT_REQUIRED');
  externalJobEffect=true;stage='ORIGINAL_WORK_EXECUTION';
  const resumed=await ports.resumeOriginal({
   session,scope,plan,active,goal,resumeGrant,env,
  });
  stage='ORIGINAL_PROVIDER_OBSERVATION';
  const outcome=await ports.observeOriginal({
   session,scope,plan,resumed,resumeGrant,env,
  });
  if(!matches(outcome,scope)||outcome.independent!==true||
     outcome.original_job_completed!==true||
     outcome.work_id!==originalWorkId||
     outcome.original_goal_id!==plan.original_goal_id||
     outcome.capability_sha256!==plan.candidate_sha256||
     typeof outcome.execution_receipt_id!=='string'||!outcome.execution_receipt_id||
     typeof outcome.evidence_ref!=='string'||!outcome.evidence_ref)
   fail('UPGRADE_CONTINUATION_ORIGINAL_WORK_NOT_INDEPENDENTLY_VERIFIED');
  stage='ORIGINAL_RESERVATION_SETTLEMENT';
  const settled=await ports.settleResumeGrant({
   session,scope,plan,resumeGrant,installed,outcome,env,
  });
  if(settled?.status!=='VERIFIED'||
     settled.reservation_id!==resumeGrant.grant_id||
     settled.durably_settled!==true)
   fail('UPGRADE_CONTINUATION_ORIGINAL_RESERVATION_NOT_SETTLED');
  stage='ORIGINAL_CONTINUITY_SETTLEMENT';
  const receipt=await ports.appendSettlement({
   session,scope,plan,installed,active,outcome,env,
  });
  const saved=await ports.readSettlement({
   session,scope,plan,receipt,outcome,env,
  });
  if(!matches(saved,scope)||
     saved.original_job_completed!==true||
     saved.original_goal_id!==plan.original_goal_id||
     saved.continuity_root_id!==plan.continuity_root_id||
     saved.worldline_id!==plan.worldline_id||
     saved.execution_receipt_id!==outcome.execution_receipt_id||
     saved.evidence_ref!==outcome.evidence_ref||
     saved.capability_sha256!==plan.candidate_sha256||
     saved.independently_reobserved!==true||
     !saved.settlement_receipt_id)
   fail('UPGRADE_CONTINUATION_ORIGINAL_SETTLEMENT_NOT_INDEPENDENTLY_REOBSERVED');
  return Object.freeze({...result,
   status:'ORIGINAL_CUSTOMER_ACTION_SETTLED_AFTER_VERIFIED_UPGRADE',
   original_job_completed:true,
   installed_commit_sha:installed.merge_commit_sha,
   original_job_execution_receipt_id:outcome.execution_receipt_id,
   settlement_receipt_id:saved.settlement_receipt_id,
   prior_install_lease_verified:true,
   original_execution_lease_settled:true,
   production_deployment_performed:false,
  });
 }catch(error){
  // Read-only waiting for post-merge CI is safe; after consuming a resume
  // grant, provider effects may exist and there is never an automatic retry.
  const waiting=stage==='POST_MERGE_ISOLATED_RUNTIME';
  return Object.freeze({...result,
   status:waiting?'WAITING_FOR_INDEPENDENT_POST_MERGE_CI':
    'UNRESOLVED_NO_AUTOMATIC_RETRY',
   blocked_at:stage,
   blocked_reason:/^UPGRADE_(?:CONTINUATION|RUNTIME|REGISTRY|FRESH_GOAL|STAGE)_[A-Z0-9_]+$/.test(String(error?.message||''))?
    error.message:'UPGRADE_CONTINUATION_PROVIDER_OR_RECEIPT_UNCERTAIN',
   safe_to_recheck:waiting,
   original_job_completed:false,
   external_effect_may_have_occurred:externalJobEffect,
   installation_replayed:false,
  });
 }
}
