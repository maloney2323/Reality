// Governed Autonomous Self-Upgrading: verified capability -> exact PR proposal.
// This module does not call a model, mint authority, or perform a provider
// write. The caller must independently re-observe sandbox/CI evidence,
// authenticated original goal and owner consent before dispatch.
import {createSelfBuildProposal,authorizeSelfBuild,executeSelfBuild}
 from './reality-self-build-controller-v1.0.js';
import {
 createGovernedGithubUpgradeProvider,
 fingerprintGovernedUpgradeCandidate,
} from './reality-governed-github-upgrade-provider-v0.1.js';

export const GOVERNED_AUTONOMOUS_UPGRADE_VERSION='reality-governed-autonomous-upgrade-v0.1';
const BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK=/^work:[0-9a-f]{32}$/;
const SHA=/^[0-9a-f]{40}$/;
const fail=code=>{throw Error(code)};
export function prepareGovernedAutonomousUpgrade({
 verifiedExperiment,originalWorkItem,
}={}){
 if(verifiedExperiment?.state!=='SANDBOX_VERIFIED'||
    !WORK.test(String(originalWorkItem?.id||''))||
    verifiedExperiment.work_item_id!==originalWorkItem.id||
    !originalWorkItem.continuity_root_id||
    verifiedExperiment.continuity_root_id!==originalWorkItem.continuity_root_id||
    verifiedExperiment.worldline_id!==originalWorkItem.worldline_id||
    verifiedExperiment.production_graph_write_permitted!==false||
    verifiedExperiment.verification_bundle?.frozen_regression?.passed!==true||
    verifiedExperiment.verification_bundle?.isolated_verification?.verified!==true)
  fail('AUTONOMOUS_UPGRADE_ORIGINAL_WORK_AND_SANDBOX_REQUIRED');
 const files=verifiedExperiment.verification_bundle.synthesized_capability?.files;
 if(!Array.isArray(files)||files.length===0)
  fail('AUTONOMOUS_UPGRADE_VERIFIED_CANDIDATE_FILES_REQUIRED');
 const capabilityId=String(verifiedExperiment.capability_id||'');
 if(!/^[a-z][a-z0-9.-]{2,63}$/.test(capabilityId))
  fail('AUTONOMOUS_UPGRADE_CAPABILITY_ID_INVALID');
 const sourceRefs=verifiedExperiment.frozen_historical_failure_refs;
 if(!Array.isArray(sourceRefs)||sourceRefs.length<1)
  fail('AUTONOMOUS_UPGRADE_HISTORICAL_FAILURES_REQUIRED');
 const tests=verifiedExperiment.capability_contract?.verification_suite_ref;
 if(typeof tests!=='string'||tests.length<3)
  fail('AUTONOMOUS_UPGRADE_VERIFICATION_SUITE_REQUIRED');
 const proposal=createSelfBuildProposal({
  requestedBy:'reality-autonomous-closure-orchestrator-v1.0',
  objective:'Install verified extension '+capabilityId,
  rationale:'Original work '+originalWorkItem.id+
   '; verified gap '+verifiedExperiment.gap_id+
   '; sandbox '+verifiedExperiment.ephemeral_worldline_id,
  files,baseRef:BASE,riskLevel:'review-required',
  tests:[tests],verificationPlan:[
   'Recheck frozen historical failure evidence',
   'Verify candidate exactly matches independently tested sandbox bytes',
   'Create new extension files only in isolated GitHub branch',
   'Verify all branch, commit and draft-PR effects independently',
   'Require a different authorization to merge or deploy',
   'Resume the original work only after verified capability registration',
  ],
 });
 return Object.freeze({
  version:GOVERNED_AUTONOMOUS_UPGRADE_VERSION,
  state:'AWAITING_EXACT_DRAFT_PR_AUTHORIZATION',
  original_work_id:originalWorkItem.id,
  continuity_root_id:originalWorkItem.continuity_root_id,
  worldline_id:originalWorkItem.worldline_id,
  capability_id:capabilityId,
  verified_experiment_hash:verifiedExperiment.verification_hash,
  verified_candidate_hash:fingerprintGovernedUpgradeCandidate(proposal.files),
  proposal,
  original_work_completed:false,code_upgrade_executed:false,
  production_merge_authorized:false,
 });
}
export async function executeGovernedAutonomousUpgradeDraft({
 plan,verifiedExperiment,originalWorkItem,
 ownerApproval,consumedReservation,
 get,write,
}={}){
 if(plan?.state!=='AWAITING_EXACT_DRAFT_PR_AUTHORIZATION'||
    plan.original_work_id!==originalWorkItem?.id||
    !WORK.test(String(plan.original_work_id||''))||
    !SHA.test(String(ownerApproval?.policy_sha||''))||
    ownerApproval?.verified_by_server!==true||
    ownerApproval?.original_work_id!==plan.original_work_id||
    ownerApproval?.approved_build_id!==plan.proposal?.build_id||
    ownerApproval?.approved_candidate_hash!==plan.verified_candidate_hash||
    ownerApproval?.operation!=='github:create_isolated_upgrade_pr'||
    ownerApproval?.promotion_authorized!==false||
    typeof ownerApproval?.authorization_ref!=='string'||
    ownerApproval.authorization_ref.length<8||
    typeof ownerApproval?.authorized_by!=='string'||
    ownerApproval.authorized_by.length<3||
    consumedReservation?.authorization_policy_sha!==ownerApproval.policy_sha||
    consumedReservation?.original_work_id!==plan.original_work_id||
    consumedReservation?.approved_candidate_hash!==plan.verified_candidate_hash||
    verifiedExperiment?.verification_hash!==plan.verified_experiment_hash)
  fail('AUTONOMOUS_UPGRADE_EXACT_OWNER_APPROVAL_AND_CONSUMED_LEASE_REQUIRED');
 // Recompute plan from the immutable verified experiment. Never accept
 // patch files supplied in a browser POST or a changed stored proposal.
 const recomputed=prepareGovernedAutonomousUpgrade({
  verifiedExperiment,originalWorkItem,
 });
 if(recomputed.proposal.build_id!==plan.proposal.build_id||
    recomputed.verified_candidate_hash!==plan.verified_candidate_hash)
  fail('AUTONOMOUS_UPGRADE_CANDIDATE_CHANGED');
 const authorized=authorizeSelfBuild(recomputed.proposal,{
  authorizationRef:ownerApproval.authorization_ref,
  authorizedBy:ownerApproval.authorized_by,
  allowedOperation:'github:create_isolated_upgrade_pr',
 });
 const provider=createGovernedGithubUpgradeProvider({
  authorizedBuild:authorized,consumedReservation,
  verifiedExperiment,get,write,
 });
 const issued=await executeSelfBuild(authorized,{provider});
 if(issued.state!=='PR_OPENED'||issued.production_merge_permitted!==false||
    !issued.pull_request?.url||!SHA.test(String(issued.commit_sha||'')))
  fail('AUTONOMOUS_UPGRADE_DRAFT_PR_INDEPENDENT_READBACK_FAILED');
 return Object.freeze({
  version:GOVERNED_AUTONOMOUS_UPGRADE_VERSION,
  state:'DRAFT_PR_CREATED_CI_AND_PROMOTION_PENDING',
  original_work_id:plan.original_work_id,
  original_continuity_root_id:plan.continuity_root_id,
  original_worldline_id:plan.worldline_id,
  capability_id:plan.capability_id,
  candidate_hash:plan.verified_candidate_hash,
  verified_sandbox_hash:plan.verified_experiment_hash,
  github_branch:issued.branch,
  github_commit_sha:issued.commit_sha,
  github_pr_number:issued.pull_request.number,
  github_pr_url:issued.pull_request.url,
  draft_pr_verified:true,
  independent_post_pr_ci_verified:false,
  promotion_authorized:false,
  capability_registered:false,
  original_work_resumed:false,
  original_work_completed:false,
  production_deployment_performed:false,
 });
}
