// Pure, bounded supervisor for ONE existing owner-authorized employee shift.
// It automates receipt reconciliation and next-work classification, not
// source admission, capability installation, replay, or execution authority.
// A checked GitHub issue is not an executable original job.
export const REALITY_AUTOMATIC_SHIFT_SUPERVISOR_VERSION=
 'reality-automatic-shift-supervisor-v1';
const SHA=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const fail=code=>{throw Error('REALITY_AUTOMATIC_SHIFT_SUPERVISOR_'+code)};
const KINDS=new Set(['REAL_ENGINEERING_REPAIR_ORIGINAL',
 'REAL_PR_REVIEW_ORIGINAL','REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL',
 'GENUINE_UNIVERSE_CAPABILITY_ORIGINAL',
 'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL','UNVERIFIED_SOURCE']);
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/;
const PHASE_COMPLETED=new Set(['SETTLED','SETTLED_ISOLATED']);
const OWNER_REVIEW=new Set(['AWAITING_OWNER_APPROVAL',
 'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL']);
export function projectRealityAutomaticShiftSupervisor(graph,mixedReceipts){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.shift_id||'')||
  !UUID.test(graph.owner_id||'')||
  !Array.isArray(graph.jobs)||graph.jobs.length<1||graph.jobs.length>4||
  !mixedReceipts||
  mixedReceipts.version!=='reality-mixed-shift-receipts-v1'||
  mixedReceipts.shift_id!==graph.shift_id||
  mixedReceipts.current_shift_complete!==false||
  mixedReceipts.read_only!==true||
  mixedReceipts.installation_authorized!==false||
  mixedReceipts.production_changed!==false||
  !Array.isArray(mixedReceipts.completed_original_receipts)||
  !Array.isArray(mixedReceipts.source_items_without_verified_final_receipt)||
  mixedReceipts.source_items_in_authorized_scope!==graph.jobs.length)
  fail('CURRENT_OWNER_SCOPE_AND_INDEPENDENT_RECEIPTS_REQUIRED');
 const completed=new Map();
 for(const r of mixedReceipts.completed_original_receipts){
  if(!REF.test(r?.source_ref||'')||completed.has(r.source_ref)||
   !WORK.test(r.original_work_id||'')||
   !SHA.test(r.source_proof_sha256||'')||
   r.independently_settled!==true||
   r.installation_authorized_by_this_read!==false||
   r.work_replayed_by_this_read!==false)
   fail('EXACT_COMPLETED_WORK_RECEIPT_INVALID');
  completed.set(r.source_ref,r);
 }
 const seen=new Set(),proposals=[];
 let existingUnfinished=0,needsQualification=0,approvalPending=0,
  verificationPending=0;
 for(const j of graph.jobs){
  if(!REF.test(j?.source_ref||'')||seen.has(j.source_ref)||
   !Number.isInteger(j.source_step_index)||
   j.source_step_index<2||j.source_step_index>5||
   !KINDS.has(j.original_kind)||
   !SHA.test(j.source_proof_sha256||'')||
   j.independent_source_proof_verified!==true||
   j.installation_authorized!==false&&
    j.capability_installation_authorized!==false||
   j.original_job_completed_by_graph===true||
   j.provider_effect_claimed_by_graph===true)
   fail('SIGNED_SOURCE_GRAPH_UNTRUSTED');
  seen.add(j.source_ref);
  const existing=completed.get(j.source_ref);
  let status,next;
  if(existing){
   if(j.source_proof_sha256!==existing.source_proof_sha256||
      j.original_work_id!==existing.original_work_id||
      !PHASE_COMPLETED.has(j.phase))
    fail('SETTLED_ORIGINAL_NOT_MATCHED_TO_CURRENT_GRAPH');
   status='EXACT_ORIGINAL_INDEPENDENTLY_SETTLED_NO_REPLAY';
   next='DO_NOT_REEXECUTE';
  }else if(PHASE_COMPLETED.has(j.phase)){
   status='SETTLEMENT_REPORTED_BUT_INDEPENDENT_RECEIPT_UNAVAILABLE';
   next='RECONCILE_RECEIPT_BEFORE_FURTHER_EFFECT';
   verificationPending++;
  }else if(j.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'||
            j.original_work_id==null){
   status='SOURCE_VALIDATED_ORIGINAL_JOB_NOT_QUALIFIED';
   next='INDEPENDENTLY_VALIDATE_DISTINCT_ORIGINAL_SCOPE';
   needsQualification++;
  }else if(j.original_kind==='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'){
   status=j.phase==='EVIDENCE_VERIFIED'?
    'INDEPENDENT_COMMIT_TRIAGE_EVIDENCE_RECORDED_AWAITING_DISPOSITION':
    'EXACT_COMMIT_TRIAGE_ORIGINAL_AWAITING_INDEPENDENT_READBACK';
   next=j.phase==='EVIDENCE_VERIFIED'?
    'DO_NOT_SETTLE_BEFORE_INDEPENDENT_TRIAGE_DISPOSITION':
    'READ_CURRENT_COMMIT_AND_RECORD_EVIDENCE_ONCE';
   if(j.phase==='EVIDENCE_VERIFIED')verificationPending++;
   else existingUnfinished++;
  }else if(OWNER_REVIEW.has(j.phase)){
   status='EXACT_EXISTING_ORIGINAL_REQUIRES_OWNER_UPGRADE_REVIEW';
   next='SHOW_VERIFIED_ARTIFACT_IN_EXISTING_CHAT_ONLY';
   approvalPending++;
  }else{
   if(!WORK.test(j.original_work_id||''))
    fail('EXISTING_ORIGINAL_ID_MALFORMED');
   status='EXISTING_ORIGINAL_FOR_GOVERNED_CONTINUATION';
   next='USE_CURRENT_TRUSTED_WORKER_PREWAKE_AND_ATOMIC_CLAIM';
   existingUnfinished++;
  }
  proposals.push(Object.freeze({
   source_ref:j.source_ref,
   source_step_index:j.source_step_index,
   status,next_action:next,
   original_work_id:j.original_work_id||null,
   independently_verified_final_receipt_ref:existing?.final_receipt_ref||null,
   creates_job:false,claim_consumed:false,
   approved_installation:false,production_changed:false
  }));
 }
 if(completed.size>seen.size||
  [...completed.keys()].some(x=>!seen.has(x))||
  mixedReceipts.completed_original_receipts.length+
    mixedReceipts.source_items_without_verified_final_receipt.length!==seen.size||
  mixedReceipts.source_items_without_verified_final_receipt.some(x=>
   !seen.has(x)||completed.has(x)))
  fail('FROZEN_SOURCE_SCOPE_AND_FINAL_RECEIPTS_DIVERGED');
 const settled=completed.size;
 const code=needsQualification?
  'AUTO_TRIAGE_'+settled+'_SETTLED_'+needsQualification+'_NEED_QUALIFICATION':
  approvalPending?
  'AUTO_TRIAGE_'+settled+'_SETTLED_'+approvalPending+'_NEED_OWNER_UPGRADE_REVIEW':
  existingUnfinished?
  'AUTO_TRIAGE_'+settled+'_SETTLED_'+existingUnfinished+'_ORIGINALS_READY_TO_RECHECK':
  verificationPending?
  'AUTO_TRIAGE_'+settled+'_SETTLED_'+verificationPending+'_RECEIPTS_TO_VERIFY':
  'AUTO_TRIAGE_ALL_SOURCE_RECEIPTS_VERIFIED_WAIT_FOR_CLOSER';
 if(code.length>100||!/^[A-Z0-9_]+$/.test(code))fail('PULSE_CODE_INVALID');
 return Object.freeze({
  version:REALITY_AUTOMATIC_SHIFT_SUPERVISOR_VERSION,
  status:'AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY',
  shift_id:graph.shift_id,owner_id:graph.owner_id,
  selected_source_count:seen.size,
  independently_settled_originals:settled,
  sources_needing_distinct_qualification:needsQualification,
  existing_originals_to_continue:existingUnfinished,
  sources_awaiting_exact_owner_upgrade_approval:approvalPending,
  sources_awaiting_final_receipt_verification:verificationPending,
  next_worker_pulse_code:code,
  jobs:Object.freeze(proposals),
  automatically_started_job_count:0,
  original_job_admission_authorized_by_triage:false,
  install_approval_authorized_by_triage:false,
  shift_completed_by_triage:false,
  measured_roi_usd:null,
  read_only:true,production_changed:false
 });
}
