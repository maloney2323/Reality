// Reality executive operational readout of the EXISTING Final Loop Engine.
// This is a view for the owner and CEO-like prioritization, not a replacement
// for a separately installed CEO implementation or a second control plane.
// No model output, future prediction, or role recommendation can grant authority.
export const REALITY_FINAL_LOOP_EXECUTIVE_BRIEF_VERSION=
 'reality-final-loop-executive-brief-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const STATES=new Set(['ADVANCE','RECOVER','REFRESH','SUSPEND','SETTLE']);
const priority=Object.freeze({
 SUSPEND:0,REFRESH:1,RECOVER:2,SETTLE:3,ADVANCE:4
});
const wrap=(status,fields={})=>Object.freeze({
 schema:REALITY_FINAL_LOOP_EXECUTIVE_BRIEF_VERSION,
 status,...fields,
 read_only:true,model_prediction_is_not_authority:true,
 decision_support_only:true,execution_authorized:false,
 new_job_admitted:false,owner_approval_recorded:false,
 installer_authorized:false,original_job_completed:false,
 shift_completed:false,production_changed:false
});
export function projectRealityFinalLoopExecutiveBrief({
 timeHorizon,supervisor=null
}={}){
 if(timeHorizon?.schema!=='reality-final-loop-time-horizon-v1'||
    timeHorizon.status!=='FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY'||
    timeHorizon.execution_authorized!==false||
    timeHorizon.installation_authorized!==false||
    timeHorizon.original_job_completed!==false||
    timeHorizon.shift_completed!==false||
    timeHorizon.future?.status!==
     'GOVERNED_PREPARATIONS_NOT_AUTHORIZED_EXECUTION'||
    !Array.isArray(timeHorizon.future.preparations)||
    !Array.isArray(timeHorizon.present?.obligations)||
    !UUID.test(timeHorizon.present.owner_id||'')||
    !UUID.test(timeHorizon.present.shift_id||''))
  return wrap('EXECUTIVE_FINAL_LOOP_EVIDENCE_NOT_CONNECTED');
 const p=timeHorizon.present;
 const allowedSupervisor=supervisor===null||(
  supervisor.version==='reality-automatic-shift-supervisor-v1'&&
  supervisor.status==='AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY'&&
  supervisor.owner_id===p.owner_id&&supervisor.shift_id===p.shift_id&&
  supervisor.read_only===true&&
  supervisor.install_approval_authorized_by_triage===false&&
  supervisor.shift_completed_by_triage===false&&
  supervisor.production_changed===false&&
  Array.isArray(supervisor.jobs)&&supervisor.jobs.length<=4
 );
 if(!allowedSupervisor)
  return wrap('EXECUTIVE_SUPERVISOR_SCOPE_CONTRADICTS_FINAL_LOOP');
 const sources=new Set(),items=[];
 for(const item of p.obligations){
  if(!STATES.has(item?.decision)||
     typeof item?.source_ref!=='string'||sources.has(item.source_ref)||
     item.action_executed!==false||
     item.settlement_committed!==false||
     typeof item?.next_governed_action!=='string'||
     item.next_governed_action.length>140)
   return wrap('EXECUTIVE_FINAL_LOOP_OBLIGATION_UNVERIFIED');
  sources.add(item.source_ref);
  // A source-only observation cannot be recast as an executable original.
  if(item.original_work_id!==null&&!WORK.test(item.original_work_id))
   return wrap('EXECUTIVE_ORIGINAL_IDENTITY_UNVERIFIED');
  if(supervisor!==null&&!supervisor.jobs.some(s=>
    s.source_ref===item.source_ref&&
    (s.original_work_id||null)===(item.original_work_id||null)&&
    s.creates_job===false&&s.approved_installation===false))
   return wrap('EXECUTIVE_SUPERVISOR_SOURCE_MISMATCH');
  items.push(Object.freeze({
   source_ref:item.source_ref,original_work_id:item.original_work_id,
   priority_band:priority[item.decision],
   engine_decision:item.decision,
   required_next_evidence_action:item.next_governed_action,
   independent_original_acceptance_pending:
    item.source_admission_verified===false||
    p.status==='CURRENT_VERIFIED_SHIFT_ACCEPTANCE_PENDING',
   status:'RECOMMENDED_ATTENTION_NOT_AUTHORIZED_EXECUTION',
   approval_granted:false,execution_authorized:false
  }));
 }
 if(timeHorizon.future.preparations.length!==items.length)
  return wrap('EXECUTIVE_FUTURE_SCOPE_CONTRADICTS_PRESENT');
 for(const future of timeHorizon.future.preparations){
  if(future?.automatically_executable!==false||
     future?.expected_outcome_verified!==false||
     !items.some(x=>x.source_ref===future.source_ref&&
      x.original_work_id===future.original_work_id&&
      x.engine_decision===future.basis_decision&&
      x.required_next_evidence_action===future.proposed_next_action))
   return wrap('EXECUTIVE_PREDICTION_CANNOT_AUTHORIZE_NEW_WORK');
 }
 items.sort((a,b)=>a.priority_band-b.priority_band||
  a.source_ref.localeCompare(b.source_ref));
 const primary=items[0]||null;
 const past=timeHorizon.past;
 return wrap('EXECUTIVE_SIGNED_SHIFT_PRIORITIES_READY',{
  owner_id:p.owner_id,shift_id:p.shift_id,
  priority_count:items.length,
  priority_items:Object.freeze(items),
  primary_attention:primary,
  past_independent_receipt_count:
   past?.status==='INDEPENDENT_PAST_VERIFIED'?
    past.independently_verified_full_loop_receipts:null,
  historical_receipt_proof_available:
   past?.status==='INDEPENDENT_PAST_VERIFIED',
  future_preparation_count:timeHorizon.future.preparations.length,
  existing_supervisor_cross_checked:supervisor!==null,
  next_executive_message:primary===null?
   'No independently eligible active original in this readback.':
   primary.independent_original_acceptance_pending?
    'Original customer-goal acceptance needs independent verification before execution.':
   primary.engine_decision==='SUSPEND'?
    'One original remains suspended. Reconcile its independent blocker before authorizing effects.':
   primary.engine_decision==='REFRESH'?
    'Source or proof is stale. Reobserve this original before any governed transition.':
   primary.engine_decision==='RECOVER'?
    'An independently attested recovery candidate needs exact governed scope.':
   primary.engine_decision==='SETTLE'?
    'An independently verified settlement request still needs durable atomic readback.':
   'One exact original is eligible for a separately authorized governed continuation.'
 });
}
