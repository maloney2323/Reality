/* Reality Chat: prepare, discuss, and explicitly authorize the existing
   fingerprinted employee shift. GET is read-only; no model message or
   generated plan starts work. Edited suggestions cannot silently change
   the immutable warrant; only an exact server-verified plan is approvable. */
(() => {
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const panel=document.getElementById('realityChatConversation');
 const workPanel=document.getElementById('realityChatPanelWork');
 const transcript=document.getElementById('privateTranscript');
 const prompt=document.getElementById('privatePrompt');
 if(!panel||!workPanel||!transcript||!prompt)return;
 const block=document.createElement('section');
 block.className='reality-chat-employee-shift-card';
 block.id='realityCreateShift';
 block.setAttribute('aria-label','Plan an automated employee shift');
 const x=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
 const title=x('h3','Your automated employee shift');
 const detail=x('p','Reality uses your existing employee roles and source-backed backlog. Review and adjust the proposal in Chat; starting work takes one explicit approval.');
 const actions=x('div');actions.className='reality-shift-plan-actions';
 const prepare=x('button','Check shift status');
 const close=x('button','Close');close.type='button';close.addEventListener('click',()=>{block.hidden=true;});
 const approve=x('button','Authorize & Start Shift');approve.hidden=true;approve.disabled=true;
 const scheduling=x('details');scheduling.hidden=true;
 const scheduleSummary=x('summary','Schedule for later (optional)');
 const scheduleLabel=x('label','Start at your local time');
 const startAt=x('input');startAt.type='datetime-local';
 scheduleLabel.append(startAt);scheduling.append(scheduleSummary,scheduleLabel);
 startAt.addEventListener('input',()=>{approve.textContent=startAt.value?'Authorize & Schedule Shift':'Authorize & Start Shift';});
 const edit=x('button','Discuss changes in Chat');edit.hidden=true;
 const reset=x('button','Discard edit request · restore verified plan');reset.hidden=true;
 const info=x('p','Planning is not work authorization. Existing shifts remain authorized; do not start a duplicate.');
 info.setAttribute('role','status');info.setAttribute('aria-live','polite');
 const work=x('div');work.className='reality-shift-plan-assignments';
 actions.append(prepare,edit,reset,approve,close);
 block.append(title,detail,actions,scheduling,info,work);
 // One compact operational card directly in Chat, outside transcript replacement.
 // The Work panel keeps its read-only evidence; never duplicate the start control.
 const composer=document.getElementById('realityChatComposer');
 if(!composer||composer.parentNode!==panel)return;
 block.hidden=true;
 panel.insertBefore(block,composer);
 function showPlan(){block.hidden=false;if(!transcript.contains(block))transcript.append(block);block.scrollIntoView({block:'nearest'});}
 window.addEventListener('reality:open-shift-plan',event=>{
  if(processing)return;
  const p=event?.detail;
  requestedHours=Number.isSafeInteger(p?.duration_hours)&&p.duration_hours>=1&&p.duration_hours<=12?p.duration_hours:8;
  allEmployees=p?.all_employees===true;
  revisionRequested=false;editing=false;startAt.value='';
  title.textContent=requestedHours+'-hour proposed employee shift';
  approve.textContent='Authorize & Start Shift';
  showPlan();void load();
 });
 new MutationObserver(()=>{if(!block.hidden&&!transcript.contains(block))transcript.append(block);}).observe(transcript,{childList:true});
 const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const SHA=/^sha256:[a-f0-9]{64}$/;
 const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d*$/;
 const active=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK']);
 let draft=null,editing=false,revisionRequested=false,processing=false;
 let requestedHours=8,allEmployees=false;
 async function request(url,options={}){
  const res=await fetch(url,{method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(40000),...options});
  const data=await res.json().catch(()=>null);
  if(!res.ok||!data||data.ok!==true)throw Error(data?.error||'Owner shift readback unavailable');
  return data;
 }
 function validDraft(p){
  const tasks=p?.combined_employee_work_orders;
  return p?.version==='reality-eight-hour-employee-shift-draft-v1'&&
    p.status==='DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED'&&
    p.read_only===true&&p.owner_approval_created===false&&
    p.job_started===false&&p.production_changed===false&&
    p.installation_authorized===false&&SHA.test(p.expected_fingerprint||'')&&
    p.shift_duration_hours===requestedHours&&p.shift_duration_minutes===requestedHours*60&&
    Array.isArray(p.slots)&&p.slots.length===8&&
    p.slots.every((s,i)=>s.sequence===i+1)&&
    tasks?.version==='reality-riley-taylor-combined-work-orders-v1'&&
    tasks.plan_fingerprint===p.expected_fingerprint&&
    tasks.operating_model==='ONE_OPENAI_MODEL_SWITCHES_EMPLOYEE_ROLE_CONTEXT'&&
    tasks.execution_started===false&&tasks.installation_authorized===false&&
    tasks.production_changed===false&&
    Number.isSafeInteger(tasks.task_count)&&tasks.task_count<=4&&
    tasks.task_count>=0&&Array.isArray(tasks.tasks)&&
    tasks.tasks.length===tasks.task_count&&
    tasks.tasks.every(t=>URL.test(t.source_ref||'')&&
     Array.isArray(t.employees)&&t.employees.join(',')==='Riley,Taylor'&&
     t.state==='READY_FOR_ONE_OWNER_SHIFT_AUTHORIZATION'&&
     t.owner_authorization_required===true&&
     t.production_changed===false&&t.installation_authorized===false&&
     typeof t.title==='string'&&t.title.length<=210);
 }
 function triggerMessage(r){
  if(r?.status==='GOVERNED_START_WORKER_OBSERVED')return 'Signed worker independently observed. See verified work updates; job completion is not implied.';
  if(r?.status==='GOVERNED_START_WAKE_QUEUED')return 'Governed Auto Trigger queued the start. Awaiting independent worker readback.';
  if(r?.status==='GOVERNED_START_SCHEDULED')return 'Scheduled for later. No work has started.';
  return 'Authorization is saved. Automatic start is not yet verified; refresh the existing shift, not a new approval.';
 }
 function showExisting(s,trigger){
  draft=null;approve.hidden=true;scheduling.hidden=true;edit.hidden=false;reset.hidden=true;
  info.textContent='An existing employee shift is already authorized ('+s.status+
   '). '+triggerMessage(trigger)+' Reality will not create a second shift. Altering live work requires a governed amendment.';
  work.replaceChildren();
  if(Array.isArray(s.steps)){
   const list=x('ul');for(const st of s.steps.filter(z=>URL.test(z.source_ref||''))){
    const line=x('li',String(st.source_title||st.source_ref).slice(0,250)+
     ' · '+String(st.state||'UNKNOWN').slice(0,65));list.append(line);
   }work.append(list);
  }
 }
 async function appendAllRoleProposals(){
  const data=await request('/api/reality/personal-employee-roster');
  const roles=data.proposed_employees;
  if(data.owner_scope_verified!==true||data.worker_execution_authorized!==false||
     data.production_changed!==false||!Array.isArray(roles)||roles.length!==8||
     new Set(roles.map(r=>r.display_name)).size!==8)
   throw Error('All-employee roster readback unverified');
  work.append(x('h4','All eight employees — source-backed planning preview'));
  const list=x('ul');
  const seen=new Set();
  for(const role of roles){
   if(typeof role.display_name!=='string'||typeof role.role!=='string'||
      !Array.isArray(role.candidate_jobs))throw Error('Employee role evidence unverified');
   const li=x('li');li.append(x('strong',role.display_name+' · '+role.role));
   const jobs=role.candidate_jobs.filter(j=>URL.test(j.source_url||'')&&
    typeof j.title==='string'&&j.authorized_execution===false&&
    j.independently_verified_done===false&&!seen.has(j.source_url)).slice(0,2);
   if(!jobs.length)li.append(x('p','No distinct source-backed assignment available in this preview.'));
   for(const j of jobs){
    seen.add(j.source_url);
    const link=x('a',j.title.slice(0,210));link.href=j.source_url;link.target='_blank';link.rel='noopener noreferrer';
    const desc=x('p','Proposed source review — not yet execution-authorized.');li.append(link,desc);
   }
   list.append(li);
  }
  work.append(list);
  work.append(x('p','The existing executable shift contract does not yet bind all eight roles to one approval. No full-team start is offered until those assignments are in the exact signed scope.'));
 }
 async function load(){
  if(processing)return;processing=true;prepare.disabled=true;approve.hidden=true;scheduling.hidden=true;
  work.replaceChildren();info.textContent='Checking existing authorization, prior settlements and employee assignments…';
  try{
   const data=await request('/api/reality/personal-governed-employee-shift?hours='+requestedHours);
   if(data.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
      data.production_changed!==false||
      data.shift_approval_does_not_authorize_installation!==true||
      !Array.isArray(data.shifts)||data.shifts.length>5)
    throw Error('Shift owner or execution boundary not verified');
   const existing=data.shifts.find(s=>active.has(s.status)&&
     UUID.test(s.shift_id||'')&&!s.closed_at);
   if(existing){showExisting(existing,data.governed_auto_trigger);if(allEmployees)await appendAllRoleProposals();return;}
   const p=data.requested_shift_draft;
   if(!validDraft(p))throw Error('Exact owner shift draft was not independently verified');
   draft=p;editing=revisionRequested;edit.hidden=false;
   reset.hidden=!revisionRequested;
   info.textContent=p.combined_employee_work_orders.task_count+
    ' selected source-backed assignment(s) for Riley + Taylor, one OpenAI model. '+
    'Source observations still require qualification. No job has started.'+
    (revisionRequested?' Requested Chat revisions are NOT incorporated into this original source-fingerprinted draft. Approval is disabled until a revised plan has its own verified fingerprint, or you explicitly discard the edits.':'');
   const list=x('ul');
   for(const t of p.combined_employee_work_orders.tasks){
    const li=x('li');const name=x('strong',t.title);
    const desc=x('p','Riley: engineering investigation · Taylor: operational reliability. '+
      'Next: independently validate current source and acceptance requirements.');
    const source=x('a','Inspect source');source.href=t.source_ref;
    source.target='_blank';source.rel='noopener noreferrer';
    li.append(name,desc,source);list.append(li);
   }
   if(list.children.length)work.append(list);
   else work.append(x('p','No qualified source assignments are available in this draft. Reality will not authorize an empty shift.'));
   if(allEmployees){
    await appendAllRoleProposals();
    info.textContent='All-employee planning preview for '+requestedHours+' hours. The exact signed scope currently covers Riley + Taylor only. No full-team work has been authorized.';
    return;
   }
   if(p.combined_employee_work_orders.task_count>0&&!revisionRequested){
    approve.hidden=false;approve.disabled=false;scheduling.hidden=false;
   }
  }catch(err){
   draft=null;
   const reason=String(err?.message||'Unverified source').slice(0,160);
   info.textContent=reason==='SHIFT_SIGN_IN_REQUIRED'?
    'Shift details require an authenticated session in this preview. Your previously authorized shift is not cancelled. Sign in to this Reality preview and review Work; this screen requested no new authorization.':
    'Shift plan unavailable: '+reason+
    '. This screen did not authorize any new job or shift; check the current owner shift readback.';
  }finally{processing=false;prepare.disabled=false;}
 }
 prepare.addEventListener('click',()=>void load());
 edit.addEventListener('click',()=>{
  const plan=draft;
  editing=true;revisionRequested=true;reset.hidden=false;
  approve.hidden=true;approve.disabled=true;scheduling.hidden=true;
  const summaries=plan?.combined_employee_work_orders.tasks.map(t=>
    '- '+t.title+' ('+t.source_ref+')').join('\n')||'(existing shift)';
  prompt.value='Reality, help me revise my automated employee shift proposal. '+
   'Use the existing AI employee roles and source-backed jobs, exclude previously settled work, and organize the assignments by employee. '+
   'Show an editable review draft with priorities, acceptance criteria, and risks. '+
   'Do NOT start a new shift, alter an existing signed warrant, or approve an installation.\n'+
   'Current source suggestions:\n'+summaries+'\nProposed changes: ';
  prompt.dispatchEvent(new Event('input',{bubbles:true}));
  prompt.focus({preventScroll:true});
  info.textContent='You can discuss and save revisions in Chat. The currently generated exact plan is no longer approvable; changed assignments must be rebound to a new verified plan fingerprint before execution.';
 });
 reset.addEventListener('click',()=>{
  revisionRequested=false;editing=false;reset.hidden=true;void load();
 });
 approve.addEventListener('click',async()=>{
  if(processing||allEmployees||editing||revisionRequested||!draft||!validDraft(draft)||
     draft.combined_employee_work_orders.task_count===0)return;
  processing=true;approve.disabled=true;prepare.disabled=true;
  info.textContent='Verifying the current source fingerprint and recording your one explicit start approval…';
  try{
   const p=draft;
   const requestedStart=startAt.value?new Date(startAt.value):new Date();
   if(!Number.isFinite(requestedStart.valueOf())||requestedStart.valueOf()<Date.now()-120000){
    info.textContent='Choose a valid future start time, or clear scheduling to start now.';
    return;
   }
   const after=await request('/api/reality/personal-governed-employee-shift',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'AUTHORIZE_EXACT_EMPLOYEE_SHIFT',
     expected_fingerprint:p.expected_fingerprint,
     planned_start_at:requestedStart.toISOString(),
     start_mode:startAt.value?'SCHEDULE':'START_NOW',
     completion_bound:true,requested_hours:p.shift_duration_hours})
   });
   if(!['SHIFT_DURABLY_AUTHORIZED','SHIFT_ALREADY_AUTHORIZED'].includes(after.status)||
      !UUID.test(after.shift_id||'')||
      after.initial_authorization_recorded!==true||
      after.installation_authorized!==false||
      after.worker_dispatch_verified!==false||
      after.production_changed!==false)
    throw Error('No independent owner shift authorization receipt');
   info.textContent='Exact shift authorization saved ('+after.shift_id+'). '+
    triggerMessage(after.governed_auto_trigger);
   draft=null;approve.hidden=true;scheduling.hidden=true;
  }catch(err){
   draft=null;approve.hidden=true;
   info.textContent='Approval not independently confirmed. Refresh the existing shift readback before retrying: '+
    String(err.message||'Unverified').slice(0,120);
  }finally{processing=false;prepare.disabled=false;approve.disabled=false;}
 });
 function revealLinkedShift(){
  if(location.hash!=='#realityCreateShift')return;
  // A direct link opens the SAME Chat card; it never authorizes work.
  showPlan();block.scrollIntoView({block:'nearest'});
  // A deep link must not ask the shift API before Chat has restored its
  // authenticated session. This is a read-only wait, not an approval.
  const ready=document.getElementById('privateReady');
  if(ready?.style.display==='block'){void load();return;}
  info.textContent='Checking the Reality Chat session before reading your existing shift. No new shift has been requested.';
  if(!ready||revealLinkedShift.authObserver)return;
  const observer=new MutationObserver(()=>{
   if(ready.style.display!=='block')return;
   observer.disconnect();revealLinkedShift.authObserver=null;
   if(location.hash==='#realityCreateShift')void load();
  });
  revealLinkedShift.authObserver=observer;
  observer.observe(ready,{attributes:true,attributeFilter:['style']});
 }
 window.addEventListener('hashchange',revealLinkedShift);
 revealLinkedShift();
})();
