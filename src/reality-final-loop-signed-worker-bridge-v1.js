// Signed-worker integration for Reality's EXISTING unified shift controller.
// This is a feature-gated SHADOW readback until the canonical service-only
// proof-envelope RPC and atomic transition writer are independently installed.
// Nothing here invokes a model, claims work, writes to the ledger, or settles.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {projectRealityFinalLoopTimeHorizon}
 from './reality-final-loop-time-horizon-v1.js';
import {verifyFinalLoopCanonicalContinuityHandoff,
 derivePendingFinalLoopSourceDecisions}
 from './reality-final-loop-canonical-handoff-v1.js';
import {
 assertRealityUnifiedShiftGraph,evaluateRealityFinalLoopEngine
} from './reality-shift-unified-execution-controller-v1.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const safe=(status,details={})=>Object.freeze({
 schema:'reality-final-loop-signed-worker-bridge-v1',
 status,...details,read_only:true,shadow_mode:true,
 transition_committed:false,executor_invoked:false,
 release_activated:false,owner_approval_granted:false,
 original_job_completed:false,shift_completed:false,
 installation_authorized:false,production_changed:false,
 provider_effect_replayed:false,new_shift_started:false
});
const identity=graph=>graph?.jobs?.map(item=>[
 item.source_ref,item.original_work_id,item.source_proof_sha256
]);
// Consume the Canonical Final Loop reader's source-bound qualifier handoff.
// A qualified diagnosis describes an unresolved obligation; it never issues a
// registered capability lease, grants authority, or certifies an outcome.
function verifyCanonicalQualificationHandoffs(proof,graph){
 const items=proof?.governed_qualification_handoffs;
 if(items===undefined)return Object.freeze([]);
 if(!Array.isArray(items)||items.length>graph.jobs.length)return null;
 const seen=new Set(),out=[];
 for(const h of items){
  if(!h||typeof h!=='object'||Array.isArray(h)||
     !/^work:[a-f0-9]{32}$/.test(h.original_work_id||'')||
     !HASH.test(h.qualifier_receipt_sha256||'')||
     !/^[A-Z][A-Z0-9_]{5,120}$/.test(h.qualifier_next_action||'')||
     !Number.isFinite(Date.parse(h.qualifier_checked_at||''))||
     !Number.isInteger(h.source_step_index)||h.source_step_index<1||
     h.proposed_transition!=='SUSPEND'||
     !['AUTHORITY_NOT_VERIFIED','BLOCKER_ATTESTATION_PENDING']
       .includes(h.reason_code)||
     h.diagnosis_consumable!==true||
     h.independent_source_proof_verified!==true||
     h.registered_capability_lease!==false||
     h.execution_authorized!==false||
     h.owner_approval_granted!==false||
     h.original_job_completed!==false||
     h.production_changed!==false||
     !Array.isArray(h.unresolved_proof_gates)||
     h.unresolved_proof_gates.length<1||
     h.unresolved_proof_gates.length>20||
     h.unresolved_proof_gates.some(x=>
      typeof x!=='string'||!/^[A-Z][A-Z0-9_]{3,99}$/.test(x)))
   return null;
  const exact=graph.jobs.filter(j=>
   j.source_ref===h.source_ref&&
   j.original_work_id===h.original_work_id&&
   j.source_step_index===h.source_step_index&&
   j.independent_source_proof_verified===true);
  const key=h.source_ref+'|'+h.original_work_id;
  if(exact.length!==1||seen.has(key))return null;
  seen.add(key);
  out.push(Object.freeze({
   source_ref:h.source_ref,original_work_id:h.original_work_id,
   source_step_index:h.source_step_index,
   qualifier_receipt_sha256:h.qualifier_receipt_sha256,
   qualifier_checked_at:h.qualifier_checked_at,
   next_qualified_action:h.qualifier_next_action,
   unresolved_proof_gates:Object.freeze([...h.unresolved_proof_gates]),
   decision:'SUSPEND',reason_code:h.reason_code,
   registered_capability_lease:false,transition_committed:false,
   executor_invoked:false,execution_authorized:false,
   owner_approval_granted:false,original_job_completed:false
  }));
 }
 return Object.freeze(out);
}

