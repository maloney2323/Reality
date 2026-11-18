// Reality speaks first when the owner's verified operational state changes.
// All human-facing text is saved by the server into the existing Chat ledger.
// No alerts, banners, fabricated role messages, or execution permissions.
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(window.location.pathname))return;
 const get=id=>document.getElementById(id);
 const ready=get('privateReady');
 if(!ready||typeof window.realityActiveConversationId!=='function')return;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
 const MIN_POLL_MS=4*60*1000;
 let lastCheckAt=0,inFlight=false,pendingConversation=null;
 const signedIn=()=>ready.style.display==='block';
 function safeToRefresh(){
  const prompt=get('privatePrompt');
  return !(prompt&&document.activeElement===prompt&&
   String(prompt.value||'').trim());
 }
 async function renderPending(){
  if(!pendingConversation||!signedIn()||!safeToRefresh())return;
  const current=window.realityActiveConversationId();
  if(current!==pendingConversation)return;
  pendingConversation=null;
  if(typeof window.realityChatRefreshTranscript==='function')
   await window.realityChatRefreshTranscript();
 }
 async function check({force=false}={}){
  if(inFlight||!signedIn()||document.visibilityState==='hidden')return;
  if(!force&&Date.now()-lastCheckAt<MIN_POLL_MS)return;
  const conversation=window.realityActiveConversationId();
  if(!UUID.test(conversation))return;
  inFlight=true;lastCheckAt=Date.now();
  try{
   const res=await fetch('/api/reality/personal-chat-operational-update',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
     action:'CHECK_VERIFIED_OWNER_OPERATIONAL_UPDATES',
     conversation_id:conversation
    }),signal:AbortSignal.timeout(25000)
   });
   const proof=await res.json().catch(()=>null);
   if(!res.ok||proof?.ok!==true||
      !['VERIFIED_OPERATIONAL_CHAT_DURABLY_SENT',
       'OPERATIONAL_STATE_ALREADY_DELIVERED_NO_REPEAT',
       'OPERATIONAL_GREETING_COOLDOWN_NO_REPEAT',
       'NO_NEW_ACTIONABLE_VERIFIED_OPERATIONAL_STATE'].includes(proof.status)||
      proof.shift_authorized!==false||
      proof.installation_authorized!==false||
      proof.production_changed!==false)
    return;
   if(proof.created===true&&
      proof.status==='VERIFIED_OPERATIONAL_CHAT_DURABLY_SENT'&&
      proof.current_conversation_received_message===true&&
      proof.conversation_id===conversation){
    pendingConversation=conversation;
    await renderPending();
   }
  }catch{
   // Uncertain network delivery is not an excuse to send a second event.
   // The DB holds one canonical row for this owner snapshot and day.
  }finally{inFlight=false}
 }
 const sessionObserver=new MutationObserver(()=>{
  if(signedIn())void check({force:true});
  else{lastCheckAt=0;pendingConversation=null;}
 });
 sessionObserver.observe(ready,{attributes:true,attributeFilter:['style']});
 const prompt=get('privatePrompt');
 prompt?.addEventListener('blur',()=>{void renderPending()});
 window.addEventListener('pageshow',()=>{void check();void renderPending()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
   void check();void renderPending();
  }
 });
 window.setInterval(()=>{void check();void renderPending()},MIN_POLL_MS);
 if(signedIn())void check({force:true});
})();
