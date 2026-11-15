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
 let lastReadback=null;
 const sendButton=document.getElementById('privateSend');
 function recoverSavedReplyIfReady(){
  const detail=lastReadback||{};
  const selected=selectSavedReplyForRecovery({
   conversationId:detail.conversation_id,
   messages:detail.messages,unansweredRequests:detail.unanswered_requests
  });
  if(!selected||document.hidden)return;
  // History often arrives BEFORE the failed Send handler's finally block.
  // Defer, don't discard the recovery when the Send button is still disabled.
  if(sendButton?.disabled)return;
  const key='reality.chat.saved-reply-recovery.v1:'+
   selected.conversation_id+':'+selected.request_id;
  if(attempted.has(key))return;
  const selector='.reality-chat-unanswered-notice button[data-recover-request-id="'+
   selected.request_id+'"]';
  const control=document.querySelector(selector);
  if(!control||control.disabled||!control.isConnected)return;
  try{
   const prior=Number(window.localStorage?.getItem(key)||0);
   if(Number.isFinite(prior)&&Date.now()-prior<60*60*1000)return;
   window.localStorage?.setItem(key,String(Date.now()));
  }catch{return}// No safe cross-tab lease; manual recovery stays available.
  attempted.add(key);
  // This invokes the existing exact saved-request POST, never Chat intake.
  // An independently verified assistant row is still required for success.
  control.textContent='Recovering saved reply automatically…';
  control.click();
 }
 window.addEventListener('reality:saved-chat-readback',event=>{
  lastReadback=event.detail||null;
  recoverSavedReplyIfReady();
 });
 // The disabled button is a temporary state, not a loss of the saved turn.
 // When Send releases, resume the ONE pending exact-ID recovery automatically.
 if(sendButton&&typeof MutationObserver!=='undefined'){
  new MutationObserver(()=>recoverSavedReplyIfReady())
   .observe(sendButton,{attributes:true,attributeFilter:['disabled']});
 }
 if(typeof document.addEventListener==='function')
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden)recoverSavedReplyIfReady();
  });
}
