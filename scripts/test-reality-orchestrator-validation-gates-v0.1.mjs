import assert from 'node:assert/strict';
import { buildRealityWorkday } from '../base44/shared/reality-core/workday-controller-v0.1.js';
import { buildOrchestrationDecision, verifyOrchestrationDecision } from '../base44/shared/reality-core/reality-orchestrator-v0.1.js';
import { buildContinuitySnapshot, verifyContinuitySnapshot } from '../base44/shared/reality-core/reality-executor-v0.1.js';

// Gate 1: decision integrity
const wd = await buildRealityWorkday({workday_id:'wd:gate',world_id:'world:gate',objective:'validation',baseline_human_hours:10,created_at:'2026-09-27T00:00:00Z'});
const base={work_unit_id:'wu:gate',workday_id:wd.workday_id,continuity_state_id:'cs:gate',verification_requirements:['VERIFY'],open_debt:[]};
const d1=await buildOrchestrationDecision(base), d2=await buildOrchestrationDecision(base);
assert.equal(d1.decision_digest,d2.decision_digest);
assert.equal((await verifyOrchestrationDecision(d1)).valid,true);
assert.equal((await verifyOrchestrationDecision({...d1,work_unit_id:'wu:tampered'})).failure,'DECISION_DIGEST_MISMATCH');
assert.equal((await verifyOrchestrationDecision({...d1,continuity_state_id:'cs:tampered'})).failure,'DECISION_DIGEST_MISMATCH');

// Gate 2: failure isolation
assert.equal((await buildOrchestrationDecision({work_unit_id:'x',workday_id:'y'})).state,'HALTED');
const failed=await buildOrchestrationDecision({...base,failure:'EXECUTOR_FAILED'});
assert.equal(failed.status,'HALTED');
assert.equal(failed.next_action,'HANDOFF_HUMAN');
assert.equal(failed.execution_authority,false);
assert.equal(failed.mutation_authority,false);
assert.equal(failed.merge_authority,false);
assert.equal(failed.deploy_authority,false);

// Gate 3: authority separation
const exec=await buildOrchestrationDecision({...base,verification_requirements:[],governed_action_required:true});
assert.equal(exec.next_action,'EXECUTE_GOVERNED');
assert.equal(exec.execution_authority,false);
assert.equal((await verifyOrchestrationDecision({...exec,execution_authority:true})).failure,'UNAUTHORIZED_AUTHORITY_ESCALATION');

// Gate 4: transition-equivalence contract
const manual=await buildOrchestrationDecision({...base});
const automated=await buildOrchestrationDecision({...base});
assert.deepEqual(
  {status:manual.status,next_action:manual.next_action,open_verification_requirements:manual.open_verification_requirements,open_debt:manual.open_debt},
  {status:automated.status,next_action:automated.next_action,open_verification_requirements:automated.open_verification_requirements,open_debt:automated.open_debt}
);
assert.equal(manual.decision_digest,automated.decision_digest);

// Continuity snapshot integrity boundary: orchestrator cannot replace ledger verification.
const snapshot=buildContinuitySnapshot({continuity_state_id:'cs:gate',parent_state_id:null,world_id:'world:gate',transition_type:'WORKDAY_START',transition_reason:'validation',evidence_refs:['e:1'],epistemic_state:{status:'SUPPORTED'},open_debt:[],created_at:'2026-09-27T00:00:00Z',status:'VALID'});
assert.equal(verifyContinuitySnapshot(snapshot).valid,true);
assert.equal(verifyContinuitySnapshot({...snapshot,epistemic_state:{status:'ESTABLISHED'}}).valid,false);

console.log('Orchestrator validation gates: 4/4 PASS');
