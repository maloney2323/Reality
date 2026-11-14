// Owner-scoped, READ-ONLY status for an authenticated saved Chat turn.
// A saved user instruction is neither a verified model reply nor a warrant.
// No new calls to the LLM, executor, or installation system.
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const savedRef=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
export function summarizeSavedChatReplyReadback(messages,{limit=16}={}){
 if(!Array.isArray(messages)||messages.length>241||
    !Number.isSafeInteger(limit)||limit<1||limit>32)
  throw Error('CHAT_REPLY_READBACK_INVALID_HISTORY');
 const requests=new Map();
 for(const item of messages){
  if(!item||!uuid.test(item.request_id||'')||
     !['user','assistant'].includes(item.role))continue;
  const request=requests.get(item.request_id)||{
   request_id:item.request_id,user:null,answer:null};
  if(item.role==='user'&&savedRef.test(item.source_ref||''))
   request.user={source_ref:item.source_ref,saved_at:item.created_at};
  if(item.role==='assistant'&&savedRef.test(item.source_ref||''))
   request.answer={source_ref:item.source_ref,saved_at:item.created_at};
  requests.set(item.request_id,request);
 }
 const pending=[...requests.values()].filter(x=>x.user&&!x.answer)
  .sort((a,b)=>String(b.user.saved_at).localeCompare(String(a.user.saved_at)))
  .slice(0,limit).map(x=>Object.freeze({
   request_id:x.request_id,
   user_source_ref:x.user.source_ref,
   saved_at:x.user.saved_at,
   status:'USER_MESSAGE_SAVED_REPLY_NOT_VERIFIED',
   response_failure_reason:'NO_DURABLE_TERMINAL_ERROR_RECORDED',
   development_job_dispatched_by_this_chat_request:false,
   installation_authorized_by_this_chat_request:false,
  }));
 return Object.freeze({
  status:pending.length?'UNANSWERED_AUTHENTICATED_SAVED_CHAT_REQUESTS':
   'NO_UNANSWERED_REQUESTS_IN_LOADED_HISTORY',
  source:'AUTHENTICATED_OWNER_SCOPED_RLS_HISTORY',
  scope:'ONLY_MESSAGES_RETURNED_IN_LOADED_HISTORY',
  chat_endpoint_mode:'AUTHENTICATED_CHAT_PERSISTS_TO_GOVERNED_WORK_INTAKE',
  unanswered_requests:pending,
  independently_verified_model_answer_for_pending:false,
  no_new_job_started_by_this_readback:true
 });
}
