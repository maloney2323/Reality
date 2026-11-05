// Reality Chat response status: observable browser request only, not model reasoning.
(()=>{'use strict';
 if(location.pathname!=='/chat')return;
 const button=document.getElementById('privateSend');
 const conversation=document.getElementById('realityChatConversation');
 if(!button||!conversation)return;
 const p=document.createElement('p');
 p.id='realityChatRequestStatus';p.setAttribute('role','status');
 p.setAttribute('aria-live','polite');
 p.hidden=true;p.textContent='';
 conversation.querySelector('.reality-chat-thread-heading')?.after(p);
 let started=0,timer=null;
 function update(){
  if(!started)return;
  const secs=Math.floor((Date.now()-started)/1000);
  p.textContent='Reality is processing your Chat request · '+secs+'s. This indicates an active browser request, not verified background worker execution.';
 }
 button.addEventListener('click',()=>{
  if(button.disabled||!document.getElementById('privatePrompt')?.value.trim())return;
  started=Date.now();p.hidden=false;update();
  clearInterval(timer);timer=setInterval(update,1000);
 },true);
 new MutationObserver(()=>{
  if(!button.disabled&&started){
   clearInterval(timer);
   p.textContent='Chat response returned. Check the conversation and verified activity for the recorded result.';
   started=0;
  }
 }).observe(button,{attributes:true,attributeFilter:['disabled']});
})();
