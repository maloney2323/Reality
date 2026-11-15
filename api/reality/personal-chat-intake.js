// Fast authenticated, durable conversation intake. No model invocation or execution authority.
// A user turn is saved and independently read back before slower cognition starts.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChatRequest,readLatestPrivateChatUserTurn,recordPrivateMessage,validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';

export const maxDuration=20;
function fail(code,status=503){const e=new Error(code);e.status=status;throw e}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 let stage='AUTHENTICATION';
 const intakeStarted=Date.now();
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
  stage='EXACT_RLS_INTAKE_AND_SAVE';
  const result=await acceptDurableChatTurn({
   session,conversationId,requestId,message,
  });
  return res.status(200).json(result);
 }catch(e){
  const value=String(e?.message||'');
  const code=/^[A-Z][A-Z0-9_]{3,119}$/.test(value)?value:'CHAT_INTAKE_UNAVAILABLE';
  console.warn('REALITY_CHAT_INTAKE_STAGE_FAILURE',stage,code,
   'elapsed_ms',Date.now()-intakeStarted);
  return res.status(Number(e.status)||503).json({
   ok:false,error:code,stage,
   request_saved_state:'CHECK_AUTHENTICATED_HISTORY',
   execution_authorized:false,installation_authorized:false});
 }
}

// Only exact owner-RLS request rows are loaded; there is no expensive
// full-history fetch before or after writing a message. A prior successful
// but unacknowledged save is recovered rather than inserted again.
export async function acceptDurableChatTurn(
 {session,conversationId,requestId,message},
 {readExact=readPrivateChatRequest,
  readLatest=readLatestPrivateChatUserTurn,
  record=recordPrivateMessage,now=Date.now}={}
){
 if(!session?.user_id||!validUuid(conversationId)||!validUuid(requestId)||
    typeof message!=='string'||!message.trim()||message.length>6000||
    typeof readExact!=='function'||typeof readLatest!=='function'||
    typeof record!=='function')
  fail('CHAT_MESSAGE_INVALID',400);
 // Concurrent read-only RLS checks keep this endpoint inside its fast
 // budget even on a long-running conversation.
 const [existing,latest]=await Promise.all([
  readExact(session,{conversationId,requestId}),
  readLatest(session,conversationId)
 ]);
 const prior=existing?.messages;
 if(!Array.isArray(prior)||prior.length>2)
  fail('CHAT_EXACT_SOURCE_READBACK_UNVERIFIED',503);
 if(prior.length){
  const saved=prior.find(x=>x.role==='user'&&x.text===message);
  if(!saved||prior.some(x=>x.role==='user'&&x.text!==message))
   fail('CHAT_REQUEST_ID_CONTENT_MISMATCH',409);
  return {ok:true,saved:true,replayed:true,duplicate_content:false,
   conversation_id:conversationId,request_id:requestId,
   source_ref:saved.source_ref,
   reply_verified:prior.some(x=>x.role==='assistant'),
   execution_authorized:false,installation_authorized:false};
 }
 // An identical, still-unanswered LAST human turn may be the very request
 // whose response acknowledgment failed. Reuse its exact identity instead
 // of creating a second human message, shift or build job. Scope to a
 // bounded recent window; intentional later repeats stay possible.
 if(latest?.role==='user'&&latest.text===message&&
    validUuid(latest.request_id)&&
    /^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(latest.source_ref||'')){
  const age=now()-Date.parse(latest.created_at||'');
  if(Number.isFinite(age)&&age>=0&&age<=30*60*1000){
   const old=await readExact(session,{
    conversationId,requestId:latest.request_id});
   const matches=old?.messages;
   if(Array.isArray(matches)&&
      matches.filter(x=>x.role==='user'&&x.text===message&&
       x.source_ref===latest.source_ref).length===1&&
      !matches.some(x=>x.role==='assistant')){
    return {ok:true,saved:true,replayed:true,duplicate_content:true,
     conversation_id:conversationId,request_id:latest.request_id,
     source_ref:latest.source_ref,reply_verified:false,
     execution_authorized:false,installation_authorized:false};
   }
  }
 }
 // The PostgREST insert returns one genuine stored row. Verify that exact
 // request independently, not a second 240-message conversation fetch.
 const written=await record(session,{
  conversationId,requestId,role:'user',text:message});
 const exact=await readExact(session,{conversationId,requestId});
 const saved=exact?.messages?.find(x=>x.role==='user'&&
  x.request_id===requestId&&x.text===message&&
  x.source_ref===written.source_ref);
 if(!saved)fail('CHAT_USER_SAVE_READBACK_UNVERIFIED',503);
 return {ok:true,saved:true,replayed:false,duplicate_content:false,
  conversation_id:conversationId,request_id:requestId,
  source_ref:saved.source_ref,reply_verified:false,
  execution_authorized:false,installation_authorized:false};
}
