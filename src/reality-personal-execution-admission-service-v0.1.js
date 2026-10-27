// The authenticated/private handoff from user-goal grounding to the
// existing execution engine. PREVIEW ONLY. Does not execute external work.
// The exported engine additionally verifies a signed admission, but a durable
// at-most-once reservation is still REQUIRED before calling the connector.
import { readFreshPersonalGoalState } from './reality-personal-goal-readback-v0.1.js';
import { verifyPersonalWorkGroundingProof }
 from './reality-personal-work-grounding-proof-v0.1.js';
import { policyMatchesGoalBoundWork }
 from './reality-personal-action-authority-v0.1.js';
import { autoAuthorize, getAuthorityPolicy, issueBoundExecutionApproval }
 from './reality-authority-v1.0.js';
import { issueFreshGoalExecutionAdmission }
 from './reality-fresh-goal-execution-admission-v0.1.js';
import { createUniversePostgresPersistence }
 from './reality-universe-postgres-persistence-v0.1.js';
import { resolveReliabilityBenchmarkDb }
 from './reality-reliability-db-boundary-v0.1.js';
import { validUuid } from './reality-private-chat-store-v0.1.js';
import { evaluateGoalExecutionBoundary }
 from './reality-goal-execution-boundary-v0.1.js';

export const PERSONAL_EXECUTION_ADMISSION_SERVICE_VERSION='reality-personal-execution-admission-service-v0.1';

export async function prepareAuthenticatedPersonalExecution({
 session,conversationId,workItem,groundingProof,env=process.env,
 readGoal=readFreshPersonalGoalState,
 loadPolicy=null,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    env.VERCEL_ENV!=='preview')
  throw Error('PERSONAL_EXECUTION_AUTHENTICATED_PREVIEW_REQUIRED');
 const isolated=resolveReliabilityBenchmarkDb(env);
 if(!isolated||isolated.url!==session?.config?.url||
    isolated.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('PERSONAL_EXECUTION_ISOLATED_AUTHORITY_PROJECT_REQUIRED');
 const boundary=evaluateGoalExecutionBoundary({workItem});
 if(boundary.status==='BLOCKED')throw Error(boundary.reason);
 const verified=verifyPersonalWorkGroundingProof({
  proof:groundingProof,principalId:session.user_id,conversationId,env,
 });
 if(verified.status!=='PROOF_VALID_FOR_FRESHNESS_ONLY')
  throw Error(verified.reason||'PERSONAL_EXECUTION_GROUNDING_MISSING');
 // Force a NEW authenticated source projection, never use the browser's or
 // assistant's claimed user-goal state.
 const latest=await readGoal({session,conversationId,env});
 const policy=loadPolicy?await loadPolicy(session.user_id):
  await getAuthorityPolicy(session.user_id,
   createUniversePostgresPersistence({...isolated}));
 if(!policyMatchesGoalBoundWork({
  policy,workItem,binding:verified.binding,
  principalId:session.user_id,conversationId,
 }))throw Error('PERSONAL_EXECUTION_PERSISTED_GOAL_BOUND_APPROVAL_REQUIRED');
 const authorization=autoAuthorize({policy,workItem});
 if(!authorization)throw Error('PERSONAL_EXECUTION_EXACT_WORK_APPROVAL_INVALID');
 const serverApprovalProof=issueBoundExecutionApproval({
  policy,workItem,authorization,principalId:session.user_id,
 });
 const serverFreshGoalAdmission=issueFreshGoalExecutionAdmission({
  workItem,groundingProof,latestAuthoritativeState:latest.state,
  principalId:session.user_id,conversationId,policy,
  authorization,serverApprovalProof,env,
 });
 // These are server-side objects; the HTTP adapter MUST NOT expose signed
 // authorization or a callable connector capability to the browser.
 return Object.freeze({
  status:'GOAL_AND_ACTION_ADMITTED_PENDING_EXECUTION_LEASE',
  goal_id:serverFreshGoalAdmission.goal_id,
  goal_revision:serverFreshGoalAdmission.goal_revision,
  work_item_fingerprint:serverFreshGoalAdmission.work_item_fingerprint,
  action_policy_id:policy.policy_id,
  execution_authorized:false,external_action_performed:false,
  // A future execution adapter must obtain and consume a DB-atomic,
  // single-use execution reservation BEFORE calling executeAuthorizedWork.
  durable_execution_lease_verified:false,
  internal:{authorization,serverApprovalProof,serverFreshGoalAdmission},
 });
}
