/* Reality Chat automatically surfaces Reality's own operational incidents.
 * This is an OWNER-ONLY ledger projection, not a saved assistant turn or a
 * synthetic customer notification. A model cannot grant repair authority.
 */
(()=>{
 'use strict';
 const thread=document.getElementById('privateTranscript');
 const signed=document.getElementById('privateReady');
 if(!thread||!signed||document.getElementById('realityOwnerIncidentChat'))return;
 const node=(tag,cls,value)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(value!==undefined)e.textContent=String(value);
  return e;
 };
 // Operational events remain readable in Work but must not push the
 // conversation and composer out of the mobile viewport.
 const root=node('details','rx-owner-incidents');
 root.id='realityOwnerIncidentChat';
 root.setAttribute('aria-label','Reality operational incidents for the signed-in owner');
 const header=node('summary','rx-owner-incidents-head');
 header.append(node('strong','','Operational briefing · View incidents'));
 const refresh=node('button','rx-owner-incidents-refresh','Check recovery progress');
 refresh.type='button';
 const status=node('p','rx-owner-incidents-status',
  'Checking Reality’s existing owner-scoped incident ledger…');
 const workerReceipt=node('p','rx-owner-worker-receipt',
  'Checking independent signed-worker execution receipts…');
 const repairReceipt=node('p','rx-owner-preview-repair-status',
  'Checking automatic preview repair and independently resumed work…');
 const continuityStatus=node('p','rx-owner-worker-receipt',
  'Checking for stalled employee work and pending capability investigations…');
 const continuityCards=node('div','rx-owner-incidents-items');
 const qualifiedWorkStatus=node('p','rx-owner-worker-receipt',
  'Checking qualified executable employee work and independent job receipts…');
 const qualifiedWorkCards=node('div','rx-owner-incidents-items');
 const cards=node('div','rx-owner-incidents-items');
 const description=node('p','rx-owner-incidents-caption',
  'For this signed-in owner only. Incident evidence is not a customer message, original-job authorization or independent repair receipt.');
 root.append(header,refresh,status,workerReceipt,repairReceipt,qualifiedWorkStatus,qualifiedWorkCards,continuityStatus,continuityCards,cards,description);
 const workPanel=document.getElementById('realityChatPanelWork');
 if(workPanel)workPanel.prepend(root);
 else thread.parentNode.insertBefore(root,thread);
 let busy=false,seen=null;
 const isChat=()=>document.body?.dataset?.realityRoute==='chat'||
  window.location.pathname==='/chat';
 const isSigned=()=>signed.style.display==='block';
 const when=s=>{
  if(!s)return 'time not verified';
  const d=new Date(s);return Number.isFinite(d.getTime())?
   d.toLocaleString():'time not verified';
 };
 const makeHandoffText=item=>{
  const status=item?.governed_original_handoff_status;
  if(!status||status==='HANDOFF_READBACK_UNAVAILABLE')
   return 'Governed original handoff: not yet verified. No repair permission is inferred.';
  const display={
   UNASSESSED:'Checking current evidence and existing original authority',
   RECOVERED_PREVIOUSLY_NO_REPLAY:'Previously recovered · no duplicate repair',
   WAITING_FOR_CURRENT_INDEPENDENT_FAILURE:'Verify the worker has truly recovered before taking another action',
   ORIGINAL_WARRANT_AND_FROZEN_PROOF_REQUIRED:'Blocked · current independent failure and exact original authorization required',
   EXISTING_ORIGINAL_RECOVERY_ELIGIBLE:'Existing authorized original found · eligible for guarded continuation',
   EXISTING_ORIGINAL_RECOVERY_CLAIMED:'Exact original recovery claim is in progress',
   EXISTING_ORIGINAL_OBLIGATION_PRESERVED:'Original recovery obligation preserved · existing governor controls further execution',
   ORIGINAL_RECOVERY_PROOF_FAILED_NEEDS_REVIEW:'Blocked · independent original recovery proof failed'
  }[status];
  return 'Governed original handoff: '+(display||'Unverified');
 };
 const render=(item)=>{
  const card=node('article','rx-owner-incident');
  const heading=node('strong','','Reality detected an operational issue');
  const status=node('p','rx-owner-incident-phase',item.stage);
  const observed=node('p','',item.error_summary+
   ' · Last observed '+when(item.observed_at)+
   ' · '+item.occurrence_count+' recorded failure'+
   (item.occurrence_count===1?'':'s'));
  const investigation=node('p','',
   'Employee: '+(item.assigned_employee||'not yet assigned')+
   ' · Independent review: '+(item.independent_reviewer||'not yet assigned'));
  const findings=node('p','',item.outcome);
  const next=node('p','rx-owner-incident-next','Next: '+item.next_action);
  card.append(heading,status,observed,investigation,findings);
  if(item.self_repair_completed===true&&
     item.bounded_preview_self_repair_cycle_proven===true){
   const proof=item.bounded_preview_self_repair;
   card.append(node('p','rx-owner-incident-proof',
    'AUTO-REPAIR VERIFIED FOR THIS PREVIEW SCHEDULER DEFECT. '+
    'Actual signed-worker run: '+proof.worker_run_id+
    ' · Same original investigation: '+proof.original_capability_claim_id+
    ' · Independent work receipt: '+proof.original_work_receipt_sha256+
    ' · No production or customer actions'));
  }
  const handoffText=makeHandoffText(item);
  if(handoffText)card.append(node('p','rx-owner-incident-handoff',handoffText));
  card.append(next);
  if(item.operational_continuity_verified&&item.operational_recovery_receipt_sha256){
   card.append(node('p','rx-owner-incident-proof',
    'Independent operational continuity receipt: '+
    item.operational_recovery_receipt_sha256+
    ' · Externally corrected, NOT self-repaired'));
  }
  const details=node('details','rx-owner-incident-details');
  details.append(node('summary','','Investigation and required proof'));
  if(item.investigation_scope)details.append(
   node('p','','Employee investigation scope: '+item.investigation_scope));
  if(item.independent_test_requirement)details.append(
   node('p','','Independent reviewer must verify: '+
    item.independent_test_requirement));
  card.append(details);
  const discuss=node('button','rx-owner-incident-discuss','Discuss this in Chat');
  discuss.type='button';
  discuss.addEventListener('click',()=>{
   const input=document.getElementById('privatePrompt');
   if(!input)return;
   input.value='Reality, explain the current verified status of your operational incident '+
    item.incident_id+'. What exactly failed, what did you investigate, '+
    'what can you repair within existing governance, what independent '+
    'receipt exists, and what will you do next? Distinguish a recovered '+
    'worker from an autonomous self-repair.';
   input.focus();
   input.scrollIntoView({behavior:'smooth',block:'center'});
  });
  card.append(discuss);
  return card;
 };
 const renderContinuity=item=>{
  const card=node('article','rx-owner-incident');
  card.append(node('strong','','Reality · Work continuity incident'),
   node('p','rx-owner-incident-phase',item.phase),
   node('p','',item.error_summary+' · '+when(item.observed_at)),
   node('p','','Employee: '+(item.assigned_employee||'not assigned yet')+
    ' · Independent reviewer: '+(item.independent_reviewer||'not yet assigned')));
  if(item.diagnosis)
   card.append(node('p','','Provisional diagnosis (not independent proof): '+item.diagnosis));
  if(item.proposed_upgrade)
   card.append(node('p','','Proposed capability upgrade (NOT installed): '+
    item.proposed_upgrade));
  if(item.independent_test_requirement)
   card.append(node('p','','Independent test needed: '+
    item.independent_test_requirement));
  if(item.investigation_receipt_sha256)
   card.append(node('p','rx-owner-incident-proof',
    'Investigation receipt: '+item.investigation_receipt_sha256+
    ' · Repair not yet proven; installation not authorized'));
  const exactGate=item.exact_code_repair_install_gate;
  if(exactGate){
   card.append(node('p','rx-owner-incident-phase',
    'Independent code repair + installation gate: '+exactGate.status),
    node('p','rx-owner-incident-next',
     'Next verified step: '+exactGate.next_action));
   if(exactGate.independent_ci_run_id)
    card.append(node('p','rx-owner-incident-proof',
     'Independent CI run: '+exactGate.independent_ci_run_id+
     ' · exact candidate: '+(exactGate.candidate_commit_sha||'not verified')));
   if(exactGate.candidate_artifact_sha256)
    card.append(node('p','rx-owner-incident-proof',
     'Exact candidate digest: '+exactGate.candidate_artifact_sha256+
     ' · Specific authenticated artifact approval is required before installation'));
  }else{
   card.append(node('p','rx-owner-incident-next',
    'Exact code repair approval gate unavailable. Do not infer testing or installation authority.'));
  }
  if(item.work_resumption_verified===true&&
    item.independent_resumption_receipt_sha256)
   card.append(node('p','rx-owner-incident-proof',
    'ORIGINAL WORK RESUMPTION VERIFIED · Signed worker '+
    item.verified_worker_run_id+' · Same source investigation '+
    item.verified_original_inquiry_claim_id+' · Receipt '+
    item.independent_resumption_receipt_sha256+
    ' · This does NOT prove Reality repaired its own code'));
  card.append(node('p','rx-owner-incident-next','Next: '+item.next_action));
  const discuss=node('button','rx-owner-incident-discuss','Discuss this stall in Chat');
  discuss.type='button';
  discuss.addEventListener('click',()=>{
   const input=document.getElementById('privatePrompt');
   if(!input)return;
   input.value='Reality, review your recorded shift-continuity incident '+
    item.incident_id+'. Explain the source-backed stall, your investigation, '+
    'which employee owns the next test, what capability improvement is proposed, '+
    'what has been independently verified, what existing authority permits, '+
    'and how you will resume the original work without claiming an unverified repair.';
   input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});
  });
  card.append(discuss);
  return card;
 };
 const renderQualifiedEvidenceJob=item=>{
  const article=node('article','rx-owner-incident');
  article.append(node('strong','','Qualified employee work · '+item.employee),
   node('p','rx-owner-incident-phase',
    item.phase==='COMPLETED_INDEPENDENTLY_VERIFIED'?
     'Source report independently verified by two signed worker runs':
     item.phase==='QUALIFIED_EXECUTABLE'?
     'Qualified and waiting for signed execution':
     item.phase==='SUBMITTED_AWAITING_INDEPENDENT_RECHECK'?
     'Evidence deliverable submitted · Independent source recheck pending':
     item.phase==='REQUALIFICATION_CLAIMED'?
      'Changed GitHub source · Same job being safely requalified':
     item.phase),
   node('p','','Current work: '+item.objective));
  if(item.current_source_title)
   article.append(node('p','','Verified source title: '+item.current_source_title));
  const sourceLink=document.createElement('a');
  sourceLink.href=item.source_ref;
  sourceLink.textContent='View cited GitHub source';
  sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
  article.append(sourceLink);
  if(item.independent_receipt_sha256)
   article.append(node('p','rx-owner-incident-proof',
    'Independent receipt: '+item.independent_receipt_sha256+
    ' · Execution worker: '+item.execution_worker_run_id+
    ' · Independent reviewing worker: '+item.review_worker_run_id));
  if(item.followup_proof_still_required)
   article.append(node('p','rx-owner-incident-next',
    'Additional proof still needed: '+item.followup_proof_still_required));
  if(item.blocker)
   article.append(node('p','rx-owner-incident-next',
    'Execution blocker: '+item.blocker));
  if(item.recovery_receipt_sha256)
   article.append(node('p','rx-owner-incident-proof',
    'Same-job recovery attempt '+item.recovery_attempts+
    ' · Original failure preserved · Receipt: '+item.recovery_receipt_sha256+
    ' · This is NOT a code repair'));
  if(item.last_failure_reason)
   article.append(node('p','rx-owner-incident-next',
    'Previous verified blocker: '+item.last_failure_reason));
  article.append(node('p','rx-owner-incidents-caption',
   'Read-only source deliverable. Not a code installation or settled customer job.'));
  return article;
 };
 const update=async()=>{
  if(busy||!isChat()||!isSigned())return;
  busy=true;refresh.disabled=true;
  try{
   const id=window.realityActiveConversationId?.();
   if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id||''))
    throw Error('OWNER_CONVERSATION_SCOPE_UNVERIFIED');
   const result=await fetch(
    '/api/reality/personal-chat?conversation_id='+encodeURIComponent(id)+
     '&incident_readback=1',{
      method:'GET',credentials:'same-origin',cache:'no-store',
      signal:AbortSignal.timeout(12000)
     });
   const data=await result.json().catch(()=>null);
   const feed=data?.operational_incidents_readback;
   if(!result.ok||data.ok!==true||
    data.execution_authorized_by_chat!==false||
    data.installation_authorized!==false||
    data.production_changed!==false||
    feed?.status!=='OWNER_OPERATIONAL_INCIDENT_CHAT_BRIEFING_READ_ONLY'||
    feed.owner_scope_verified!==true||feed.read_only!==true||
    feed.owner_chat_only!==true||
    feed.original_job_authorized_by_chat!==false||
    feed.installation_authorized!==false||
    !Array.isArray(feed.items)||feed.items.length>5||
    feed.count!==feed.items.length||
    feed.items.some(x=>
      x.owner_chat_only!==true||
      (x.self_repair_completed!==false&&
       !(x.self_repair_completed===true&&
         x.bounded_preview_self_repair_cycle_proven===true&&
         x.self_repair_scope==='KNOWN_SAFE_PREVIEW_SCHEDULER_PERMISSION_GATE_ONLY'))||
      (x.bounded_preview_self_repair_cycle_proven===true&&
       x.self_repair_completed!==true)||
      x.original_job_authorized_by_chat!==false||
      x.install_authorized_by_chat!==false||
      x.customer_notified!==false))
    throw Error('OWNER_OPERATIONAL_BRIEFING_READBACK_UNVERIFIED');
   const actual=feed.signed_worker_delivery;
   if(!actual||typeof actual!=='object'||
    actual.scheduler_success_alone_proves_execution!==false||
    actual.actual_worker_process_attested!==true&&
      actual.actual_worker_process_attested!==false||
    typeof actual.next_action!=='string')
     throw Error('SIGNED_WORKER_ACTUAL_EXECUTION_EVIDENCE_UNVERIFIED');
   const stageText={
    SIGNED_WORKER_PROCESS_COMPLETED:'Signed worker process finished',
    SIGNED_WORKER_FAILURE_RECORDED:'Signed worker process failed',
    SIGNED_WORKER_STARTED_NO_FINAL_RECEIPT:'Signed worker started · final receipt pending',
    SIGNED_WORKER_STALLED_OR_FINAL_RECEIPT_MISSING:
      'Signed worker start observed · final receipt missing beyond the bounded window',
    SIGNED_WORKER_PROCESS_NOT_YET_ATTESTED:
      'Scheduler dispatch is not proof that the signed worker started'
   }[actual.phase]||'Signed worker process status not independently verified';
   workerReceipt.textContent='Actual worker: '+stageText+
    '. '+actual.next_action;
   const repair=feed.bounded_preview_auto_repair;
   if(!repair||typeof repair!=='object'||
    !Array.isArray(repair.items)||repair.items.length>6||
    repair.count!==repair.items.length||
    repair.historical_external_correction_not_reclassified!==true)
    throw Error('OWNER_PREVIEW_AUTONOMOUS_REPAIR_STATUS_UNVERIFIED');
   if(repair.count){
    const r=repair.items[0];
    const label={
     PATCH_APPLIED_AWAITING_WORKER:
      'Known preview fault corrected; waiting for the actual signed worker',
     WORKER_ATTESTED_AWAITING_ORIGINAL:
      'Signed worker recovered; original authorized work still needs independent verification',
     WORKER_RESTORED_NO_ORIGINAL_TO_RESUME:
      'Signed worker recovered; there was no unfinished authorized original to resume',
     INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED:
      'Automatic preview repair, signed worker and resumed original work independently verified',
     BLOCKED_UNRECOGNIZED_SCOPE:
      'Blocked: the failure does not match an approved safe repair recipe',
     BLOCKED_EVIDENCE_OR_WORKER_MISSING:
      'Blocked: required independent repair evidence is missing'
    }[r.phase]||'Unverified repair state';
    repairReceipt.textContent='Automatic preview recovery: '+label+
     '. '+r.next_action+
     ' · Receipt: '+r.receipt_sha256;
   }else{
    repairReceipt.textContent=
     'Automatic preview recovery: no current self-repair attempt recorded. '+
     'The historical scheduler correction was external and remains classified that way.';
   }
   if(!['OWNER_EXACT_REPAIR_INSTALL_GATE_VERIFIED_READ_ONLY',
      'EXACT_REPAIR_INSTALL_GATE_READBACK_UNAVAILABLE']
      .includes(feed.exact_repair_install_gate_read_status)||
     !Number.isSafeInteger(feed.exact_repair_install_gate_count)||
     feed.exact_repair_install_gate_count>8)
    throw Error('EXACT_ARTIFACT_REPAIR_GATE_READBACK_UNVERIFIED');
   const q=feed.qualified_employee_evidence_work;
   if(!q||!Array.isArray(q.items)||q.items.length>12||
    !q.counts||!Number.isSafeInteger(q.counts.total)||
    !['OWNER_SOURCE_QUALIFIED_EMPLOYEE_WORK_READ_ONLY',
      'QUALIFIED_EMPLOYEE_WORK_READBACK_UNAVAILABLE'].includes(q.status)||
    q.original_customer_job_completed!==false||
    q.source_report_only!==true||
    q.items.some(x=>x.original_customer_job_completed!==false||
     x.code_repair_installed!==false||x.production_changed!==false||
     x.evidence_job_completed!==(x.phase===
      'COMPLETED_INDEPENDENTLY_VERIFIED')))
    throw Error('OWNER_QUALIFIED_EMPLOYEE_SOURCE_WORK_PROOF_UNVERIFIED');
   qualifiedWorkStatus.textContent=
    q.status==='QUALIFIED_EMPLOYEE_WORK_READBACK_UNAVAILABLE'?
    'Qualified employee work evidence unavailable; no job completion assumed.':
    'Reality employee work · '+q.counts.total+' qualified source evidence jobs · '+
    q.counts.independently_completed+' independently verified deliverable'+
     (q.counts.independently_completed===1?'':'s')+
    ' · '+q.counts.qualified_executable+' ready · '+
    q.counts.blocked+' blocked. These are not customer-job or code-install receipts.';
   qualifiedWorkCards.replaceChildren(...q.items.slice(0,5).map(renderQualifiedEvidenceJob));
   const stalls=feed.shift_continuity_incidents;
   if(!Array.isArray(stalls)||stalls.length>8||
    feed.shift_continuity_count!==stalls.length||
    !['OWNER_SHIFT_CONTINUITY_INCIDENTS_VERIFIED_READ_ONLY',
      'OWNER_SHIFT_CONTINUITY_EVIDENCE_UNAVAILABLE']
      .includes(feed.shift_continuity_read_status)||
    stalls.some(x=>x.owner_chat_only!==true||
     x.repair_executed!==false||
     x.self_repair_proven!==false||
     x.installation_authorized!==false||
     x.customer_job_completed!==false||
     (x.exact_code_repair_install_gate!==null&&
      (x.exact_code_repair_install_gate?.installation_authorized_by_read!==false||
       x.exact_code_repair_install_gate?.new_self_repair_proven!==false||
       x.exact_code_repair_install_gate?.production_changed!==false))))
    throw Error('OWNER_SHIFT_CONTINUITY_STALL_EVIDENCE_UNVERIFIED');
   continuityStatus.textContent=
    feed.shift_continuity_read_status===
     'OWNER_SHIFT_CONTINUITY_EVIDENCE_UNAVAILABLE'?
     'Stalled-work watchdog evidence is temporarily unavailable; no repair or healthy state is assumed.':
     stalls.length?
     'Reality detected '+stalls.length+' signed-shift continuity issue'+
      (stalls.length===1?'':'s')+
      '. Diagnosis and upgrade proposals are not independently verified repairs.':
     'Stalled-work watchdog: no source-backed continuity incident recorded.';
   continuityCards.replaceChildren(...stalls.map(renderContinuity));
   const snapshot=JSON.stringify(feed.items);
   if(snapshot!==seen){
    cards.replaceChildren(...feed.items.map(render));
    seen=snapshot;
   }
   status.textContent=feed.count?
    'Reality automatically forwarded '+feed.count+
    ' saved operational incident'+(feed.count===1?'':'s')+
    ' into your owner Chat briefing. These are ledger-backed facts, not model guesses.':
    'No operational incident is currently recorded in this owner-scoped worker ledger. Other systems are not assumed healthy.';
   if(!feed.count)cards.replaceChildren();
  }catch{
   status.textContent='Reality cannot independently read its current operational incident status. No recovery or repair is assumed.';
   workerReceipt.textContent='Worker execution evidence unavailable. A successful cron dispatch alone never proves completed work.';
   repairReceipt.textContent='Automatic repair receipt unavailable. No completed repair or resumed original job is assumed.';
   continuityStatus.textContent='Stalled-work incident evidence unavailable; no healthy state is inferred.';
   qualifiedWorkStatus.textContent='Qualified employee work evidence unavailable; no verified deliverables assumed.';
   qualifiedWorkCards.replaceChildren();
   continuityCards.replaceChildren();
  }finally{busy=false;refresh.disabled=false;}
 };
 refresh.addEventListener('click',()=>{void update()});
 window.addEventListener('reality:saved-chat-readback',()=>{void update()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')void update();
 });
 window.setInterval(()=>{
  if(document.visibilityState==='visible')void update();
 },30000);
 void update();
 // Auth may finish after the view script loads; read the same owner ledger on
 // the next visible signed-in refresh rather than pretending the user logged in.
 window.addEventListener('reality:private-session-ready',()=>{void update()});
})();
