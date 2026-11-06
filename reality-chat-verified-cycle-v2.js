/* Reality Chat v2: verified, expandable operational stages.
   An authenticated read-only observer. It neither invokes models nor starts
   jobs, signs warrants, installs capabilities, or guesses model reasoning.
   Status from a model's chat text is NEVER treated as execution proof. */
(() => {
 'use strict';
 if (!/^\/chat\/?$/.test(location.pathname)) return;
 const byId=id=>document.getElementById(id);
 const ready=byId('privateReady'),transcript=byId('privateTranscript');
 const workPanel=byId('realityChatPanelWork');
 const center=byId('realityChatConversation');
 if(!ready||!transcript||!center||!workPanel||byId('realityVerifiedCycle'))return;
 const div=(tag,klass,text)=>{
  const e=document.createElement(tag);
  if(klass)e.className=klass;
  if(text!==undefined)e.textContent=String(text);
  return e;
 };
 const headline=div('section','reality-cycle-headline');
 headline.id='realityCycleHeadline';
 headline.setAttribute('aria-label','Reality verified operational state');
 const signal=div('span','reality-cycle-headline-text',
   'Checking saved conversation and governed work…');
 signal.id='realityCycleStateText';
 const show=div('button','reality-cycle-open','View steps');
 show.type='button';
 show.addEventListener('click',()=>{
  const button=byId('realityChatOpenInspector');
  if(button && getComputedStyle(button).display!=='none' &&
   document.body.dataset.realityChatPanel!=='work')button.click();
  const workTab=byId('realityChatTabWork');
  if(workTab)workTab.click();
  byId('realityVerifiedCycle')?.scrollIntoView({block:'nearest'});
 });
 headline.append(signal,show);
 const threadHead=center.querySelector('.reality-chat-thread-heading');
 if(threadHead)threadHead.insertAdjacentElement('afterend',headline);
 const wrap=div('section','reality-verified-cycle');
 wrap.id='realityVerifiedCycle';
 wrap.setAttribute('aria-label','Reality original-job lifecycle and evidence');
 const header=div('div','reality-cycle-header');
 const heading=div('div');
 heading.append(div('h3','','Governed activity'),div('p','',
  'Click a stage for its verified evidence. No private model reasoning or simulated activity.'));
 const reload=div('button','reality-cycle-refresh','Refresh evidence');
 reload.type='button';
 header.append(heading,reload);
 const banner=div('p','reality-cycle-notice',
  'Checking the owner-scoped original-job ledger…');
 banner.id='realityCycleNotice';
 const stagesBox=div('div','reality-cycle-stage-list');
 stagesBox.id='realityCycleStages';
 const checked=div('p','reality-cycle-checked','Read-only evidence. No actions authorized.');
 wrap.append(header,banner,stagesBox,checked);
 workPanel.prepend(wrap);

 const stages=[
  {key:'chat',name:'Chat message saved',source:'Authenticated conversation / RLS'},
  {key:'goal',name:'Objective confirmed',source:'Authoritative Continuity goal receipt'},
  {key:'admitted',name:'Original job admitted',source:'Owner-bound governed build queue'},
  {key:'dispatched',name:'Investigation delegated',source:'Fenced worker dispatch and readback'},
  {key:'tested',name:'Defect and repair independently verified',source:'Original-job capability receipt'},
  {key:'approval',name:'Exact installation authorization',source:'Owner approval ledger'},
  {key:'installed',name:'Isolated installation verified',source:'Independent installation record'},
  {key:'settled',name:'Original job independently settled',source:'Original-work settlement event'},
  {key:'receipt',name:'Final receipt independently read back',source:'Original-job final receipt'},
 ];
 const clean=x=>typeof x==='string'&&x.length<520?x:'';
 const workId=x=>/^work:[a-f0-9]{32}$/.test(x||'')?x:null;
 const result=(state='pending',detail='No independently verified event for this stage.',
  evidence=null)=>({state,detail,evidence});
 let lastChecked=0,pending=false,requestSequence=0,actualConversation=null;
 const conversationId=()=>{try{return localStorage.getItem('reality.private.chat.conversation.v1')}catch{return null}};
 const validUuid=x=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x||'');
 const nowLocal=iso=>{
  if(!iso||!Number.isFinite(Date.parse(iso)))return '';
  return new Date(iso).toLocaleString(undefined,{dateStyle:'short',timeStyle:'short'});
 };
 const textLine=(parent,label,val)=>{
  const p=div('p');
  p.append(div('strong','',label+': '),document.createTextNode(val));
  parent.append(p);
 };
 function draw(stageResults){
  const open=new Set([...stagesBox.querySelectorAll('details[open]')]
   .map(x=>x.dataset.key));
  stagesBox.replaceChildren();
  for(const [index,item] of stages.entries()){
   const info=stageResults[item.key]||result();
   const details=div('details','reality-cycle-stage');
   details.dataset.key=item.key;
   details.dataset.state=info.state;
   details.open=open.has(item.key);
   const summary=div('summary','reality-cycle-stage-summary');
   summary.append(div('span','reality-cycle-index',String(index+1)));
   const label=div('span','reality-cycle-stage-name',item.name);
   const state=div('span','reality-cycle-stage-status',({
    verified:'Verified',dispatched:'Dispatched',blocked:'Blocked',
    pending:'Not verified',unavailable:'Unavailable'})[info.state]||'Not verified');
   summary.append(label,state);
   const body=div('div','reality-cycle-stage-evidence');
   textLine(body,'Evidence source',item.source);
   textLine(body,'What we know',info.detail);
   if(info.evidence)textLine(body,'Reference',info.evidence);
   details.append(summary,body);
   stagesBox.append(details);
  }
 }
 const empty=()=>Object.fromEntries(stages.map(s=>[s.key,result()]));
 function displayError(error){
  banner.textContent='Live verification unavailable. A model reply cannot stand in for a job receipt.';
  signal.textContent='Work status could not be verified';
  const steps=empty();
  for(const key of ['goal','admitted','dispatched','tested','approval','installed','settled','receipt'])
   steps[key]=result('unavailable','Owner-scoped readback failed or is unavailable.');
  draw(steps);
  checked.textContent='Readback failed. No operation has been started or retried.';
 }
 async function get(path){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
  try{
   const response=await fetch(path,{
    method:'GET',credentials:'same-origin',cache:'no-store',
    redirect:'error',signal:controller.signal
   });
   const body=await response.json().catch(()=>null);
   if(!response.ok||body?.ok!==true)throw Error('READBACK_UNAVAILABLE');
   return body;
  }finally{clearTimeout(timer)}
 }
 async function refresh(force=false){
  if(pending||ready.style.display!=='block'||document.hidden)return;
  const id=conversationId();
  if(!validUuid(id)){signal.textContent='No selected conversation';return}
  if(!force&&Date.now()-lastChecked<16000&&id===actualConversation)return;
  lastChecked=Date.now();actualConversation=id;
  pending=true;reload.disabled=true;banner.textContent='Reading Reality’s actual saved work and independent receipts…';
  const sequence=++requestSequence;
  try{
   const jobs=await Promise.allSettled([
    get('/api/reality/personal-chat?conversation_id='+encodeURIComponent(id)),
    get('/api/reality/personal-goals?conversation_id='+encodeURIComponent(id)),
    get('/api/reality/personal-governed-build'),
    get('/api/reality/personal-genuine-loop-status')
   ]);
   if(sequence!==requestSequence||id!==conversationId())return;
   const values=jobs.map(j=>j.status==='fulfilled'?j.value:null);
   const [chat,goal,build,loop]=values;
   const states=empty();
   if(chat?.conversation_id===id&&Array.isArray(chat.messages)&&
     chat.messages.some(m=>m.role==='user'&&m.source_ref?.startsWith('supabase:reality_chat_messages:'))){
    const users=chat.messages.filter(m=>m.role==='user');
    const last=users.at(-1);
    states.chat=result('verified',
      users.length+' saved user message(s); latest at '+nowLocal(last?.created_at),
      clean(last?.source_ref)||null);
   }else if(!chat)states.chat=result('unavailable','Saved conversation readback could not be verified.');
   const gs=goal?.goal_state;
   const active=gs?.active_goal?.status==='ACTIVE'&&
    gs.active_goal?.user_confirmed===true&&
    gs.active_goal_id===gs.active_goal?.goal_id&&
    typeof gs.active_goal?.last_transition_receipt_id==='string';
   if(active)states.goal=result('verified',
     'This conversation has a user-confirmed active objective, independently reconstructed from Continuity.',
     clean(gs.active_goal.last_transition_receipt_id));
   else if(!goal)states.goal=result('unavailable','Goal ledger readback is unavailable.');
   else states.goal=result('blocked','No confirmed active objective in this conversation. A Chat statement does not confirm it.');
   const tied=build?.original_conversation_id===id&&
    workId(build.original_work_id)&&
    active&&build.goal_id===gs.active_goal_id;
   const admitted=tied&&build.queued===true&&
    typeof build.queue_id==='string'&&validUuid(build.queue_id);
   const assigned=tied&&build.queued===false&&
    build.phase==='NOT_QUEUED'&&build.eligible_for_investigation===true;
   if(admitted)states.admitted=result('verified',
     'Original job accepted into the owner-bound governed queue. Queue phase: '+clean(build.phase),
     build.original_work_id);
   else if(assigned)states.admitted=result('blocked',
     'A matching eligible original job is recognized but is NOT yet queued. No worker started.',build.original_work_id);
   else if(!build)states.admitted=result('unavailable','Governed queue readback unavailable; cannot infer admission.');
   else states.admitted=result('blocked',
     'No durable governed build queue record was verified for this conversation. Chat text alone is not execution.');
   if(admitted&&build.dispatched_at&&/^[a-f0-9]{40}$/.test(build.dispatch_commit_sha||'')){
    states.dispatched=result('dispatched',
      'A bounded isolated-worker dispatch was recorded at '+nowLocal(build.dispatched_at)+
      '. Dispatch does not prove that the investigation finished.',
      build.dispatch_commit_sha);
   }else if(admitted)states.dispatched=result('blocked',
    'Queue exists, but a successful worker dispatch and execution readback were not verified.');
   else states.dispatched=result('blocked','No worker dispatch for this conversation was verified.');
   const originalId=admitted?build.original_work_id:null;
   const matched=originalId&&loop?.jobs?.find(j=>j.original_work_id===originalId);
   if(matched?.candidate_verified===true)
    states.tested=result('verified','Verified upgrade candidate is tied to this exact original job.',originalId);
   if(matched?.owner_install_approved===true)
    states.approval=result('verified','Exact owner approval is recorded for this original job.',originalId);
   if(matched?.isolated_installed===true)
    states.installed=result('verified','Isolated installed capability is recorded for this original job.',originalId);
   if(matched?.independently_settled===true)
    states.settled=result('verified','Original-job settlement is independently verified.',originalId);
   const receipt=originalId&&loop?.independent_final_receipts?.find(x=>
    x.original_work_id===originalId&&x.status==='FULL_LOOP_INDEPENDENTLY_VERIFIED');
   if(receipt)states.receipt=result('verified',
     'Independent final receipt matches the original job and verified settlement.',
     clean(receipt.settlement_event_id)||originalId);
   if(!loop){
    for(const k of ['tested','approval','installed','settled','receipt'])
     states[k]=result('unavailable','Independent original-job ledger readback unavailable.');
   }
   const independentlyExecuting=states.dispatched.state==='dispatched';
   if(states.receipt.state==='verified'){
    signal.textContent='Original job completed and independently verified';
    banner.textContent='The same original job has a verified final receipt.';
   }else if(independentlyExecuting){
    signal.textContent='Worker dispatched · completion not verified';
    banner.textContent='Reality has a recorded worker dispatch. Open the stages for proof; do not assume execution is still running.';
   }else if(states.admitted.state==='verified'){
    signal.textContent='Job queued · worker not verified';
    banner.textContent='A governed job is recorded, but no authorized worker dispatch was independently verified.';
   }else{
    signal.textContent='No running development job verified';
    banner.textContent='Reality may have answered in Chat, but this conversation has no independently verified development worker execution.';
   }
   draw(states);
   checked.textContent='Evidence checked '+new Date().toLocaleTimeString([],{
    hour:'numeric',minute:'2-digit'})+
    ' · Read-only · No model execution or authorization granted by viewing.';
  }catch(e){displayError(e)}
  finally{pending=false;reload.disabled=false}
 }
 reload.addEventListener('click',()=>refresh(true));
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)void refresh(true);
 });
 const obs=new MutationObserver(()=>{if(ready.style.display==='block')void refresh()});
 obs.observe(ready,{attributes:true,attributeFilter:['style']});
 let debounce=null;
 new MutationObserver(()=>{
  clearTimeout(debounce);
  debounce=setTimeout(()=>void refresh(true),1400);
 }).observe(transcript,{childList:true});
 draw(empty());
 void refresh();
 setInterval(()=>{if(!document.hidden)void refresh(true)},45000);
})();
