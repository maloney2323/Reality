import {authenticatedChatSession,assertSameOrigin,privateChatConfig} from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {saveAuthenticatedOriginalRepairAssessment} from '../../src/reality-original-job-acceptance-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const b=req.body||{};
  if(Object.keys(b).some(k=>!['conversation_id','work_id','intent'].includes(k))||
   b.intent!=='VERIFY_ORIGINAL_REPAIR_CAUSE'||!validUuid(b.conversation_id)||
   b.work_id!=='work:24cda9611404e9bcb47909976067605c')
   return res.status(400).json({ok:false,error:'ORIGINAL_WORK_SCOPE_INVALID'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await saveAuthenticatedOriginalRepairAssessment({
   session,conversationId:b.conversation_id,workId:b.work_id,
  });
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const raw=String(error?.message||'');
  return res.status(503).json({ok:false,error:'REPAIR_NOT_VERIFIED',
   error_code:/^ACCEPTANCE_[A-Z0-9_]{4,100}$/.test(raw)?raw:'ACCEPTANCE_EVIDENCE_UNAVAILABLE',
   external_action_performed:false});
 }
}
