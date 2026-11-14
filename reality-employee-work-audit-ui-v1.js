// Reality Home: each employee audits responsibilities and live provider
// sources. Uses the owner-authenticated existing Work Center audit endpoint.
// An investigation or source finding never becomes an executable job here.
(()=>{
 'use strict';
 if(window.location.pathname!=='/')return;
 const root=document.getElementById('realityHomeEmployees');
 if(!root)return;
 const names=['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage'];
 const heading=root.querySelector('.home-team-head');
 const grid=root.querySelector('.home-team-grid');
 if(!heading||!grid)return;
 const add=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!=null)node.textContent=text;
  return node;
 };
 const action=add('button','simple-secondary reality-employee-audit-all',
  'Audit All Employees');
 action.type='button';
 action.setAttribute('aria-label','Audit the weekly responsibilities of all eight employees');
 heading.append(action);
 const panel=add('section','reality-employee-audit-panel');
 panel.id='realityEmployeeResponsibilityAuditResults';
 panel.setAttribute('aria-live','polite');
 panel.setAttribute('aria-label','Independently checked employee weekly responsibilities');
 panel.hidden=true;
 grid.insertAdjacentElement('afterend',panel);
 const buttons=[action];
 let running=false;
 async function audit(name){
  if(running)return;
  running=true;
  buttons.forEach(b=>b.disabled=true);
  panel.hidden=false;
  panel.replaceChildren(add('p','reality-audit-progress',
   name==='ALL'?
    'Checking all employee responsibilities, current GitHub evidence and unfinished work…':
    'Checking '+name+'\'s responsibilities, current evidence and weekly work…'));
  try{
   const response=await fetch('/api/reality/personal-employee-work-audit',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({intent:'AUDIT_EMPLOYEE_WEEK',employee_name:name}),
    signal:AbortSignal.timeout(115000)
   });
   if(response.status===401){
    panel.replaceChildren(add('p','reality-audit-warning',
     'Sign in to Reality to inspect your employee responsibilities.'));
    return;
   }
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true||
    !['EMPLOYEE_RESPONSIBILITIES_SOURCE_AUDITED',
      'EMPLOYEE_RESPONSIBILITIES_PARTIAL_SOURCE_AUDIT'].includes(data.status)||
    data.requested_scope!==name||data.owner_scope_verified!==true||
    data.source_check_executed!==true||
    data.original_job_executed!==false||
    data.installation_authorized!==false||
    data.production_changed!==false||data.shift_started!==false||
    !Array.isArray(data.role_audits)||
    data.role_audits.length!==(name==='ALL'?8:1))
    throw Error('EMPLOYEE_AUDIT_SOURCE_READBACK_UNVERIFIED');
   const status=add('p','reality-audit-summary');
   status.textContent=(name==='ALL'?'All employees':'Employee '+name)+
    ' · Fresh source audit '+new Date(data.checked_at).toLocaleString()+
    ' · '+data.weekly_source_inspected+' weekly issues previously inspected'+
    ' · No job or capability installation authorized.';
   panel.replaceChildren(status);
   if(data.status==='EMPLOYEE_RESPONSIBILITIES_PARTIAL_SOURCE_AUDIT')
    panel.append(add('p','reality-audit-warning',
     'Weekly qualification readback was unavailable; the live catalog was checked, but its entries still require verification.'));
   if(data.capability_audit_status===
     'CAPABILITY_AUDIT_PROVIDER_OR_RECEIPT_UNVERIFIED')
    panel.append(add('p','reality-audit-warning',
     'Capability audit evidence was incomplete; no current gap or install was verified.'));
   const list=add('div','reality-audit-role-list');
   for(const role of data.role_audits){
    if(!names.includes(role?.employee_name)||!Array.isArray(role.suggested_checks)||
      !Array.isArray(role.responsibility_checks)||role.suggested_checks.length>14||
      role.installations_authorized!==0||
      role.qualified_executable_originals_created!==0)
     throw Error('EMPLOYEE_AUDIT_ROLE_EVIDENCE_UNVERIFIED');
    const card=add('article','reality-audit-role');
    card.append(add('strong',null,role.employee_name+' · '+role.role));
    card.append(add('p','reality-audit-role-description',
      role.responsibility_summary));
    card.append(add('p','reality-audit-role-counts',
      role.weekly_investigation_assignments+' weekly investigations · '+
      role.catalog_source_candidates+' catalog observations · '+
      role.settled_origins_excluded+' previously settled source(s) excluded'));
    const checks=add('ul','reality-audit-responsibilities');
    for(const check of role.responsibility_checks.slice(0,3))
     checks.append(add('li',null,check));
    card.append(checks);
    const details=add('details','reality-audit-findings');
    const summary=add('summary',null,'Review '+role.suggested_checks.length+
     ' source-backed checks and next evidence requirements');
    details.append(summary);
    if(!role.suggested_checks.length)
     details.append(add('p',null,
      'No current GitHub task matches this role. Further business-source connections may be needed.'));
    const work=add('div','reality-audit-work-items');
    for(const item of role.suggested_checks){
     if(!/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d*$/.test(item.source_url||'')||
       item.execution_authorized!==false||
       item.installation_authorized!==false)
      throw Error('EMPLOYEE_AUDIT_FINDING_PROVENANCE_UNVERIFIED');
     const row=add('div','reality-audit-work-item');
     const a=add('a',null,item.title||'Review source evidence');
     a.href=item.source_url;a.target='_blank';a.rel='noopener noreferrer';
     row.append(a);
     row.append(add('small',null,
      item.next_proof||'Confirm current evidence before executable work.'));
     work.append(row);
    }
    details.append(work);card.append(details);
    if(role.additional_business_connections_needed)
     card.append(add('p','reality-audit-warning',
      'Connected GitHub sources do not yet cover this role\'s full business responsibilities.'));
    list.append(card);
   }
   panel.append(list);
   panel.append(add('p','reality-audit-footnote',
    'Audit and investigation only. Reality\'s existing signed worker controls executable jobs; exact upgrade installations require separate approval in Chat.'));
  }catch{
   panel.replaceChildren(add('p','reality-audit-warning',
    'The employee audit could not be independently verified. No new job, shift or installation was authorized.'));
  }finally{
   running=false;
   buttons.forEach(b=>b.disabled=false);
  }
 }
 for(const name of names){
  const card=root.querySelector('[data-home-employee="'+name+'"]');
  if(!card)continue;
  const button=add('button','simple-secondary reality-employee-audit-trigger',
   'Refresh & Audit Work');
  button.type='button';
  button.setAttribute('aria-label','Refresh and audit '+name+'\'s weekly work');
  button.addEventListener('click',()=>{void audit(name);});
  card.append(button);buttons.push(button);
 }
 action.addEventListener('click',()=>{void audit('ALL');});
})();
