// Authenticated owner time-horizon adapter for the existing Final Loop.
// The owner endpoint reads the SAME service-only canonical proof projection
// as the signed worker, but cannot claim worker activation or grant authority.
import {projectRealityFinalLoopTimeHorizon}
 from './reality-final-loop-time-horizon-v1.js';
import {projectRealityFinalLoopExecutiveBrief}
 from './reality-final-loop-executive-brief-v1.js';
import {verifyFinalLoopCanonicalContinuityHandoff,
 derivePendingFinalLoopSourceDecisions}
 from './reality-final-loop-canonical-handoff-v1.js';
export const FINAL_LOOP_OWNER_TIME_BRIDGE_VERSION=
 'reality-final-loop-owner-time-bridge-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/;
const blocked=(status)=>Object.freeze({
 schema:FINAL_LOOP_OWNER_TIME_BRIDGE_VERSION,status,
 read_only:true,owner_scope_verified:false,executive:null,
 time_horizon:null,independent_settlement_claimed:false,
 new_job_authorized:false,external_execution_authorized:false,
 original_job_completed:false,production_changed:false
});
export function projectOwnerFinalLoopTimeReadback({
 ownerId,shiftId,expectedPlanFingerprint,proof,
 independentHistory=null,now=Date.now()
}={}){
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !HASH.test(expectedPlanFingerprint||'')||
  proof?.plan_fingerprint!==expectedPlanFingerprint||
  !Number.isFinite(now)||proof?.status!==
   'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'||
  proof.schema!=='reality-final-loop-canonical-proof-readback-v1'||
  proof.owner_id!==ownerId||proof.shift_id!==shiftId||
  proof.read_only!==true||
  proof.independent_owner_scope_verified!==true||
  proof.owner_acceptance_verified!==false||
  proof.acceptance_frozen!==false||
  proof.acceptance_contract_sha256!==null||
  proof.original_job_completed!==false||
  proof.installation_authorized!==false||
  proof.execution_authorized!==false||
  proof.production_changed!==false||
  !HASH.test(proof.plan_fingerprint||'')||
  !HASH.test(proof.frozen_shift_scope_sha256||'')||
  !HASH.test(proof.continuity_head_sha256||'')||
  !UUID.test(proof.continuity_root_id||'')||
  !Number.isSafeInteger(proof.revision)||proof.revision<1||
  !Array.isArray(proof.jobs)||proof.jobs.length<1||proof.jobs.length>4||
  !Number.isFinite(Date.parse(proof.observed_at||''))||
  Date.parse(proof.observed_at)>now+300000||
  now-Date.parse(proof.observed_at)>300000)
  return blocked('FINAL_LOOP_OWNER_VERIFIED_CANONICAL_PROOF_REQUIRED');
 const seenSource=new Set(),seenWork=new Set(),decisions=[];
 for(const p of proof.jobs){
  if(!REF.test(p?.source_ref||'')||seenSource.has(p.source_ref)||
   (p.original_work_id!=null&&!WORK.test(p.original_work_id))||
   (p.original_work_id!=null&&seenWork.has(p.original_work_id))||
   !HASH.test(p.source_proof_sha256||'')||
   p.original_acceptance_verified!==false||
   p.authority_proof_verified!==false||
   p.capacity_proof_verified!==false||
   p.final_outcome_verified!==false||
   p.settlement_eligible!==false||
   typeof p.evidence_checkpoint_recorded_on_head!=='boolean'||
   typeof p.independent_source_proof_verified!=='boolean')
   return blocked('FINAL_LOOP_OWNER_ORIGINAL_EVIDENCE_SCOPE_INVALID');
  seenSource.add(p.source_ref);
  if(p.original_work_id!=null)seenWork.add(p.original_work_id);

 }
 const sourceDecisions=derivePendingFinalLoopSourceDecisions(proof);
 if(sourceDecisions===null)
  return blocked('FINAL_LOOP_OWNER_MISSING_SOURCE_ADMISSION_POLICY');
 decisions.push(...sourceDecisions);
 const timeHorizon=projectRealityFinalLoopTimeHorizon({
  engine:{
   schema:'reality-final-loop-owner-readback-v1',
   status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
   owner_id:ownerId,shift_id:shiftId,
   plan_fingerprint:proof.plan_fingerprint,
   frozen_shift_scope_sha256:proof.frozen_shift_scope_sha256,
   continuity_root_id:proof.continuity_root_id,
   continuity_head_sha256:proof.continuity_head_sha256,
   revision:proof.revision,missing_proofs:proof.missing_proofs,
   original_job_completed:false,shift_completed:false,
   installation_authorized:false,production_changed:false,
   decisions
  },independentHistory
 });
 const executive=projectRealityFinalLoopExecutiveBrief({
  timeHorizon
 });
 const handoff=verifyFinalLoopCanonicalContinuityHandoff({
  proof,expectedOwnerId:ownerId,expectedShiftId:shiftId,
  expectedPlanFingerprint,timeHorizon,executive,now
 });
 if(handoff.canonical_handoff_verified!==true)
  return blocked('FINAL_LOOP_OWNER_CONTINUITY_HANDOFF_REJECTED');
 if(timeHorizon.status!=='FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY'||
  executive.status!=='EXECUTIVE_SIGNED_SHIFT_PRIORITIES_READY')
  return blocked('FINAL_LOOP_OWNER_EXECUTIVE_TIME_RECONCILIATION_REJECTED');
 return Object.freeze({
  schema:FINAL_LOOP_OWNER_TIME_BRIDGE_VERSION,
  status:'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY',
  read_only:true,owner_scope_verified:true,
  owner_id:ownerId,shift_id:shiftId,
  source:'SAME_CANONICAL_SIGNED_SHIFT_SCOPE_NO_SECOND_LEDGER',
  continuity_head_sha256:proof.continuity_head_sha256,
  time_horizon:timeHorizon,executive,
  canonical_continuity_handoff:handoff,
  independent_settlement_claimed:false,
  new_job_authorized:false,external_execution_authorized:false,
  original_job_completed:false,production_changed:false
 });
}


