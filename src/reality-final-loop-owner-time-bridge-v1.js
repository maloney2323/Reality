// Authenticated owner time-horizon adapter for the existing Final Loop.
// The owner endpoint reads the SAME service-only canonical proof projection
// as the signed worker, but cannot claim worker activation or grant authority.
import {projectRealityFinalLoopTimeHorizon}
 from './reality-final-loop-time-horizon-v1.js';
import {projectRealityFinalLoopExecutiveBrief}
 from './reality-final-loop-executive-brief-v1.js';
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
 ownerId,shiftId,proof,independentHistory=null,now=Date.now()
}={}){
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
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
  decisions.push({
   original_work_id:p.original_work_id,source_ref:p.source_ref,
   decision:'REFRESH',
   next_governed_action:
    'INDEPENDENTLY_BIND_FROZEN_ORIGINAL_GOAL_ACCEPTANCE_AND_FOUR_PROOFS',
   reason:'CUSTOMER_ORIGINAL_ACCEPTANCE_NOT_INDEPENDENTLY_PROVEN',
   transition_committed:false
  });
 }
 const timeHorizon=projectRealityFinalLoopTimeHorizon({
  engine:{
   schema:'reality-final-loop-owner-readback-v1',
   status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
   owner_id:ownerId,shift_id:shiftId,
   continuity_head_sha256:proof.continuity_head_sha256,
   original_job_completed:false,shift_completed:false,
   installation_authorized:false,production_changed:false,
   decisions
  },independentHistory
 });
 const executive=projectRealityFinalLoopExecutiveBrief({
  timeHorizon
 });
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
  independent_settlement_claimed:false,
  new_job_authorized:false,external_execution_authorized:false,
  original_job_completed:false,production_changed:false
 });
}
