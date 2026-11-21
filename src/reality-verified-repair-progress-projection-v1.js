// Exact, owner-bound Reality work progress. This is a read-only projection
// of persisted verified work-scope receipts, not a model-authored status.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const safeStamp=value=>{
 if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return null;
 return new Date(value).toISOString();
};
const readonly=(data)=>Object.freeze({
 ...data,
 read_only:true,installation_authorized:false,
 production_changed:false,original_job_completed:false,
 new_shift_started:false,independent_frozen_tests_completed:false
});
export function projectVerifiedOwnerRepairWorkProgress(card,ownerId){
 if(!card||card.owner_id!==ownerId||
  !UUID.test(ownerId||'')||!UUID.test(card.shift_id||'')||
  !UUID.test(card.handoff_id||'')||!REF.test(card.source_ref||'')||
  !HASH.test(card.work_order_fingerprint||'')||
  card.installation_authorized!==false||
  card.production_changed!==false||
  card.original_job_completed!==false||
  card.new_shift_started!==false||
  card.read_only!==true)
  return readonly({status:'OWNER_WORK_PROGRESS_UNVERIFIED',
   work_found:false,progress_message:'The exact owner work ledger could not be verified.',
   blocker:'OWNER_SOURCE_VERIFICATION_REQUIRED',
   next_action:'RECHECK_OWNER_BOUND_SOURCE',
   next_actor:'REALITY',owner_action_required:false,
   source_recheck_verified:false,
   source_verified_at:null,owner_approved_at:null,
   scope_approval_receipted:false,
   next_independent_test_receipt_verified:false});
 const common={
  owner_id:ownerId,
  shift_id:card.shift_id,
  handoff_id:card.handoff_id,
  source_ref:card.source_ref,
  work_found:true,
  work_scope_fingerprint:card.work_order_fingerprint,
  approval_receipt_sha256:
   HASH.test(card.approval_receipt_sha256||'')?
    card.approval_receipt_sha256:null,
  owner_approved_at:safeStamp(card.approved_at),
  source_verified_at:safeStamp(card.continued_at),
  last_verified_event_time:safeStamp(card.continued_at)||
   safeStamp(card.approved_at)||safeStamp(card.created_at),
  next_independent_test_receipt_verified:false
 };
 if(card.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_APPROVAL_READY'&&
  card.continuation_state==='PREPARED'&&
  card.owner_approval_ready===true&&
  card.owner_work_scope_approved===false&&
  !card.approval_receipt_sha256)
  return readonly({...common,
   status:'AWAITING_EXACT_OWNER_WORK_SCOPE_APPROVAL',
   progress_message:'Reality verified the repair source and prepared an exact owner decision.',
   blocker:'EXACT_OWNER_INVESTIGATION_AND_TESTING_SCOPE_REQUIRED',
   next_action:'OWNER_REVIEW_AND_APPROVE_EXACT_WORK_SCOPE',
   next_actor:'OWNER',
   owner_action_required:true,scope_approval_receipted:false,
   source_recheck_verified:false,
   evidence_stage:'VERIFIED_CANDIDATE_OWNER_DECISION_READY'
  });
 if(card.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED'&&
  card.owner_work_scope_approved===true&&
  card.owner_approval_ready===false&&
  HASH.test(card.approval_receipt_sha256||'')&&
  card.continuation_state==='APPROVED'&&
  safeStamp(card.approved_at))
  return readonly({...common,
   status:'OWNER_SCOPE_APPROVED_WAITING_FOR_SIGNED_SOURCE_RECHECK',
   progress_message:'Your exact investigation/testing approval was recorded. The signed worker has not yet receipted the postapproval source recheck.',
   blocker:'POSTAPPROVAL_SIGNED_WORKER_SOURCE_RECHECK_REQUIRED',
   next_action:'AUTOMATICALLY_RECHECK_APPROVED_SOURCE_IN_SAME_SHIFT',
   next_actor:'REALITY',
   owner_action_required:false,scope_approval_receipted:true,
   source_recheck_verified:false,
   evidence_stage:'SCOPE_APPROVAL_RECEIPTED_SOURCE_RECHECK_PENDING'
  });
 if(card.status==='EXACT_OWNER_REPAIR_WORK_SCOPE_DECISION_RECORDED'&&
  card.owner_work_scope_approved===true&&
  card.owner_approval_ready===false&&
  HASH.test(card.approval_receipt_sha256||'')&&
  card.continuation_state==='SOURCE_RECHECKED'&&
  safeStamp(card.approved_at)&&safeStamp(card.continued_at)&&
  Date.parse(card.continued_at)>=Date.parse(card.approved_at))
  return readonly({...common,
   status:'SOURCE_RECHECKED_AWAITING_NEW_INDEPENDENT_FROZEN_CI',
   progress_message:'Reality resumed this exact repair on the existing signed shift and independently rechecked its source after your approval.',
   blocker:'NEW_INDEPENDENT_FROZEN_CI_NOT_RECORDED_IN_THIS_WORK_HANDOFF',
   next_action:'REGISTER_AND_RUN_CASE_SPECIFIC_INDEPENDENT_FROZEN_CI',
   next_actor:'REALITY',
   owner_action_required:false,scope_approval_receipted:true,
   source_recheck_verified:true,
   evidence_stage:'POSTAPPROVAL_SOURCE_RECHECK_RECEIPTED_CI_UNPROVEN'
  });
 return readonly({...common,
  status:'OWNER_WORK_PROGRESS_RECEIPT_CONTRADICTORY',
  progress_message:'Reality cannot reconcile the current work progress from the exact receipt.',
  blocker:'INDEPENDENT_RECEIPT_RECONCILIATION_REQUIRED',
  next_action:'INVESTIGATE_EXACT_SOURCE_RECEIPT',
  next_actor:'REALITY',
  owner_action_required:false,scope_approval_receipted:false,
  source_recheck_verified:false,
  evidence_stage:'UNVERIFIED'
 });
}
