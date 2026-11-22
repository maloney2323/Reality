// One read-only temporal interpretation of the EXISTING Final Loop Engine.
// Past is admitted ONLY from independent final receipts; Present from exact
// owner-scoped lifecycle decisions; Future is preparation, never authority.
// This is not a second engine, ledger, scheduler, verifier, or completion gate.
export const REALITY_FINAL_LOOP_TIME_HORIZON_VERSION=
 'reality-final-loop-time-horizon-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const DECISIONS=new Set(['ADVANCE','RECOVER','REFRESH','SUSPEND','SETTLE']);
const hash=/^sha256:[a-f0-9]{64}$/;
const frozen=o=>Object.freeze(o);
function acceptedPast(history){
 if(history?.status!=='INDEPENDENT_HISTORY_VERIFIED'||
  history.receipt_scope!=='INDEPENDENT_SETTLED_FULL_LOOP_ONLY'||
  !Number.isSafeInteger(history.verified_final_loop_receipts)||
  history.verified_final_loop_receipts<0||
  history.verified_final_loop_receipts>30)
  return frozen({status:'INDEPENDENT_PAST_READBACK_REQUIRED',
   independently_verified_full_loop_receipts:null});
 return frozen({
  status:'INDEPENDENT_PAST_VERIFIED',
  independently_verified_full_loop_receipts:history.verified_final_loop_receipts,
  most_recent_verified_at:history.most_recent_verified_at||null,
  source:'EXISTING_OWNER_VERIFIED_FINAL_RECEIPT_LEDGER'
 });
}
function safeUnbound(past){
 return frozen({
  schema:REALITY_FINAL_LOOP_TIME_HORIZON_VERSION,
  status:'NO_SIGNED_FINAL_LOOP_ENGINE_READBACK',
  past,present:frozen({status:'CURRENT_ENGINE_STATE_UNVERIFIED',obligations:[]}),
  future:frozen({status:'FUTURE_ENGINE_DECISIONS_NOT_VERIFIED',preparations:[]}),
  model_output_authorizes_nothing:true,
  execution_authorized:false,repair_authorized:false,
  new_work_authorized:false,installation_authorized:false,
  settlement_committed:false,original_job_completed:false,
  shift_completed:false,production_changed:false,
  universe_return_independently_verified:false
 });
}

// Use an independently authenticated historical receipt projection from
// Reality's existing Past endpoint, never an LLM's remembered completion.
// An engine decision *requesting* SETTLE is still PRESENT, not PAST.
export function projectRealityFinalLoopTimeHorizon({
 engine=null,independentHistory=null
}={}){
 const past=acceptedPast(independentHistory);
 if(engine===null)return safeUnbound(past);
 if(!UUID.test(engine?.owner_id||'')||!UUID.test(engine?.shift_id||'')||
   !Array.isArray(engine.decisions)||engine.decisions.length>4||
   engine.original_job_completed!==false||
   engine.shift_completed!==false||
   engine.installation_authorized!==false||
   engine.production_changed!==false||
   (engine.schema!=='reality-final-loop-engine-v1'&&
    engine.schema!=='reality-final-loop-signed-worker-bridge-v1'&&
    engine.schema!=='reality-final-loop-owner-readback-v1'))
  return safeUnbound(past);
 const seen=new Set();
 const obligations=[];
 for(const item of engine.decisions){
  const id=item?.original_work_id;
  const sourceOnly=id===null&&(item?.decision==='SUSPEND'||
   item?.decision==='REFRESH');
  const identity=sourceOnly?item?.source_ref:id;
  if((!WORK.test(id||'')&&!sourceOnly)||seen.has(identity)||
   !DECISIONS.has(item?.decision)||
   typeof item?.source_ref!=='string'||
   !/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/.test(item.source_ref)||
   !/^[A-Z][A-Z0-9_]{6,130}$/.test(item.next_governed_action||'')||
   typeof item.reason!=='string'||
   item.transition_committed!==false)
    return safeUnbound(past);
  seen.add(identity);
  obligations.push(frozen({
   original_work_id:id,source_ref:item.source_ref,
   source_admission_verified:!sourceOnly,
   decision:item.decision,
   next_governed_action:item.next_governed_action,
   reason:item.reason,
   // This is operational intent, not the independently durable effect.
   action_executed:false,
   settlement_committed:false,
   prediction_not_evidence:true
  }));
 }
 const present=frozen({
  status:obligations.length?
   engine.status==='FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'?
    'CURRENT_VERIFIED_SHIFT_ACCEPTANCE_PENDING':
    'CURRENT_VERIFIED_SHIFT_DECISION_PROJECTION':
   'CURRENT_SHIFT_HAS_NO_ADMITTED_ORIGINAL_DECISIONS',
  owner_id:engine.owner_id,shift_id:engine.shift_id,
  continuity_root_id:/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
   engine.continuity_root_id||'')?engine.continuity_root_id:null,
  plan_fingerprint:hash.test(engine.plan_fingerprint||'')?
   engine.plan_fingerprint:null,
  frozen_shift_scope_sha256:hash.test(engine.frozen_shift_scope_sha256||'')?
   engine.frozen_shift_scope_sha256:null,
  revision:Number.isSafeInteger(engine.revision)&&engine.revision>0?
   engine.revision:null,
  missing_proofs:Array.isArray(engine.missing_proofs)?
   Object.freeze([...engine.missing_proofs]):null,
  continuity_head_sha256:hash.test(engine.continuity_head_sha256||'')?
   engine.continuity_head_sha256:null,
  obligations:frozen(obligations),
  blocked_or_recheck_count:obligations.filter(x=>
   x.decision==='SUSPEND'||x.decision==='REFRESH').length,
  recovery_candidate_count:obligations.filter(x=>
   x.decision==='RECOVER').length,
  uncommitted_settlement_requests:obligations.filter(x=>
   x.decision==='SETTLE').length
 });
 const future=frozen({
  status:'GOVERNED_PREPARATIONS_NOT_AUTHORIZED_EXECUTION',
  preparations:frozen(obligations.map(item=>frozen({
   original_work_id:item.original_work_id,
   source_ref:item.source_ref,
   proposed_next_action:item.next_governed_action,
   basis_decision:item.decision,
   confidence:'NOT_INDEPENDENT_OUTCOME_PROOF',
   owner_authorization_required_when_applicable:true,
   automatically_executable:false,
   expected_outcome_verified:false
  }))),
  new_work_discovered_by_projection:0,
  automatically_authorized_jobs:0
 });
 return frozen({
  schema:REALITY_FINAL_LOOP_TIME_HORIZON_VERSION,
  status:'FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY',
  past,present,future,
  source:'SAME_FINAL_LOOP_CONTROL_AND_EXISTING_PAST_LEDGER',
  existing_universe_reconciliation_required:true,
  model_output_authorizes_nothing:true,
  execution_authorized:false,repair_authorized:false,
  new_work_authorized:false,installation_authorized:false,
  settlement_committed:false,original_job_completed:false,
  shift_completed:false,production_changed:false,
  universe_return_independently_verified:false
 });
}
