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
  // This exact request's work handoff is read independently of its Chat
  // answer. Diagnosed work is not execution, installation or settlement.
  const work=state.work;
  const names={
   PENDING:'Saved in existing governed worker inbox; investigation not yet claimed.',
   CLAIMED:'Existing worker claimed this instruction for investigation.',
   INVESTIGATED_SCOPED:'Investigation recorded against existing authorized work; execution is not proven.',
   NEEDS_AUTHORIZED_SCOPE:'Requested work is outside the existing signed scope.',
   CONVERSATION_ONLY:'Classified as a conversation, not executable work.',
   PROVIDER_UNVERIFIED:'Investigation failed verification; no work completion is claimed.'
  };
  const development=work?.development;
  if(development&&/^work:[a-f0-9]{32}$/.test(development.original_work_id||'')&&
     development.installation_authorized===false&&
     development.production_changed===false){
    const stage=String(development.phase||'QUEUED');
    one('New development task · '+development.original_work_id,
      ['DRAFT_GENERATED','CANDIDATE_STAGED','CI_VERIFIED'].includes(stage),
      'Owner-signed work admission · '+stage.replaceAll('_',' ')+
      '. '+(stage==='QUEUED'?'Waiting for existing service worker.':
       stage==='CLAIMED'?'Existing service worker is preparing code.':
       stage==='DRAFT_GENERATED'?'Model-generated candidate saved; independent proof pending.':
       stage==='CI_VERIFIED'?'Independent CI receipt recorded; installation still requires exact approval.':
       'No production installation has been authorized.'));
  }
  const last=work?.work_chain?.find(x=>typeof x?.current_evidence_stage==='string');
  const evidence=last?' Latest original-work evidence: '+String(last.current_evidence_stage)
   .replaceAll('_',' ')+'.':'';
  const stage=last?.current_evidence_stage||'';
  const verified=new Set(['MODEL_DRAFT_AWAITING_INDEPENDENT_CI',
   'INITIAL_CANDIDATE_INDEPENDENTLY_REJECTED',
   'CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI',
   'CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING',
   'CORRECTIVE_CI_REJECTED_WITH_FROZEN_EVIDENCE',
   'CORRECTIVE_CI_PASSED_AWAITING_EXACT_INSTALL_GATE',
   'ORIGINAL_SETTLEMENT_RECEIPT_PRESENT']);
  const engineering=verified.has(stage);
  one('Engineering and independent test receipts',engineering,
   engineering?'Original '+String(last.original_work_id)+': '+stage.replaceAll('_',' ')+
     (last.corrective_ci_url?' · '+String(last.corrective_ci_url):'')+
     '. These are provider-backed stage readbacks, not a new owner approval.':
     work?.status==='INVESTIGATED_SCOPED'?
       'Investigation was recorded; model analysis is not yet verified code generation.':
       'Awaiting a scoped engineering receipt from the existing signed worker.');
  if(state.buildResult)
   one('Requested isolated build continuation',state.buildResult.execution_started===true,
    'Reality governed builder: '+state.buildResult.status+
    (state.buildResult.broker_status?' · '+state.buildResult.broker_status:'')+
    (state.buildResult.independent_run_url?' · '+state.buildResult.independent_run_url:'')+
    '. No installation, production change or new shift.');
  one('Governed work handoff',Boolean(work),
   work?(names[work.status]||'Governed intake status not recognized.')+evidence:
    state.saved?'Saved message verified; checking its separate governed work record.':
    'Available after the authenticated message save.');
  if(state.answer){
   spinner.classList.add('completed');
   title.textContent='Reality saved your answer';
   line.textContent='The Chat answer is recorded. The governed work status below is a separate, independently read-back state.';
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
 async function readWork(state){
  if(!state||current!==state||state.workReading||!state.saved||document.hidden)return;
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
   if(state.saved)void readWork(state);
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
   saved:null,answer:null,complete:false,reading:false,failure:null,
   work:null,workReading:false,lastWorkCheck:0,
   explicitBuild:event.detail?.explicit_scoped_build===true,
   buildPosted:false,buildReading:false,buildResult:null};
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
  // Work evidence is independent of Chat's answer. Keep checking even after
  // the assistant has replied; a worker may write and test code later.
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
