// Reality's single owner-only signed handoff map inside Chat.
// No model claim, UI click, or read-only poll may execute a job or approve it.
(()=>{
 'use strict';
 if(!/^\/chat\/?$/.test(window.location.pathname))return;
 const find=id=>document.getElementById(id);
 const ready=find('privateReady'),thread=find('privateTranscript');
 if(!ready||!thread||find('realityHandoffHealthInChat'))return;
 const URL='/api/reality/personal-handoff-health';
 const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
 const create=(tag,className,content)=>{
  const e=document.createElement(tag);
  if(className)e.className=className;
  if(content!==undefined)e.textContent=String(content);
  return e;
 };
 const card=create('article','bubble reality-handoff-health');
 card.id='realityHandoffHealthInChat';
 card.setAttribute('aria-label','Reality verified employee handoffs and next actions');
 card.hidden=true;
 const top=create('div','label','REALITY · LIVE HANDOFF AUDIT');
 const heading=create('strong','reality-handoff-health-title','Verifying the full work loop…');
 const body=create('p','reality-handoff-health-summary','Checking the signed shift and independent ledgers.');
 const key=create('div','reality-handoff-health-next');
 const details=create('details','reality-handoff-health-details');
 const summary=create('summary','','View all work handoffs and independent proof');
 const lanes=create('div','reality-handoff-health-lanes');
 const status=create('p','reality-handoff-health-status','');
 status.setAttribute('aria-live','polite');status.setAttribute('role','status');
 const actions=create('div','reality-handoff-health-actions');
 const refresh=create('button','reality-handoff-health-refresh','Refresh verified work');
 refresh.type='button';
 actions.append(refresh);
 details.append(summary,lanes);
 card.append(top,heading,body,key,details,actions,status);
 thread.append(card);
 const signedIn=()=>ready.style.display==='block';
 let verified=false,reading=false;
 function valid(d){
  return d?.ok===true&&
   d.status==='SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY'&&
   /^\w{8}-(?:\w{4}-){3}\w{12}$/.test(d.shift_id||'')&&
   d.read_only===true&&
   d.installation_authorized===false&&
   d.original_job_completed===false&&
   d.production_changed===false&&
   d.new_shift_started===false&&
   d.employee_evidence_is_not_customer_completion===true&&
   Number.isSafeInteger(d.original_claim_count)&&d.original_claim_count>=0&&
   Number.isSafeInteger(d.original_independent_final_receipt_count)&&
   d.original_independent_final_receipt_count>=0&&
   Number.isSafeInteger(d.employee_independently_verified_evidence_jobs)&&
   d.employee_independently_verified_evidence_jobs>=0&&
   Array.isArray(d.maintenance_handoffs)&&d.maintenance_handoffs.length<=8&&
   d.maintenance_handoffs.every(x=>REF.test(x.source_ref||''))&&
   d.ceo_operational_decision_handoff==='NOT_INDEPENDENTLY_ATTESTED_BY_THIS_READ'&&
   d.governed_capability_plan?.status==='GOVERNED_SOURCE_RECEIPT_CAPABILITY_PLAN'&&
   d.governed_capability_plan.owner_id===d.owner_id&&
   d.governed_capability_plan.shift_id===d.shift_id&&
   d.governed_capability_plan.executor_invoked===false&&
   d.governed_capability_plan.original_job_completed===false&&
   d.governed_capability_plan.installation_authorized===false&&
   d.governed_capability_plan.production_changed===false&&
   Number.isSafeInteger(d.governed_capability_plan.candidate_count)&&
   d.governed_capability_plan.candidate_count>=0&&
   Array.isArray(d.governed_capability_plan.source_actions)&&
   d.governed_capability_plan.source_actions.length===
    d.governed_capability_plan.candidate_count&&
   d.original_lineage_packet&&
   d.original_lineage_packet.original_job_completed===false&&
   d.original_lineage_packet.installation_authorized===false&&
   d.original_lineage_packet.production_changed===false&&
   ['SIGNED_ORIGINAL_LINEAGE_EVIDENCE_INDEPENDENTLY_READ',
    'NO_SIGNED_ORIGINAL_LINEAGE_PACKET',
    'SIGNED_ORIGINAL_LINEAGE_PACKET_SOURCE_DRIFT',
    'SIGNED_ORIGINAL_LINEAGE_READ_UNAVAILABLE'].includes(
     d.original_lineage_packet.status);
 }
 const time=x=>{
  const ms=typeof x==='string'?Date.parse(x):NaN;
  return Number.isFinite(ms)?new Date(ms).toLocaleString([],{
   month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
  }):'No verified timestamp';
 };
 function lane(name,verdict,explanation,nextAction){
  const section=create('section','reality-handoff-health-lane');
  section.append(create('strong','',name+' · '+verdict),
   create('p','',explanation));
  if(nextAction)section.append(create('p','reality-handoff-health-next-action',
   'Next: '+nextAction));
  lanes.append(section);
 }
 function render(d){
  verified=true;card.hidden=false;
  heading.textContent='Reality is tracking your entire signed work loop';
  body.textContent='The scheduled worker and employees can complete evidence work without the original job being finished. This view reconciles those different receipts.';
  key.replaceChildren();lanes.replaceChildren();
  const s=d.repair_scope;
  const approved=s?.state==='SOURCE_RECHECKED';
  const maintenance=d.maintenance_handoffs;
  const blocked=maintenance.filter(x=>
   x.status==='REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION');
  const verifiedRepairs=maintenance.filter(x=>
   x.status==='REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY');
  const actions=[];
  if(approved)actions.push('Reality: run independent frozen tests for repair #'+s.source_ref.split('/').pop());
  if(blocked.length)actions.push('Reality: advance '+blocked.map(x=>'#'+x.source_ref.split('/').pop()).join(', ')+
   ' through case-specific independent tests');
  if(d.original_claim_count===0)actions.push('Reality: qualify a real owner business job before claiming the original loop is complete');
  if(s?.state==='PREPARED')actions.unshift('Owner: review exact source-bound investigation/testing scope');
  for(const text of actions.slice(0,3))key.append(create('p','',text));
  if(!actions.length)key.append(create('p','',
   'No next action inferred. Review independent evidence before declaring completion.'));
  const routes=d.governed_capability_plan;
  lane('Generic capability routing',
   routes.missing_capability_count+
    ' capability adapter(s) not connected',
   'Reality selected '+routes.candidate_count+
    ' source-backed next action(s) from owner work receipts. '+
    'No job identity or customer-specific action was hardcoded into the router.',
   routes.missing_capability_count?
    'Reality must register and independently test the missing handler types':
    'Reality should execute authorized work only through registered handlers');
  for(const step of routes.source_actions.slice(0,8)){
   const route=step.execution_route;
   const display=step.source_ref.length>110?
    step.source_ref.slice(0,110)+'…':step.source_ref;
   const kind=route==='REGISTERED_CAPABILITY_AVAILABLE'?
    'registered executor':
    route==='OWNER_CLICK_REQUIRED'?'owner decision needed':
    'missing executor';
   lane('Next capability · '+kind,
    String(step.capability_key).replaceAll('_',' ').toLowerCase(),
    'Verified work source: '+display+
    ' · Current evidence: '+String(step.evidence_state).replaceAll('_',' ').toLowerCase(),
    route==='OWNER_CLICK_REQUIRED'?
     'Owner reviews the exact scope; Reality cannot self-approve':
    route==='REGISTERED_CAPABILITY_AVAILABLE'?
     'Reality routes this action only after signed executor authority checks':
     'Reality must connect and verify a capability handler before executing');
  }
  lane('Scheduled executor',
   d.worker_status==='SCHEDULED_WORKER_RECENT_WAKE_COMPLETED'?
    'recent real wake recorded':'worker freshness not verified',
   'Last recorded worker cycle: '+time(d.last_worker_seen_at)+
   ' · Shift: '+d.shift_status,
   d.worker_status==='SCHEDULED_WORKER_RECENT_WAKE_COMPLETED'?
    'Move the verified next work order to its executable handler':
    'Diagnose the scheduler or signed worker before retrying');
  lane('Employee discovery and evidence',
   d.employee_independently_verified_evidence_jobs+' evidence jobs independently verified',
   'Employee source evidence is an intermediate deliverable, not customer job settlement.',
   d.employee_evidence_jobs_unsettled?
    'Resolve '+d.employee_evidence_jobs_unsettled+' unfinished evidence jobs':
    'Qualify source-backed customer work from the evidence');
  if(s)lane('Repair #'+s.source_ref.split('/').pop()+' · owner scope',
   s.state==='SOURCE_RECHECKED'?'approved and source rechecked':
   s.state==='APPROVED'?'approved; source recheck pending':
   'owner decision required',
   'Owner approval: '+time(s.owner_approved_at)+
   ' · Source recheck: '+time(s.source_rechecked_at)+
   ' · No fresh independent frozen CI is proven by this handoff.',
   s.state==='SOURCE_RECHECKED'?'Reality must run and verify fresh case-specific frozen CI':
    s.state==='APPROVED'?'Reality must recheck source under existing shift':
     'Owner must review the exact investigation/testing approval');
  else lane('Repair qualification and owner scope','no current exact scope recorded',
   'No source-backed repair decision was verified in this read.',
   'Reality must investigate qualifying evidence; no approval may be inferred');
  for(const x of maintenance){
   const no=x.source_ref.split('/').pop();
   const settled=x.status==='REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY';
   lane('Maintenance #'+no,
    settled?'repair installed and independently verified':
    x.status==='REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION'?
      'blocked before case-specific frozen CI':'independent proof still in progress',
    settled?
      'Verified preview installation: '+time(x.independent_install_verified_at)+
      '. The original customer work is separately unsettled.':
      'Prior handoff phase: '+String(x.older_handoff_phase||'unknown')+
      '. No independently verified install receipt exists for this work.',
    settled?'Reconcile original customer acceptance separately':
      'Reality: '+String(x.next_action||'verify missing source proof').replaceAll('_',' ').toLowerCase());
  }
  const originalPacket=d.original_lineage_packet;
  const packetVerified=originalPacket.status===
   'SIGNED_ORIGINAL_LINEAGE_EVIDENCE_INDEPENDENTLY_READ'&&
   originalPacket.packet_verified===true&&
   originalPacket.customer_original_verified===false;
  lane('Original evidence → customer-work handoff',
   packetVerified?'source claim and maintenance evidence bound':
    'exact source-binding packet not verified',
   packetVerified?
    'Existing PR-review original '+originalPacket.original_work_id+
    ' links to the exact claim '+originalPacket.source_claim_id+
    ' and source '+originalPacket.source_ref+
    '. Evidence receipt: '+originalPacket.evidence_sha256+
    '. No verified customer-original admission or final receipt exists.':
    'Reality has not independently verified a durable source-to-original evidence packet for this shift.',
   packetVerified?
    'Independently identify and authorize the actual customer/business original and acceptance criteria; do not translate a PR-review claim into completion':
    'Restore authenticated source-bound handoff readback and investigate missing evidence');
  lane('Original customer work',
   d.original_independent_final_receipt_count+' final receipts for this shift',
   d.original_claim_count+' original jobs admitted. Evidence work and repair installation do not count as original completion.',
   d.original_claim_count===0?
    'Reality must independently qualify and admit real canonical owner business work before execution':
    'Reality must execute and independently verify each admitted original');
  lane('Continuity Ledger → Universe',
   d.universe_verified_event_rows+' stored owner-bound VERIFIED events',
   'These are stored repair/authority/work events. The readback does not cryptographically reverify the chain or claim a final business outcome.',
   'Carry new independent receipts through governed classification and reconcile the same shift');
  lane('Reality CEO and Past / Present / Future',
   'end-to-end executive decision handoff not attested',
   'A separate owner-scoped Past/Present/Future read-only view exists. This audit found no independent proof here of a CEO decision advancing an original job.',
   'Bind executive priorities to the signed shift and verified next-action receipts; do not let a summary create authority');
  status.textContent='Verified owner read: '+time(d.checked_at)+
   ' · '+verifiedRepairs.length+' independently verified maintenance installation(s) · '+
   blocked.length+' maintenance repair(s) needing new proof. No production change authorized by this read.';
 }
 async function load(){
  if(!signedIn()||reading)return;
  reading=true;refresh.disabled=true;
  try{
   const r=await fetch(URL,{method:'GET',credentials:'same-origin',
    cache:'no-store',signal:AbortSignal.timeout(15000)});
   const d=await r.json().catch(()=>null);
   if(!r.ok||!valid(d))throw Error('OWNER_HANDOFF_EVIDENCE_UNVERIFIED');
   render(d);
  }catch{
   if(!verified){
    card.hidden=false;heading.textContent='Handoff verification unavailable';
    body.textContent='Reality could not independently read the complete signed work ledger. No completion, installation or job approval is inferred.';
    key.replaceChildren();lanes.replaceChildren();
   }
   status.textContent='The handoff readback is unavailable; previous proof may be stale. Refresh when signed in.';
  }finally{refresh.disabled=false;reading=false;}
 }
 refresh.addEventListener('click',()=>{void load()});
 const observer=new MutationObserver(()=>{
  if(signedIn()&&!thread.contains(card))thread.append(card);
  if(!signedIn()){verified=false;card.hidden=true;}
 });
 observer.observe(thread,{childList:true});
 const auth=new MutationObserver(()=>{
  if(signedIn())void load();
  else {verified=false;card.hidden=true;}
 });
 auth.observe(ready,{attributes:true,attributeFilter:['style']});
 if(signedIn())void load();
 window.addEventListener('pageshow',()=>{if(signedIn())void load()});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&signedIn())void load();
 });
 window.setInterval(()=>{
  if(document.visibilityState==='visible'&&signedIn())void load();
 },30000);
})();