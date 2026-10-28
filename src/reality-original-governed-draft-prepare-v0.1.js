// Owner-scoped, non-executing preparation of Reality's original governed
// draft PR. The authenticated owner must separately approve and run this
// EXACT action. Neither preparation nor a signed evidence warrant writes GitHub.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {ORIGINAL_OWNER_WORK_ID} from './reality-original-owner-console-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade} from './reality-warranted-upgrade-candidate-loader-v0.1.js';
import {prepareGovernedAutonomousUpgrade} from './reality-governed-autonomous-upgrade-orchestrator-v0.1.js';
import {exactGovernedUpgradeWorkItem} from './reality-governed-upgrade-execution-dispatch-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {bindWorkToAuthenticatedGoal} from './reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof} from './reality-personal-work-grounding-proof-v0.1.js';
import {readOriginalExecutorPinnedBase} from './reality-original-executor-trusted-warrant-recorder-v0.1.js';

export const ORIGINAL_GOVERNED_DRAFT_PREPARE_VERSION='reality-original-governed-draft-prepare-v0.1';
const WORK=ORIGINAL_OWNER_WORK_ID;
const REPO='maloney2323/Reality';
const BASE='experiment/reality-live-durable-adversarial-20261025';
const CANDIDATE='88d4bba7f2ddf0c7331ddfcc0621b4a13739326451cb53d41ad807c97bceb9b2';
const fail=x=>{throw Error(x)};
export async function prepareOriginalGovernedDraft({
 session,conversationId,originalWorkId,env=process.env,
 loadTrusted=loadAuthenticatedWarrantedUpgrade,
 readGoal=readFreshPersonalGoalState,
 getBase=readOriginalExecutorPinnedBase,
}={}){
 if(env.VERCEL_ENV!=='preview'||!validUuid(session?.user_id)||
    !validUuid(conversationId)||originalWorkId!==WORK)
  fail('ORIGINAL_DRAFT_AUTHENTICATED_EXACT_PREVIEW_WORK_REQUIRED');
 const trusted=await loadTrusted({session,conversationId,originalWorkId,env});
 if(trusted?.original_work_id!==WORK||
    trusted.owner_id!==session.user_id||
    trusted.conversation_id!==conversationId||
    trusted.persisted_and_reobserved!==true||
    trusted.verified_not_authorized!==true||
    trusted.external_action_authorized!==false||
    trusted.original_job_completed!==false||
    trusted.candidate_hash!==CANDIDATE||
    trusted.evidence_warrant?.candidate_sha256!==CANDIDATE)
  fail('ORIGINAL_DRAFT_REAL_SIGNED_WARRANT_REQUIRED');
 const plan=prepareGovernedAutonomousUpgrade({
  originalWorkItem:trusted.originalWorkItem,
  verifiedExperiment:trusted.verifiedExperiment,
 });
 if(plan.original_work_id!==WORK||
    plan.verified_candidate_hash!==CANDIDATE||
    plan.proposal?.base_ref!==BASE||
    plan.proposal?.production_merge_permitted!==false||
    plan.proposal?.files?.length!==2)
  fail('ORIGINAL_DRAFT_EXACT_MODEL_PACKAGE_OR_SCOPE_CHANGED');
 const workItem=exactGovernedUpgradeWorkItem(plan,{
  warrant:trusted.evidence_warrant,
 });
 if(workItem.work_item_id!==WORK||workItem.connector!=='github'||
    workItem.operation!=='create_isolated_upgrade_pr'||
    workItem.inputs?.candidate_hash!==CANDIDATE||
    workItem.inputs?.repository!==REPO||
    workItem.inputs?.base_ref!==BASE||
    workItem.inputs?.draft!==true||
    workItem.inputs?.production_merge_permitted!==false)
  fail('ORIGINAL_DRAFT_CONSEQUENTIAL_ACTION_SCOPE_INVALID');
 // Verify that the precise base commit signed in the warrant is still HEAD.
 // A moved base must be re-warranted; never silently rebase a signed upgrade.
 const ref=await getBase('/repos/'+REPO+'/git/ref/heads/'+BASE);
 if(ref?.ref!=='refs/heads/'+BASE||
    ref?.object?.sha!==trusted.evidence_warrant?.pinned_base_commit_sha)
  fail('ORIGINAL_DRAFT_SIGNED_GITHUB_BASE_CHANGED');
 const goal=await readGoal({session,conversationId,env});
 if(goal?.principal_id!==session.user_id||
    goal.conversation_id!==conversationId||
    goal.state?.active_goal_id!==trusted.original_goal_id||
    goal.state?.active_goal?.last_transition_receipt_id!==trusted.goal_revision)
  fail('ORIGINAL_DRAFT_OWNER_GOAL_REVISION_CHANGED');
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:goal.state,
  serverVerifiedPrincipalId:session.user_id,
 });
 if(binding.status!=='BOUND_FOR_FRESHNESS_CHECK'||
    binding.grants_external_execution!==false)
  fail('ORIGINAL_DRAFT_ACTIVE_GOAL_BINDING_NOT_VERIFIED');
 const proof=issuePersonalWorkGroundingProof({
  binding,conversationId,principalId:session.user_id,env,
 });
 if(proof.grants_external_execution!==false||
    proof.approves_proposed_work!==false)
  fail('ORIGINAL_DRAFT_NON_AUTHORIZING_GROUNDING_REQUIRED');
 return Object.freeze({
  version:ORIGINAL_GOVERNED_DRAFT_PREPARE_VERSION,
  status:'AWAITING_EXACT_GOVERNED_DRAFT_OWNER_APPROVAL',
  stage:'DRAFT',original_work_id:WORK,
  original_goal_id:trusted.original_goal_id,
  warrant_id:trusted.evidence_warrant_id,
  warrant_receipt_id:trusted.warrant_receipt_id,
  expected_candidate_hash:CANDIDATE,
  pinned_base_sha:ref.object.sha,
  target_repository:REPO,target_base:BASE,
  expected_extension_paths:workItem.inputs.candidate_paths,
  work_item:workItem,grounding_proof:proof,
  approval_recorded:false,draft_pr_created:false,
  installation_authorized:false,
  external_action_performed:false,original_job_completed:false,
 });
}
