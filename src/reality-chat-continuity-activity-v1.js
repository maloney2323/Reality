// A presentation of existing authenticated evidence, not a new work engine.
// Current proof, recorded historical events and model proposals are separate.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const bounded=(v,n=1600)=>typeof v==='string'?v.slice(0,n):'';
const date=v=>Number.isFinite(Date.parse(v||''))?v:null;
const human=v=>bounded(v,160).replace(/_/g,' ').toLowerCase();
const names={
 QUALIFIER_PROOF_CHANGED:'Source qualification',
 INDEPENDENT_FROZEN_CI_RECEIPT:'Independent frozen test',
 VERIFIED_SUSPENSION_INVESTIGATION:'Blocker investigation',
 VERIFIED_INVESTIGATION_REVIEW:'Independent investigation review',
 VERIFIED_REVIEW_TECHNICAL_EVIDENCE:'Technical evidence return'
};
export function projectChatContinuityActivity({current,incidentReadback,historyByShift={},ownerId}={}){
 if(!current||!Array.isArray(current.observations)||!date(current.observed_at))return null;
 const incidentValid=incidentReadback?.status==='OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY'&&
  incidentReadback.owner_id===ownerId&&incidentReadback.owner_scope_verified===true&&
  incidentReadback.read_only===true&&incidentReadback.execution_authorized===false&&
  incidentReadback.installation_authorized===false&&incidentReadback.production_changed===false&&
  Array.isArray(incidentReadback.items)&&incidentReadback.items.length<=8;
 const obligations=current.observations.slice(0,12).map(entry=>{
  const ob=entry.current_operational_facts;
  const recent=ob.current_events.filter(e=>UUID.test(e?.event_id||'')&&HASH.test(e.source_receipt_sha256||''));
  const shadow=historyByShift[ob.shift_id];
  const validHistory=shadow?.status==='FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY'&&
   shadow.shift_id===ob.shift_id&&shadow.execution_authorized===false&&shadow.installation_authorized===false&&
   shadow.production_changed===false&&Array.isArray(shadow.events)&&shadow.events.length<=128;
  const past=validHistory?shadow.events.filter(e=>e.original_work_id===ob.original_work_id&&e.source_ref===ob.source_ref&&
   UUID.test(e.event_id||'')&&HASH.test(e.source_receipt_sha256||'')&&
   Number.isSafeInteger(e.continuity_revision)&&e.continuity_revision<ob.continuity_revision&&
   ['SHADOW_OBSERVED','SHADOW_STALE'].includes(e.event_state)).slice(-12):[];
  const timeline=past.map(e=>({id:e.event_id,label:names[e.event_kind]||human(e.event_kind),
   state:'historical',detail:'Prior revision '+e.continuity_revision+' · '+(e.event_state==='SHADOW_STALE'?'signal superseded':'signal observed')+
    '. Historical signal is not final outcome proof.',receipt:e.source_receipt_sha256,at:null}));
  const inv=ob.verified_investigation,review=ob.verified_independent_review;
  const incident=incidentValid?incidentReadback.items.find(i=>i.shift_id===ob.shift_id&&
   HASH.test(i.investigation_receipt_sha256||'')&&
   ((inv&&i.incident_id===inv.incident_id&&i.investigation_receipt_sha256===inv.investigation_receipt_sha256)||
    past.some(e=>e.event_kind==='VERIFIED_INVESTIGATION_REVIEW'&&e.source_receipt_sha256===i.investigation_receipt_sha256))):null;
  if(inv)timeline.push({id:inv.investigation_event_id+':suspension',label:'Original obligation suspended',
   state:'blocked',detail:'Required proof is missing. No replay or additional recovery attempt is authorized.',
   receipt:inv.suspension_receipt_sha256,at:date(incident?.first_detected_at)});
  for(const e of [...recent].reverse()){
   const isInv=inv?.investigation_event_id===e.event_id;
   const isReview=review?.review_event_id===e.event_id;
   const verified=isInv||isReview;
   const state=verified?'verified':e.worker_status==='FAILED'?'blocked':
    e.state==='SHADOW_STALE'?'historical':e.state==='SHADOW_OBSERVED'?'recorded':
    e.worker_status==='STARTED'?'running':e.worker_status==='COMPLETED'?'blocked':'pending';
   const detail=verified?(isInv?'Signed investigation receipt verified. The diagnosis and proposed repair remain advisory.':
    'Separate reviewer receipt verified. Repair and original outcome still unproven.'):
    e.worker_status==='FAILED'?'Signed worker failure recorded. Exact cause requires investigation.':
    e.state==='SHADOW_OBSERVED'?'Signal observed; independent business outcome is not implied.':
    e.worker_status==='COMPLETED'?'Worker ended without an observed event receipt. Reconciliation required; do not replay.':
    e.worker_status==='STARTED'?'Signed worker running · '+human(e.worker_stage):
    'Awaiting a verified worker claim.';
   timeline.push({id:e.event_id,label:names[e.signal_kind]||human(e.signal_kind),state,detail,
    receipt:isInv?inv.investigation_receipt_sha256:isReview?review.receipt_sha256:e.source_receipt_sha256,
    at:date(e.observed_at),worker_run_id:e.governed_wake_worker_run_id||null});
  }
  if(incident)timeline.push({id:incident.incident_id+':proposal',label:'Investigation findings and proposed correction',
   state:'proposal',detail:'Recorded employee proposal — not independently verified root cause or permission to install.',
   investigator:bounded(incident.assigned_employee,120),reviewer:bounded(incident.independent_reviewer,120),
   diagnosis:bounded(incident.diagnosis),proposal:bounded(incident.proposed_upgrade),
   test:bounded(incident.independent_test_requirement),limitations:bounded(incident.limitations),
   receipt:incident.investigation_receipt_sha256,at:null});
  const originalComplete=ob.independent_original_outcome_verified===true&&ob.universe_return_verified===true;
  const gates=ob.unresolved_proof_gates.filter(x=>typeof x==='string').slice(0,24);
  return {original_work_id:ob.original_work_id,source_ref:bounded(ob.source_ref,2048),shift_id:ob.shift_id,
   revision:ob.continuity_revision,head:ob.continuity_head_sha256,shift_status:human(ob.shift_status),
   original_complete:originalComplete,next_action:human(ob.operational_next_action),gates:gates.map(human),
   history_available:validHistory,proposal_available:!!incident,steps:timeline,
   active_release:ob.active_release_observation?{sha:ob.active_release_observation.release_sha,
    observed_at:ob.active_release_observation.alias_observed_at}:null};
 });
 return {status:'OWNER_CHAT_CONTINUITY_ACTIVITY_READ_ONLY',observed_at:current.observed_at,
  active_shift_count:current.active_shift_count,unverified_guard_count:current.unverified_guard_count,
  partial:!incidentValid||current.unverified_guard_count>0||obligations.some(o=>!o.history_available),
  obligations,read_only:true,execution_authorized:false,installation_authorized:false,production_changed:false};
}
