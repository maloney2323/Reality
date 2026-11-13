// Compact approval handoff beside existing Chat shift card: saved source ->
// owner-approved employee job lists. Never authorizes the active shift,
// performs original-job intake or installs an upgrade.
(() => {
 'use strict';
 if(!/^\/chat\/?$/.test(location.pathname))return;
 const host=document.getElementById('realityCreateShift');
 if(!host)return;
 const details=document.createElement('details');
 details.className='reality-chat-approved-assignments';
 const summary=document.createElement('summary');
 summary.textContent='Saved Chat employee assignments · Review for approval';
 const body=document.createElement('div');
 body.className='reality-shift-plan-assignments';
 const status=document.createElement('p');status.textContent='Open to inspect the most recent saved multi-employee Chat plan.';
 const list=document.createElement('div');
 body.append(status,list);details.append(summary,body);
 host.append(details);
 const NAMES=new Set(['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage']);
 const SHA=/^sha256:[a-f0-9]{64}$/;
 const REF=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
 let loading=false,approvedInThisView=false;
 async function request(url,options={}){
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(47000),...options});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw Error('Saved Chat or approved employee job list unavailable');
  return data;
 }
 const el=(tag,s)=>{const x=document.createElement(tag);if(s!==undefined)x.textContent=s;return x};
 async function load(){
  if(loading)return;
  loading=true;list.replaceChildren();
  status.textContent='Reading the saved Chat source and existing employee assignments…';
  try{
   const roster=await request('/api/reality/personal-employee-roster');
   if(roster.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
    roster.owner_scope_verified!==true||
    roster.worker_execution_authorized!==false||
    roster.installation_authorized!==false||
    roster.production_changed!==false)
    throw Error('Employee owner roster scope unverified');
   const p=roster.saved_chat_employee_proposals;
   const read=roster.approved_chat_employee_assignments;
   if(roster.saved_chat_employee_proposals_status!=='AUTHENTICATED_SAVED_CHAT_READBACK'||
    p?.status!=='SAVED_CHAT_IDEAS_AWAITING_SOURCE_AND_SETTLEMENT_RECONCILIATION'||
    p.read_only!==true||p.execution_authorized!==false||
    p.installation_authorized!==false||p.proposals_not_verified_jobs!==true||
    !REF.test(p.source_message_ref||'')||!SHA.test(p.source_content_sha256||'')||
    !Array.isArray(p.roles)||p.roles.length<2||p.roles.length>8||
    roster.approved_chat_employee_assignments_status!=='OWNER_DURABLE_CHAT_JOB_LIST_READBACK'||
    read?.status!=='OWNER_APPROVED_CHAT_EMPLOYEE_JOB_LIST_READBACK'||
    read.owner_scope_verified!==true||read.read_only!==true||
    read.production_changed!==false||read.installation_authorized!==false||
    !Array.isArray(read.approvals)||read.approvals.length>12)
    throw Error('Saved Chat source or existing approvals not independently verified');
   const seen=new Set();
   let total=0;
   for(const r of p.roles){
    if(!NAMES.has(r.employee_name)||seen.has(r.employee_name)||
     !Array.isArray(r.proposals)||r.proposals.length<1||r.proposals.length>8)
     throw Error('Employee role assignments invalid');
    seen.add(r.employee_name);
    const line=document.createElement('details');
    line.append(el('summary',r.employee_name+' · '+r.proposals.length+' proposed tasks'));
    const ul=el('ul');
    for(const t of r.proposals){
     if(typeof t.description!=='string'||t.description.length<5||
      t.description.length>270||t.authorized_execution!==false||
      t.independently_verified_job!==false)
      throw Error('Chat suggestion source unverified');
     ul.append(el('li',t.description));total++;
    }
    line.append(ul);list.append(line);
   }
   const old=read.approvals.find(a=>
    a.source_message_id===p.source_message_ref.slice('supabase:reality_chat_messages:'.length)&&
    a.source_content_sha256===p.source_content_sha256);
   if(old){
    status.textContent='These '+total+' tasks are already saved in the approved employee job lists. Independent source qualification and work authorization are separate.';
    return;
   }
   status.textContent='Review '+total+' saved Chat tasks for '+seen.size+
    ' employee roles. Approval adds them to each employee’s job list without starting another shift.';
   const approve=el('button','Approve '+total+' employee job-list assignments');
   approve.type='button';approve.disabled=approvedInThisView;
   approve.addEventListener('click',async()=>{
    approve.disabled=true;
    status.textContent='Verifying exact saved Chat source and durable owner approval…';
    try{
     const result=await request('/api/reality/personal-employee-chat-assignments',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({action:'APPROVE_EXACT_SAVED_CHAT_EMPLOYEE_ASSIGNMENTS',
       expected_source_message_ref:p.source_message_ref,
       expected_content_sha256:p.source_content_sha256})
     });
     if(result.status!=='OWNER_CHAT_EMPLOYEE_ASSIGNMENTS_DURABLY_APPROVED'||
      result.job_list_assignments_persisted!==true||
      result.shift_execution_authorized!==false||
      result.original_job_created!==false||
      result.capability_installation_authorized!==false||
      result.production_changed!==false)
      throw Error('Independent owner approval receipt unavailable');
     approvedInThisView=true;approve.remove();
     status.textContent='Saved '+total+' approved Chat assignments into '+seen.size+
      ' employee job lists. Nothing was started or installed. Reality must independently qualify the tasks.';
    }catch{
     status.textContent='Approval could not be independently verified. No new shift was started.';
     approve.disabled=false;
    }
   });
   list.append(approve);
  }catch{
   status.textContent='Unable to verify current saved employee proposal or approved list. No approval or job was created.';
  }finally{loading=false;}
 }
 details.addEventListener('toggle',()=>{if(details.open)void load();});
})();
