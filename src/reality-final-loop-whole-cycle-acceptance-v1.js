// One read-only acceptance verdict for the SAME Reality Final Loop Engine.
// NOT a controller, scheduler, owner authorization, verifier or settlement.
// Consumes independent Continuity/authority/outcome readbacks after each wake.
export const WHOLE_CYCLE_ACCEPTANCE_VERSION='reality-final-loop-whole-cycle-acceptance-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/pull\/[1-9]\d*$/i;
const base=Object.freeze({
 schema:WHOLE_CYCLE_ACCEPTANCE_VERSION,read_only:true,
 full_cycle_accepted:false,owner_approval_granted_by_evaluator:false,
 authority_extended:false,model_execution_authorized:false,
 original_job_completed_by_evaluator:false,production_changed:false,
 new_job_created:false,new_shift_started:false
});
const result=(status,extra={})=>Object.freeze({...base,status,...extra});
const stage=(name,status,verified=false)=>Object.freeze({name,status,verified});
export function evaluateRealityWholeCycleAcceptance({
 graph,ingress,continuityReturn,ownerPackets,recovery,
 parentReturn,verifiedContinuation
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.owner_id||'')||!UUID.test(graph.shift_id||'')||
  !HASH.test(graph.plan_fingerprint||'')||
  !Array.isArray(graph.jobs)||graph.jobs.length<1||
  graph.jobs.length>25||graph.production_changed!==false||
  ingress?.status!=='FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
  continuityReturn?.status!=='FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
  ingress.owner_id!==graph.owner_id||
  continuityReturn.owner_id!==graph.owner_id||
  ingress.shift_id!==graph.shift_id||
  continuityReturn.shift_id!==graph.shift_id||
  ingress.shared_continuity_guard?.status!==
   'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
  continuityReturn.shared_continuity_guard?.status!==
   'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
  !UUID.test(ingress.shared_continuity_guard.continuity_root_id||'')||
  ingress.shared_continuity_guard.continuity_root_id!==
   continuityReturn.shared_continuity_guard.continuity_root_id||
  !HASH.test(continuityReturn.continuity_head_sha256||'')||
  !Number.isSafeInteger(ingress.revision)||
  !Number.isSafeInteger(continuityReturn.revision)||
  continuityReturn.revision<ingress.revision||
  continuityReturn.shared_continuity_guard.continuity_head_sha256!==
   continuityReturn.continuity_head_sha256||
  continuityReturn.shared_continuity_guard.revision!==continuityReturn.revision||
  !Array.isArray(continuityReturn.shared_continuity_guard.handoffs)||
  continuationIsUntrusted(verifiedContinuation))
  return result('FULL_CYCLE_INDEPENDENT_CONTINUITY_PROOF_UNVERIFIED',{
   next_governed_action:'VERIFY_SAME_ORIGINAL_CONTINUITY_AND_INDEPENDENT_RETURN'
  });

 const handoffs=continuityReturn.shared_continuity_guard.handoffs;
 const originals=graph.jobs.filter(j=>WORK.test(j.original_work_id||'')&&
  PR.test(j.source_ref||'')&&
  j.independent_source_proof_verified===true);
 if(originals.length<1||originals.length>10)
  return result('FULL_CYCLE_NO_INDEPENDENTLY_QUALIFIED_ORIGINAL',{
   next_governed_action:'QUALIFY_REAL_ORIGINAL_WITH_INDEPENDENT_SOURCE_PROOF'
  });
 if(ownerPackets?.status!=='FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY'||
  ownerPackets.read_only!==true||
  ownerPackets.execution_authorized!==false||
  ownerPackets.owner_id!==graph.owner_id||
  ownerPackets.shift_id!==graph.shift_id||
  !Array.isArray(ownerPackets.packets)||ownerPackets.packets.length>25)
  return result('FULL_CYCLE_OWNER_PACKET_INDEPENDENT_READBACK_UNAVAILABLE',{
   next_governed_action:'RETRY_EXISTING_OWNER_PACKET_READBACK',
   continuity_revision:continuityReturn.revision
  });
 if(recovery?.original_job_completed!==false||
    recovery?.recovery_verified!==false||
    recovery?.owner_approval_granted!==false)
  return result('FULL_CYCLE_RECOVERY_SELF_CERTIFICATION_REJECTED');
 const reports=[];
 for(const j of originals){
  const hs=handoffs.filter(h=>h.source_ref===j.source_ref&&
   h.original_work_id===j.original_work_id);
  if(hs.length!==1||hs[0].continuity_identity_verified!==true||
   hs[0].qualifier_digest_verified!==true)
    return result('FULL_CYCLE_ORIGINAL_CONTINUITY_IDENTITY_FAILED');
  const h=hs[0];
  const packets=ownerPackets.packets.filter(p=>p.source_ref===j.source_ref&&
   p.parent_original_work_id===j.original_work_id);
  if(packets.length>1)return result('FULL_CYCLE_DUPLICATE_OWNER_APPROVAL_PACKET');
  const p=packets[0]||null;
  if(p&&(!UUID.test(p.packet_id||'')||
   !HASH.test(p.approval_fingerprint||'')||
   !HASH.test(p.acceptance_contract_sha256||'')||
   !HASH.test(p.source_manifest_sha256||'')||
   p.effect_type!=='READ_ONLY_INTERNAL_PR_REVIEW'||
   !Number.isSafeInteger(p.file_count)||p.file_count<1||
   p.approved!==Boolean(p.state==='APPROVED_ONCE')||
   p.original_job_completed!==false))
    return result('FULL_CYCLE_OWNER_PACKET_OR_EFFECT_UNVERIFIED');
  const approved=p?.state==='APPROVED_ONCE'&&p.approved===true;
  const final=h.independent_original_outcome_verified===true;
  const settled=h.universe_return_verified===true;
  const admission=h.original_claim_admitted===true;
  const resumed=verifiedContinuation?.status===
     'FINAL_LOOP_INDEPENDENT_NEXT_ACTION_EXECUTED_AND_VERIFIED'&&
   verifiedContinuation.shift_id===graph.shift_id&&
   verifiedContinuation.owner_id===graph.owner_id&&
   verifiedContinuation.original_work_id===j.original_work_id&&
   verifiedContinuation.source_ref===j.source_ref&&
   verifiedContinuation.independent_resume_receipt_verified===true&&
   verifiedContinuation.continuity_root_id===
    continuityReturn.shared_continuity_guard.continuity_root_id;
  const internalCI=h.independent_internal_ci_verified===true;
  const gates=Array.isArray(h.unresolved_proof_gates)?h.unresolved_proof_gates:[];
  const businessAuthorityMissing=gates.includes('BUSINESS_ORIGINAL_WARRANT_MISMATCH');
  const authorityAction=businessAuthorityMissing?
   'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION':null;
  const statuses=[
   stage('Original source and goal','VERIFIED',true),
   stage('Continuity and independent verifier','VERIFIED',true),
   stage('Exact owner approval',approved?'APPROVED':p?'PENDING_OWNER':'PREPARE_PACKET',approved),
   stage('Internal frozen-case CI',internalCI?'INDEPENDENTLY_VERIFIED':'RECOVER_WITHIN_EXISTING_WARRANT',internalCI),
   stage('Governed original admission',admission?'ADMITTED':'AWAITING_AUTHORITY_AND_CAPACITY',admission),
   stage('Independent original outcome',final?'VERIFIED':'NOT_VERIFIED',final),
   stage('Universe return to same original',settled?'VERIFIED':'NOT_VERIFIED',settled),
   stage('Automatic next authorized action',resumed?'INDEPENDENTLY_VERIFIED':'NOT_VERIFIED',resumed)
  ];
  const status=resumed&&settled&&final&&admission&&approved&&internalCI&&!businessAuthorityMissing?
    'FULL_CYCLE_INDEPENDENTLY_ACCEPTED':
    !p?'FULL_CYCLE_SELF_RECOVERY_PREPARE_EXACT_OWNER_PACKET':
    !approved?'FULL_CYCLE_OWNER_APPROVAL_REQUIRED_AND_INTERNAL_CI_PENDING':
    businessAuthorityMissing?'FULL_CYCLE_EXACT_BUSINESS_AUTHORITY_RECONCILIATION_REQUIRED':
    !internalCI?'FULL_CYCLE_SELF_RECOVERY_INDEPENDENT_INTERNAL_CI_REQUIRED':
    !admission?'FULL_CYCLE_GOVERNED_ORIGINAL_ADMISSION_REQUIRED':
    !final?'FULL_CYCLE_ORIGINAL_OUTCOME_VERIFICATION_REQUIRED':
    !settled?'FULL_CYCLE_UNIVERSE_RECONCILIATION_REQUIRED':
    'FULL_CYCLE_INDEPENDENT_NEXT_ACTION_REQUIRED';
  reports.push(Object.freeze({
   source_ref:j.source_ref,original_work_id:j.original_work_id,
   status,stages:Object.freeze(statuses),owner_packet_id:p?.packet_id??null,
   exact_owner_approval_required:!approved,
   business_original_authority_missing:businessAuthorityMissing,
   next_authority_action:authorityAction,
   internal_ci_evidence_missing:!internalCI,
   next_recovery_action:!internalCI?
    'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC':null,
   next_governed_action:!p?'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET':
    !approved?'PRESENT_EXACT_OWNER_PACKET_IN_REALITY_CHAT':
    businessAuthorityMissing?authorityAction:
    !internalCI?'RESUME_REGISTERED_SIGNED_MAINTENANCE_CI_VERIFIER':
    !admission?'VERIFY_ISOLATED_ONE_USE_CHILD_EXECUTION_CLAIM':
    !final?'REQUIRE_INDEPENDENT_ORIGINAL_OUTCOME':
    !settled?'RECONCILE_VERIFIED_UNIVERSE_PARENT_TO_ORIGINAL':
    !resumed?'RESUME_NEXT_AUTHORIZED_ACTION_WITH_SIGNED_VERIFIER_RECEIPT':
    'FULL_CYCLE_ACCEPTED',
   full_cycle_accepted:!businessAuthorityMissing&&statuses.every(s=>s.verified),
   owner_approval_granted_by_evaluator:false
  }));
 }
 const allAccepted=reports.every(r=>r.full_cycle_accepted===true);
 // Do not quietly exclude another source selected by the original shift.
 const unadmitted=graph.jobs.filter(j=>j.original_work_id===null).length;
 return result(allAccepted&&unadmitted===0?
  'FULL_CYCLE_INDEPENDENT_ACCEPTANCE_PASS':
  'FULL_CYCLE_ACCEPTANCE_OPEN_WITH_EXACT_BLOCKERS',{
   owner_id:graph.owner_id,shift_id:graph.shift_id,
   continuity_root_id:continuityReturn.shared_continuity_guard.continuity_root_id,
   continuity_revision:continuityReturn.revision,
   original_count:originals.length,
   unadmitted_source_count:unadmitted,
   original_reports:Object.freeze(reports),
   full_cycle_accepted:allAccepted&&unadmitted===0,
   next_governed_action:reports.find(r=>!r.full_cycle_accepted)?
    reports.find(r=>!r.full_cycle_accepted).next_governed_action:
    unadmitted>0?'QUALIFY_NEXT_UNADMITTED_SOURCE':'FULL_CYCLE_ACCEPTED'
  });
}
function continuationIsUntrusted(c){
 if(c===undefined||c===null)return false;
 if(typeof c!=='object'||Array.isArray(c))return true;
 return c.execution_authorized===true||c.owner_approval_granted_by_evaluator===true;
}
