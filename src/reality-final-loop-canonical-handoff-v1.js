// Final Loop canonical handoff integrity (read-only).
// Implements the missing-information discipline from earlier CEO continuity
// proposals on the CURRENT owner-bound Continuity/Universe record.
// This is not another ledger, verifier, controller, engine, or authority grant.
// A local digest proves payload binding only; it DOES NOT prove factual truth.
import {createHash} from 'node:crypto';
export const FINAL_LOOP_CANONICAL_HANDOFF_VERSION=
 'reality-final-loop-canonical-handoff-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull)\/[1-9]\d*$/;
const missing=Object.freeze([
 'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
 'EXACT_ORIGINAL_EFFECT_AUTHORITY',
 'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
 'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'
]);
const fail=x=>Object.freeze({
 schema:FINAL_LOOP_CANONICAL_HANDOFF_VERSION,status:x,
 canonical_handoff_verified:false,read_only:true,
 digest_is_not_independent_fact_proof:true,execution_authorized:false,
 owner_approval_recorded:false,original_job_completed:false,
 shift_completed:false,production_changed:false
});
const stable=x=>Array.isArray(x)?x.map(stable):
 x&&typeof x==='object'?Object.fromEntries(
  Object.entries(x).sort(([a],[b])=>a.localeCompare(b))
   .map(([k,v])=>[k,stable(v)])):x;
const seal=x=>'sha256:'+createHash('sha256')
 .update(JSON.stringify(stable(x))).digest('hex');
