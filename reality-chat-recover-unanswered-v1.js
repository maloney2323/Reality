// Authenticated Reality Chat: recover one eligible saved, unanswered turn.
// Recovery invokes the EXISTING same-request replay path. It never submits a
// new user message, interprets text as authorization, or starts an employee.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const REF=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
const MAX_AGE_MS=24*60*60*1000;
export function selectSavedReplyForRecovery({
 conversationId,messages,unansweredRequests,now=Date.now()
}={}){
 if(!UUID.test(conversationId||'')||!Array.isArray(messages)||
    !Array.isArray(unansweredRequests)||messages.length>241||
    unansweredRequests.length>32||!Number.isFinite(now))
  return null;
 const last=messages.at(-1);
 if(last?.role!=='user'||!UUID.test(last.request_id||'')||
    !REF.test(last.source_ref||''))return null;
 const age=now-Date.parse(last.created_at||'');
 if(!Number.isFinite(age)||age<0||age>MAX_AGE_MS)return null;
 const pending=unansweredRequests.find(x=>
  x?.status==='USER_MESSAGE_SAVED_REPLY_NOT_VERIFIED'&&
  x.request_id===last.request_id&&
  x.user_source_ref===last.source_ref);
 if(!pending)return null;
 // Only the latest authenticated saved user turn, not an old turn after
 // subsequent messages, may be resumed automatically.
 return Object.freeze({conversation_id:conversationId,request_id:last.request_id,
  source_ref:last.source_ref,age_ms:age,creates_user_message:false,
  execution_authorized:false,installation_authorized:false});
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&
   window.location?.pathname==='/chat'){
 const attempted=new Set();
 window.addEventListener('reality:saved-chat-readback',event=>{
  const detail=event.detail||{};
  const selected=selectSavedReplyForRecovery({
   conversationId:detail.conversation_id,
   messages:detail.messages,unansweredRequests:detail.unanswered_requests
  });
  if(!selected||document.hidden||document.getElementById('privateSend')?.disabled)
   return;
  const key='reality.chat.saved-reply-recovery.v1:'+
   selected.conversation_id+':'+selected.request_id;
  if(attempted.has(key))return;
  try{
   const prior=Number(window.localStorage?.getItem(key)||0);
   if(Number.isFinite(prior)&&Date.now()-prior<60*60*1000)return;
   window.localStorage?.setItem(key,String(Date.now()));
  }catch{return}// No safe cross-tab lease; keep manual recovery available.
  attempted.add(key);
  const selector='.reality-chat-unanswered-notice button[data-recover-request-id="'+
   selected.request_id+'"]';
  const control=document.querySelector(selector);
  if(!control||control.disabled||!control.isConnected)return;
  // The existing recovery button performs the same authenticated POST,
  // checks final durability and reports exact safe stage errors.
  control.textContent='Recovering saved reply automatically…';
  control.click();
 });
}
