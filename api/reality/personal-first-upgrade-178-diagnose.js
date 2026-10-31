// Owner-authenticated Reality system self-diagnosis; read only.
// This route never creates model runs, resets attempts, or grants approval.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';
import {diagnoseOriginal178Self}
 from '../../src/reality-first178-self-diagnosis-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='GET'){
   res.setHeader('Allow','GET');
   return res.status(405).json({ok:false,error:'FIRST178_DIAGNOSIS_READ_ONLY'});
  }
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const keys=Object.keys(req.query||{});
  if(keys.some(x=>x!=='conversation_id')||
     keys.length>1||
     (keys.length===1&&!validUuid(req.query.conversation_id)))
   return res.status(400).json({ok:false,error:'FIRST178_DIAGNOSIS_INVALID_SCOPE'});
  const result=await diagnoseOriginal178Self({session,
   selectedConversationId:req.query?.conversation_id||null});
  return res.status(200).json({ok:true,...result});
 }catch(e){
  return res.status(503).json({ok:false,
   error:'FIRST178_DIAGNOSIS_OWNER_READBACK_UNRESOLVED',
   read_only:true,installation_authorized:false,
   original_job_completed:false,do_not_retry:true});
 }
}
