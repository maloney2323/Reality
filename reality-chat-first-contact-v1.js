// Chat-first Reality: one owner-scoped saved first message, not a fake
// client-only bubble, and no repeated greeting for returning businesses.
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(window.location.pathname))return;
 const get=id=>document.getElementById(id);
 const ready=get('privateReady');
 if(!ready||typeof window.realityActiveConversationId!=='function')return;
 const UUID=/^[a-f0-9]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 let inFlight=false,checked=false;
 async function firstContact(){
  if(inFlight||checked||ready.style.display!=='block')return;
  const conversationId=window.realityActiveConversationId();
  if(!UUID.test(conversationId))return;
  inFlight=true;
  try{
   const res=await fetch('/api/reality/personal-chat-first-contact',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     action:'SEND_FIRST_OWNER_BUSINESS_CHAT_IF_NEW',
     conversation_id:conversationId
    }),
    signal:AbortSignal.timeout(20000)
   });
   const data=await res.json().catch(()=>null);
   if(!res.ok||data?.ok!==true||
    !['OWNER_FIRST_PROACTIVE_CHAT_DURABLY_SENT',
      'OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE',
      'OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK'].includes(data.status)||
    data.work_shift_authorized!==false||
    data.external_actions_authorized!==false||
    data.production_changed!==false||
    data.provider_connected_by_read!==false)
    throw Error('OWNER_FIRST_CHAT_LEDGER_UNVERIFIED');
   checked=true;
   // Send was committed as an assistant message in real saved Chat.
   // Re-read only if THIS conversation received it. Do not replace an
   // in-progress human draft or create an additional Chat request.
   if(data.status==='OWNER_FIRST_PROACTIVE_CHAT_DURABLY_SENT'&&
      data.current_conversation_received_message===true&&
      data.conversation_id===conversationId&&
      typeof window.realityChatRefreshTranscript==='function')
    await window.realityChatRefreshTranscript();
  }catch{
   // The server may already have saved the first assistant message before
   // an acknowledgment disappeared. Never retry automatically in the same
   // session; next sign-in may perform idempotent owner-locked readback.
   checked=true;
  }finally{inFlight=false}
 }
 const stateObserver=new MutationObserver(()=>{
  if(ready.style.display==='block')void firstContact();
  else checked=false;
 });
 stateObserver.observe(ready,{attributes:true,attributeFilter:['style']});
 if(ready.style.display==='block')void firstContact();
})();
