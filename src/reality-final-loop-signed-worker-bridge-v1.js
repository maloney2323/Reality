// Signed-worker integration for Reality's EXISTING unified shift controller.
// This is a feature-gated SHADOW readback until the canonical service-only
// proof-envelope RPC and atomic transition writer are independently installed.
// Nothing here invokes a model, claims work, writes to the ledger, or settles.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
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
 let refreshed,proofEnvelope;
 try{
  // The shared controller's current native shift + original-job source
  // graph must be reread from the same service-only database. A UI request
  // or an LLM-proposed graph is not authoritative.
  refreshed=assertRealityUnifiedShiftGraph(await read(db,
   'reality_read_current_shift_execution_graph_v1',{},{
    fetchImpl,timeoutMs:6000
   }),{expectedShiftId:wake.shift_id});
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
 let evaluation;
 try{
  evaluation=evaluateRealityFinalLoopEngine({
   graph:refreshed,ledger:proofEnvelope,now
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
