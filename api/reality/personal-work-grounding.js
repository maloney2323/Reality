// Private preview-only, non-executing authenticated grounding handshake.
// PREPARE attaches an exact proposed work item to the USER'S currently
// authenticated goal. RECHECK independently reloads Continuity and compares
// it with the signed earlier binding. Neither operation approves or runs work.
// A future execution endpoint must separately require durable, scoped user
// action approval, an execution lease, and another goal readback.
import { authenticatedChatSession, privateChatConfig, assertSameOrigin }
 from '../../src/reality-private-chat-auth-v0.1.js';
import { validUuid } from '../../src/reality-private-chat-store-v0.1.js';
import { readFreshPersonalGoalState }
 from '../../src/reality-personal-goal-readback-v0.1.js';
import { bindWorkToAuthenticatedGoal, compareFreshAuthenticatedGoalForWork }
 from '../../src/reality-execution-goal-grounding-v0.1.js';
import { evaluateGoalExecutionBoundary }
 from '../../src/reality-goal-execution-boundary-v0.1.js';
import { classifyWorkItemExecutionEffect }
 from '../../src/reality-governed-work-runtime-v0.1.js';
import { issuePersonalWorkGroundingProof, verifyPersonalWorkGroundingProof }
 from '../../src/reality-personal-work-grounding-proof-v0.1.js';

export const maxDuration=60;
function fail(message,status=400){const e=Error(message);e.status=status;throw e;}
const denied=(reason)=>({ok:true,status:'BLOCKED',reason,
 execution_authorized:false,external_action_performed:false});
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')
   return res.status(405).setHeader('Allow','POST')
    .json({ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!req.headers?.origin)fail('PERSONAL_GROUNDING_ORIGIN_REQUIRED',403);
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   fail('PERSONAL_GROUNDING_JSON_REQUIRED',415);
  const body=req.body||{};
  if(!['PREPARE','RECHECK'].includes(body.intent))
   fail('PERSONAL_GROUNDING_OPERATION_INVALID');
  if(!validUuid(body.conversation_id))
   fail('PERSONAL_GROUNDING_CONVERSATION_INVALID');
  const workItem=body.work_item;
  if(!workItem||typeof workItem!=='object'||Array.isArray(workItem))
   fail('PERSONAL_GROUNDING_WORK_ITEM_REQUIRED');
  if(body.authorization!==undefined||body.serverApprovalProof!==undefined||
   body.connector!==undefined||body.independentVerifier!==undefined)
   fail('PERSONAL_GROUNDING_CLIENT_AUTHORITY_REJECTED');
  const goalBoundary=evaluateGoalExecutionBoundary({workItem});
  if(goalBoundary.status==='BLOCKED')
   return res.status(200).json(denied(goalBoundary.reason));
  const effect=classifyWorkItemExecutionEffect(workItem);
  if(effect.status!=='EXTERNAL_CONNECTOR_WRITE')
   return res.status(200).json(denied('PERSONAL_GROUNDING_SUPPORTED_CONNECTOR_WRITE_REQUIRED'));
  const session=await authenticatedChatSession(req,res);
  if(!session)fail('CHAT_SIGN_IN_REQUIRED',401);
  // The readback function enforces Preview only, isolated Supabase and the
  // scope derived from authenticated session.user_id + conversation_id.
  if(body.intent==='RECHECK'){
   const verified=verifyPersonalWorkGroundingProof({
    proof:body.grounding_proof,principalId:session.user_id,
    conversationId:body.conversation_id,
   });
   if(verified.status!=='PROOF_VALID_FOR_FRESHNESS_ONLY')
    return res.status(200).json(denied(verified.reason));
   const latest=await readFreshPersonalGoalState({
    session,conversationId:body.conversation_id,
   });
   const comparison=compareFreshAuthenticatedGoalForWork({
    workItem,binding:verified.binding,
    latestAuthoritativeState:latest.state,
    serverVerifiedPrincipalId:session.user_id,
    // Action approval is still separate. Supabase authentication is the only
    // accepted identity source, never a generic session principal cookie.
    approvedActionPrincipalId:session.user_id,
   });
   return res.status(200).json({
    ok:true,status:comparison.status,
    reason:comparison.reason||null,goal_check:comparison,
    execution_authorized:false,external_action_performed:false,
   });
  }
  const latest=await readFreshPersonalGoalState({
   session,conversationId:body.conversation_id,
  });
  const binding=bindWorkToAuthenticatedGoal({
   workItem,authoritativeState:latest.state,
   serverVerifiedPrincipalId:session.user_id,
  });
  if(binding.status!=='BOUND_FOR_FRESHNESS_CHECK')
   return res.status(200).json(denied(binding.reason));
  const proof=issuePersonalWorkGroundingProof({
   binding,conversationId:body.conversation_id,
   principalId:session.user_id,
  });
  return res.status(200).json({
   ok:true,status:'PREPARED_FOR_FRESH_GOAL_RECHECK',
   binding,grounding_proof:proof,
   execution_authorized:false,external_action_performed:false,
  });
 }catch(err){
  return res.status(Number(err?.status)||503)
   .json({ok:false,error:err?.message||'PERSONAL_GROUNDING_UNAVAILABLE',
    external_action_performed:false});
 }
}
