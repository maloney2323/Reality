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
 const root=node('section','rx-owner-incidents');
 root.id='realityOwnerIncidentChat';
 root.setAttribute('aria-label','Reality operational incidents for the signed-in owner');
 const header=node('div','rx-owner-incidents-head');
 header.append(node('strong','','Reality · Operational briefing'));
 const refresh=node('button','rx-owner-incidents-refresh','Check recovery progress');
 refresh.type='button';
 header.append(refresh);
 const status=node('p','rx-owner-incidents-status',
  'Checking Reality’s existing owner-scoped incident ledger…');
 const workerReceipt=node('p','rx-owner-worker-receipt',
  'Checking independent signed-worker execution receipts…');
 const repairReceipt=node('p','rx-owner-preview-repair-status',
  'Checking automatic preview repair and independently resumed work…');
 const cards=node('div','rx-owner-incidents-items');
 const description=node('p','rx-owner-incidents-caption',
  'For this signed-in owner only. Incident evidence is not a customer message, original-job authorization or independent repair receipt.');
 root.append(header,status,workerReceipt,repairReceipt,cards,description);
 thread.parentNode.insertBefore(root,thread);
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
      x.self_repair_completed!==false||
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
