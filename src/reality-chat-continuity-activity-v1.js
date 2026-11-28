// A presentation of existing authenticated evidence, not a new work engine.
// Current proof, recorded historical events and model proposals are separate.
import {createHash} from 'node:crypto';
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
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
const digest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// The authenticated canonical guard supplies the exact current root and head.
// A historical signal or worker wake is not itself technical proof.
export function projectCurrentTerminalEvidence(row,ob,ownerId){
 const p=row?.payload,proof=p?.technical_provider_proof,t=p?.terminal_recovery_history,prov=row?.provenance,sp=prov?.continuity_spine;
 if(!UUID.test(row?.event_id||'')||!UUID.test(row?.parent_event_id||'')||
  row.continuity_root_id!==ob?.continuity_root_id||'sha256:'+row.lineage_hash!==ob?.continuity_head_sha256||
  row.entity_type!=='reality_final_loop_terminal_technical_observation_v1'||row.event_kind!=='OBSERVATION'||
  row.epistemic_status!=='OBSERVED'||!date(row.assertion_time)||!p||
  row.content_hash!==digest(p)||p.owner_id!==ownerId||p.shift_id!==ob.shift_id||
  p.original_work_id!==ob.original_work_id||p.source_ref!==ob.source_ref||
  p.qualifier_receipt_sha256!==ob.qualifier_receipt_sha256||
  !Number.isSafeInteger(p.prior_revision)||p.prior_revision+1!==ob.continuity_revision||
  !HASH.test(p.prior_head_sha256||'')||sp?.source_event_id!==row.parent_event_id||
  'sha256:'+sp?.prior_lineage_hash!==p.prior_head_sha256||
  prov?.source!=='SIGNED_TERMINAL_TECHNICAL_CI_READBACK'||prov.principal_id!==ownerId||
  !UUID.test(prov.worker_run_id||'')||
  !HASH.test(p.review_receipt_sha256||'')||!HASH.test(p.investigation_receipt_sha256||'')||
  p.technical_evidence_only!==true||p.previous_attempt_budget_preserved!==true||
  p.replay_authorized!==false||p.new_attempt_authorized!==false||p.original_job_completed!==false||
  p.original_business_red_verified!==false||p.execution_authorized!==false||
  p.installation_authorized!==false||p.production_changed!==false||
  t?.original_work_id!==ob.original_work_id||t.remaining_attempts!==0||t.new_attempt_authorized!==false||t.replay_permitted!==false||
  proof?.status!=='RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED'||
  proof.owner_id!==ownerId||proof.shift_id!==ob.shift_id||proof.obligation_id!==ob.original_work_id||
  proof.source_ref!==ob.source_ref||proof.qualifier_receipt_sha256!==ob.qualifier_receipt_sha256||
  proof.independent_technical_ci_verified!==true||proof.frozen_technical_red_verified!==true||
  proof.independent_ci_provider_observation!==true||proof.original_business_case_red_verified!==false||
  proof.original_job_completed!==false||proof.execution_authorized!==false||proof.production_changed!==false||
  proof.previous_attempt_budget_preserved!==true||proof.new_attempt_authorized!==false||
  proof.repeat_prior_ci_dispatch_permitted!==false||!HASH.test(proof.github_artifact_digest||''))return null;
 return {id:row.event_id,label:'Technical evidence accepted',state:'verified',
  detail:'Independent technical test evidence returned to the same original work. Continuity advanced from revision '+p.prior_revision+' to '+ob.continuity_revision+'. No repair attempt was added; original work remains open.',
  receipt:'sha256:'+row.content_hash,at:row.assertion_time,worker_run_id:prov.worker_run_id,
  investigation_receipt:p.investigation_receipt_sha256,review_receipt:p.review_receipt_sha256,
  prior_revision:p.prior_revision,revision:ob.continuity_revision,remaining_attempts:t.remaining_attempts,
  attempt_count:t.attempt_count,next_action:human(p.next_action)};
}
export function projectChatContinuityActivity({current,incidentReadback,finalReadback,historyByShift={},terminalRows=[],ownerId}={}){
 if(!current||!Array.isArray(current.observations)||!date(current.observed_at))return null;
 const incidentValid=incidentReadback?.status==='OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY'&&
  incidentReadback.owner_id===ownerId&&incidentReadback.owner_scope_verified===true&&
  incidentReadback.read_only===true&&incidentReadback.execution_authorized===false&&
  incidentReadback.installation_authorized===false&&incidentReadback.production_changed===false&&
  Array.isArray(incidentReadback.items)&&incidentReadback.items.length<=8;
 const finalValid=finalReadback?.status==='INDEPENDENT_FINAL_RECEIPT_READBACK'&&
  finalReadback.does_not_authorize_actions===true&&Array.isArray(finalReadback.receipts)&&finalReadback.receipts.length<=12;
 const receipts=finalValid?finalReadback.receipts.filter(r=>r.status==='FULL_LOOP_INDEPENDENTLY_VERIFIED'&&
  /^work:[a-f0-9]{32}$/.test(r.original_work_id||'')&&UUID.test(r.settlement_event_id||'')&&
  /^[a-f0-9]{64}$/.test(r.artifact_sha256||'')&&/^[a-f0-9]{40}$/.test(r.installed_commit_sha||'')&&
  HASH.test(r.verifier_artifact_digest||'')&&Number.isSafeInteger(r.provider_run_id)&&r.provider_run_id>0&&
  r.production_changed===false).map(r=>({original_work_id:r.original_work_id,
   settlement_event_id:r.settlement_event_id,installed_commit_sha:r.installed_commit_sha,
   verifier_artifact_digest:r.verifier_artifact_digest})):[]; 
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
  const terminal=Array.isArray(terminalRows)&&terminalRows.length<=12?terminalRows.map(row=>projectCurrentTerminalEvidence(row,ob,ownerId)).find(Boolean):null;
  const inv=ob.verified_investigation,review=ob.verified_independent_review;
  const incident=incidentValid?incidentReadback.items.find(i=>i.shift_id===ob.shift_id&&
   HASH.test(i.investigation_receipt_sha256||'')&&
   ((inv&&i.incident_id===inv.incident_id&&i.investigation_receipt_sha256===inv.investigation_receipt_sha256)||
    (terminal&&terminal.investigation_receipt===i.investigation_receipt_sha256)||
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
    e.worker_status==='FAILED'?'Signed worker failure recorded at '+(human(e.worker_stage)||'unknown stage')+'. Exact cause requires investigation.':
    e.state==='SHADOW_OBSERVED'?'Signal observed; independent business outcome is not implied.':
    e.worker_status==='COMPLETED'?'Worker ended without an observed event receipt. Reconciliation required; do not replay.':
    e.worker_status==='STARTED'?'Signed worker running · '+human(e.worker_stage):
    'Awaiting a verified worker claim.';
   timeline.push({id:e.event_id,label:names[e.signal_kind]||human(e.signal_kind),state,detail,
    receipt:isInv?inv.investigation_receipt_sha256:isReview?review.receipt_sha256:e.source_receipt_sha256,
    at:date(e.observed_at),worker_run_id:e.governed_wake_worker_run_id||null,
    employee:isInv?bounded(incident?.assigned_employee,120):isReview?bounded(incident?.independent_reviewer,120):null});
  }
  if(incident){const proposalStep={id:incident.incident_id+':proposal',label:'Investigation findings and proposed correction',
   state:'proposal',detail:'Recorded employee proposal — not independently verified root cause or permission to install.',
   investigator:bounded(incident.assigned_employee,120),reviewer:bounded(incident.independent_reviewer,120),
   diagnosis:bounded(incident.diagnosis),proposal:bounded(incident.proposed_upgrade),
   test:bounded(incident.independent_test_requirement),limitations:bounded(incident.limitations),
   receipt:incident.investigation_receipt_sha256,at:null};
   const index=timeline.findIndex(s=>s.id===inv?.investigation_event_id);
   if(index>=0)timeline.splice(index+1,0,proposalStep);else timeline.push(proposalStep);
  }
  if(terminal){
   // This exact accepted technical return binds the prior investigation and review receipts.
   if(incident){
    timeline.push({id:terminal.id+':investigation',label:'Investigated blocker',state:'verified',detail:'Recorded investigation linked to the accepted recovery evidence. The proposed repair is not installed by this receipt.',receipt:terminal.investigation_receipt,at:null,employee:bounded(incident.assigned_employee,120)});
    timeline.push({id:terminal.id+':review',label:'Independently reviewed investigation',state:'verified',detail:'Separate reviewer receipt linked to the accepted recovery evidence. Original business outcome remains open.',receipt:terminal.review_receipt,at:null,employee:bounded(incident.independent_reviewer,120)});
   }
   timeline.push(terminal);
  }
  const originalComplete=ob.independent_original_outcome_verified===true&&ob.universe_return_verified===true;
  const gates=ob.unresolved_proof_gates.filter(x=>typeof x==='string').slice(0,24);
  return {original_work_id:ob.original_work_id,source_ref:bounded(ob.source_ref,2048),shift_id:ob.shift_id,
   revision:ob.continuity_revision,head:ob.continuity_head_sha256,shift_status:human(ob.shift_status),
   original_complete:originalComplete,next_action:human(ob.operational_next_action),gates:gates.map(human),
   history_available:validHistory,proposal_available:!!incident,steps:timeline,
   terminal_evidence:terminal?{revision:terminal.revision,prior_revision:terminal.prior_revision,remaining_attempts:terminal.remaining_attempts,attempt_count:terminal.attempt_count,receipt:terminal.receipt,at:terminal.at,next_action:terminal.next_action}:null,
   active_release:ob.active_release_observation?{sha:ob.active_release_observation.release_sha,
    observed_at:ob.active_release_observation.alias_observed_at}:null};
 });
 return {status:'OWNER_CHAT_CONTINUITY_ACTIVITY_READ_ONLY',observed_at:current.observed_at,
  active_shift_count:current.active_shift_count,unverified_guard_count:current.unverified_guard_count,
  partial:!incidentValid||!finalValid||current.unverified_guard_count>0||obligations.some(o=>!o.history_available),
  obligations,final_receipts:receipts,read_only:true,execution_authorized:false,installation_authorized:false,production_changed:false};
}
