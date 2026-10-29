// Preview-only source-reobserved Home work -> authenticated GoalState handoff.
// Browser sends ONLY the discovered work ID and conversation ID.
// No goal mutation, policy grant, reservation, connector invocation or model.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {preparePersonalDiscoveredWorkHandoff,listPersonalDiscoveredWorkHandoffs}
 from '../../src/reality-personal-discovered-work-handoff-v0.1.js';

export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).setHeader('Allow','GET, POST').json({
    ok:false,error:'METHOD_NOT_ALLOWED',
   });
  if(req.method==='GET'){
   const id=req.query?.conversation_id;
   if(!validUuid(id))
    throw Object.assign(Error('DISCOVERED_WORK_READBACK_CONVERSATION_INVALID'),{status:400});
   const session=await authenticatedChatSession(req,res);
   if(!session)
    throw Object.assign(Error('CHAT_SIGN_IN_REQUIRED'),{status:401});
   const prior=await listPersonalDiscoveredWorkHandoffs({
    session,conversationId:id,
   });
   return res.status(200).json({ok:true,...prior});
  }
  if(!req.headers?.origin)
   throw Object.assign(Error('DISCOVERED_WORK_SAME_ORIGIN_REQUIRED'),{status:403});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   throw Object.assign(Error('DISCOVERED_WORK_JSON_REQUIRED'),{status:415});
  const b=req.body||{};
  const keys=Object.keys(b);
  if(keys.some(k=>!['intent','conversation_id','discovered_work_id'].includes(k)))
   throw Object.assign(Error('DISCOVERED_WORK_CLIENT_WORK_OR_AUTHORITY_REJECTED'),{status:400});
  if(b.intent!=='PREPARE'||!validUuid(b.conversation_id)||
     !/^work:[a-f0-9]{32}$/.test(String(b.discovered_work_id||'')))
   throw Object.assign(Error('DISCOVERED_WORK_PREPARE_INPUT_INVALID'),{status:400});
  const session=await authenticatedChatSession(req,res);
  if(!session)
   throw Object.assign(Error('CHAT_SIGN_IN_REQUIRED'),{status:401});
  const prepared=await preparePersonalDiscoveredWorkHandoff({
   session,conversationId:b.conversation_id,
   discoveredWorkId:b.discovered_work_id,
  });
  return res.status(200).json({
   ok:true,...prepared,
   action_approved:false,execution_authorized:false,
   external_action_performed:false,
  });
 }catch(e){
  // Do not send PostgREST's raw error JSON (which can include user/conversation
  // scoped IDs and SQL details) to the mobile UI.
  const raw=String(e?.message||'');
  const dbFailure=/UNIVERSE_POSTGRES_HTTP_|EXECUTION_RESERVATION_DATABASE_|CONTINUITY_PERSISTENCE_REQUIRED/.test(raw);
  return res.status(e.status||503).json({
   ok:false,error:dbFailure?'DISCOVERED_WORK_CONTINUITY_STORAGE_UNAVAILABLE':
    raw||'DISCOVERED_WORK_HANDOFF_UNAVAILABLE',
   external_action_performed:false,
  });
 }
}
