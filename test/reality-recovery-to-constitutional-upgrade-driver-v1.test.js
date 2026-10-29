import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {continueVerifiedRecoveryDiagnosis}
 from '../src/reality-original-job-recovery-diagnosis-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const work='work:24cda9611404e9bcb47909976067605c';
const goalId='user-goal:219764fa8213a41a2ba638c5c2533d5b';
const session={user_id:owner};
const goal={state:{active_goal_id:goalId}};
const spine={continuity_root_id:'root:auth',worldline_id:'worldline:auth'};
const base={original_work_id:work,original_job_completed:false,
 external_action_performed:false,action_authorized:false,
 upgrade_discovery:{status:'CAPABILITY_GAP_CANDIDATE',
  needed_upgrade:'reality.missing-instrument',
  original_job_completed:false,authorization_granted:false,
  capability_installed:false,sandbox_executed:false}};
const state={scope:{owner_id:owner,goal_id:goalId,original_work_id:work,
 continuity_root_id:spine.continuity_root_id,worldline_id:spine.worldline_id}};
test('existing #143 already fixed: recovery POST never fabricates a new upgrade',async()=>{
 const report=await continueVerifiedRecoveryDiagnosis({report:{
  ...base,upgrade_discovery:{...base.upgrade_discovery,status:'NO_NEW_UPGRADE_NEEDED'}}});
 assert.equal(report.self_upgrade_execution_status,'NO_INDEPENDENT_MISSING_CAPABILITY_VERIFIED');
 assert.equal(report.self_upgrade_model_executed,false);
 assert.equal(report.self_upgrade_installed,false);
 assert.equal(report.original_job_completed,false);
});
test('missing independent gap classification is UNKNOWN, never a model generation trigger',async()=>{
 let loaded=false;
 const report=await continueVerifiedRecoveryDiagnosis({
  report:{...base,upgrade_discovery:undefined},
  session,goal,spine,
  loadSelfImprovementState:async()=>{loaded=true;return state},
  trustedSelfImprovementAdapters:{trusted:true}
 });
 assert.equal(loaded,false);
 assert.equal(report.self_upgrade_execution_status,'INDEPENDENT_GAP_DIAGNOSIS_UNAVAILABLE');
 assert.equal(report.original_job_completed,false);
 assert.equal(report.self_upgrade_model_executed,false);
 assert.equal(report.self_upgrade_installed,false);
});
test('candidate gap with no trusted runner safely blocks, without new credential request',async()=>{
 const report=await continueVerifiedRecoveryDiagnosis({report:base});
 assert.equal(report.self_upgrade_execution_status,'TRUSTED_ISOLATED_RUNNER_NOT_CONNECTED');
 assert.equal(report.self_upgrade_model_executed,false);
 assert.equal(report.self_upgrade_installed,false);
});
test('real recovery handoff invokes existing driver only after owner, goal and worldline readback',async()=>{
 let calls=0,reads=0;
 const report=await continueVerifiedRecoveryDiagnosis({
  report:base,session,goal,spine,
  loadSelfImprovementState:async request=>{
   reads++;assert.equal(request.originalWorkId,work);
   assert.equal(request.session.user_id,owner);return state;
  },
  trustedSelfImprovementAdapters:{trusted:true},
  continueUpgrade:async args=>{
   calls++;assert.equal(args.originalWorkId,work);
   assert.equal(args.state,state);
   assert.equal(args.discovery,base.upgrade_discovery);
   return {status:'OWNER_APPROVAL_REQUIRED',original_work_id:work,
    checkpoint_hash:'sha256:verified-checkpoint',
    correction_attempts:2,owner_action_required:true,original_job_completed:false};
  }
 });
 assert.equal(reads,1);assert.equal(calls,1);
 assert.equal(report.self_upgrade_execution_status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(report.self_upgrade_attempt_count,2);
 assert.equal(report.self_upgrade_owner_action_required,true);
 assert.equal(report.self_upgrade_installed,false);
 assert.equal(report.original_job_completed,false);
});
test('changing owner, goal, work or worldline rejects before model invocation',async()=>{
 let called=false;
 for(const field of ['owner_id','goal_id','original_work_id','continuity_root_id','worldline_id']){
  await assert.rejects(continueVerifiedRecoveryDiagnosis({
   report:base,session,goal,spine,
   loadSelfImprovementState:async()=>({scope:{...state.scope,[field]:'other'}}),
   trustedSelfImprovementAdapters:{trusted:true},
   continueUpgrade:async()=>{called=true}
  }),/RECOVERY_DIAGNOSIS_UPGRADE_GOAL_OR_WORK_DRIFT/);
 }
 assert.equal(called,false);
});
test('a claim of completed work or sandbox installation cannot enter self-upgrade',async()=>{
 for(const report of [{...base,original_job_completed:true},
  {...base,upgrade_discovery:{...base.upgrade_discovery,original_job_completed:true}}]){
  await assert.rejects(continueVerifiedRecoveryDiagnosis({report}),
   /RECOVERY_DIAGNOSIS_UPGRADE_HANDOFF_SOURCE_INVALID/);
 }
});
test('same authenticated recovery endpoint calls this direct handoff without new route',()=>{
 const handler=readFileSync('api/reality/personal-recovery-loop.js','utf8');
 const implementation=readFileSync('src/reality-original-job-recovery-diagnosis-v0.1.js','utf8');
 assert.match(handler,/recordAuthenticatedRecoveryDiagnosis/);
 assert.match(handler,/RUN_AND_RECORD_RECOVERY_DIAGNOSIS/);
 assert.match(implementation,/continueVerifiedRealityUpgrade/);
 assert.match(implementation,/return continueVerifiedRecoveryDiagnosis/);
 assert.match(implementation,/typeof loadSelfImprovementState!=='function'/);
 assert.doesNotMatch(handler,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY|dispatchGovernedBuild/);
});
