// EXECUTION admission is minted only after the server has: authenticated the
// Supabase user, re-read scoped Continuity, checked a signed earlier goal/work
// binding, and separately loaded the persisted exact-work action policy.
// This signed artifact prevents the exported execution engine from trusting a
// raw client/model goal-check object. It is NOT a one-time execution lease.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { fingerprintApprovedWorkItem, verifyBoundExecutionApproval }
 from './reality-authority-v1.0.js';
import { compareFreshAuthenticatedGoalForWork }
 from './reality-execution-goal-grounding-v0.1.js';
import { verifyPersonalWorkGroundingProof }
 from './reality-personal-work-grounding-proof-v0.1.js';
import { policyMatchesGoalBoundWork }
 from './reality-personal-action-authority-v0.1.js';

export const FRESH_GOAL_EXECUTION_ADMISSION_VERSION='reality-fresh-goal-execution-admission-v0.1';
const nonempty=x=>typeof x==='string'&&x.length>0;
const canonical=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?
 x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const secret=env=>{
 const key=env.REALITY_CHAT_RECEIPT_HMAC_KEY;
 if(typeof key!=='string'||key.length<32)
  throw Error('EXECUTION_GOAL_ADMISSION_SIGNING_KEY_REQUIRED');
 return key;
};
const hmac=(payload,env)=>createHmac('sha256',secret(env))
 .update('reality:fresh-goal-before-consequential-execution:v1:'+
  JSON.stringify(canonical(payload))).digest('hex');
const blocked=reason=>Object.freeze({status:'BLOCKED',reason});

export function issueFreshGoalExecutionAdmission({
 workItem,groundingProof,latestAuthoritativeState,
 principalId,conversationId,policy,authorization,serverApprovalProof,
 env=process.env,now=Date.now(),
}={}){
 // This issuer must be invoked only by a trusted server route AFTER a new
 // database reconstruction; caller-provided goal state is not trusted.
 if(env.VERCEL_ENV!=='preview')throw Error('EXECUTION_GOAL_ADMISSION_PREVIEW_ONLY');
 if(!nonempty(principalId)||!nonempty(conversationId)||
    policy?.principal_id!==principalId||
    authorization?.principal!==principalId||
    !Number.isSafeInteger(now))
  throw Error('EXECUTION_GOAL_ADMISSION_PRINCIPAL_OR_INPUT_INVALID');
 const signedGoal=verifyPersonalWorkGroundingProof({
  proof:groundingProof,principalId,conversationId,env,now,
 });
 if(signedGoal.status!=='PROOF_VALID_FOR_FRESHNESS_ONLY')
  throw Error(signedGoal.reason||'EXECUTION_GOAL_BINDING_NOT_VERIFIED');
 const goal=compareFreshAuthenticatedGoalForWork({
  workItem,binding:signedGoal.binding,latestAuthoritativeState,
  serverVerifiedPrincipalId:principalId,
  approvedActionPrincipalId:policy.principal_id,
 });
 if(goal.status!=='FRESH_GOAL_BINDING_MATCHED')
  throw Error(goal.reason||'EXECUTION_GOAL_NOT_CURRENT');
 // A previous generic or different-goal action policy MUST NOT be
 // promoted into a new goal's execution authority.
 if(!policyMatchesGoalBoundWork({
  policy,workItem,binding:signedGoal.binding,principalId,
  conversationId,
 }))throw Error('EXECUTION_GOAL_BOUND_ACTION_POLICY_REQUIRED');
 const approval=verifyBoundExecutionApproval({
  proof:serverApprovalProof,workItem,authorization,
 });
 if(!approval.valid)throw Error(approval.reason||'EXECUTION_ACTION_APPROVAL_INVALID');
 const data={
  version:FRESH_GOAL_EXECUTION_ADMISSION_VERSION,
  principal_id:principalId,conversation_id:conversationId,
  isolated_project_ref:env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||null,
  continuity_root_id:signedGoal.binding.continuity_root_id,
  world_id:signedGoal.binding.world_id,
  goal_id:goal.goal_id,
  goal_revision:goal.goal_revision,
  goal_transition_receipt_id:goal.goal_transition_receipt_id,
  work_item_fingerprint:fingerprintApprovedWorkItem(workItem),
  authorization_id:authorization.authorization_id,
  action_policy_id:policy.policy_id,
  action_approval_signature:serverApprovalProof.server_signature,
  issued_at:new Date(now).toISOString(),
  expires_at:new Date(now+15000).toISOString(),
  grants_goal_mutation:false,
  semantic_alignment_independently_verified:false,
 };
 return Object.freeze({...data,signature:hmac(data,env)});
}

export function verifyFreshGoalExecutionAdmission({
 admission,workItem,authorization,serverApprovalProof,
 env=process.env,now=Date.now(),
}={}){
 if(env.VERCEL_ENV!=='preview')return blocked('EXECUTION_GOAL_ADMISSION_PREVIEW_ONLY');
 if(!admission||admission.version!==FRESH_GOAL_EXECUTION_ADMISSION_VERSION||
    typeof admission.signature!=='string'||!/^[a-f0-9]{64}$/.test(admission.signature))
  return blocked('EXECUTION_FRESH_GOAL_ADMISSION_REQUIRED');
 const {signature,...data}=admission;
 const actual=Buffer.from(signature,'hex'),expected=Buffer.from(hmac(data,env),'hex');
 if(!timingSafeEqual(actual,expected))
  return blocked('EXECUTION_FRESH_GOAL_ADMISSION_SIGNATURE_INVALID');
 const issued=Date.parse(data.issued_at),expires=Date.parse(data.expires_at);
 if(!Number.isFinite(issued)||!Number.isFinite(expires)||
    !Number.isSafeInteger(now)||issued>now+3000||
    expires<=now||expires-issued>15000||expires<=issued)
  return blocked('EXECUTION_FRESH_GOAL_ADMISSION_EXPIRED');
 const approval=verifyBoundExecutionApproval({
  proof:serverApprovalProof,workItem,authorization,
 });
 if(!approval.valid)return blocked(approval.reason);
 if(!nonempty(data.principal_id)||!nonempty(data.conversation_id)||
    !nonempty(data.goal_id)||!nonempty(data.continuity_root_id)||
    !nonempty(data.goal_transition_receipt_id)||
    !nonempty(data.isolated_project_ref)||
    data.isolated_project_ref!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    data.principal_id!==authorization?.principal||
    data.authorization_id!==authorization.authorization_id||
    data.action_approval_signature!==serverApprovalProof?.server_signature||
    data.work_item_fingerprint!==fingerprintApprovedWorkItem(workItem)||
    data.grants_goal_mutation!==false||
    data.semantic_alignment_independently_verified!==false)
  return blocked('EXECUTION_FRESH_GOAL_ADMISSION_SCOPE_MISMATCH');
 return Object.freeze({status:'FRESH_GOAL_ATTESTED',reason:null,
  goal_id:data.goal_id,principal_id:data.principal_id,
  goal_revision:data.goal_revision,conversation_id:data.conversation_id,
  work_item_fingerprint:data.work_item_fingerprint,
  // A 15s admission does NOT solve exactly-once execution or concurrency.
  durable_execution_lease_verified:false,
 });
}
