// Signed-in user's independent consent to a specific goal-bound action.
// Persists exact approval in the existing isolated Continuity authority
// ledger. It NEVER invokes an external connector.
import { authenticatedChatSession, privateChatConfig, assertSameOrigin }
 from '../../src/reality-private-chat-auth-v0.1.js';
import { validUuid } from '../../src/reality-private-chat-store-v0.1.js';
import { recordAuthenticatedPersonalActionApproval }
 from '../../src/reality-personal-action-authority-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).setHeader('Allow','POST')
   .json({ok:false,error:'METHOD_NOT_ALLOWED'});
  if(!req.headers?.origin)throw Object.assign(Error('ACTION_APPROVAL_ORIGIN_REQUIRED'),{status:403});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   throw Object.assign(Error('ACTION_APPROVAL_JSON_REQUIRED'),{status:415});
  const body=req.body||{};
  if(!validUuid(body.conversation_id)||!body.work_item||
     typeof body.work_item!=='object'||Array.isArray(body.work_item))
   throw Object.assign(Error('ACTION_APPROVAL_CONVERSATION_OR_WORK_INVALID'),{status:400});
  if(body.confirmation!=='APPROVE_THIS_EXACT_WORK_ITEM')
   throw Object.assign(Error('ACTION_APPROVAL_EXPLICIT_CONFIRMATION_REQUIRED'),{status:400});
  if(body.authorization!==undefined||body.approved_principal_id!==undefined||
     body.connector!==undefined||body.server_approval_proof!==undefined)
   throw Object.assign(Error('ACTION_APPROVAL_CLIENT_AUTHORITY_NOT_TRUSTED'),{status:400});
  const session=await authenticatedChatSession(req,res);
  if(!session)throw Object.assign(Error('CHAT_SIGN_IN_REQUIRED'),{status:401});
  const saved=await recordAuthenticatedPersonalActionApproval({
   session,conversationId:body.conversation_id,
   workItem:body.work_item,groundingProof:body.grounding_proof,
   confirmedAction:body.confirmation,
  });
  return res.status(200).json({ok:true,status:'EXACT_GOAL_BOUND_ACTION_APPROVED',
   ...saved,execution_authorized_by_approval_alone:false});
 }catch(error){
  // Database driver errors may contain private Continuity IDs and SQL.
  // Surface a stable, non-secret failure while remaining fail-closed.
  const raw=String(error?.message||'');
  const database=/UNIVERSE_POSTGRES_HTTP_|CONTINUITY_PERSISTENCE_REQUIRED|CONTINUITY_REHYDRATION_FAILED/.test(raw);
  return res.status(error.status||503).json({ok:false,
   error:database?'ACTION_APPROVAL_CONTINUITY_STORAGE_UNAVAILABLE':
    raw||'ACTION_APPROVAL_UNAVAILABLE',
   external_action_performed:false});
 }
}
