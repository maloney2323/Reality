// Reality Chat reply visibility, backed only by the existing authenticated
// saved-message readback and the browser's actual in-flight request.
// Chat progress does not imply a worker was dispatched or an LLM's hidden thoughts.
(() => {
 'use strict';
 if(location.pathname!=='/chat')return;
 const get=id=>document.getElementById(id);
 const button=get('privateSend'),conversation=get('realityChatConversation');
 const transcript=get('privateTranscript');
 if(!button||!conversation||!transcript||get('realityChatRequestStatus'))return;
 const block=document.createElement('section');
 block.id='realityChatRequestStatus';
 block.className='reality-live-reply bubble';
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
 // Progress belongs directly BELOW the new user message in the thread,
 // not in a fixed banner above the conversation or inside the composer.
 // The send handler first appends a visibly unverified local user bubble.

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
  one('Message submitted',true,'You pressed Send. No development worker was started by this Chat display; no installation or approval was authorized.');
  one('Authenticated message save',Boolean(state.saved),
   state.saved?'Verified from the signed-in conversation: '+state.saved.source_ref:
     'Waiting for independent message readback. The message above is displayed locally until verified.');
  one('Evidence and answer processing',Boolean(state.answer),
   state.answer?'The server completed its governed response process; saved output is available.':
     state.complete?'No successful response has been independently verified.':
     'Reality is handling this Chat request. Internal model reasoning and verification stages are not streamed by the current Chat endpoint.');
  one('Final reply saved and verified',Boolean(state.answer),
   state.answer?'The same request ID has an independently read-back answer: '+state.answer.source_ref:
     'Waiting for a matching assistant message in authenticated saved history.');
  if(state.answer){
   spinner.classList.add('completed');
   title.textContent='Reality saved your answer';
   line.textContent='The Chat answer is durably recorded. View the separate job timeline for real worker execution.';
  }else if(state.complete){
   spinner.classList.remove('completed');
   title.textContent='Reply not verified';
   line.textContent=state.failure?
     'Reality could not finish this Chat request ('+state.failure+'). Your message is preserved; no worker or new job started.':
     'The request ended without a verified saved answer. Check the saved-message stage; do not assume work continues in the background.';
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
   saved:null,answer:null,complete:false,reading:false,failure:null};
  // If a previous attempt is still visible, give the new attempt its own
  // current inline status immediately after its user bubble.
  block.remove();
  transcript.append(block);
  block.hidden=false;
  spinner.classList.remove('completed');
  details.open=true;
  render();
  transcript.scrollTop=transcript.scrollHeight;
  clockInterval=setInterval(render,1000);
  pollInterval=setInterval(()=>{void readback()},2500);
  setTimeout(()=>{void readback()},800);
 }
 window.addEventListener('reality:chat-request-started',start);
 window.addEventListener('reality:chat-request-failed',event=>{
  const state=current;
  if(!state||event.detail?.request_id!==state.requestId)return;
  state.failure=/^[A-Z][A-Z0-9_]{3,119}$/.test(event.detail?.code||'')?
   event.detail.code:'CHAT_RESPONSE_UNAVAILABLE';
  state.complete=true;
  stopClocks();
  void readback();
  render();
 });
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
