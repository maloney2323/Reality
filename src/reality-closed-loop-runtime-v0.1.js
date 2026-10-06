import {createObjective,recordCapabilityGap,recordCapabilityAcquisition,verifyCapability,grantAuthority,recordExecution,recordExternalObservation,independentlyVerifyObservation,commitLearning,updateUniverse,resumeCognition} from './reality-closed-loop-objective-v0.1.js';

export const CLOSED_LOOP_RUNTIME_VERSION='0.1.0';

export async function runClosedLoopObjective({objective,capability,action,recursive}={}){
  if(!objective) throw new Error('OBJECTIVE_REQUIRED');
  if(!capability?.detectGap||!capability?.acquire||!capability?.verify) throw new Error('CAPABILITY_RUNTIME_ADAPTERS_REQUIRED');
  if(!action?.prepare) throw new Error('ACTION_PREPARE_ADAPTER_REQUIRED');
  if(!recursive?.run) throw new Error('RECURSIVE_RUNTIME_ADAPTER_REQUIRED');

  let state=createObjective(objective);
  const gap=await capability.detectGap({objective:state});
  if(!gap?.gap_id||!gap?.capability_id||!Array.isArray(gap.evidence_refs)||!gap.evidence_refs.length) throw new Error('CAPABILITY_GAP_ADAPTER_RETURN_INVALID');
  state=recordCapabilityGap(state,{gapId:gap.gap_id,capabilityId:gap.capability_id,reason:gap.reason||'Capability required by objective.',evidenceRefs:gap.evidence_refs});
  state=recordCapabilityAcquisition(state,await capability.acquire({objective:state,gap:state}));
  state=verifyCapability(state,await capability.verify({objective:state,acquisition:state}));

  const prepared=await action.prepare({objective:state,capability:state});
  if(!prepared?.action_hash) throw new Error('ACTION_PREPARATION_HASH_REQUIRED');
  state=grantAuthority(state,{authorizationId:prepared.authorization_id,authorizedBy:prepared.authorized_by,actionHash:prepared.action_hash,scope:prepared.scope,expiresAt:prepared.expires_at});

  const recursiveResult=await recursive.run({objective:state,authority:state,preparedAction:prepared});
  if(!recursiveResult?.executionReceipt) throw new Error('RECURSIVE_EXECUTION_RECEIPT_REQUIRED');
  state=recordExecution(state,{executionReceiptHash:recursiveResult.executionReceipt.execution_receipt_hash,actionHash:prepared.action_hash,status:recursiveResult.executionReceipt.status||recursiveResult.executionReceipt.provider_receipt?.status||'SUCCEEDED',evidenceRefs:recursiveResult.executionReceipt.evidence_references||['execution-receipt']});
  if(state.state==='BLOCKED') return Object.freeze({state:state.state,objective:state,recursiveResult});

  const o=recursiveResult.targetObservation;
  if(!o) throw new Error('RECURSIVE_TARGET_OBSERVATION_REQUIRED');
  state=recordExternalObservation(state,{observationId:o.observation_id,executionReceiptHash:o.execution_receipt_hash,evidenceRefs:o.evidence_references,result:o.claim||o.result});
  const v=recursiveResult.independentVerification;
  if(!v) throw new Error('RECURSIVE_INDEPENDENT_VERIFICATION_REQUIRED');
  state=independentlyVerifyObservation(state,{verificationId:v.verification_id,independentSourceRef:v.independent_source_ref||v.method,targetObservationId:v.target_observation_id,verified:v.verified,evidenceRefs:v.evidence_references,result:v.result});
  const l=recursiveResult.learningDelta;
  if(!l) throw new Error('RECURSIVE_LEARNING_DELTA_REQUIRED');
  state=commitLearning(state,{learningDeltaId:l.learning_delta_id,changedClaims:l.changed_claims,evidenceRefs:l.evidence_references});
  const u=recursiveResult.universeUpdate;
  if(!u) throw new Error('RECURSIVE_UNIVERSE_UPDATE_REQUIRED');
  state=updateUniverse(state,{universeUpdateId:u.universe_learning_update_id,updatedStateId:u.universe_state_id,ledgerEntryHash:l.ledger_entry_hash||l.bitemporal_ledger_entry_hash||'ledger-bound-by-recursive-learning'});
  if(!recursiveResult.nextCognitiveState?.cognitive_state_id) throw new Error('RECURSIVE_NEXT_COGNITIVE_STATE_REQUIRED');
  state=resumeCognition(state,{nextCognitiveStateId:recursiveResult.nextCognitiveState.cognitive_state_id});
  return Object.freeze({state:state.state,objective:state,recursiveResult});
}

export const CLOSED_LOOP_RUNTIME_INVARIANTS=Object.freeze({
  contractWrapsExistingMachinery:true,
  capabilityAcquisitionIsBoundToObjectiveGap:true,
  authorityBindsPreparedActionHash:true,
  recursiveExecutionMustReturnReceipt:true,
  independentVerificationMustBindObservation:true,
  learningMustComeFromRecursiveVerifiedPath:true,
  universeUpdateMustFollowLearning:true,
  cognitionResumeMustFollowUniverseUpdate:true,
});
