// Safe experimental handoff: authenticated user goal + separate persisted
// action approval + fresh goal revision. NO connector writes at this route.
import { authenticatedChatSession,privateChatConfig,assertSameOrigin }
 from '../../src/reality-private-chat-auth-v0.1.js';
import { prepareAuthenticatedPersonalExecution }
 from '../../src/reality-personal-execution-admission-service-v0.1.js';
import { reserveAuthenticatedPersonalExecution }
 from '../../src/reality-personal-execution-reservation-service-v0.1.js';
import { validUuid } from '../../src/reality-private-chat-store-v0.1.js';

export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).setHeader('Allow','POST')
    .json({ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!req.headers?.origin)
   throw Object.assign(Error('PERSONAL_EXECUTION_ORIGIN_REQUIRED'),{status:403});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   throw Object.assign(Error('PERSONAL_EXECUTION_JSON_REQUIRED'),{status:415});
  const body=req.body||{};
  if(!validUuid(body.conversation_id)||!body.work_item||
     typeof body.work_item!=='object'||Array.isArray(body.work_item))
   throw Object.assign(Error('PERSONAL_EXECUTION_REQUEST_INVALID'),{status:400});
  if(body.authorization!==undefined||body.principal_id!==undefined||
    body.serverFreshGoalAdmission!==undefined||
    body.serverApprovalProof!==undefined||
    body.connector!==undefined||body.independentVerifier!==undefined)
   throw Object.assign(Error('PERSONAL_EXECUTION_CLIENT_AUTHORITY_REJECTED'),{status:400});
  const session=await authenticatedChatSession(req,res);
  if(!session)throw Object.assign(Error('CHAT_SIGN_IN_REQUIRED'),{status:401});
  if(body.intent!==undefined&&!['CHECK','RESERVE'].includes(body.intent))
   throw Object.assign(Error('PERSONAL_EXECUTION_INTENT_INVALID'),{status:400});
  if(body.intent==='RESERVE'){
   if(body.confirmation!=='RESERVE_THIS_APPROVED_ACTION')
    throw Object.assign(Error('EXECUTION_RESERVATION_EXPLICIT_CONFIRMATION_REQUIRED'),{status:400});
   const reserved=await reserveAuthenticatedPersonalExecution({
    session,conversationId:body.conversation_id,
    workItem:body.work_item,groundingProof:body.grounding_proof,
   });
   return res.status(200).json({ok:true,status:reserved.status,
    reservation_id:reserved.reservation_id,
    goal_id:reserved.goal_id,action_policy_id:reserved.action_policy_id,
    work_item_fingerprint:reserved.work_item_fingerprint,
    execution_authorized:false,external_action_performed:false,
    durable_execution_reservation_claimed:true,
    no_automatic_retry:true,
   });
  }
  const prepared=await prepareAuthenticatedPersonalExecution({
    session,conversationId:body.conversation_id,
    workItem:body.work_item,groundingProof:body.grounding_proof,
  });
  // Do not leak a server signer capability. The authority and admission
  // proofs remain server-internal, and are not executed while the execution
  // reservation / replay-safe transaction is unavailable.
  return res.status(200).json({ok:true,status:prepared.status,
   goal_id:prepared.goal_id,
   goal_revision:prepared.goal_revision,
   work_item_fingerprint:prepared.work_item_fingerprint,
   action_policy_id:prepared.action_policy_id,
   execution_authorized:false,durable_execution_lease_verified:false,
   external_action_performed:false,
  });
 }catch(error){
  const raw=String(error?.message||'');
  const database=/UNIVERSE_POSTGRES_HTTP_|CONTINUITY_PERSISTENCE_REQUIRED|CONTINUITY_REHYDRATION_FAILED/.test(raw);
  return res.status(error.status||503).json({ok:false,
   error:database?'PERSONAL_EXECUTION_CONTINUITY_STORAGE_UNAVAILABLE':
    raw||'PERSONAL_EXECUTION_ADMISSION_UNAVAILABLE',
   external_action_performed:false});
 }
}
