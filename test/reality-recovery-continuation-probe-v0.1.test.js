import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {probeStalledOriginalRepair}
 from '../src/reality-recovery-continuation-probe-v0.1.js';
import {projectOriginalJobRecoveryLoop,inspectAuthenticatedOriginalJobRecoveryLoop}
 from '../src/reality-real-recovery-coordinator-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine} from '../src/reality-continuity-spine-v2.0.js';
const work='work:24cda9611404e9bcb47909976067605c';
const conversationId=randomUUID(),owner=randomUUID();
const evidence={original_work_id:work,
 recovery_receipt_id:randomUUID(),original_job_completed:false,
 external_action_performed:false,execution_authorized:false,
 status:'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED',
 later_success:{run_url:'https://github.com/maloney2323/Reality/actions/runs/40605639502'},
 historical_run_urls:['https://github.com/maloney2323/Reality/actions/runs/40591283500']};
const cognitionState={state:'NO_CAPABILITY_GAP'};
test('3/7 historical CI recovery triggers original-work executor investigation, NOT false "all capabilities present"',()=>{
 const result=projectOriginalJobRecoveryLoop({
  originalWorkId:work,conversationId,evidence,cognitionState,goalId:'original-goal',
 });
 assert.equal(result.completed_stages,3);
 assert.equal(result.continuation_probe.stalled_at,'ORIGINAL_JOB_RESUMPTION');
 assert.equal(result.continuation_probe.previously_verified_stages,3);
 assert.equal(result.continuation_probe.state,
  'EXECUTION_CAPABILITY_REQUIRES_INDEPENDENT_INVESTIGATION');
 assert.equal(result.continuation_probe.historical_workflow_correction_is_job_completion,false);
 assert.equal(result.continuation_probe.missing_capability_independently_established,false);
 assert.equal(result.continuation_probe.upgrade_executed,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.real_new_upgrade_executed,false);
 assert.equal(result.timeline.length,7);
});
test('a separately verified missing repair executor becomes a gap candidate, not automatic signed upgrade',()=>{
 const proof={original_work_id:work,independently_reobserved:true,
  executor_status:'MISSING',
  evidence_ref:'https://github.com/maloney2323/Reality/actions/runs/40880012345'};
 const r=probeStalledOriginalRepair({
  originalWorkId:work,evidence,completedStages:3,runtimeProof:proof});
 assert.equal(r.state,'CAPABILITY_GAP_CANDIDATE_NEEDS_SANDBOX_VERIFICATION');
 assert.equal(r.candidate_capability,'reality.original-repair-execution');
 assert.equal(r.missing_capability_independently_established,true);
 assert.equal(r.authorization_granted,false);
 assert.equal(r.upgrade_executed,false);
 assert.equal(r.original_job_completed,false);
});
test('when original-work executor independently exists, resume job instead of inventing an upgrade',()=>{
 const r=probeStalledOriginalRepair({
  originalWorkId:work,evidence,completedStages:3,
  runtimeProof:{original_work_id:work,independently_reobserved:true,
   executor_status:'AVAILABLE',evidence_ref:'receipt:verified-runtime-123'}});
 assert.equal(r.state,'ORIGINAL_REPAIR_EXECUTOR_AVAILABLE');
 assert.equal(r.independent_executor_verified,true);
 assert.equal(r.candidate_capability,null);
 assert.equal(r.original_job_completed,false);
});
test('unverified or foreign runtime proof cannot be a capability discovery trigger',()=>{
 for(const bad of [
  {original_work_id:work,independently_reobserved:false,
   executor_status:'MISSING',evidence_ref:'receipt:missing'},
  {original_work_id:'work:'+'a'.repeat(32),independently_reobserved:true,
   executor_status:'MISSING',evidence_ref:'receipt:missing'},
  {original_work_id:work,independently_reobserved:true,
   executor_status:'MISSING',evidence_ref:''},
  {original_work_id:work,independently_reobserved:true,
   executor_status:'UNKNOWN',evidence_ref:'receipt:missing'},
 ]){
  assert.throws(()=>probeStalledOriginalRepair({
   originalWorkId:work,evidence,completedStages:3,runtimeProof:bad,
  }),/RECOVERY_PROBE_RUNTIME_PROOF_INVALID/);
 }
});
test('public historical passing workflow is not enough to claim repair completion',()=>{
 assert.throws(()=>probeStalledOriginalRepair({
  originalWorkId:work,evidence:{...evidence,original_job_completed:true},
  completedStages:3}),/RECOVERY_PROBE_ORIGINAL_WORK_NOT_VERIFIED/);
 assert.throws(()=>probeStalledOriginalRepair({
  originalWorkId:work,evidence:{...evidence,
   later_success:{run_url:'https://github.com/other/repo/actions/runs/1'}},
  completedStages:3}),/RECOVERY_PROBE_HISTORICAL_PASS_REF_REQUIRED/);
});
test('real authenticated recovery coordinator now exposes the same original-work stall probe',async()=>{
 const scope=personalGoalScope({userId:owner,conversationId});
 const spine=createContinuitySpine({
  continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:owner});
 const session={user_id:owner};
 const fresh={principal_id:owner,conversation_id:conversationId,scope,
  state:{continuity_root_id:spine.continuity_root_id,world_id:scope.world,
   active_goal_id:'goal:original',
   active_goal:{goal_id:'goal:original',status:'ACTIVE',user_confirmed:true}}};
 const r=await inspectAuthenticatedOriginalJobRecoveryLoop({
  session,conversationId,workId:work,env:{VERCEL_ENV:'preview'},
  inspectEvidence:async()=>evidence,readGoal:async()=>fresh,
 });
 assert.equal(r.continuation_probe.original_work_id,work);
 assert.equal(r.continuation_probe.state,
  'EXECUTION_CAPABILITY_REQUIRES_INDEPENDENT_INVESTIGATION');
 assert.equal(r.current_decision,'RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED');
 assert.equal(r.original_job_resumed,false);
});

test('recovery UI shows the original-work automation gap investigation, not just historical workflow pass',async()=>{
 const {readFileSync}=await import('node:fs');
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(page,/Original job automation · /);
 assert.match(page,/Capability investigation: /);
 assert.match(page,/Missing capability verified: /);
 assert.match(page,/Historical workflow corrected\. Investigate how Reality executes and verifies the original repair/);
 assert.doesNotMatch(page,/Verify root cause and original job acceptance; no new upgrade required\./);
});
