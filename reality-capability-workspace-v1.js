/* Reality · Capabilities, an employee-adjacent view over existing owner
   capability evidence and an explicit, expiring routine-work delegation. */
(()=>{
 'use strict';
 if(window.location.pathname!=='/')return;
 const stage=document.querySelector('#realityHomeCommand .rc-stage');
 if(!stage||document.getElementById('realityCapabilities'))return;
 const make=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const section=make('section','rc-capabilities');
 section.id='realityCapabilities';
 section.setAttribute('aria-label','Capability opportunities and routine employee autonomy');
 const head=make('div','rc-cap-head');
 const textHead=make('div');
 textHead.append(make('span','rc-eyebrow','EMPLOYEE WORK · CAPABILITY INVESTIGATIONS'),
  make('h2','','Capabilities'),
  make('p','rc-cap-description',
   'Existing upgrades and missing capabilities, investigated by your AI workforce. Nothing is assigned or executable until its proof and authority are verified.'));
 head.append(textHead);
 const refresh=make('button','rc-outline rc-cap-refresh','Check work progress');
 refresh.type='button';
 head.append(refresh);section.append(head);
 const metrics=make('div','rc-cap-metrics');
 const stats={};
 for(const [k,title] of [['candidates','Discovered candidates'],
  ['gaps','Verified current gaps'],['queue','Active capability queue'],
  ['tested','Historically tested']]){
  const card=make('div','rc-cap-stat');
  card.append(make('span','',title));
  const value=make('strong','','—');stats[k]=value;card.append(value);
  metrics.append(card);
 }
 section.append(metrics);
 const autonomy=make('div','rc-cap-autonomy');
 const autonomyLeft=make('div');
 autonomyLeft.append(make('strong','','Routine autonomy'),
  make('p','',
   'Permit independent source checks and AI investigation receipts within the existing owner scope. Expires after 30 days; maximum 12 investigations per day. No deploys, purchases, customer messages, external writes, or new execution warrants.'));
 const state=make('p','rc-cap-grant-state','Checking owner delegation…');
 autonomyLeft.append(state);
 const toggle=make('button','rc-outline rc-cap-toggle','Enable routine discovery');
 toggle.type='button';toggle.disabled=true;
 autonomy.append(autonomyLeft,toggle);section.append(autonomy);
 // Progress does not stop at an 'Enabled' switch. Every state names the
 // underlying observed work, any blocker, and exactly what happens next.
 const progress=make('div','rc-cap-progress');
 progress.setAttribute('role','status');
 progress.setAttribute('aria-live','polite');
 const progressHeading=make('strong','','What Reality is doing');
 const progressState=make('p','rc-cap-progress-state',
  'Checking the authenticated worker and schedule receipts…');
 const progressNext=make('p','rc-cap-progress-next',
  'Next: verify the scheduled worker has actually advanced a source-backed investigation.');
 const progressIncidents=make('div','rc-cap-incident-list');
 progress.append(progressHeading,progressState,progressNext,progressIncidents);
 section.append(progress);
 // Separate demonstration warrant: this is intentionally NOT the standing
 // research grant and NOT a customer/production repair authorization.
 const demo=make('section','rc-cap-demo');
 demo.setAttribute('aria-label','Isolated self-repair demonstration');
 demo.append(make('strong','','Self-repair demonstration'),
  make('p','',
   'Run one safe, isolated test: Reality’s AI proposes a repair to a disposable internal fixture, the existing governed engine applies it, and separate checks verify the SAME original job resumes. No repository, customer, production, or payment changes.'));
 const demoButton=make('button','rc-outline rc-cap-demo-run',
  'Run isolated self-repair demo');
 demoButton.type='button';
 const demoStatus=make('p','rc-cap-demo-state',
  'Ready to inspect the last owner-scoped demonstration receipt.');
 const demoReceipt=make('p','rc-cap-demo-receipt','');
 demo.append(demoButton,demoStatus,demoReceipt);
 section.append(demo);
 const list=make('div','rc-cap-list');
 const notice=make('p','rc-cap-notice','Checking verified capability evidence…');
 section.append(notice,list);
 const queue=stage.querySelector('.rc-queue');
 if(queue)stage.insertBefore(section,queue);else stage.append(section);
 let latest=null,loading=false,demoBusy=false;
 const readDemo=async()=>{
  try{
   const response=await fetch('/api/reality/personal-self-repair-demo',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(20000)
   });
   const read=await response.json().catch(()=>null);
   if(!response.ok||read?.ok!==true||
    read.status!=='OWNER_ISOLATED_SELF_REPAIR_DEMO_READ_ONLY'||
    read.owner_scope_verified!==true||
    read.demo_only!==true||
    read.customer_job_completed!==false||
    read.installation_authorized!==false||
    read.production_changed!==false)
    throw Error('SELF_REPAIR_DEMO_READBACK_UNVERIFIED');
   if(read.phase==='VERIFIED'&&
    /^sha256:[a-f0-9]{64}$/.test(read.final_receipt_sha256||'')){
    demoStatus.textContent='ISOLATED DEMO VERIFIED · The governed executor completed the temporary repair and the original job passed its independent checks.';
    demoReceipt.textContent='Durable demonstration receipt: '+read.final_receipt_sha256+
     '. This does not prove an autonomous production repair.';
   }else if(read.phase==='FAILED'){
    demoStatus.textContent='DEMO BLOCKED · The attempted repair did not produce a verified final receipt.';
    demoReceipt.textContent='Next: '+(read.failure_code||'Independent proof unavailable')+
     '. No live repair was authorized.';
   }else if(read.phase==='CLAIMED'){
    demoStatus.textContent='DEMO UNCERTAIN · The owner grant was consumed, but no final verification is recorded.';
    demoReceipt.textContent='Next: use Check work progress or inspect the owner receipt; do not start a duplicate run to guess the outcome.';
   }else{
    demoStatus.textContent='No isolated self-repair demonstration has been recorded yet.';
    demoReceipt.textContent='One authenticated Start authorizes only this disposable demonstration, not real customer work.';
   }
  }catch{
   demoStatus.textContent='Demo status readback unavailable; no success is assumed.';
   demoReceipt.textContent='Next: check Reality’s authenticated status again.';
  }
 };
 demoButton.addEventListener('click',async()=>{
  if(demoBusy||loading)return;
  if(!window.confirm(
   'Run one isolated, temporary self-repair demonstration with AI? It may use a model call and records one owner-scoped test receipt. It CANNOT deploy, spend money, message customers, or modify your business records.'
  ))return;
  demoBusy=true;demoButton.disabled=true;
  demoStatus.textContent='AUTHORIZED · Reality is reproducing an isolated failure, requesting a bounded model patch, and verifying the original job.';
  demoReceipt.textContent='Next: await the returned independent receipt or a specific blocker. No additional approval is required within this exact test.';
  try{
   const response=await fetch('/api/reality/personal-self-repair-demo',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'RUN_ONE_ISOLATED_SELF_REPAIR_DEMO'}),
    signal:AbortSignal.timeout(58000)
   });
   const receipt=await response.json().catch(()=>null);
   if(!response.ok||receipt?.ok!==true||
    receipt.status!=='EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED'||
    receipt.independent_final_receipt_verified!==true||
    receipt.existing_governed_executor_used!==true||
    receipt.original_work_resumed!==true||
    receipt.demo_only!==true||
    receipt.customer_job_completed!==false||
    receipt.production_changed!==false||
    !/^sha256:[a-f0-9]{64}$/.test(receipt.final_receipt_sha256||''))
    throw Error('SELF_REPAIR_DEMO_FINAL_PROOF_REQUIRED');
   demoStatus.textContent='VERIFIED ISOLATED TEST · Repair applied through the existing governor, independently checked, and the same original job resumed.';
   demoReceipt.textContent='Receipt: '+receipt.final_receipt_sha256+
    '. Next: a real autonomous customer repair requires a current independently reproduced original defect and an existing execution warrant.';
  }catch{
   demoStatus.textContent='UNVERIFIED · This demo did not return a complete independent receipt.';
   demoReceipt.textContent='Next: inspect the owner-scoped recorded status. No live repair or production action is assumed.';
  }finally{
   demoBusy=false;demoButton.disabled=false;
   void readDemo();
  }
 });
 const formatDate=s=>{
  if(!s)return 'Not active';
  const d=new Date(s);
  return Number.isFinite(d.getTime())?d.toLocaleDateString():'Unverified';
 };
 const refreshUI=async()=>{
  if(loading)return;
  loading=true;refresh.disabled=true;toggle.disabled=true;
  try{
   const response=await fetch('/api/reality/personal-capabilities',{
    method:'GET',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>null);
   if(response.status===401){
    notice.textContent='Sign in to Reality to view owner-scoped capabilities. Use Refresh evidence after signing in.';
    return;
   }
   if(!response.ok||data?.ok!==true||
      data.status!=='OWNER_CAPABILITY_AND_ROUTINE_DELEGATION_WORKSPACE'||
      data.owner_scope_verified!==true||data.read_only!==true||
      data.jobs_created_by_read!==0||data.production_changed!==false||
      !Array.isArray(data.items)||data.items.length>20||
      data.candidate_count!==data.items.length||
      data.items.some(x=>x.executable_job!==false||
       x.execution_authorized!==false||x.installation_authorized!==false))
    throw Error('CAPABILITY_READBACK_NOT_OWNER_VERIFIED');
   latest=data;
   stats.candidates.textContent=String(data.candidate_count);
   stats.gaps.textContent=String(data.verified_current_gaps);
   stats.queue.textContent=String(data.active_capability_queue);
   stats.tested.textContent=String(data.independently_tested_candidates);
   const grant=data.standing_delegation;
   state.textContent=grant.active?
    'Enabled for verified evidence-only investigations · '+
    grant.today_reserved+' / '+grant.max_daily_inquiries+
    ' daily reservations · Expires '+formatDate(grant.expires_at):
    'Paused or expired · No background model investigations are delegated';
   toggle.textContent=grant.active?
    'Pause automatic investigations':'Authorize automatic investigations';
   const health=data.worker_progress;
   if(!health||typeof health!=='object'||
    !Array.isArray(health.incidents)||health.incidents.length>8||
    typeof health.next_action!=='string'||
    health.scheduler_dispatch_success_not_worker_proof!==true||
    health.execution_authorized_by_read!==false||
    health.installation_authorized!==false)
    throw Error('OWNER_WORKER_OPERATIONAL_STATUS_UNVERIFIED');
   const scheduled=Number(data.scheduled_capability_investigations||0);
   const investigated=Number(data.performed_capability_investigations||0);
   const blocked=Number(data.blocked_capability_investigations||0);
   const schedulerFailed=health.last_scheduler_status==='failed';
   const recentIncident=health.incidents[0]||null;
   if(!grant.active){
    progressState.textContent='PAUSED · No standing research authority currently active.';
    progressNext.textContent='Next: authorize bounded investigations if you want Reality to continue. Existing separately authorized jobs are unaffected.';
   }else if(schedulerFailed){
    progressState.textContent='BLOCKED · Reality recorded a scheduled-worker failure at '+
     formatDate(health.last_scheduler_check_at)+'. Permission was saved but the worker did not dispatch successfully.';
    progressNext.textContent='Next: '+health.next_action;
   }else if(health.operational_recoveries_verified>0&&
    health.incidents.some(i=>i.operational_continuity_verified===true)){
    progressState.textContent='OPERATIONAL RECOVERY VERIFIED · Independent evidence confirms the signed worker resumed. The historical correction was external, not an autonomous self-repair.';
    progressNext.textContent='Next: '+health.next_action+
     (grant.today_reserved>=grant.max_daily_inquiries?
      ' Today’s '+grant.max_daily_inquiries+' research reservations are used; fresh routine investigations can continue when the UTC day resets.':'');
   }else if(health.incidents.some(i=>i.phase==='LEASED_FOR_INVESTIGATION')){
    progressState.textContent='INVESTIGATING · Reality has claimed an operational failure and is checking what recovery it needs.';
    progressNext.textContent='Next: record employee diagnosis and independent proof requirement. A repair is not authorized merely by this claim.';
   }else if(grant.today_reserved>=grant.max_daily_inquiries){
    progressState.textContent='DAILY RESEARCH LIMIT REACHED · '+
     grant.today_reserved+' / '+grant.max_daily_inquiries+
     ' bounded investigation reservations used. '+scheduled+
     ' assigned capability investigation'+(scheduled===1?' is':'s are')+
     ' recorded · '+investigated+' source investigation receipt'+
     (investigated===1?'':'s')+' · '+blocked+' blocked source investigation'+
     (blocked===1?'':'s')+'.';
    progressNext.textContent='Next: Reality automatically regains its evidence-only investigation allowance when the database day resets (UTC). No additional authorization or Start button is needed. Existing schedules still require independent proof; this is not a completed repair or shift.';
   }else if(scheduled>0){
    progressState.textContent='ADVANCING · '+scheduled+
     ' capability investigation'+(scheduled===1?' is':'s are')+
     ' scheduled from verified owner records · '+grant.today_reserved+
     ' of '+grant.max_daily_inquiries+' daily reservations used.';
    progressNext.textContent='Next: '+health.next_action;
   }else if(health.last_scheduler_status==='succeeded'){
    progressState.textContent='AUTHORIZED · Scheduler dispatch checked. No completed employee investigation is yet independently verified.';
    progressNext.textContent='Next: Reality should record a real employee assignment or report a source/provider blocker; scheduler success alone is not proof of worker execution.';
   }else{
    progressState.textContent='AUTHORIZED · Waiting for independently verifiable worker evidence.';
    progressNext.textContent='Next: '+health.next_action;
   }
   progressIncidents.replaceChildren();
   if(recentIncident){
    const issue=make('div','rc-cap-incident');
    const diagnostic=make('strong','','Detected operational issue');
    const detail=make('p','',
     recentIncident.error_summary+' · '+recentIncident.phase.replaceAll('_',' ').toLowerCase());
    issue.append(diagnostic,detail);
    if(recentIncident.assigned_employee){
     issue.append(make('p','','Investigating: '+
      recentIncident.assigned_employee+' · Independent review: '+
      (recentIncident.independent_reviewer||'awaiting assignment')));
    }
    if(recentIncident.operational_continuity_verified){
     issue.append(make('p','',
      'Operational continuity independently verified on '+
      formatDate(recentIncident.operational_recovery_verified_at)+
      ' with signed-worker evidence. Repair attribution: externally corrected, not self-repaired. Autonomous self-repair is still unproven.'));
     issue.append(make('p','',
      'Verification receipt: '+(recentIncident.operational_recovery_receipt_sha256||'Missing')));
    }else if(recentIncident.scheduler_dispatched_after_failure)
     issue.append(make('p','',
      'A later scheduler dispatch succeeded, but the original failure has not yet been independently reconciled.'));
    progressIncidents.append(issue);
   }
   notice.textContent=data.candidate_count?
    data.candidate_count+' evidence-backed opportunities · '+
    (data.scheduled_capability_investigations||0)+
    ' employee investigations assigned · '+
    (data.performed_capability_investigations||0)+
    ' source inquiry receipts · '+
    (data.blocked_capability_investigations||0)+
    ' blocked · '+(data.existing_independently_proven_originals||0)+
    ' current gaps independently verified in original-job records. '+
    'Hours are preliminary proposals, never measured results.':
    'No capability candidates in the current owner ledger.';
   list.replaceChildren();
   for(const item of data.items){
    const card=make('article','rc-cap-item');
    const upper=make('div','rc-cap-item-top');
    upper.append(make('strong','',item.title),
     make('span','rc-cap-phase',item.stage.replaceAll('_',' ').toLowerCase()));
    card.append(upper);
    if(item.potential_value)
     card.append(make('p','',item.potential_value));
    const info=make('div','rc-cap-meta');
    const scoped=item.assigned_employee&&
     ['EMPLOYEE_INQUIRY_SCHEDULED_AWAITING_INDEPENDENT_GAP_TEST',
      'EMPLOYEE_INQUIRY_RECORDED_AWAITING_INDEPENDENT_GAP_TEST',
      'EMPLOYEE_INQUIRY_BLOCKED_NEEDS_SOURCE_PROOF',
      'EMPLOYEE_INQUIRY_ACTIVELY_CLAIMED'].includes(item.owner_assignment_status)&&
     item.estimated_hours&&
     item.estimate_confidence===
      'MODEL_PLANNING_RANGE_NOT_INDEPENDENTLY_VERIFIED';
    const minutes=x=>Number(x).toFixed(1);
    info.append(make('span','',scoped?
      'Assigned: '+item.assigned_employee+' · Review: '+item.reviewing_employee:
      'Employee: awaiting evidence-based assignment'),
     make('span','',scoped?
      'Provisional investigation: '+minutes(item.estimated_hours.low)+
      '–'+minutes(item.estimated_hours.high)+' hours (not measured)':
      'Estimated hours: not yet scoped'),
     make('span','',scoped?
      'Scheduled inquiry: '+formatDate(item.planned_inquiry_at):
      'Latest source observation: '+formatDate(item.last_seen_at)));
    card.append(info);
    if(scoped){
     const done=item.owner_assignment_status===
      'EMPLOYEE_INQUIRY_RECORDED_AWAITING_INDEPENDENT_GAP_TEST';
     const blocked=item.owner_assignment_status===
      'EMPLOYEE_INQUIRY_BLOCKED_NEEDS_SOURCE_PROOF';
     const active=item.owner_assignment_status==='EMPLOYEE_INQUIRY_ACTIVELY_CLAIMED';
     card.append(make('p','rc-cap-investigation-stage',
      item.independent_current_gap_proven&&item.existing_original_work_id?
       'Existing original independently qualified · Governed execution permission must still be checked':
      done?'Source investigation recorded · Independent CURRENT internal-gap verification required':
      blocked?'Investigation blocked · '+(item.inquiry_block_reason||'Provider proof is unavailable'):
      active?'Investigation claimed · Working toward durable receipt, not completed':
       'Investigation scheduled · No employee execution receipt yet'));
     if(done){
      card.append(make('p','rc-cap-investigation-receipt',
       'Investigation receipt: '+item.inquiry_receipt_sha256));
      card.append(make('p','',
       'Next independent action: '+(item.inquiry_next_evidence_action||'Verify current internal capability gap')));
     }
    }
    const details=make('details','rc-cap-proof');
    details.append(make('summary','','Evidence and next independent proof'));
    if(scoped){
     if(item.inquiry_question)details.append(make('p','','Employee question: '+item.inquiry_question));
     if(item.inquiry_findings)details.append(make('p','','Investigation findings (model assessment, not independent internal gap proof): '+item.inquiry_findings));
     if(item.inquiry_source_kind)details.append(make('p','','Source proof class: '+item.inquiry_source_kind));
     details.append(make('p','','Assigned investigation: '+item.investigation_scope));
     details.append(make('p','',
      'Independent verification requirement: '+item.independent_test_requirement));
     details.append(make('p','','Evidence limitations: '+item.source_limitations));
    }
    if(item.next_proof)details.append(make('p','',item.next_proof));
    if(item.source_url&&/^https:\/\//.test(item.source_url)){
     const link=make('a','','Open source');
     link.href=item.source_url;link.target='_blank';
     link.rel='noopener noreferrer';details.append(link);
    }
    card.append(details);list.append(card);
   }
  }catch{
   notice.textContent='Capability or owner delegation readback is unavailable. No authority or job inferred.';
   progressState.textContent='UNVERIFIED · The latest worker status could not be read.';
   progressNext.textContent='Next: Check work progress again or inspect Reality Chat for an independent recovery receipt. No completed work is assumed.';
  }finally{
   loading=false;refresh.disabled=false;toggle.disabled=!latest;
  }
 };
 refresh.addEventListener('click',()=>{void refreshUI()});
 toggle.addEventListener('click',async()=>{
  if(loading||!latest)return;
  const active=latest.standing_delegation.active;
  if(!active&&!window.confirm(
   'Enable Reality to independently investigate verified source observations using the existing AI model, up to 12 inquiries per day for 30 days? This does NOT authorize deployments, spending, customer messages, installations or executable jobs.'
  ))return;
  loading=true;toggle.disabled=true;refresh.disabled=true;
  state.textContent='Checking exact owner grant and independent readback…';
  progressState.textContent='Saving the exact owner permission—not starting a repair or shift.';
  progressNext.textContent='Next: the existing signed worker must record an independently verified investigation receipt.';
  try{
   const response=await fetch('/api/reality/personal-capabilities',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({action:active?
     'PAUSE_ROUTINE_DISCOVERY':'ENABLE_ROUTINE_DISCOVERY'}),
    signal:AbortSignal.timeout(20000)
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||data?.ok!==true||
      data.standing_delegation?.owner_scope_verified!==true||
      data.execution_authorized!==false||
      data.installation_authorized!==false||
      data.production_changed!==false)
    throw Error('STANDING_GRANT_PROOF_REQUIRED');
   state.textContent=active?
    'Routine discovery paused.':
    'Your existing employee investigation permission is saved.';
   progressState.textContent=active?
    'PAUSED · Standing discovery switched off.':
    'AUTHORIZED · The worker may now investigate source-backed work within the existing daily limit.';
   progressNext.textContent=active?
    'Next: existing authorized shifts continue under their separate permissions.':
    'Next: Reality checks the existing employee and capability backlog, records assignments, and reports any failure here. No second Start button is needed.';
  }catch{
   state.textContent='Could not verify that the setting changed. Check the authenticated readback.';
  }finally{
   loading=false;refresh.disabled=false;toggle.disabled=false;
   void refreshUI();
  }
 });
 // Read-only progress polling while this Home view is visible. This does
 // not trigger work, schedule a worker, or change owner permissions.
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&latest?.standing_delegation?.active&&!loading)
   void refreshUI();
 },30000);
 void refreshUI();
 void readDemo();
})();
