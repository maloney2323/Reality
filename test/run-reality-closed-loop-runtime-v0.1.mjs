import assert from 'node:assert/strict';
import {runClosedLoopObjective} from '../src/reality-closed-loop-runtime-v0.1.js';

const recursiveResult={executionReceipt:{execution_receipt_hash:'exec',proposal_hash:'action',status:'SUCCEEDED'},targetObservation:{observation_id:'obs',execution_receipt_hash:'exec',evidence_references:['obs-e'],claim:'confirmed'},independentVerification:{verification_id:'ver',target_observation_id:'obs',execution_receipt_hash:'exec',verified:true,method:'independent',evidence_references:['ver-e'],result:'CONFIRMED'},learningDelta:{learning_delta_id:'learn',changed_claims:['confirmed'],evidence_references:['learn-e']},universeUpdate:{universe_learning_update_id:'update',universe_state_id:'state'},nextCognitiveState:{cognitive_state_id:'next'},state:'COMPLETED'};

const result=await runClosedLoopObjective({
 objective:{objectiveId:'objective:test',description:'test',worldId:'world:test',continuityRootId:'root:test',worldlineId:'worldline:test',successCriteria:['confirmed']},
 capability:{
  detectGap:async()=>({gap_id:'gap:test',capability_id:'cap:test',reason:'missing',evidence_refs:['gap-e']}),
  acquire:async()=>({acquisitionId:'acq:test',artifactRefs:['artifact:test'],candidateCapabilityHash:'candidate:test'}),
  verify:async()=>({verificationId:'cap-ver:test',independent:true,passed:true,evidenceRefs:['cap-ver-e']})
 },
 action:{prepare:async()=>({action_hash:'action',authorization_id:'auth:test',authorized_by:'test',scope:'test',expires_at:'2099-01-01T00:00:00Z'})},
 recursive:{run:async()=>recursiveResult}
});

assert.equal(result.state,'COGNITION_RESUMED');
assert.equal(result.objective.authorized_action_hash,'action');
assert.equal(result.objective.execution_receipt_hash,'exec');
assert.equal(result.objective.independent_verification_id,'ver');
assert.equal(result.objective.learning_delta_id,'learn');
assert.equal(result.objective.universe_learning_update_id,'update');
assert.equal(result.objective.next_cognitive_state_id,'next');
console.log(JSON.stringify({test:'closed-loop-runtime-v0.1',state:result.state,exact_action_binding:true,verification_binding:true,learning_binding:true,universe_binding:true,cognition_binding:true},null,2));