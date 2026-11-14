// Fast authenticated, durable conversation intake. No model invocation or execution authority.
// A user turn is saved and independently read back before slower cognition starts.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,recordPrivateMessage,validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';

export const maxDuration=15;
function fail(code,status=503){const e=new Error(code);e.status=status;throw e}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')
   return res.status(405).setHeader('Allow','POST').json({ok:false,error:'METHOD_NOT_ALLOWED'});
  assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session)fail('CHAT_SIGN_IN_REQUIRED',401);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   fail('CHAT_JSON_REQUIRED',415);
  const conversationId=String(req.body?.conversation_id||'');
  const requestId=String(req.body?.request_id||'');
  const message=String(req.body?.message||'').trim();
  if(!validUuid(conversationId)||!validUuid(requestId)||!message||message.length>6000)
   fail('CHAT_MESSAGE_INVALID',400);
  // Intake never interprets model text as owner authorization, and does not
  // apply or accept goal/installation/worker commands.
  const result=await acceptDurableChatTurn({
   session,conversationId,requestId,message,
  });
  return res.status(200).json(result);
 }catch(e){
  return res.status(Number(e.status)||503).json({ok:false,error:e.message||'CHAT_INTAKE_UNAVAILABLE'});
 }
}

// Pure transport decision with injectable RLS storage for deterministic tests.
// Owner authorization stays in the existing governed execution path.
export async function acceptDurableChatTurn(
 {session,conversationId,requestId,message},
 {readChat=readPrivateChat,record=recordPrivateMessage}={}
){
 if(!session?.user_id||!validUuid(conversationId)||!validUuid(requestId)||
    typeof message!=='string'||!message.trim()||message.length>6000)
  fail('CHAT_MESSAGE_INVALID',400);
 const existing=await readChat(session,conversationId);
 const prior=existing.messages.filter(x=>x.request_id===requestId);
 if(prior.length){
  const saved=prior.find(x=>x.role==='user'&&x.text===message);
  if(!saved||prior.some(x=>x.role==='user'&&x.text!==message))
   fail('CHAT_REQUEST_ID_CONTENT_MISMATCH',409);
  return {ok:true,saved:true,replayed:true,conversation_id:conversationId,
   request_id:requestId,source_ref:saved.source_ref,
   reply_verified:prior.some(x=>x.role==='assistant'),
   execution_authorized:false,installation_authorized:false};
 }
 // Owner-bound Supabase RLS insert also enters the existing durable work inbox;
 // it does NOT authorize a worker, installation or production change.
 const written=await record(session,{conversationId,requestId,role:'user',text:message});
 const readback=await readChat(session,conversationId);
 const saved=readback.messages.find(x=>x.role==='user'&&x.request_id===requestId&&
  x.text===message&&x.source_ref===written.source_ref);
 if(!saved)fail('CHAT_USER_SAVE_READBACK_UNVERIFIED',503);
 return {ok:true,saved:true,replayed:false,
  conversation_id:conversationId,request_id:requestId,
  source_ref:saved.source_ref,reply_verified:false,
  execution_authorized:false,installation_authorized:false};
}