// The SAME missing-acceptance policy is used by the signed worker and owner
// view. Unadmitted sources cannot be mistaken for executable originals.
export function derivePendingFinalLoopSourceDecisions(proof){
 if(proof?.status!==
     'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'||
    !Array.isArray(proof.jobs)||proof.jobs.length<1||
    proof.jobs.length>4)
  return null;
 const sources=new Set(),works=new Set(),decisions=[];
 for(const item of proof.jobs){
  if(!REF.test(item?.source_ref||'')||sources.has(item.source_ref)||
     (item.original_work_id!==null&&
      (!WORK.test(item.original_work_id||'')||
       works.has(item.original_work_id)))||
     !HASH.test(item.source_proof_sha256||'')||
     item.original_acceptance_verified!==false||
     item.authority_proof_verified!==false||
     item.capacity_proof_verified!==false||
     item.final_outcome_verified!==false||
     item.settlement_eligible!==false)
   return null;
  sources.add(item.source_ref);
  if(item.original_work_id!==null)works.add(item.original_work_id);
  const notAdmitted=item.original_work_id===null;
  decisions.push(Object.freeze({
   original_work_id:item.original_work_id,
   source_ref:item.source_ref,
   decision:notAdmitted?'SUSPEND':'REFRESH',
   next_governed_action:notAdmitted?
    'QUALIFY_DISTINCT_SOURCE_TO_ORIGINAL_BEFORE_ACCEPTANCE':
    'INDEPENDENTLY_BIND_FROZEN_ORIGINAL_GOAL_ACCEPTANCE_AND_FOUR_PROOFS',
   reason:notAdmitted?'SOURCE_NOT_ADMITTED_AS_ORIGINAL_WORK':
    'CUSTOMER_ORIGINAL_ACCEPTANCE_NOT_INDEPENDENTLY_PROVEN',
   transition_committed:false
  }));
 }
 return Object.freeze(decisions);
}
export function verifyFinalLoopCanonicalContinuityHandoff({
 proof,expectedOwnerId,expectedShiftId,expectedPlanFingerprint,
 sourceGraph=null,timeHorizon=null,executive=null,
 now=Date.now()
}={}){
 if(!UUID.test(expectedOwnerId||'')||
    !UUID.test(expectedShiftId||'')||
    !HASH.test(expectedPlanFingerprint||'')||
    proof?.schema!=='reality-final-loop-canonical-proof-readback-v1'||
    proof.status!=='FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'||
    proof.owner_id!==expectedOwnerId||
    proof.shift_id!==expectedShiftId||
    proof.plan_fingerprint!==expectedPlanFingerprint||
    proof.read_only!==true||
    proof.independent_owner_scope_verified!==true||
    proof.owner_acceptance_verified!==false||
    proof.acceptance_frozen!==false||
    proof.acceptance_contract_sha256!==null||
    proof.execution_authorized!==false||
    proof.installation_authorized!==false||
    proof.original_job_completed!==false||
    proof.production_changed!==false||
    !UUID.test(proof.continuity_root_id||'')||
    !HASH.test(proof.continuity_head_sha256||'')||
    !HASH.test(proof.frozen_shift_scope_sha256||'')||
    !Number.isSafeInteger(proof.revision)||proof.revision<1||
    !Array.isArray(proof.jobs)||proof.jobs.length<1||
    proof.jobs.length>4||
    !Array.isArray(proof.missing_proofs)||
    proof.missing_proofs.length!==missing.length||
    missing.some(m=>!proof.missing_proofs.includes(m))||
    !Number.isFinite(now)||
    !Number.isFinite(Date.parse(proof.observed_at||''))||
    Date.parse(proof.observed_at)>now+300000||
    now-Date.parse(proof.observed_at)>300000)
  return fail('CANONICAL_HANDOFF_SCOPE_OR_REQUIRED_PROOFS_MISSING');
 const canonicalDecisions=derivePendingFinalLoopSourceDecisions(proof);
 if(canonicalDecisions===null)
  return fail('CANONICAL_HANDOFF_MISSING_ORIGINAL_ADMISSION_POLICY');
 const decisionBySource=new Map(canonicalDecisions.map(d=>[d.source_ref,d]));
 const bySource=new Map(),usedWork=new Set();
 for(const j of proof.jobs){
  if(!REF.test(j?.source_ref||'')||
     bySource.has(j.source_ref)||
     (j.original_work_id!==null&&!WORK.test(j.original_work_id||''))||
     (j.original_work_id!==null&&usedWork.has(j.original_work_id))||
     !HASH.test(j.source_proof_sha256||'')||
     typeof j.independent_source_proof_verified!=='boolean'||
     j.original_acceptance_verified!==false||
     j.authority_proof_verified!==false||
     j.capacity_proof_verified!==false||
     j.final_outcome_verified!==false||
     j.settlement_eligible!==false||
     typeof j.evidence_checkpoint_recorded_on_head!=='boolean')
   return fail('CANONICAL_HANDOFF_ORIGINAL_SOURCE_OR_PROOF_INVALID');
  usedWork.add(j.original_work_id);
  bySource.set(j.source_ref,j);
 }
 if(sourceGraph!==null){
  if(sourceGraph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
     sourceGraph.owner_id!==expectedOwnerId||
     sourceGraph.shift_id!==expectedShiftId||
     sourceGraph.plan_fingerprint!==expectedPlanFingerprint||
     sourceGraph.installation_authorized!==false||
     sourceGraph.production_changed!==false||
     !Array.isArray(sourceGraph.jobs)||
     sourceGraph.jobs.length!==bySource.size||
     sourceGraph.jobs.some(j=>{
      const p=bySource.get(j.source_ref);
      return !p||p.original_work_id!==(j.original_work_id??null)||
       p.source_proof_sha256!==j.source_proof_sha256||
       p.independent_source_proof_verified!==
        j.independent_source_proof_verified;
     }))
   return fail('CANONICAL_HANDOFF_SIGNED_WORKER_GRAPH_DRIFT');
 }
 if(timeHorizon!==null){
  const p=timeHorizon?.present;
  if(timeHorizon.schema!=='reality-final-loop-time-horizon-v1'||
     timeHorizon.status!=='FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY'||
     timeHorizon.execution_authorized!==false||
     timeHorizon.original_job_completed!==false||
     timeHorizon.future?.status!==
      'GOVERNED_PREPARATIONS_NOT_AUTHORIZED_EXECUTION'||
     p?.owner_id!==expectedOwnerId||p.shift_id!==expectedShiftId||
     p.plan_fingerprint!==expectedPlanFingerprint||
     p.continuity_root_id!==proof.continuity_root_id||
     p.continuity_head_sha256!==proof.continuity_head_sha256||
     p.frozen_shift_scope_sha256!==proof.frozen_shift_scope_sha256||
     p.revision!==proof.revision||
     !Array.isArray(p.missing_proofs)||
     JSON.stringify(p.missing_proofs)!==
      JSON.stringify(proof.missing_proofs)||
     !Array.isArray(p.obligations)||p.obligations.length!==bySource.size||
     !Array.isArray(timeHorizon.future.preparations)||
     timeHorizon.future.preparations.length!==bySource.size)
   return fail('CANONICAL_HANDOFF_TIME_OR_CONTINUITY_SCOPE_DRIFT');
  for(const o of p.obligations){
   const j=bySource.get(o?.source_ref);
   const f=timeHorizon.future.preparations.find(x=>
    x.source_ref===o?.source_ref);
   const expected=decisionBySource.get(o?.source_ref);
   if(!j||!f||!expected||
      o.original_work_id!==j.original_work_id||
      o.decision!==expected.decision||
      o.reason!==expected.reason||
      o.next_governed_action!==expected.next_governed_action||
      o.settlement_committed!==false||
      o.action_executed!==false||
      f.original_work_id!==j.original_work_id||
      f.basis_decision!==expected.decision||
      f.proposed_next_action!==expected.next_governed_action||
      f.automatically_executable!==false||
      f.expected_outcome_verified!==false)
    return fail('CANONICAL_HANDOFF_FUTURE_OR_ORIGINAL_DECISION_DRIFT');
  }
 }
 if(executive!==null){
  if(timeHorizon===null||
     executive.schema!=='reality-final-loop-executive-brief-v1'||
     executive.status!=='EXECUTIVE_SIGNED_SHIFT_PRIORITIES_READY'||
     executive.owner_id!==expectedOwnerId||
     executive.shift_id!==expectedShiftId||
     executive.execution_authorized!==false||
     executive.original_job_completed!==false||
     !Array.isArray(executive.priority_items)||
     executive.priority_items.length!==bySource.size||
     executive.priority_items.some(p=>{
      const j=bySource.get(p.source_ref);
      const expected=decisionBySource.get(p.source_ref);
      return !j||!expected||
       p.original_work_id!==j.original_work_id||
       p.engine_decision!==expected.decision||
       p.required_next_evidence_action!==expected.next_governed_action||
       p.execution_authorized!==false||
       p.approval_granted!==false;
     }))
   return fail('CANONICAL_HANDOFF_EXECUTIVE_SCOPE_OR_AUTHORITY_DRIFT');
 }
 // Strict integrity fingerprint of the read model. Underlying proof remains
 // explicitly PENDING; hashing does not make it authentic or factually true.
 const capsule=Object.freeze({
  owner_id:expectedOwnerId,shift_id:expectedShiftId,
  plan_fingerprint:expectedPlanFingerprint,
  frozen_shift_scope_sha256:proof.frozen_shift_scope_sha256,
  continuity_root_id:proof.continuity_root_id,
  continuity_head_sha256:proof.continuity_head_sha256,
  revision:proof.revision,observed_at:proof.observed_at,
  original_acceptance_status:'INDEPENDENT_CUSTOMER_ACCEPTANCE_PENDING',
  missing_proofs:Object.freeze([...proof.missing_proofs]),
  original_sources:Object.freeze([...bySource.values()].map(j=>Object.freeze({
   source_ref:j.source_ref,original_work_id:j.original_work_id,
   source_proof_sha256:j.source_proof_sha256,
   independent_source_proof_verified:j.independent_source_proof_verified,
   original_acceptance_verified:false,authority_proof_verified:false,
   capacity_proof_verified:false,final_outcome_verified:false,
   evidence_checkpoint_recorded_on_head:j.evidence_checkpoint_recorded_on_head
  })))
 });
 return Object.freeze({
  schema:FINAL_LOOP_CANONICAL_HANDOFF_VERSION,
  status:'CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS',
  canonical_handoff_verified:true,
  continuity_root_id:proof.continuity_root_id,
  continuity_head_sha256:proof.continuity_head_sha256,
  frozen_shift_scope_sha256:proof.frozen_shift_scope_sha256,
  revision:proof.revision,
  missing_proofs:Object.freeze([...missing]),
  source_count:bySource.size,
  read_model_digest_sha256:seal(capsule),
  digest_is_not_independent_fact_proof:true,
  original_acceptance_verified:false,
  read_only:true,execution_authorized:false,
  owner_approval_recorded:false,original_job_completed:false,
  shift_completed:false,production_changed:false
 });
}
