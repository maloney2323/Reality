// One Reality Chat control surface for already-supported governed job executors.
// Authenticated conversation identity is verified from Supabase RLS; no model
// text, local bubble or request body can forge an original job or install gate.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';
import {inspectSavedChatWork,authorizeSavedChatExistingOriginal}
 from '../../src/reality-saved-chat-work-adapter-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')
   return res.status(405).setHeader('Allow','POST').json({ok:false,error:'CHAT_WORK_METHOD_REQUIRED'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'CHAT_WORK_OWNER_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'CHAT_WORK_JSON_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session||!validUuid(session.user_id))
   return res.status(401).json({ok:false,error:'CHAT_WORK_SIGN_IN_REQUIRED'});
  const body=req.body||{};
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).sort().join(',')!=='action,conversation_id,request_id')
   return res.status(400).json({ok:false,error:'CHAT_WORK_EXACT_SOURCE_REQUIRED'});
  const {action,conversation_id:conversationId,request_id:requestId}=body;
  if(!validUuid(conversationId)||!validUuid(requestId))
   return res.status(400).json({ok:false,error:'CHAT_WORK_EXACT_SOURCE_INVALID'});
  if(!['INSPECT_VERIFIED_WORK','AUTHORIZE_VERIFIED_ORIGINAL_DISCOVERY'].includes(action))
   return res.status(400).json({ok:false,error:'CHAT_WORK_ACTION_UNSUPPORTED'});
  const {messages}=await readPrivateChat(session,conversationId);
  const args={session,conversationId,requestId,messages};
  const result=action==='INSPECT_VERIFIED_WORK'?
   await inspectSavedChatWork(args):
   await authorizeSavedChatExistingOriginal(args);
  return res.status(action==='INSPECT_VERIFIED_WORK'?200:202).json({ok:true,...result});
 }catch(error){
  const code=String(error?.message||'CHAT_WORK_UNAVAILABLE');
  const safe=/^CHAT_WORK_[A-Z0-9_]{4,110}$/.test(code)?code:'CHAT_WORK_UNAVAILABLE';
  return res.status(Number(error?.status)||503).json({ok:false,error:safe,
   execution_started:false,installation_authorized:false,production_changed:false});
 }
}
