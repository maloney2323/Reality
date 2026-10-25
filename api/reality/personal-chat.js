// Isolated, authenticated Personal Reality conversation. No customer actions.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin} from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,recordPrivateMessage,validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../../src/reality-live-intelligence-orchestration-v0.1.js';
export const maxDuration=60;
function fail(code,status){const e=new Error(code);e.status=status;throw e}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).setHeader('Allow','GET, POST').json({error:'METHOD_NOT_ALLOWED'});
  if(req.method==='POST')assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session)fail('CHAT_SIGN_IN_REQUIRED',401);
  const conversationId=String((req.method==='GET'?req.query?.conversation_id:req.body?.conversation_id)||'');
  if(!validUuid(conversationId))fail('CHAT_CONVERSATION_ID_INVALID',400);
  const history=await readPrivateChat(session,conversationId);
  if(req.method==='GET'){
   return res.status(200).json({ok:true,conversation_id:conversationId,
    messages:history.messages,continuity:{
     history_source:'AUTHENTICATED_SUPABASE_RLS',
     recovered_messages:history.messages.length,
     coverage:history.history_status,older_messages_may_be_missing:history.older_missing,
    }});
  }
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   fail('CHAT_JSON_REQUIRED',415);
  const requestId=String(req.body?.request_id||''),text=String(req.body?.message||'').trim();
  if(!validUuid(requestId)||!text||text.length>6000)fail('CHAT_MESSAGE_INVALID',400);
  const existing=history.messages.filter(m=>m.request_id===requestId);
  if(existing.length){
   const prior=existing.find(x=>x.role==='assistant');
   if(prior)return res.status(200).json({ok:true,conversation_id:conversationId,
     answer:prior.text,replayed:true,continuity:{coverage:history.history_status,
      recovered_messages:history.messages.length,older_messages_may_be_missing:history.older_missing}});
   fail('CHAT_REQUEST_ALREADY_IN_HISTORY',409);
  }
  const key=String(process.env.REALITY_STANDALONE_OPENAI_API_KEY||process.env.OPENAI_API_KEY||'');
  if(!key)fail('CHAT_MODEL_KEY_NOT_CONFIGURED',503);
  // Save the human utterance BEFORE any cognition, and do not hallucinate
  // continuity success when source persistence fails.
  await recordPrivateMessage(session,{conversationId,requestId,role:'user',text});
  const result=await runLiveIntelligenceOrchestration({
   message:text,requestedBy:session.user_id,
   model:'gpt-4.1-mini',apiKey:key,
   systemContext:{conversation_id:conversationId,worldline_id:'personal:chat',
    conversation_history_source:'AUTHENTICATED_SUPABASE_RLS',
    conversation_history_older_messages_may_be_missing:history.older_missing,
    action_authorized:false,execution_authorized:false,
   },
   verifiedConversationTurns:history.messages,
  });
  const answer=String(result?.intelligence?.answer||'').trim();
  if(!answer)fail('CHAT_MODEL_ANSWER_UNAVAILABLE',503);
  await recordPrivateMessage(session,{conversationId,requestId,role:'assistant',text:answer});
  const check=await readPrivateChat(session,conversationId);
  if(!check.messages.some(x=>x.role==='assistant'&&x.request_id===requestId&&x.text===answer))
   fail('CHAT_ASSISTANT_DURABILITY_NOT_VERIFIED',503);
  return res.status(200).json({ok:true,conversation_id:conversationId,answer,replayed:false,
   continuity:{history_source:'AUTHENTICATED_SUPABASE_RLS',
    recovered_messages:check.messages.length,coverage:check.history_status,
    older_messages_may_be_missing:check.older_missing,
    current_answer_persisted:true},
   execution:{status:'NOT_EXECUTED',external_actions_authorized:false}});
 }catch(e){
  const status=Number(e.status)||503;
  return res.status(status).json({ok:false,error:e.message||'CHAT_UNAVAILABLE'});
 }
}
