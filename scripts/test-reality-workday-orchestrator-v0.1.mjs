import assert from 'node:assert/strict';
import { buildRealityWorkday, estimateHumanEffortAvoided, closeRealityWorkday } from '../base44/shared/reality-core/workday-controller-v0.1.js';
import { buildOrchestrationDecision, verifyOrchestrationDecision } from '../base44/shared/reality-core/reality-orchestrator-v0.1.js';

const wd = buildRealityWorkday({ workday_id:'wd:test', world_id:'world:test', objective:'complete governed software work', baseline_human_hours:10, created_at:'2026-09-27T00:00:00Z' });
assert.equal(wd.target_operating_envelope_hours.min, 8);
assert.equal(wd.target_operating_envelope_hours.max, 12);
assert.equal(wd.execution_authority, false);

const d1 = buildOrchestrationDecision({ work_unit_id:'wu:test', workday_id:wd.workday_id, continuity_state_id:'cs:1', verification_requirements:['RUN_TESTS'] });
assert.equal(d1.next_action, 'VERIFY');
assert.equal(verifyOrchestrationDecision(d1).valid, true);

const d2 = buildOrchestrationDecision({ work_unit_id:'wu:test', workday_id:wd.workday_id, continuity_state_id:'cs:1', governed_action_required:true });
assert.equal(d2.next_action, 'EXECUTE_GOVERNED');

const d3 = buildOrchestrationDecision({ work_unit_id:'wu:test', workday_id:wd.workday_id, continuity_state_id:'cs:1', evidence_required:true });
assert.equal(d3.next_action, 'REQUEST_EVIDENCE');

assert.equal(verifyOrchestrationDecision({...d1, execution_authority:true}).failure, 'UNAUTHORIZED_AUTHORITY_ESCALATION');
assert.equal(verifyOrchestrationDecision({...d1, decision_digest:'bad'}).failure, 'DECISION_DIGEST_MISMATCH');

const avoided = estimateHumanEffortAvoided({ baseline_human_hours:10, human_intervention_seconds:3600 });
assert.equal(avoided.value_hours, 9);

const closed = closeRealityWorkday(wd, { verified_work_completed:['task:1'], work_remaining:false });
assert.equal(closed.status, 'COMPLETED');
assert.equal(closed.work_remaining, false);

console.log('Reality Workday + Orchestrator contract suite: PASS');
