// Reality Governed Self-Improvement Driver v1.0.
//
// The model does not drive the security-critical state machine. Trusted
// server adapters perform actual discovery, sandbox execution, owner-approved
// capability installation and independent provider/Continuity readback.
// A worker may execute unattended until it reaches an authority boundary.
// No global singleton, in-memory "completed" flag, or unverified model output.
import {
 verifySelfImprovementJournal,
 proposeGovernedCandidate,
 acceptGovernedObservation,
 nextGovernedSelfImprovementAction,
} from './reality-governed-self-improvement-spine-v1.0.js';

export const GOVERNED_SELF_IMPROVEMENT_DRIVER_VERSION='reality-governed-self-improvement-driver-v1.0';

function requireAdapter(adapters,name){
 if(typeof adapters?.[name]!=='function')
  throw Error('SELF_IMPROVEMENT_TRUSTED_ADAPTER_MISSING_'+name.toUpperCase());
 return adapters[name];
}
async function committed(state,adapters){
 const store=requireAdapter(adapters,'persistCheckpoint');
 const receipt=await store(state);
 if(receipt?.persisted!==true||
  receipt?.independent_readback_verified!==true||
  receipt?.checkpoint_hash!==state.head_hash||
  receipt?.original_work_id!==state.scope.original_work_id)
  throw Error('SELF_IMPROVEMENT_DURABLE_CHECKPOINT_READBACK_REQUIRED');
 return state;
}
async function observe(state,kind,operation,adapters){
 const adapter=requireAdapter(adapters,operation);
 const result=await adapter(Object.freeze({
  kind,phase:state.phase,scope:state.scope,
  checkpoint_hash:state.head_hash,
  candidate_artifact_hash:state.candidate?.artifact_hash||null,
  previous_failure:state.independent_failure,
 }));
 if(!result||result.kind!==kind)
  throw Error('SELF_IMPROVEMENT_PROVIDER_RESULT_TYPE_INVALID');
 const verified=await acceptGovernedObservation(state,result,{
  verifyProvider:requireAdapter(adapters,'verifyIndependentReceipt'),
 });
 return committed(verified,adapters);
}
// Driver does not accept direct owner approval from an LLM, cron or chat text.
// A separate authenticated, goal-bound one-time owner action must produce the
// independently re-read PROMOTION_AUTHORIZED receipt.
export async function continueGovernedSelfImprovement({
 state,adapters,maxTransitions=12,
}={}){
 verifySelfImprovementJournal(state);
 if(!Number.isInteger(maxTransitions)||maxTransitions<1||maxTransitions>50)
  throw Error('SELF_IMPROVEMENT_RUN_BUDGET_INVALID');
 let current=state;
 const trace=[];
 for(let i=0;i<maxTransitions;i++){
  const decision=nextGovernedSelfImprovementAction(current);
  trace.push({phase:current.phase,action:decision.action,
   head_hash:current.head_hash});
  switch(current.phase){
   case 'DISCOVERING':
    current=await observe(current,'GAP_CONFIRMED','observeMissingCapability',adapters);
    break;
   case 'GAP_CONFIRMED':
   case 'REPAIR_REQUIRED':{
    const generate=requireAdapter(adapters,'generateCandidate');
    const candidate=await generate(Object.freeze({
     goal_id:current.scope.goal_id,
     original_work_id:current.scope.original_work_id,
     continuity_root_id:current.scope.continuity_root_id,
     current_attempt:current.attempt_count+1,
     remaining_attempts:current.attempt_limit-current.attempt_count,
     frozen_gap:current.confirmed_gap,
     previous_independent_failure:current.independent_failure,
     // Original prior model candidate is untrusted. Its exact source stays
     // paired with the independently verified failure for model correction.
     previous_candidate:current.phase==='REPAIR_REQUIRED'?current.candidate:null,
     no_execution_authority:true,
    }));
    current=await committed(proposeGovernedCandidate(current,candidate),adapters);
    break;
   }
   case 'CANDIDATE_READY':{
    const run=requireAdapter(adapters,'runIsolatedSandbox');
    const result=await run(Object.freeze({
     original_work_id:current.scope.original_work_id,
     artifact_hash:current.candidate.artifact_hash,
     candidate:current.candidate,
     frozen_gap:current.confirmed_gap,
     attempt:current.attempt_count,
     prior_failed_receipt:current.independent_failure,
     network_access:false,production_write_permitted:false,
    }));
    if(!['SANDBOX_FAILED','SANDBOX_VERIFIED'].includes(result?.kind))
     throw Error('SELF_IMPROVEMENT_ISOLATED_VERIFIER_RESULT_REQUIRED');
    current=await committed(await acceptGovernedObservation(current,result,{
     verifyProvider:requireAdapter(adapters,'verifyIndependentReceipt'),
    }),adapters);
    break;
   }
   case 'PROMOTION_AUTHORIZED':
    current=await observe(current,'CAPABILITY_REGISTERED','registerAndReobserve',adapters);
    break;
   case 'CAPABILITY_REGISTERED':
    current=await observe(current,'ORIGINAL_JOB_RESUMED','resumeOriginalWork',adapters);
    break;
   case 'ORIGINAL_JOB_RESUMED':
    current=await observe(current,'ORIGINAL_JOB_SETTLED','settleAndReobserve',adapters);
    break;
   case 'AWAITING_OWNER_APPROVAL':
    return Object.freeze({
     driver_version:GOVERNED_SELF_IMPROVEMENT_DRIVER_VERSION,
     status:'OWNER_APPROVAL_REQUIRED',
     state:current,trace,
     // A model cannot auto-click or fabricate user authorization.
     owner_action_required:true,production_mutation_authorized:false,
     original_job_completed:false,
    });
   case 'ESCALATED':
    return Object.freeze({
     driver_version:GOVERNED_SELF_IMPROVEMENT_DRIVER_VERSION,
     status:'ESCALATED_WITH_FROZEN_EVIDENCE',
     state:current,trace,owner_action_required:decision.action==='REQUEST_OWNER_AUTHORITY',
     original_job_completed:false,
    });
   case 'SETTLED':
    return Object.freeze({
     driver_version:GOVERNED_SELF_IMPROVEMENT_DRIVER_VERSION,
     status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
     state:current,trace,original_job_completed:true,
    });
   default:throw Error('SELF_IMPROVEMENT_UNKNOWN_DRIVER_STAGE');
  }
 }
 return Object.freeze({
  driver_version:GOVERNED_SELF_IMPROVEMENT_DRIVER_VERSION,
  status:'WORK_BUDGET_EXHAUSTED_CHECKPOINT_PRESERVED',
  state:current,trace,original_job_completed:false,
 });
}
