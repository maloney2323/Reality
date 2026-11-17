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
 // Normal Chat has one unobtrusive reply indicator. The detailed
 // lifecycle belongs in Work ONLY after real provider-backed execution
 // evidence exists; it must not interrupt the conversation on every Send.
 block.append(heading,line);
 // Progress belongs directly BELOW the new user message in the thread,
 // not in a fixed banner above the conversation or inside the composer.
 // The send handler first appends a visibly unverified local user bubble.

 const validUuid=s=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s||'');
 let current=null,pollInterval=null,clockInterval=null,workInterval=null;
 function stopClocks({keepWork=false}={}){
  clearInterval(pollInterval);
  clearInterval(clockInterval);
  if(!keepWork)clearInterval(workInterval);
  pollInterval=null;clockInterval=null;
  if(!keepWork)workInterval=null;
 }
 function render(){
  const state=current;
  if(!state)return;
  const work=state.work;
  const development=work?.development;
  const legitimateDevelopment=development&&
   /^work:[a-f0-9]{32}$/.test(development.original_work_id||'')&&
   development.installation_authorized===false&&
   development.production_changed===false&&
   ['QUEUED','CLAIMED','DRAFT_GENERATED','PUBLISH_FENCED',
    'CANDIDATE_STAGED','CI_VERIFIED','CI_REJECTED',
    'NEEDS_SOURCE','PROVIDER_UNVERIFIED'].includes(development.phase);
  const chain=work?.work_chain?.find(x=>
   /^work:[a-f0-9]{32}$/.test(x?.original_work_id||'')&&
   ['CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI',
    'CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING',
    'CORRECTIVE_CI_PASSED_AWAITING_EXACT_INSTALL_GATE',
    'ORIGINAL_SETTLEMENT_RECEIPT_PRESENT']
    .includes(x.current_evidence_stage));
  const broker=state.buildResult?.execution_started===true&&
   /^work:[a-f0-9]{32}$/.test(state.buildResult.original_work_id||'')?
    state.buildResult:null;
  const actualWork=Boolean(legitimateDevelopment||chain||broker);
  // Never show ordinary conversational PENDING / NEEDS_AUTHORIZED_SCOPE /
  // model-advice checks as a nine-step "operational" workflow.
  if(state.answer&&!actualWork){
   block.hidden=true;
   return;
  }
  block.hidden=false;
  duration.hidden=!actualWork;
  duration.textContent=actualWork?
   Math.floor((Date.now()-state.startedAt)/1000)+'s':'';
  if(actualWork){
   spinner.classList.add('completed');
   if(legitimateDevelopment){
    title.textContent='Reality development · '+development.phase.replaceAll('_',' ').toLowerCase();
    line.textContent=development.original_work_id+
     (development.evidence?.pr_url?' · '+development.evidence.pr_url:'')+
     (development.evidence?.ci_url?' · Independent CI: '+development.evidence.ci_url:'')+
     ' · Installation not authorized';
   }else if(chain){
    title.textContent='Reality engineering · '+chain.current_evidence_stage.replaceAll('_',' ').toLowerCase();
    line.textContent=chain.original_work_id+
     (chain.corrective_ci_url?' · '+chain.corrective_ci_url:'')+
     ' · Verified original-stage evidence';
   }else{
    title.textContent='Reality engineering · provider dispatch verified';
    line.textContent=broker.original_work_id+
     (broker.independent_run_url?' · '+broker.independent_run_url:'')+
     ' · Installation not authorized';
   }
   line.hidden=false;
   return;
  }
  spinner.classList.remove('completed');
  duration.hidden=true;
  if(state.complete&&state.failure){
   title.textContent=state.saved?'Reply unavailable · message saved':
    'Message delivery not verified';
   line.hidden=false;
   line.textContent=state.saved?
    'Reality saved this message. Recover its reply using the saved message; do not send it again.':
    'Reality could not verify delivery. Your draft is preserved.';
  }else if(state.complete&&!state.answer){
   title.textContent='Checking saved reply…';
   line.hidden=true;
  }else{
   title.textContent='Reality is replying…';
   line.hidden=true;
  }
 }
 async function readWork(state){
  if(!state||current!==state||!state.monitorWork||state.workReading||!state.saved||document.hidden)return;
  if(Date.now()-(state.lastWorkCheck||0)<7500)return;
  state.lastWorkCheck=Date.now();
  state.workReading=true;
  try{
   const response=await fetch(
    '/api/reality/personal-chat?conversation_id='+encodeURIComponent(state.conversationId)+
    '&work_readback=1&request_id='+encodeURIComponent(state.requestId),{
     method:'GET',credentials:'same-origin',cache:'no-store',
     signal:AbortSignal.timeout(8000)});
   if(!response.ok)return;
   const data=await response.json();
   if(current!==state||data?.ok!==true||
      data.conversation_id!==state.conversationId||
      data.request_id!==state.requestId||
      data.execution_authorized_by_chat!==false||
      data.installation_authorized!==false||
      data.production_changed!==false||
      data.status!=='AUTHENTICATED_WORK_INTAKE_RECORD_VERIFIED')return;
   const work=data.work_handoff;
   if(!work||work.request_id!==state.requestId||
      !/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(work.source_ref||'')||
      !['PENDING','CLAIMED','INVESTIGATED_SCOPED',
        'NEEDS_AUTHORIZED_SCOPE','CONVERSATION_ONLY',
        'PROVIDER_UNVERIFIED'].includes(work.status)||
      work.execution_authorized_by_chat!==false||
      work.installation_authorized!==false||
      work.production_changed!==false||
      !Array.isArray(work.work_chain)||work.work_chain.length>25)return;
   state.work=work;
   render();
   if(state.explicitBuild && !state.buildPosted &&
      work.status==='INVESTIGATED_SCOPED' &&
      Array.isArray(work.work_chain) &&
      work.work_chain.length===1 &&
      ['CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI',
       'CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING']
       .includes(work.work_chain[0]?.current_evidence_stage)){
    // Read-only status surfaces an independently verified candidate.
    // Only the actual user Send handler may dispatch the governed action.
    state.buildPosted=true;
    window.dispatchEvent(new CustomEvent('reality:chat-engineering-ready',{
     detail:{conversation_id:state.conversationId,
      request_id:state.requestId,
      original_work_id:work.work_chain[0].original_work_id}
    }));
   }
   // A conversational investigation may conclude 'needs scope' while
   // the independent NEW development is already queued/generating. Keep the
   // signed work readback alive after Chat answers so code and CI are visible.
   // The interval has an idempotent 7.5s floor and stops on new request or
   // when the page is hidden, never by declaring model advice a final job.
  }catch{/* An unavailable readback is not proof of a failed job. */}
  finally{state.workReading=false}
 }
 async function readback(){
  const state=current;
  if(!state||state.reading||state.answer||document.hidden)return;
  state.reading=true;
  try{
   const response=await fetch(
    '/api/reality/personal-chat?conversation_id='+encodeURIComponent(state.conversationId)+
    '&reply_readback=1&request_id='+encodeURIComponent(state.requestId),
    {method:'GET',credentials:'same-origin',cache:'no-store',
     signal:AbortSignal.timeout(8000)});
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
   if(state.saved&&state.monitorWork)void readWork(state);
   if(state.answer)stopClocks({keepWork:true});
   render();
  }catch{/* A temporary readback failure is not evidence that work failed. */}
  finally{state.reading=false}
 }
 function start(event){
  const {conversation_id:conversationId,request_id:requestId}=event.detail||{};
  if(!validUuid(conversationId)||!validUuid(requestId))return;
  stopClocks();
  current={conversationId,requestId,startedAt:Date.now(),
   saved:null,answer:null,complete:false,reading:false,failure:null,failureStage:null,
   work:null,workReading:false,lastWorkCheck:0,
   explicitBuild:event.detail?.explicit_scoped_build===true,
   monitorWork:event.detail?.work_status_requested===true,
   buildPosted:false,buildReading:false,buildResult:null};
  // If a previous attempt is still visible, give the new attempt its own
  // current inline status immediately after its user bubble.
  block.remove();
  transcript.append(block);
  block.hidden=false;
  spinner.classList.remove('completed');
  render();
  transcript.scrollTop=transcript.scrollHeight;
  clockInterval=setInterval(render,1000);
  pollInterval=setInterval(()=>{void readback()},2500);
  // Work evidence is independent of Chat's answer. Keep checking even after
  // the assistant has replied; a worker may write and test code later.
  if(current.monitorWork)
   workInterval=setInterval(()=>{if(current?.saved)void readWork(current)},8500);
  setTimeout(()=>{void readback()},800);
 }
 // Saved-history refresh replaces the transcript's children. Preserve the
 // request-bound live work panel under its exact signed-in user turn; otherwise
 // the existing timer updates a detached, invisible node after the reply.
 new MutationObserver(()=>{
  if(!current||block.isConnected)return;
  const bubble=[...transcript.querySelectorAll('.bubble.user')]
   .find(x=>x.dataset.requestId===current.requestId);
  if(!bubble)return;
  bubble.after(block);
  block.hidden=false;
  render();
 }).observe(transcript,{childList:true});
 // Trust the authenticated intake receipt immediately. An independent GET
 // can corroborate it later, but a timeout must never erase a genuine save
 // receipt and mislabel an already-persisted message as "not delivered".
 window.addEventListener('reality:chat-intake-saved',event=>{
  const d=event.detail||{},state=current;
  if(!state||d.conversation_id!==state.conversationId||
     d.request_id!==state.requestId||
     !/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(d.source_ref||''))return;
  state.saved={source_ref:d.source_ref};
  void readWork(state);
  render();
 });
 window.addEventListener('reality:chat-request-rebound',event=>{
  const d=event.detail||{},state=current;
  if(!state||d.conversation_id!==state.conversationId||
     d.previous_request_id!==state.requestId||
     !validUuid(d.request_id)||
     !/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i.test(d.source_ref||''))return;
  state.requestId=d.request_id;
  state.saved={source_ref:d.source_ref};
  state.work=null;state.lastWorkCheck=0;
  render();
 });
 window.addEventListener('reality:chat-engineering-result',event=>{
  const state=current,detail=event.detail||{};
  if(!state||!state.buildPosted||
     detail.conversation_id!==state.conversationId||
     detail.request_id!==state.requestId)return;
  state.buildResult=detail.result&&typeof detail.result==='object'?
    detail.result:{status:'CHAT_WORK_ENGINEERING_EFFECT_UNVERIFIED',
     execution_started:false};
  render();
 });
 window.addEventListener('reality:chat-request-started',start);
 window.addEventListener('reality:chat-request-failed',event=>{
  const state=current;
  if(!state||event.detail?.request_id!==state.requestId)return;
  state.failure=/^[A-Z][A-Z0-9_]{3,119}$/.test(event.detail?.code||'')?
   event.detail.code:'CHAT_RESPONSE_UNAVAILABLE';
  state.failureStage=/^[A-Z][A-Z0-9_]{3,80}$/.test(event.detail?.stage||'')?
   event.detail.stage:null;
  state.complete=true;
  stopClocks({keepWork:true});
  void readback();
  render();
 });
 new MutationObserver(()=>{
  if(current&&!button.disabled&&!current.complete){
   current.complete=true;
   stopClocks({keepWork:true});
   void readback();
   render();
  }
 }).observe(button,{attributes:true,attributeFilter:['disabled']});
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&current&&!current.answer)void readback();
 });
})();
