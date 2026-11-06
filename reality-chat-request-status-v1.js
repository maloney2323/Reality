// Reality Chat reply visibility, backed only by the existing authenticated
// saved-message readback and the browser's actual in-flight request.
// Chat progress does not imply a worker was dispatched or an LLM's hidden thoughts.
(() => {
 'use strict';
 if(location.pathname!=='/chat')return;
 const get=id=>document.getElementById(id);
 const button=get('privateSend'),conversation=get('realityChatConversation');
 if(!button||!conversation||get('realityChatRequestStatus'))return;
 const block=document.createElement('section');
 block.id='realityChatRequestStatus';
 block.className='reality-live-reply';
 block.hidden=true;
 block.setAttribute('aria-label','Live Chat response activity');
 const heading=document.createElement('div');
 heading.className='reality-live-reply-heading';
 const spinner=document.createElement('span');
 spinner.className='reality-live-reply-spinner';
 spinner.setAttribute('aria-hidden','true');
 const title=document.createElement('strong');
 const duration=document.createElement('span');
 duration.className='reality-live-reply-duration';
 heading.append(spinner,title,duration);
 const line=document.createElement('p');
 line.className='reality-live-reply-text';
 line.setAttribute('role','status');
 line.setAttribute('aria-live','polite');
 const details=document.createElement('details');
 details.className='reality-live-reply-proof';
 const summary=document.createElement('summary');
 summary.textContent='Show verified response stages';
 const steps=document.createElement('div');
 steps.className='reality-live-reply-steps';
 details.append(summary,steps);
 block.append(heading,line,details);
 const parent=conversation.querySelector('.reality-chat-thread-heading');
 if(parent)parent.insertAdjacentElement('afterend',block);
 else conversation.prepend(block);

 const validUuid=s=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s||'');
 let current=null,pollInterval=null,clockInterval=null;
 function stopClocks(){
  clearInterval(pollInterval);
  clearInterval(clockInterval);
  pollInterval=null;clockInterval=null;
 }
 function render(){
  const state=current;
  if(!state)return;
  const seconds=Math.floor((Date.now()-state.startedAt)/1000);
  duration.textContent=seconds+'s';
  const one=(name,verified,description)=>{
   const row=document.createElement('div');
   row.className='reality-live-reply-row';
   const strong=document.createElement('strong');
   strong.textContent=(verified?'✓ ':'○ ')+name;
   const p=document.createElement('p');
   p.textContent=description;
   row.append(strong,p);
   steps.append(row);
  };
  steps.replaceChildren();
  one('Request submitted',true,'Observed when you pressed Send. No development worker was started by this display.');
  one('Message saved',Boolean(state.saved),
   state.saved?'Authenticated saved-message source: '+state.saved.source_ref:
     'Waiting for independently retrievable authenticated Chat history.');
  one('Answer recorded',Boolean(state.answer),
   state.answer?'Matching assistant answer read back with the exact request ID: '+state.answer.source_ref:
    'Not yet read back. Internal model reasoning and verification stages are not streamed by the current Chat endpoint.');
  if(state.answer){
   spinner.classList.add('completed');
   title.textContent='Reality saved your answer';
   line.textContent='The Chat answer is durably recorded. View the separate job timeline for real worker execution.';
  }else if(state.complete){
   spinner.classList.remove('completed');
   title.textContent='Chat request finished';
   line.textContent='The request finished, but a matching saved answer has not been verified. Check the response details; do not assume a background investigation is running.';
  }else if(state.saved){
   title.textContent='Reality is preparing a reply';
   line.textContent='Your message is saved. Waiting for the checked answer; the current endpoint does not expose live internal reasoning.';
  }else{
   title.textContent='Sending message to Reality';
   line.textContent='Waiting for the authenticated message save. This is Chat activity, not a development-worker receipt.';
  }
 }
 async function readback(){
  const state=current;
  if(!state||state.reading||state.answer||document.hidden)return;
  state.reading=true;
  try{
   const response=await fetch(
    '/api/reality/personal-chat?conversation_id='+encodeURIComponent(state.conversationId),
    {method:'GET',credentials:'same-origin',cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json();
   if(current!==state||data?.ok!==true||
      data.conversation_id!==state.conversationId||
      !Array.isArray(data.messages))return;
   const found=data.messages.filter(x=>x.request_id===state.requestId);
   const user=found.find(x=>x.role==='user'&&
      String(x.source_ref||'').startsWith('supabase:reality_chat_messages:'));
   const answer=found.find(x=>x.role==='assistant'&&
      String(x.source_ref||'').startsWith('supabase:reality_chat_messages:'));
   if(user)state.saved={source_ref:user.source_ref};
   if(user&&answer)state.answer={source_ref:answer.source_ref};
   if(state.answer)stopClocks();
   render();
  }catch{/* A temporary readback failure is not evidence that work failed. */}
  finally{state.reading=false}
 }
 function start(event){
  const {conversation_id:conversationId,request_id:requestId}=event.detail||{};
  if(!validUuid(conversationId)||!validUuid(requestId))return;
  stopClocks();
  current={conversationId,requestId,startedAt:Date.now(),
   saved:null,answer:null,complete:false,reading:false};
  block.hidden=false;
  spinner.classList.remove('completed');
  details.open=false;
  render();
  clockInterval=setInterval(render,1000);
  pollInterval=setInterval(()=>{void readback()},2500);
  setTimeout(()=>{void readback()},800);
 }
 window.addEventListener('reality:chat-request-started',start);
 new MutationObserver(()=>{
  if(current&&!button.disabled&&!current.complete){
   current.complete=true;
   stopClocks();
   void readback();
   render();
  }
 }).observe(button,{attributes:true,attributeFilter:['disabled']});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&current&&!current.answer)void readback();
 });
})();
