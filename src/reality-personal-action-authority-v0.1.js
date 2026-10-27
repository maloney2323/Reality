// Preview-only, authenticated exact-work approval inside the EXISTING
// authority/Continuity ledger. Does not execute work or invent a new goal DB.
// The explicit signed-in user's approval is separate from their goal command.
import {
 createAuthorityPolicy, fingerprintApprovedWorkItem,
 saveAuthorityPolicy, getAuthorityPolicy,
} from './reality-authority-v1.0.js';
import { createUniversePostgresPersistence }
 from './reality-universe-postgres-persistence-v0.1.js';
import { resolveReliabilityBenchmarkDb }
 from './reality-reliability-db-boundary-v0.1.js';
import { readFreshPersonalGoalState } from './reality-personal-goal-readback-v0.1.js';
import { verifyPersonalWorkGroundingProof }
 from './reality-personal-work-grounding-proof-v0.1.js';
import { compareFreshAuthenticatedGoalForWork }
 from './reality-execution-goal-grounding-v0.1.js';
import { evaluateGoalExecutionBoundary }
 from './reality-goal-execution-boundary-v0.1.js';

export const PERSONAL_ACTION_AUTHORITY_VERSION='reality-personal-action-authority-v0.1';
function isolatedPersistence(session,env=process.env){
 const isolated=resolveReliabilityBenchmarkDb(env);
 if(env.VERCEL_ENV!=='preview'||!isolated||
   isolated.url!==session?.config?.url||
   isolated.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('PERSONAL_ACTION_AUTHORITY_ISOLATED_PROJECT_REQUIRED');
 return createUniversePostgresPersistence({...isolated});
}
export function policyMatchesGoalBoundWork({
 policy,workItem,binding,principalId,conversationId,
}={}){
 const g=policy?.goal_binding;
 return Boolean(policy?.authority_version==='reality-authority-v1.0'&&
  policy.mode==='auto'&&policy.enabled===true&&
  policy.principal_id===principalId&&
  policy.approved_by===principalId&&
  g?.version===PERSONAL_ACTION_AUTHORITY_VERSION&&
  g.user_confirmation==='APPROVE_THIS_EXACT_WORK_ITEM'&&
  g.principal_id===principalId&&
  g.conversation_id===conversationId&&
  g.goal_id===binding?.goal_id&&
  g.goal_revision===binding?.goal_revision&&
  g.goal_transition_receipt_id===binding?.goal_transition_receipt_id&&
  g.continuity_root_id===binding?.continuity_root_id&&
  g.world_id===binding?.world_id&&
  g.goal_source_user_message_ref===binding?.goal_source_user_message_ref&&
  g.work_item_fingerprint===fingerprintApprovedWorkItem(workItem)&&
  (policy.scopes||[]).some(x=>
   x.work_item_id===workItem.work_item_id&&
   x.work_item_fingerprint===g.work_item_fingerprint));
}
export async function recordAuthenticatedPersonalActionApproval({
 session,conversationId,workItem,groundingProof,
 confirmedAction,env=process.env,
 readGoal=readFreshPersonalGoalState,
 persistence=null,
}={}){
 if(confirmedAction!=='APPROVE_THIS_EXACT_WORK_ITEM')
  throw Error('PERSONAL_ACTION_EXPLICIT_USER_CONFIRMATION_REQUIRED');
 const boundary=evaluateGoalExecutionBoundary({workItem});
 if(boundary.status==='BLOCKED')throw Error(boundary.reason);
 const signed=verifyPersonalWorkGroundingProof({
  proof:groundingProof,conversationId,principalId:session?.user_id,env,
 });
 if(signed.status!=='PROOF_VALID_FOR_FRESHNESS_ONLY')
  throw Error(signed.reason||'PERSONAL_ACTION_GOAL_BINDING_REQUIRED');
 const latest=await readGoal({session,conversationId,env});
 const comparison=compareFreshAuthenticatedGoalForWork({
  workItem,binding:signed.binding,
  latestAuthoritativeState:latest.state,
  serverVerifiedPrincipalId:session.user_id,
  approvedActionPrincipalId:session.user_id,
 });
 if(comparison.status!=='FRESH_GOAL_BINDING_MATCHED')
  throw Error(comparison.reason||'PERSONAL_ACTION_GOAL_CHANGED');
 const store=persistence||isolatedPersistence(session,env);
 const expiresAt=new Date(Date.now()+2*60*1000).toISOString();
 const base=createAuthorityPolicy({
  principalId:session.user_id,mode:'auto',expiresAt,
  scopes:[{connector:workItem.connector,operation:workItem.operation,
    work_item_id:workItem.work_item_id,
    work_item_fingerprint:fingerprintApprovedWorkItem(workItem),
    resource:workItem.resource||workItem.inputs?.resource||
      workItem.inputs?.repository||null}],
  approvedBy:session.user_id,
 });
 const policy=Object.freeze({...base,goal_binding:Object.freeze({
  version:PERSONAL_ACTION_AUTHORITY_VERSION,
  user_confirmation:confirmedAction,
  principal_id:session.user_id,
  conversation_id:conversationId,
  goal_id:signed.binding.goal_id,
  goal_revision:signed.binding.goal_revision,
  goal_transition_receipt_id:signed.binding.goal_transition_receipt_id,
  continuity_root_id:signed.binding.continuity_root_id,
  world_id:signed.binding.world_id,
  goal_source_user_message_ref:signed.binding.goal_source_user_message_ref,
  work_item_fingerprint:signed.binding.work_item_fingerprint,
 })});
 if(!policyMatchesGoalBoundWork({
  policy,workItem,binding:signed.binding,
  principalId:session.user_id,conversationId,
 }))throw Error('PERSONAL_ACTION_GOAL_APPROVAL_BINDING_INVALID');
 await saveAuthorityPolicy(policy,store);
 const persisted=await getAuthorityPolicy(session.user_id,store);
 if(persisted?.policy_id!==policy.policy_id||
    !policyMatchesGoalBoundWork({
      policy:persisted,workItem,binding:signed.binding,
      principalId:session.user_id,conversationId,
    }))
  throw Error('PERSONAL_ACTION_APPROVAL_DURABLE_READBACK_FAILED');
 return Object.freeze({policy_id:policy.policy_id,
  expires_at:policy.expires_at,principal_id:session.user_id,
  goal_id:signed.binding.goal_id,
  action_approved_for_this_exact_goal:true,
  external_action_performed:false,
 });
}
