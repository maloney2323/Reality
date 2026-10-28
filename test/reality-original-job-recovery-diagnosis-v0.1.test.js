import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope}
 from '../src/reality-personal-goal-readback-v0.1.js';
import {recordAuthenticatedRecoveryDiagnosis}
 from '../src/reality-original-job-recovery-diagnosis-v0.1.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'fake-test-key-only',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
};
const owner=randomUUID(),conv=randomUUID(),work='work:'+'d'.repeat(32),goalId='goal:test';
const session={user_id:owner,config:{url}};
const scope=personalGoalScope({userId:owner,conversationId:conv});
const spine=createContinuitySpine({continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:owner});
const checkpoint=randomUUID();
const payload={original_work_id:work,job_completed:false};
const at='2026-10-27T23:24:32.347Z';
const root=appendContinuityNode({
 spine,stage:'RAW_SIGNAL',entityId:work,eventId:randomUUID(),
 effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
 payload:{source:'initial-original-work'},
});
const cp=appendContinuityNode({
 spine,stage:'WORK',entityId:work,eventId:checkpoint,
 parentEventId:root.event_id,priorLineageHash:root.lineage_hash,
 effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',payload,
});
function persisted(ev,type){
 return {...ev,entity_type:type,provenance:{...ev.provenance,
  continuity_spine:{prior_lineage_hash:ev.prior_lineage_hash,
   transformation_receipt_id:ev.transformation_receipt_id}}};
}
const fakeGoal=async()=>({principal_id:owner,conversation_id:conv,scope,
 state:{continuity_root_id:spine.continuity_root_id,active_goal_id:goalId}});
