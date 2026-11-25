// Shared Universe <-> existing Final Loop read-model adapter.
// The CANONICAL signed shift and independent native+Universe settlement RPC
// remain the only sources of operational proof. This module never authorizes,
// schedules, executes, modifies ledgers or promotes an AI's assertion to truth.
export const FINAL_LOOP_UNIVERSE_FEEDBACK_VERSION=
 'reality-final-loop-universe-feedback-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const COMMENT=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*#issuecomment-[1-9]\d*$/;
const ACTION=/^[A-Z][A-Z0-9_]{6,130}$/;
const base=Object.freeze({
 schema:FINAL_LOOP_UNIVERSE_FEEDBACK_VERSION,
 read_only:true,universe_is_not_a_second_truth_ledger:true,
 future_is_not_execution_authority:true,action_dispatched:false,
 execution_authorized:false,owner_approval_granted:false,
 model_certifies_nothing:true,original_job_completed:false,
 shift_completed:false,production_changed:false
});
const output=(status,more={})=>Object.freeze({...base,status,...more});
const frozen=a=>Object.freeze(a.map(x=>Object.freeze(x)));
const identity=view=>{
 const c=view?.canonical_continuity_handoff;
 const t=view?.time_horizon;
 const p=t?.present;
 if(!['FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY',
       'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'].includes(view?.status)||
    view.read_only!==true||
    view.original_job_completed!==false||
    !UUID.test(view.owner_id||'')||!UUID.test(view.shift_id||'')||
    c?.status!=='CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS'||
    c.canonical_handoff_verified!==true||
    c.read_only!==true||
    !UUID.test(c.continuity_root_id||'')||
    !HASH.test(c.continuity_head_sha256||'')||
    !Number.isSafeInteger(c.revision)||c.revision<1||
    c.original_job_completed!==false||
    t?.status!=='FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY'||
    t.execution_authorized!==false||
    t.original_job_completed!==false||
    p?.owner_id!==view.owner_id||p?.shift_id!==view.shift_id||
    p.continuity_root_id!==c.continuity_root_id||
    p.continuity_head_sha256!==c.continuity_head_sha256||
    p.revision!==c.revision||
    !Array.isArray(p.obligations)||p.obligations.length>8||
    (view.continuity_head_sha256!==undefined&&
     view.continuity_head_sha256!==c.continuity_head_sha256))
  return null;
 const unique=new Set();
 for(const x of p.obligations){
  if(!REF.test(x?.source_ref||'')||
     !(x.original_work_id===null||WORK.test(x.original_work_id||''))||
     typeof x?.decision!=='string'||!['ADVANCE','RECOVER','REFRESH',
      'SUSPEND','SETTLE'].includes(x.decision)||
     !ACTION.test(x.next_governed_action||'')||
     x.action_executed!==false||x.settlement_committed!==false||
     unique.has(x.source_ref))return null;
  unique.add(x.source_ref);
 }
 return {owner_id:view.owner_id,shift_id:view.shift_id,
  continuity_root_id:c.continuity_root_id,
  continuity_head_sha256:c.continuity_head_sha256,
  revision:c.revision,obligations:p.obligations};
};
export function projectFinalLoopUniverseFeedback({
 canonicalView,parentOutcomes,recoveryGuidance=null,
 sharedContinuityGuard=null
}={}){
 const i=identity(canonicalView);

 if(sharedContinuityGuard!==null){
  const g=sharedContinuityGuard;
  if(g.status!=='FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
     g.read_only!==true||g.execution_authorized!==false||
     g.transition_committed!==false||g.original_job_completed!==false||
     g.owner_id!==i?.owner_id||g.shift_id!==i?.shift_id||
     g.continuity_root_id!==i?.continuity_root_id||
     g.continuity_head_sha256!==i?.continuity_head_sha256||
     g.revision!==i?.revision||!HASH.test(g.observation_sha256||'')||
     !Array.isArray(g.handoffs)||g.handoffs.length!==i?.obligations.length||
     i.obligations.some(o=>g.handoffs.filter(h=>
       h.source_ref===o.source_ref&&
       h.original_work_id===o.original_work_id&&
       h.continuity_identity_verified===true&&
       h.execution_authorized===false).length!==1))
   return output('FINAL_LOOP_UNIVERSE_SHARED_CONTINUITY_PROOF_MISMATCH');
 }

 if(!i)return output('FINAL_LOOP_UNIVERSE_CANONICAL_CONTINUITY_UNVERIFIED');
 if(!['FINAL_LOOP_OWNER_PARENT_OUTCOMES_READ_ONLY',
        'FINAL_LOOP_SAME_OWNER_PARENT_OUTCOMES_INDEPENDENTLY_READ']
    .includes(parentOutcomes?.status)||
    parentOutcomes.owner_id!==i.owner_id||
    parentOutcomes.shift_id!==i.shift_id||
    parentOutcomes.read_only!==true||
    parentOutcomes.owner_scope_verified!==true||
    parentOutcomes.execution_authorized!==false||
    !Array.isArray(parentOutcomes.outcomes)||
    parentOutcomes.outcomes.length>16||
    parentOutcomes.parent_delivery_count!==parentOutcomes.outcomes.length||
    !Number.isSafeInteger(parentOutcomes.verified_parent_count)||
    !Number.isSafeInteger(parentOutcomes.unfinished_parent_count)||
    parentOutcomes.verified_parent_count+
      parentOutcomes.unfinished_parent_count!==parentOutcomes.outcomes.length)
  return output('FINAL_LOOP_UNIVERSE_INDEPENDENT_OUTCOME_READBACK_REQUIRED');

 if(sharedContinuityGuard!==null){
  const g=sharedContinuityGuard;
  const gSettled=g.handoffs.filter(h=>h.universe_return_verified===true)
   .map(h=>h.original_work_id+'|'+h.source_ref).sort();
  const oSettled=parentOutcomes.outcomes.filter(o=>
   o.status==='INDEPENDENTLY_SETTLED_UNIVERSE_PAST'&&
   o.independent_universe_verified===true&&
   o.original_job_completed===true)
   .map(o=>o.original_work_id+'|'+o.source_ref).sort();
  if(JSON.stringify(gSettled)!==JSON.stringify(oSettled))
    return output('FINAL_LOOP_UNIVERSE_INDEPENDENT_SETTLEMENT_NOT_RECONCILED');
 }

 const byWork=new Map(),seen=new Set();
 for(const p of parentOutcomes.outcomes){
  const matched=i.obligations.find(o=>
   o.original_work_id===p?.original_work_id&&
   o.source_ref===p.source_ref);
  const settled=p?.status==='INDEPENDENTLY_SETTLED_UNIVERSE_PAST';
  if(!matched||!WORK.test(p.original_work_id||'')||
     !REF.test(p.source_ref||'')||seen.has(p.original_work_id)||
     !HASH.test(p.source_manifest_sha256||'')||
     p.independent_universe_verified!==settled||
     p.original_job_completed!==settled||
     (settled&&![
       UUID.test(p.verified_universe_outcome_event_id||''),
       UUID.test(p.parent_settlement_receipt_id||''),
       COMMENT.test(p.verified_provider_comment_url||'')
      ].every(Boolean))||
     (!settled&&(p.status!=='PARENT_DELIVERY_UNFINISHED_PRESENT'||
      p.verified_provider_comment_url!=null||
      p.verified_universe_outcome_event_id!=null||
      p.parent_settlement_receipt_id!=null)))
   return output('FINAL_LOOP_UNIVERSE_OUTCOME_SCOPE_OR_PROOF_CONFLICT');
  seen.add(p.original_work_id);
  byWork.set(p.original_work_id,p);
 }
 if([...byWork.values()].filter(x=>x.original_job_completed).length!==
    parentOutcomes.verified_parent_count)
  return output('FINAL_LOOP_UNIVERSE_SETTLEMENT_COUNT_CONFLICT');
 let recovery=null;
 if(recoveryGuidance?.status===
    'FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY'&&
    recoveryGuidance.owner_id===i.owner_id&&
    recoveryGuidance.shift_id===i.shift_id&&
    recoveryGuidance.continuity_head_sha256===i.continuity_head_sha256&&
    recoveryGuidance.read_only===true&&
    recoveryGuidance.recovery_verified===false&&
    recoveryGuidance.original_job_completed===false&&
    recoveryGuidance.future?.automatically_executable===false&&
    ACTION.test(recoveryGuidance.future?.next_governed_action||'')&&
    i.obligations.some(o=>o.original_work_id===recoveryGuidance.original_work_id&&
      o.source_ref===recoveryGuidance.source_ref))
  recovery={original_work_id:recoveryGuidance.original_work_id,
   source_ref:recoveryGuidance.source_ref,
   next_governed_action:recoveryGuidance.future.next_governed_action};
 const pending=frozen(i.obligations.filter(o=>
  !byWork.get(o.original_work_id)?.original_job_completed).map(o=>({
  original_work_id:o.original_work_id,source_ref:o.source_ref,
  status:o.original_work_id?'ORIGINAL_WORK_STILL_OPEN':
   'SOURCE_NOT_INDEPENDENTLY_ADMITTED',
  decision:o.decision,next_governed_action:
   recovery?.original_work_id===o.original_work_id?
    recovery.next_governed_action:o.next_governed_action,
  evidence_not_authority:true
 })));
 const verified=frozen([...byWork.values()].filter(x=>
  x.original_job_completed).map(x=>({
  original_work_id:x.original_work_id,source_ref:x.source_ref,
  status:'INDEPENDENTLY_SETTLED_UNIVERSE_PAST',
  universe_outcome_event_id:x.verified_universe_outcome_event_id,
  parent_settlement_receipt_id:x.parent_settlement_receipt_id,
  verified_provider_comment_url:x.verified_provider_comment_url,
  independently_verified:true
 })));
 // These are deliberately bounded, source-bound Universe observations.
 // Ordinary Chat may use them as evidence, but must not execute their hints.
 const observations=frozen([
  ...verified.map(x=>({
   entry_id:'reality:final-loop:universe:'+x.universe_outcome_event_id,
   event_kind:'owner_independent_original_job_final_receipt',
   source_kind:'CANONICAL_FINAL_LOOP_ATOMIC_UNIVERSE_SETTLEMENT_READBACK',
   source_ref:x.source_ref,original_work_id:x.original_work_id,
   independent_original_settlement_verified:true,
   original_job_completed:true,execution_authorized:false,
   installation_authorized:false,production_changed:false,
   summary:'Independently settled original '+x.original_work_id+
    ' with Universe event '+x.universe_outcome_event_id+
    ' and parent receipt '+x.parent_settlement_receipt_id+'.'
  })),
  ...pending.slice(0,8).map(x=>({
   entry_id:'reality:final-loop:pending:'+(x.original_work_id||
    encodeURIComponent(x.source_ref)),
   event_kind:'owner_final_loop_continuity_obligation_pending',
   source_kind:'CANONICAL_SIGNED_FINAL_LOOP_UNFINISHED_READBACK',
   source_ref:x.source_ref,original_work_id:x.original_work_id,
   independent_original_settlement_verified:false,
   original_job_completed:false,execution_authorized:false,
   installation_authorized:false,production_changed:false,
   summary:'Unfinished Final Loop '+(x.original_work_id||'source')+
    '; current decision '+x.decision+
    '; next governed evidence step '+x.next_governed_action+
    '. No owner consent or execution is implied.'
  }))
 ]);
 return output('FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY',{
  owner_id:i.owner_id,shift_id:i.shift_id,
  continuity_root_id:i.continuity_root_id,
  continuity_head_sha256:i.continuity_head_sha256,revision:i.revision,
  verified_parent_count:verified.length,
  unfinished_obligation_count:pending.length,
  verified_outcomes:verified,unfinished_obligations:pending,
  observations,
  next_attention:recovery||pending[0]||null,
  universe_readback_verified:true,
  shared_continuity_guard_crosschecked:sharedContinuityGuard!==null,
  no_verified_parent_is_not_shift_completion:true
 });
}
