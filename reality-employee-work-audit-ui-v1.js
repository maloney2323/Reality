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
 const inquiryAction=add('button','simple-secondary reality-employee-inquiry-trigger',
  'Discover next question');
 inquiryAction.type='button';
 inquiryAction.setAttribute('aria-label','Let Reality form and investigate one source-backed question');
 heading.append(inquiryAction);
 const panel=add('section','reality-employee-audit-panel');
 panel.id='realityEmployeeResponsibilityAuditResults';
 panel.setAttribute('aria-live','polite');
 panel.setAttribute('aria-label','Independently checked employee weekly responsibilities');
 panel.hidden=true;
 grid.insertAdjacentElement('afterend',panel);
 const buttons=[action,inquiryAction];
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
   if(data.business_launch_readiness==='NOT_VERIFIED_FROM_CONNECTED_EVIDENCE'&&
      data.launch_decision_authorized===false&&
      data.standing_discovery_roles_defined===data.role_audits.length&&
      data.standing_discovery_is_execution===false){
    panel.append(add('p','reality-audit-warning',
     'BUSINESS LAUNCH POSTURE · Not independently certified launch-ready. Each employee below owns a source-specific discovery scope; current findings still need qualification and the recurring role-level auto-wake has not been proven.'));
   }
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
    const discovery=role.standing_discovery;
    if(discovery?.employee===role.employee_name&&
       discovery.cadence==='WEEKLY_DISCOVERY_SCOPE_PROPOSED_NOT_AUTONOMOUS_SHIFT'&&
       discovery.original_job_created===false&&
       discovery.execution_authorized===false&&
       discovery.installation_authorized===false&&
       Array.isArray(discovery.categories)&&discovery.categories.length===3){
     const scope=add('details','reality-audit-findings');
     scope.append(add('summary',null,'Standing job-discovery responsibilities'));
     const mandate=add('ul','reality-audit-responsibilities');
     for(const requirement of discovery.categories)
      mandate.append(add('li',null,requirement));
     scope.append(mandate,add('p','reality-audit-warning',
      'Discovery scope defined. Recurring autonomous employee investigation is NOT yet verified; this audit itself runs only when requested. Unconnected source coverage must be reported rather than inventing work.'));
     card.append(scope);
    }
    const launch=role.business_launch_requirement;
    if(launch?.readiness==='NOT_VERIFIED_FOR_CUSTOMER_LAUNCH'&&
       launch.launch_authorized===false){
     const gate=add('div','reality-audit-role-description');
     gate.append(add('strong',null,'Launch-readiness investigation'));
     gate.append(add('p',null,'Business outcome: '+
       String(launch.business_outcome||'Not yet verified')+
       ' · Required gate: '+String(launch.required_gate||'Evidence not yet connected')));
     gate.append(add('small',null,'Existing source coverage: '+
       String(launch.evidence_status||'UNVERIFIED')+
       '. This role must investigate its gate; no launch or deployment approval is implied.'));
     card.append(gate);
    }
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
    // The SAME owner-scoped Past/Present/Future evidence used by Home can
    // inform role investigations. Source signals are not model questions,
    // approved jobs, execution or claimed outcomes.
    const time=data.employee_time_inquiry_context;
    if(time?.owner_scope_verified===true&&time.read_only===true&&
       time.execution_authorized===false&&
       time.new_original_jobs_created===0&&
       Array.isArray(time.roles)){
     const perspective=time.roles.find(x=>x.employee_name===role.employee_name);
     if(perspective&&Array.isArray(perspective.inquiry_sources)&&
        perspective.execution_authorized===false&&
        perspective.questions_generated===0){
      const block=add('details','reality-audit-findings');
      block.append(add('summary',null,
       'Past · Present · Future · '+perspective.inquiry_sources.length+
       ' source signals for investigation'));
      const phase=add('p','reality-audit-role-description',
       'Past verified final receipts: '+
        (perspective.past_verified_receipt_count??'Not verified')+
       ' · Present active shifts: '+
        (perspective.present_active_shift_count??'Not verified')+
       '. These totals do not establish work for this role.');
      block.append(phase);
      if(!perspective.future_source_snapshot_verified)
       block.append(add('p','reality-audit-warning',
        'Future discovery is stale or unverified. No inquiry signals were admitted.'));
      else if(!perspective.inquiry_sources.length)
       block.append(add('p','reality-audit-role-description',
        'No unresolved, currently verified source observations for this role.'));
      const lines=add('ul','reality-audit-responsibilities');
      for(const signal of perspective.inquiry_sources.slice(0,30)){
       if(signal.employee_name!==role.employee_name||
          signal.qualified_job!==false||
          signal.execution_authorized!==false||
          signal.question_generated!==false)continue;
       const entry=add('li',null,signal.source_title);
       entry.append(add('small',null,
        ' · '+signal.evidence_disposition+
        ' · Independent source revalidation required'));
       lines.append(entry);
      }
      block.append(lines);
      block.append(add('p','reality-audit-warning',
       'These are grounded inputs for Reality to develop new questions. No question has been generated or dispatched as a job by this read-only view.'));
      card.append(block);
     }
    }
    // Only signed durable model/investigation receipts are surfaced here.
    const inquiry=data.employee_inquiry_receipts;
    if(inquiry?.status==='OWNER_EMPLOYEE_INQUIRIES_READ_ONLY'&&
       inquiry.owner_scope_verified===true&&inquiry.read_only===true&&
       inquiry.execution_authorized===false&&
       inquiry.qualified_executable_jobs===0&&
       Array.isArray(inquiry.items)){
     const received=inquiry.items.filter(x=>x.employee===role.employee_name);
     if(received.length){
      const saved=add('details','reality-audit-findings');
      saved.append(add('summary',null,
       'Reality investigated '+received.length+' source question(s)'));
      for(const record of received){
       if(record.qualified_executable_job!==false||
          record.execution_authorized!==false||
          !/^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:issues|pull)\/[1-9][0-9]*$/.test(
           record.source_ref||''))continue;
       const item=add('div','reality-audit-work-item');
       item.append(add('strong',null,record.question));
       const source=add('a',null,'View original source');
       source.href=record.source_ref;source.target='_blank';
       source.rel='noopener noreferrer';item.append(source);
       item.append(add('p',null,'Investigation: '+record.investigation));
       item.append(add('p',null,'Next independent proof: '+record.next_proof));
       item.append(add('small',null,
        'Source checked and model response recorded · '+record.recommendation+
        ' · Not a verified repair, approved job or completed customer outcome'));
       saved.append(item);
      }
      card.append(saved);
     }
    }
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
 async function inquire(){
  if(running)return;
  running=true;buttons.forEach(b=>b.disabled=true);
  panel.hidden=false;
  panel.replaceChildren(add('p','reality-audit-progress',
   'Reality is rechecking one source and generating its own evidence-grounded question…'));
  let refresh=false;
  try{
   const response=await fetch('/api/reality/personal-employee-inquiry',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({intent:'INVESTIGATE_NEXT_SOURCE'}),
    signal:AbortSignal.timeout(55000)
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true||
      data.execution_authorized!==false||
      data.installation_authorized!==false||
      data.production_changed!==false)
    throw Error('INQUIRY_VERIFIED_RESPONSE_REQUIRED');
   refresh=data.status==='EMPLOYEE_SOURCE_QUESTION_AND_INVESTIGATION_RECORDED';
   panel.replaceChildren(add('p','reality-audit-summary',
    refresh?'Reality recorded a new source-backed question for '+
       data.employee+'. Reloading verified employee investigation receipts…':
    data.status==='NO_FRESH_UNSETTLED_EMPLOYEE_INQUIRY_SOURCE'?
       'No new verified unsettled source is eligible. Refresh connected business sources; no job created.':
    'Inquiry is blocked or already claimed. No job or approval was created.'));
  }catch{
   panel.replaceChildren(add('p','reality-audit-warning',
    'Reality could not verify a new investigation. No work or capability was authorized.'));
  }finally{
   running=false;buttons.forEach(b=>b.disabled=false);
  }
  if(refresh)void audit('ALL');
 }
 inquiryAction.addEventListener('click',()=>{void inquire()});
 action.addEventListener('click',()=>{void audit('ALL');});
})();
