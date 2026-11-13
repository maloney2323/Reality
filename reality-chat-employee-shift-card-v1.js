/* Reality Chat: prepare, discuss, and explicitly authorize the existing
   fingerprinted employee shift. GET is read-only; no model message or
   generated plan starts work. Edited suggestions cannot silently change
   the immutable warrant; only an exact server-verified plan is approvable. */
(() => {
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const panel=document.getElementById('realityChatConversation');
 const transcript=document.getElementById('privateTranscript');
 const prompt=document.getElementById('privatePrompt');
 if(!panel||!transcript||!prompt)return;
 const block=document.createElement('section');
 block.className='reality-chat-employee-shift-card';
 block.id='realityCreateShift';
 block.setAttribute('aria-label','Plan an automated employee shift');
 const x=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
 const title=x('h3','Your automated employee shift');
 const detail=x('p','Reality uses your existing employee roles and source-backed backlog. Review and adjust the proposal in Chat; starting work takes one explicit approval.');
 const actions=x('div');actions.className='reality-shift-plan-actions';
 const prepare=x('button','Generate or review my shift');
 const approve=x('button','Approve exact shift and start');approve.hidden=true;approve.disabled=true;
 const edit=x('button','Discuss changes in Chat');edit.hidden=true;
 const info=x('p','Planning is not work authorization. Existing shifts remain authorized; do not start a duplicate.');
 info.setAttribute('role','status');info.setAttribute('aria-live','polite');
 const work=x('div');work.className='reality-shift-plan-assignments';
 actions.append(prepare,edit,approve);
 block.append(title,detail,actions,info,work);
 transcript.insertAdjacentElement('beforebegin',block);
 const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const SHA=/^sha256:[a-f0-9]{64}$/;
 const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d*$/;
 const active=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK']);
 let draft=null,editing=false,processing=false;
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
 function showExisting(s){
  draft=null;approve.hidden=true;edit.hidden=false;
  info.textContent='An existing employee shift is already authorized ('+s.status+
   '). Reality will not create a second shift. You can discuss priorities in Chat; altering live work requires a governed amendment.';
  work.replaceChildren(x('p','Existing shift · '+s.shift_id));
  if(Array.isArray(s.steps)){
   const list=x('ul');for(const st of s.steps.filter(z=>URL.test(z.source_ref||''))){
    const line=x('li',String(st.source_title||st.source_ref).slice(0,250)+
     ' · '+String(st.state||'UNKNOWN').slice(0,65));list.append(line);
   }work.append(list);
  }
 }
 async function load(){
  if(processing)return;processing=true;prepare.disabled=true;approve.hidden=true;
  work.replaceChildren();info.textContent='Checking existing authorization, prior settlements and employee assignments…';
  try{
   const data=await request('/api/reality/personal-governed-employee-shift?hours=8');
   if(data.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
      data.production_changed!==false||
      data.shift_approval_does_not_authorize_installation!==true||
      !Array.isArray(data.shifts)||data.shifts.length>5)
    throw Error('Shift owner or execution boundary not verified');
   const existing=data.shifts.find(s=>active.has(s.status)&&
     UUID.test(s.shift_id||'')&&!s.closed_at);
   if(existing){showExisting(existing);return;}
   const p=data.requested_shift_draft;
   if(!validDraft(p))throw Error('Exact owner shift draft was not independently verified');
   draft=p;editing=false;edit.hidden=false;
   info.textContent=p.combined_employee_work_orders.task_count+
    ' selected source-backed assignment(s) for Riley + Taylor, one OpenAI model. '+
    'Source observations still require qualification. No job has started.';
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
   if(p.combined_employee_work_orders.task_count>0){
    approve.hidden=false;approve.disabled=false;
   }
  }catch(err){
   draft=null;info.textContent='Shift plan unavailable: '+
    String(err.message||'Unverified source').slice(0,160)+
    '. No job or shift was authorized.';
  }finally{processing=false;prepare.disabled=false;}
 }
 prepare.addEventListener('click',()=>void load());
 edit.addEventListener('click',()=>{
  const plan=draft;
  editing=true;
  approve.hidden=true;approve.disabled=true;
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
 approve.addEventListener('click',async()=>{
  if(processing||editing||!draft||!validDraft(draft)||
     draft.combined_employee_work_orders.task_count===0)return;
  processing=true;approve.disabled=true;prepare.disabled=true;
  info.textContent='Verifying the current source fingerprint and recording your one explicit start approval…';
  try{
   const p=draft;
   const after=await request('/api/reality/personal-governed-employee-shift',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'AUTHORIZE_EXACT_EMPLOYEE_SHIFT',
     expected_fingerprint:p.expected_fingerprint,
     planned_start_at:new Date().toISOString(),
     completion_bound:true,requested_hours:8})
   });
   if(!['SHIFT_DURABLY_AUTHORIZED','SHIFT_ALREADY_AUTHORIZED'].includes(after.status)||
      !UUID.test(after.shift_id||'')||
      after.initial_authorization_recorded!==true||
      after.installation_authorized!==false||
      after.worker_dispatch_verified!==false||
      after.production_changed!==false)
    throw Error('No independent owner shift authorization receipt');
   info.textContent='Exact employee shift authorization recorded ('+after.shift_id+
    '). The existing worker executes under governance; independent job results and upgrade approvals appear in Reality Chat. This is not proof of job completion.';
   draft=null;approve.hidden=true;
  }catch(err){
   draft=null;approve.hidden=true;
   info.textContent='Approval not independently confirmed. Refresh the existing shift readback before retrying: '+
    String(err.message||'Unverified').slice(0,120);
  }finally{processing=false;prepare.disabled=false;approve.disabled=false;}
 });
 if(location.hash==='#realityCreateShift'){
  // Navigating here is a read-only invitation, never authorization.
  void load();
 }
})();