export async function inspectFinalLoopOnExistingSignedWorker({
 db,wake,graph,env=process.env,now=new Date().toISOString(),
 read=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
    !UUID.test(wake.shift_id||'')||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !UUID.test(graph.owner_id||'')||graph.shift_id!==wake.shift_id||
    !HASH.test(graph.plan_fingerprint||'')||
    graph.installation_authorized!==false||
    graph.production_changed!==false||
    typeof read!=='function')
  return safe('FINAL_LOOP_SIGNED_WORKER_OWNER_SCOPE_UNVERIFIED');
 if(env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true')
  return safe('FINAL_LOOP_SHADOW_NOT_ENABLED',{
   owner_id:graph.owner_id,shift_id:graph.shift_id
  });
 let refreshed,refreshedRaw,proofEnvelope;
 try{
  // The shared controller's current native shift + original-job source
  // graph must be reread from the same service-only database. A UI request
  // or an LLM-proposed graph is not authoritative.
  refreshedRaw=await read(db,
   'reality_read_current_shift_execution_graph_v1',{},{
    fetchImpl,timeoutMs:6000
   });
  refreshed=assertRealityUnifiedShiftGraph(refreshedRaw,{
   expectedShiftId:wake.shift_id
  });
 }catch{
  return safe('FINAL_LOOP_SAME_SHIFT_PROVIDER_GRAPH_UNVERIFIED');
 }
 if(refreshed.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    refreshed.owner_id!==graph.owner_id||
    refreshed.plan_fingerprint!==graph.plan_fingerprint||
    JSON.stringify(identity(refreshed))!==JSON.stringify(identity(graph)))
  return safe('FINAL_LOOP_CANONICAL_SOURCE_GRAPH_DRIFT_FENCED',{
   owner_id:graph.owner_id,shift_id:wake.shift_id
  });
 try{
  // This RPC must return the frozen original goal acceptance and four
  // independently observed proof classes. The RPC is intentionally NOT
  // substituted with a synthetic shape or any existing read that merely
  // proves a shift happened. Until deployed, the result is unavailable.
  proofEnvelope=await read(db,
   'reality_read_current_final_loop_proof_envelope_v1',
   {p_shift_id:wake.shift_id},{fetchImpl,timeoutMs:6000});
 }catch{
  return safe('FINAL_LOOP_CANONICAL_PROOF_RPC_NOT_CONNECTED',{
   owner_id:graph.owner_id,shift_id:wake.shift_id,
   next_governed_action:'CONNECT_SERVICE_ONLY_CANONICAL_ACCEPTANCE_AND_PROOF_READBACK'
  });
 }
 // Read the canonical shift's real frozen scope, but never confuse the
 // shift warrant with independent acceptance of every customer original.
 if(proofEnvelope?.status===
    'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'){
  const p=proofEnvelope;
  if(p.schema!=='reality-final-loop-canonical-proof-readback-v1'||
    p.owner_id!==graph.owner_id||p.shift_id!==wake.shift_id||
    p.plan_fingerprint!==graph.plan_fingerprint||
    p.read_only!==true||p.independent_owner_scope_verified!==true||
    p.owner_acceptance_verified!==false||
    p.acceptance_contract_sha256!==null||
    p.execution_authorized!==false||
    p.installation_authorized!==false||
    p.original_job_completed!==false||
    p.production_changed!==false||
    !HASH.test(p.frozen_shift_scope_sha256||'')||
    !HASH.test(p.continuity_head_sha256||'')||
    !Number.isSafeInteger(p.revision)||p.revision<1||
    !Array.isArray(p.jobs)||p.jobs.length!==refreshed.jobs.length)
   return safe('FINAL_LOOP_CANONICAL_PENDING_PROOF_READBACK_INVALID');
  const pending=[];
  for(const item of p.jobs){
   const exact=refreshed.jobs.filter(j=>
    j.source_ref===item?.source_ref&&
    j.original_work_id===item?.original_work_id&&
    j.source_proof_sha256===item?.source_proof_sha256);
   if(exact.length!==1||
      item.original_acceptance_verified!==false||
      item.authority_proof_verified!==false||
      item.capacity_proof_verified!==false||
      item.final_outcome_verified!==false||
      item.settlement_eligible!==false||
      typeof item.evidence_checkpoint_recorded_on_head!=='boolean')
    return safe('FINAL_LOOP_CANONICAL_PENDING_ORIGINAL_LINEAGE_INVALID');
   if(/^work:[a-f0-9]{32}$/.test(item.original_work_id||'')&&
      item.independent_source_proof_verified===true&&
      item.evidence_checkpoint_recorded_on_head===false)
    pending.push(Object.freeze({
     original_work_id:item.original_work_id,
     source_ref:item.source_ref
    }));
  }
  const governedQualificationHandoffs=
   verifyCanonicalQualificationHandoffs(p,refreshed);
  if(governedQualificationHandoffs===null)
   return safe('FINAL_LOOP_GOVERNED_QUALIFICATION_HANDOFF_INVALID');
  const canonicalSourceDecisions=derivePendingFinalLoopSourceDecisions(p);
  if(canonicalSourceDecisions===null)
   return safe('FINAL_LOOP_CANONICAL_SOURCE_ADMISSION_POLICY_UNVERIFIED');
  const temporal=projectRealityFinalLoopTimeHorizon({engine:{
   schema:'reality-final-loop-signed-worker-bridge-v1',
   status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
   owner_id:graph.owner_id,shift_id:wake.shift_id,
   plan_fingerprint:p.plan_fingerprint,
   frozen_shift_scope_sha256:p.frozen_shift_scope_sha256,
   continuity_root_id:p.continuity_root_id,
   continuity_head_sha256:p.continuity_head_sha256,
   revision:p.revision,missing_proofs:p.missing_proofs,
   original_job_completed:false,shift_completed:false,
   installation_authorized:false,production_changed:false,
   decisions:canonicalSourceDecisions
  }});
  const handoff=verifyFinalLoopCanonicalContinuityHandoff({
   proof:p,expectedOwnerId:graph.owner_id,
   expectedShiftId:wake.shift_id,
   expectedPlanFingerprint:graph.plan_fingerprint,
   sourceGraph:refreshed,timeHorizon:temporal,
   now:Date.parse(now)
  });
  if(handoff.canonical_handoff_verified!==true)
   return safe('FINAL_LOOP_SIGNED_CONTINUITY_HANDOFF_REJECTED',{
    owner_id:graph.owner_id,shift_id:wake.shift_id,
    continuity_handoff_status:handoff.status
   });
  return safe('FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',{
   owner_id:graph.owner_id,shift_id:wake.shift_id,
   canonical_continuity_handoff:handoff,
   time_horizon:temporal,
   frozen_shift_scope_sha256:p.frozen_shift_scope_sha256,
   continuity_head_sha256:p.continuity_head_sha256,
   revision:p.revision,checkpoint_candidates:Object.freeze(pending),
   governed_qualification_handoffs:governedQualificationHandoffs,
   next_governed_action:governedQualificationHandoffs.length>0?
    governedQualificationHandoffs[0].next_qualified_action:
    canonicalSourceDecisions.some(d=>
    d.decision==='SUSPEND')?
    'QUALIFY_DISTINCT_SOURCE_TO_ORIGINAL_BEFORE_ACCEPTANCE':
    'INDEPENDENTLY_BIND_FROZEN_ORIGINAL_GOAL_ACCEPTANCE_AND_FOUR_PROOFS'
  });
 }
 let evaluation;
 try{
  // The engine revalidates the EXACT DB source graph itself. Never
  // re-wrap an already normalized view as a new source of authority.
  evaluation=evaluateRealityFinalLoopEngine({
   graph:refreshedRaw,ledger:proofEnvelope,now
  });
 }catch{
  return safe('FINAL_LOOP_FROZEN_ACCEPTANCE_OR_PROOF_EVALUATION_REJECTED',{
   owner_id:graph.owner_id,shift_id:wake.shift_id
  });
 }
 // Only a projected status is emitted. Exact write/execution requires a
 // separately proven one-use service claim, CAS and installed handler.
 return safe(evaluation.status,{
  owner_id:graph.owner_id,shift_id:wake.shift_id,
  plan_fingerprint:graph.plan_fingerprint,
  continuity_root_id:evaluation.continuity_root_id,
  continuity_head_sha256:evaluation.continuity_head_sha256,
  decision_count:evaluation.decision_count,
  time_horizon:evaluation.time_horizon,
  decisions:evaluation.decisions.map(d=>({
   original_work_id:d.original_work_id,source_ref:d.source_ref,
   decision:d.decision,next_governed_action:d.next_governed_action,
   reason:d.reason,transition_committed:false
  })),
  all_originals_independently_settlement_eligible:
   evaluation.all_originals_independently_settlement_eligible,
  transition_requires_atomic_service_claim:true
 });
}


// Single-use evidence-only checkpoint on the EXISTING signed worker.
// The real service-only DB rechecks original/shift/lineage and CAS revision.
// Nothing here executes work, authorizes repair, installs, or settles.
export async function recordOneFinalLoopEvidenceCheckpoint({
 db,wake,workerRunId,inspection,env=process.env,
 call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true'||
    env.REALITY_FINAL_LOOP_EVIDENCE_CHECKPOINT_ENABLED!=='true')
  return safe('FINAL_LOOP_DURABLE_CHECKPOINT_DISABLED');
 if(db?.strictSecrets!==true||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
    inspection?.status!=='FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'||
    inspection.shift_id!==wake.shift_id||
    !UUID.test(wake.shift_id||'')||!UUID.test(workerRunId||'')||
    !HASH.test(inspection.frozen_shift_scope_sha256||'')||
    !HASH.test(inspection.continuity_head_sha256||'')||
    !Number.isSafeInteger(inspection.revision)||inspection.revision<1||
    !Array.isArray(inspection.checkpoint_candidates)||
    typeof call!=='function')
  return safe('FINAL_LOOP_EVIDENCE_CHECKPOINT_SCOPE_UNVERIFIED');
 if(inspection.checkpoint_candidates.length===0)
  return safe('FINAL_LOOP_PENDING_ACCEPTANCE_ALREADY_CHECKPOINTED');
 const original=inspection.checkpoint_candidates[0];
 if(!/^work:[a-f0-9]{32}$/.test(original?.original_work_id||'')||
    typeof original.source_ref!=='string')
  return safe('FINAL_LOOP_PENDING_ORIGINAL_IDENTITY_UNVERIFIED');
 let receipt;
 try{
  receipt=await call(db,
   'reality_record_final_loop_evidence_checkpoint_v1',{
    p_shift_id:wake.shift_id,
    p_original_work_id:original.original_work_id,
    p_worker_run_id:workerRunId,
    p_expected_revision:inspection.revision,
    p_expected_scope_sha256:inspection.frozen_shift_scope_sha256,
    p_expected_head_sha256:inspection.continuity_head_sha256,
    p_decision:'REFRESH',
    p_reason_code:'CANONICAL_ACCEPTANCE_PENDING'
   },{fetchImpl,timeoutMs:6000});
 }catch{
  // A timed-out RPC write may have committed. Never auto-replay it.
  return safe('FINAL_LOOP_EVIDENCE_CHECKPOINT_EFFECT_UNCERTAIN_NO_RETRY',{
   shift_id:wake.shift_id,original_work_id:original.original_work_id
  });
 }
 if(['FINAL_LOOP_EXISTING_CHECKPOINT_NO_REPLAY',
     'FINAL_LOOP_CAUSAL_HEAD_OR_SCOPE_DRIFT_NO_REPLAY'].includes(receipt?.status))
  return safe(receipt.status,{
   shift_id:wake.shift_id,original_work_id:original.original_work_id
  });
 if(receipt?.status!=='FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_DURABLY_RECORDED'||
    receipt.shift_id!==wake.shift_id||
    receipt.original_work_id!==original.original_work_id||
    receipt.decision!=='REFRESH'||
    receipt.reason_code!=='CANONICAL_ACCEPTANCE_PENDING'||
    receipt.evidence_only!==true||
    receipt.transition_committed!==true||
    !UUID.test(receipt.receipt_id||'')||
    !HASH.test(receipt.receipt_sha256||'')||
    receipt.execution_authorized!==false||
    receipt.installation_authorized!==false||
    receipt.original_job_completed!==false||
    receipt.production_changed!==false)
  return safe('FINAL_LOOP_DB_CHECKPOINT_RECEIPT_UNVERIFIED_NO_REPLAY',{
   shift_id:wake.shift_id,original_work_id:original.original_work_id
  });
 return safe('FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_INDEPENDENTLY_ACKNOWLEDGED',{
  shift_id:wake.shift_id,original_work_id:original.original_work_id,
  checkpoint_receipt_id:receipt.receipt_id,
  checkpoint_receipt_sha256:receipt.receipt_sha256,
  evidence_checkpoint_acknowledged:true
 });
}
