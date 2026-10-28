import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import './reality-original-job-recovery-diagnosis-v0.1.test.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine} from '../src/reality-continuity-spine-v2.0.js';
import {
 projectOriginalJobRecoveryLoop,inspectAuthenticatedOriginalJobRecoveryLoop,
} from '../src/reality-real-recovery-coordinator-v0.1.js';
const owner=randomUUID(),conversationId=randomUUID();
const session={user_id:owner,config:{url:'https://example.supabase.co'}};
const work='work:24cda9611404e9bcb47909976067605c';
const scope=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({
 continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:owner,
});
const verifiedEvidence=Object.freeze({
 original_work_id:work,
 recovery_receipt_id:'e54ec3ff-4a8e-5a15-b69d-9e5c592fbc23',
 original_job_completed:false,
 external_action_performed:false,
 execution_authorized:false,
 status:'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED',
 later_success:{run_url:'https://github.com/maloney2323/Reality/actions/runs/40605639502'},
 historical_run_urls:[
  'https://github.com/maloney2323/Reality/actions/runs/40591283500',
 ],
});
const goal={principal_id:owner,conversation_id:conversationId,scope,
 state:{continuity_root_id:spine.continuity_root_id,
  world_id:scope.world,active_goal_id:'goal:real',
  active_goal:{goal_id:'goal:real',status:'ACTIVE',user_confirmed:true}},
};
test('live original-job coordinator calls actual v1 capability cognition with same original identity',async()=>{
 let calls=0;
 const report=await inspectAuthenticatedOriginalJobRecoveryLoop({
  session,conversationId,workId:work,
  env:{VERCEL_ENV:'preview'},
  inspectEvidence:async params=>{
   assert.equal(params.workId,work);assert.equal(params.conversationId,conversationId);
   calls++;return verifiedEvidence;
  },
  readGoal:async()=>goal,
 });
 assert.equal(calls,1);
 assert.equal(report.original_work_id,work);
 assert.equal(report.recovery_receipt_id,verifiedEvidence.recovery_receipt_id);
 assert.equal(report.capability_engine_state,'NO_CAPABILITY_GAP');
 assert.equal(report.current_decision,'RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED');
 assert.equal(report.provider_passing_run,verifiedEvidence.later_success.run_url);
 assert.equal(report.timeline.length,7);
 assert.equal(report.total_stages,7);
 assert.equal(report.real_original_job_restored,true);
 assert.equal(report.real_provider_observation,true);
 assert.equal(report.real_new_upgrade_executed,false);
 assert.equal(report.original_job_resumed,false);
 assert.equal(report.original_job_completed,false);
 assert.equal(report.action_authorized,false);
 assert.equal(report.external_action_performed,false);
});
test('absence of later success blocks upgrade rather than imagining a missing capability',async()=>{
 const report=await inspectAuthenticatedOriginalJobRecoveryLoop({
  session,conversationId,workId:work,env:{VERCEL_ENV:'preview'},
  inspectEvidence:async()=>({
   ...verifiedEvidence,
   status:'NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW',
   later_success:null,
  }),
  readGoal:async()=>goal,
 });
 assert.equal(report.current_decision,'BLOCKED_REQUIRES_ROOT_CAUSE_DIAGNOSIS');
 assert.equal(report.timeline[3].state,'NOT_PROVEN');
 assert.equal(report.timeline[4].state,'BLOCKED_UNPROVEN_GAP');
 assert.equal(report.original_job_completed,false);
});
test('foreign session, changed goal and forged completion are rejected',async()=>{
 await assert.rejects(inspectAuthenticatedOriginalJobRecoveryLoop({
  session:{user_id:'outside'},conversationId,workId:work,
 }),/LIVE_LOOP_AUTHENTICATED_SCOPE_REQUIRED/);
 await assert.rejects(inspectAuthenticatedOriginalJobRecoveryLoop({
  session,conversationId,workId:work,env:{VERCEL_ENV:'preview'},
  inspectEvidence:async()=>verifiedEvidence,
  readGoal:async()=>({...goal,state:{...goal.state,active_goal:{...goal.state.active_goal,status:'CANCELLED'}}}),
 }),/LIVE_LOOP_ORIGINAL_USER_GOAL_UNVERIFIED/);
 assert.throws(()=>projectOriginalJobRecoveryLoop({
  originalWorkId:work,conversationId,
  evidence:{...verifiedEvidence,original_job_completed:true},
  cognitionState:{state:'NO_CAPABILITY_GAP'},goalId:'goal:real',
 }),/LIVE_LOOP_ORIGINAL_WORK_EVIDENCE_REQUIRED/);
});
test('verified later run cannot be substituted from another repository or trust a claimed missing capability',()=>{
 assert.throws(()=>projectOriginalJobRecoveryLoop({
  originalWorkId:work,conversationId,
  evidence:{...verifiedEvidence,later_success:{run_url:'https://github.com/evil/else/actions/runs/1'}},
  cognitionState:{state:'NO_CAPABILITY_GAP'},goalId:'goal:real',
 }),/LIVE_LOOP_PROVIDER_SUCCESS_REF_MISSING/);
 assert.throws(()=>projectOriginalJobRecoveryLoop({
  originalWorkId:work,conversationId,
  evidence:verifiedEvidence,cognitionState:{state:'REACTIVATION_READY'},goalId:'goal:real',
 }),/LIVE_LOOP_UNPROVEN_CAPABILITY_CLASSIFICATION/);
});
test('live endpoint permits only exact authenticated read-only request',()=>{
 const api=readFileSync(new URL('../api/reality/personal-recovery-loop.js',import.meta.url),'utf8');
 assert.match(api,/!\['GET','POST'\]\.includes\(req\.method\)/);
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/recordAuthenticatedRecoveryDiagnosis/);
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/inspectAuthenticatedOriginalJobRecoveryLoop/);
 assert.doesNotMatch(api,/method:'POST'|githubWrite|executeSelfBuild|issueBoundExecutionApproval/);
});
test('user interface runs same original job without approval inference or false completion',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(script);assert.doesNotThrow(()=>new Function(script));
 assert.match(script,/Run recovery loop · Save findings/);
 assert.match(script,/RUN_AND_RECORD_RECOVERY_DIAGNOSIS/);
 assert.match(script,/info\.diagnosis_saved!==true/);
 assert.match(script,/\/api\/reality\/personal-recovery-loop/);
 assert.match(script,/original_job_completed!==false/);
 assert.match(script,/external_action_performed!==false/);
 assert.match(script,/Original job remains unfinished/);
 assert.match(script,/current_decision/);
});