const fakeReport=async()=>({
 original_work_id:work,original_goal_id:goalId,
 recovery_receipt_id:checkpoint,
 real_original_job_restored:true,real_provider_observation:true,
 original_job_completed:false,action_authorized:false,external_action_performed:false,
 provider_status:'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED',
 provider_passing_run:'https://github.com/maloney2323/Reality/actions/runs/40605639502',
 current_decision:'RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED',
 capability_engine_state:'NO_CAPABILITY_GAP',
 completed_stages:3,total_stages:7,
 timeline:[],
});
function harness(){
 const records=[persisted(root,'raw_signal'),persisted(cp,'personal_recovery_checkpoint')];
 let writes=0;
 const createPersistence=()=>({
  reconstruct:async()=>[...records],
  appendEvent:async event=>{writes++;records.push(persisted(event,'personal_recovery_diagnosis'));},
 });
 return {createPersistence,get writes(){return writes},get records(){return records}};
}
test('a real owner-scoped original work diagnosis is persisted, verified and idempotently recovered',async()=>{
 const h=harness();
 const input={session,conversationId:conv,workId:work,env,
  inspect:fakeReport,readGoal:fakeGoal,createPersistence:h.createPersistence};
 const first=await recordAuthenticatedRecoveryDiagnosis(input);
 assert.equal(first.diagnosis_saved,true);
 assert.equal(first.already_recorded,false);
 assert.equal(first.original_work_id,work);
 assert.equal(first.original_job_completed,false);
 assert.equal(h.writes,1);
 const saved=h.records.at(-1);
 assert.equal(saved.payload.original_work_id,work);
 assert.equal(saved.payload.original_job_completed,false);
 assert.equal(saved.payload.new_capability_promoted,false);
 assert.equal(saved.payload.external_action_authorized,false);
 assert.equal(saved.parent_event_id,checkpoint);
 assert.equal(saved.continuity_root_id,spine.continuity_root_id);
 const repeated=await recordAuthenticatedRecoveryDiagnosis(input);
 assert.equal(repeated.diagnosis_receipt_id,first.diagnosis_receipt_id);
 assert.equal(repeated.already_recorded,true);
 assert.equal(h.writes,1);
});
test('changed current goal, missing source or forged completion prevent writes',async()=>{
 const h=harness();
 await assert.rejects(recordAuthenticatedRecoveryDiagnosis({
  session,conversationId:conv,workId:work,env,
  inspect:fakeReport,
  readGoal:async()=>({...await fakeGoal(),state:{continuity_root_id:spine.continuity_root_id,active_goal_id:'different-goal'}}),
  createPersistence:h.createPersistence,
 }),/RECOVERY_DIAGNOSIS_GOAL_SCOPE_CHANGED/);
 await assert.rejects(recordAuthenticatedRecoveryDiagnosis({
  session,conversationId:conv,workId:work,env,
  inspect:async()=>({...await fakeReport(),original_job_completed:true}),
  readGoal:fakeGoal,createPersistence:h.createPersistence,
 }),/RECOVERY_DIAGNOSIS_LIVE_VERIFICATION_REQUIRED/);
 assert.equal(h.writes,0);
});
test('POST route uses exact owner input and browser shows saved readback without claiming finished',()=>{
 const api=readFileSync(new URL('../api/reality/personal-recovery-loop.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/RUN_AND_RECORD_RECOVERY_DIAGNOSIS/);
 assert.match(api,/recordAuthenticatedRecoveryDiagnosis/);
 assert.match(api,/authenticatedChatSession/);
 assert.match(html,/info\.diagnosis_saved!==true/);
 assert.match(html,/Original repair still OPEN/);
 const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
 assert.doesNotThrow(()=>new Function(script));
});

test('the exact stalled 3/7 original job independently persists a scoped capability-candidate receipt, never owner approval',async()=>{
 const records=[];
 const src=appendContinuityNode({
  spine,stage:'RAW_SIGNAL',entityId:work,eventId:randomUUID(),
  effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
  payload:{type:'original-source'},
 });
 records.push(persisted(src,'raw_signal'));
 const handoff=appendContinuityNode({
  spine,stage:'OBSERVATION',entityId:work,eventId:randomUUID(),
  parentEventId:src.event_id,priorLineageHash:src.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
  payload:{work_id:work,goal_id:goalId},
  provenance:{source:'reality-personal-discovered-work-handoff-v0.1',
   principal_id:owner,conversation_id:conv},
 });
 records.push(persisted(handoff,'personal_discovered_work_handoff'));
 const cpId=randomUUID();
 const cp2=appendContinuityNode({
  spine,stage:'WORK',entityId:work,eventId:cpId,
  parentEventId:handoff.event_id,priorLineageHash:handoff.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
  payload:{original_work_id:work,job_completed:false},
 });
 records.push(persisted(cp2,'personal_recovery_checkpoint'));
 let writes=0;
 const createPersistence=()=>({
  reconstruct:async()=>[...records],
  appendEvent:async e=>{
   writes++;
   records.push(persisted(e,e.entity_type));
  },
 });
 const proof='owner-continuity:'+handoff.event_id;
 const gapId='capability_gap:'+'1'.repeat(32);
 const experimentHash='2'.repeat(64);
 const inspect=async()=>({
  ...await fakeReport(),recovery_receipt_id:cpId,
  continuation_probe:{
   state:'CAPABILITY_GAP_CANDIDATE_NEEDS_SANDBOX_VERIFICATION',
   original_work_id:work,stalled_at:'ORIGINAL_JOB_RESUMPTION',
   missing_capability_independently_established:true,
   candidate_capability:'reality.original-repair-execution',
   capability_gap_proof_ref:proof,authorization_granted:false,
   original_job_completed:false,
  },
  continuation_experiment:{
   state:'SANDBOX_PROPOSED_AWAITING_AUTHORIZATION',
   original_work_id:work,capability_id:'reality.original-repair-execution',
   gap_id:gapId,experiment_hash:experimentHash,
   ephemeral_worldline_id:'worldline:ephemeral:'+'3'.repeat(32),
   historical_failure_refs:[proof,
    'https://github.com/maloney2323/Reality/actions/runs/40591283500'],
   verification_suite_ref:'test/reality-original-repair-runtime-capability-readback-v0.1.test.js',
   upgrade_installed:false,model_generation_performed:false,
   original_job_completed:false,
  },
 });
 const args={session,conversationId:conv,workId:work,env,
  inspect,readGoal:fakeGoal,createPersistence};
 const first=await recordAuthenticatedRecoveryDiagnosis(args);
 assert.equal(first.completed_stages,3);
 assert.equal(first.diagnosis_saved,true);
 assert.equal(first.capability_candidate_saved,true);
 assert.ok(first.capability_candidate_receipt_id);
 assert.equal(writes,2);
 const saved=records.at(-1);
 assert.equal(saved.entity_type,'personal_original_repair_capability_candidate');
 assert.equal(saved.epistemic_status,'CORROBORATED');
 assert.equal(saved.payload.original_work_id,work);
 assert.equal(saved.payload.original_goal_id,goalId);
 assert.equal(saved.payload.experiment_hash,experimentHash);
 assert.equal(saved.payload.code_generated,false);
 assert.equal(saved.payload.installation_authorized,false);
 assert.equal(saved.payload.original_job_completed,false);
 assert.equal(saved.provenance.principal_id,owner);
 const second=await recordAuthenticatedRecoveryDiagnosis(args);
 assert.equal(second.capability_candidate_already_recorded,true);
 assert.equal(second.capability_candidate_receipt_id,first.capability_candidate_receipt_id);
 assert.equal(second.already_recorded,true);
 assert.equal(writes,2);
});