// Owner Past/Present/Future and CEO consume the SAME canonical Continuity head
// and reviewed recovery evidence. This is a bounded advisory projection, not
// another orchestrator, a second ledger, authority, or an independent outcome.
// Do not recast a historical recovery review as a settled business original.
export function projectFinalLoopOwnerReviewedRecoveryGuidance({
 ownerView,sourcePlans,preflight,recoveryActions,ownerPackets
}={}){
 const base=Object.freeze({
  schema:'reality-final-loop-owner-reviewed-recovery-guidance-v1',
  read_only:true,authority_granted:false,
  action_dispatched:false,recovery_verified:false,
  original_job_completed:false,production_changed:false,
  past:{reviewed_recovery_is_not_original_settlement:true},
  present:null,future:null,ceo:null
 });
 const done=(status,more={})=>Object.freeze({...base,status,...more});
 if(ownerView?.status!=='FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY'||
    ownerView.owner_scope_verified!==true||
    !UUID.test(ownerView.owner_id||'')||
    !UUID.test(ownerView.shift_id||'')||
    !HASH.test(ownerView.continuity_head_sha256||'')||
    ownerView.original_job_completed!==false||
    ownerView.external_execution_authorized!==false||
    sourcePlans?.status!==
      'FINAL_LOOP_SAME_OWNER_PENDING_SOURCE_PLANS_VERIFIED_READ_ONLY'||
    sourcePlans.owner_id!==ownerView.owner_id||
    sourcePlans.shift_id!==ownerView.shift_id||
    sourcePlans.owner_scope_verified!==true||
    sourcePlans.read_only!==true||
    !Array.isArray(sourcePlans.plans)||
    preflight?.status!=='FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY'||
    preflight.owner_id!==ownerView.owner_id||
    preflight.shift_id!==ownerView.shift_id||
    preflight.read_only!==true||
    preflight.execution_authorized!==false||
    !Array.isArray(preflight.plans)||
    recoveryActions?.status!=='OWNER_SIGNED_SHIFT_RECOVERY_ACTIONS_READ_ONLY'||
    recoveryActions.owner_id!==ownerView.owner_id||
    recoveryActions.owner_scope_verified!==true||
    recoveryActions.read_only!==true||
    !Array.isArray(recoveryActions.items))
  return done('FINAL_LOOP_OWNER_RECOVERY_SOURCE_OR_CONTINUITY_UNVERIFIED');
 const verifiedActions=recoveryActions.items.filter(x=>
  x.shift_id===ownerView.shift_id&&
  x.kind==='SIGNED_SHIFT_REPEATED_NO_PROGRESS'&&
  x.action_independently_rechecked===true&&
  HASH.test(x.action_receipt_sha256||'')&&
  HASH.test(x.independent_review_receipt_sha256||'')&&
  x.owner_next_action===
   'EXACT_OWNER_SOURCE_SCOPE_AND_ITEMIZED_BUSINESS_WARRANT_REQUIRED_IN_CHAT'&&
  x.original_job_completed===false&&x.installation_authorized===false&&
  x.production_changed===false);
 if(verifiedActions.length!==1)
  return done('FINAL_LOOP_OWNER_REVIEWED_RECOVERY_ACTION_UNAVAILABLE_OR_AMBIGUOUS');
 const candidates=preflight.plans.filter(p=>
  p.verified_signed_source_goal_contract_prepared===true&&
  p.pending_exact_owner_approval===true&&
  p.independent_goal_acceptance_verified===false&&
  HASH.test(p.acceptance_contract_sha256||'')&&
  sourcePlans.plans.some(x=>x.plan_id===p.plan_id&&
   x.source_ref===p.source_ref&&
   x.parent_original_work_id===p.parent_original_work_id&&
   x.source_manifest_sha256===p.source_manifest_sha256&&
   x.parent_source_phase==='BLOCKED'&&
   x.state==='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'&&
   WORK.test(x.parent_original_work_id||'')));
 if(candidates.length!==1)
  return done('FINAL_LOOP_OWNER_EXACT_ORIGINAL_SOURCE_CANDIDATE_REQUIRED');
 const p=candidates[0];
 if(ownerPackets!==null&&ownerPackets!==undefined&&(
   ownerPackets.status!=='FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY'||
   ownerPackets.owner_id!==ownerView.owner_id||
   ownerPackets.shift_id!==ownerView.shift_id||
   ownerPackets.read_only!==true||
   !Array.isArray(ownerPackets.packets)))
  return done('FINAL_LOOP_OWNER_PACKET_READBACK_UNVERIFIED');
 const matching=ownerPackets?.packets?.filter(x=>
  x.source_ref===p.source_ref&&
  x.parent_original_work_id===p.parent_original_work_id&&
  x.source_manifest_sha256===p.source_manifest_sha256&&
  x.acceptance_contract_sha256===p.acceptance_contract_sha256)??[];
 if(matching.length>1)
  return done('FINAL_LOOP_OWNER_DUPLICATE_EXACT_APPROVAL_PACKET_RECHECK_REQUIRED');
 const packet=matching[0]||null;
 const next=packet?
  packet.state==='AWAITING_EXACT_OWNER_APPROVAL'&&
   packet.approved===false&&UUID.test(packet.packet_id||'')?
   'PRESENT_EXACT_OWNER_PACKET_IN_REALITY_CHAT':
  'RECONCILE_EXACT_APPROVAL_AND_SIGNED_CHILD_CLAIM':
  'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET';
 return done('FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY',{
  owner_id:ownerView.owner_id,shift_id:ownerView.shift_id,
  continuity_head_sha256:ownerView.continuity_head_sha256,
  incident_id:verifiedActions[0].incident_id,
  original_work_id:p.parent_original_work_id,
  source_ref:p.source_ref,plan_id:p.plan_id,
  incident_causal_lineage_independently_verified:false,
  past:{
   status:'HISTORICAL_RECOVERY_ACTION_INDEPENDENTLY_REVIEWED_ONLY',
   independent_recovery_receipt_sha256:
    verifiedActions[0].independent_review_receipt_sha256,
   reviewed_recovery_is_not_original_settlement:true
  },
  present:{
   status:packet?
    'EXACT_SOURCE_BOUND_OWNER_PACKET_OBSERVED':
    'EXACT_SOURCE_BOUND_OWNER_PACKET_NOT_YET_OBSERVED',
   original_work_id:p.parent_original_work_id,
   approval_packet_id:packet?.packet_id??null,
   source_ref:p.source_ref,
   owner_approval_pending:!packet||packet.approved===false,
   original_settled:false
  },
  future:{
   next_governed_action:next,
   automatically_executable:false,
   original_outcome_verified:false
  },
  ceo:{
   priority:'RESOLVE_EXISTING_FINAL_LOOP_RECOVERY_HANDOFF',
   required_next_action:next,
   independent_outcome_required:true,
   autonomous_authority_granted:false
  }
 });
}
