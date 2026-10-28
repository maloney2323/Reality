import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {readOwnerOriginalWorkGoalBeforeResume}
 from '../src/reality-owner-upgrade-fresh-goal-v0.1.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-dummy',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'a'.repeat(32);
const home=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({continuityRootId:home.root,
 worldlineId:home.worldline,subjectId:owner});
const goalId='goal:original',goalRev=randomUUID(),candidate='b'.repeat(64);
const session={user_id:owner,config:{url}};
const scope={ownerId:owner,conversationId,workId,candidateSha:candidate,goalRevision:goalRev};
const plan={owner_id:owner,conversation_id:conversationId,
 original_work_id:workId,original_goal_id:goalId,goal_revision:goalRev,
 continuity_root_id:spine.continuity_root_id,worldline_id:spine.worldline_id};
function setup(){
 const history=[],at='2026-10-28T12:00:00.000Z';
 const add=(entityType,payload)=>{
  const prev=history.at(-1);
  const node=appendContinuityNode({spine,stage:'VERIFICATION',
   entityId:workId,eventId:randomUUID(),
   parentEventId:prev?.event_id||null,
   priorLineageHash:prev?.lineage_hash||null,
   effectiveTime:at,assertionTime:at,
   epistemicStatus:'VERIFIED',payload,evidenceRefs:[]});
  history.push({...node,entity_type:entityType,
   provenance:{...node.provenance,continuity_spine:{
    prior_lineage_hash:node.prior_lineage_hash,
    transformation_receipt_id:node.transformation_receipt_id}}});
 };
 add('personal_upgrade_runtime_verified',{
  original_work_id:workId,candidate_sha256:candidate});
 const readGoal=async()=>({
  principal_id:owner,conversation_id:conversationId,scope:home,
  state:{active_goal_id:goalId,active_goal:{
   goal_id:goalId,status:'ACTIVE',user_confirmed:true,
   last_transition_receipt_id:goalRev}},
 });
 const createPersistence=()=>({reconstruct:async()=>history});
 return {history,add,readGoal,createPersistence,
  args:{session,conversationId,scope,plan,env,readGoal,createPersistence}};
}
test('fresh original authenticated goal and verified original capability allow a new separately authorized resume',async()=>{
 const x=setup();const r=await readOwnerOriginalWorkGoalBeforeResume(x.args);
 assert.equal(r.active,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.original_work_id,workId);
 assert.equal(r.from_authenticated_continuity,true);
 assert.equal(r.external_action_performed,false);
});
test('a changed owner goal blocks execution, not silently accepted',async()=>{
 const x=setup();
 await assert.rejects(readOwnerOriginalWorkGoalBeforeResume({
  ...x.args,readGoal:async()=>({...await x.readGoal(),
   state:{active_goal_id:'different',active_goal:{
    goal_id:'different',status:'ACTIVE',user_confirmed:true,
    last_transition_receipt_id:goalRev}}}),
 }),/UPGRADE_FRESH_GOAL_CURRENT_OWNER_INTENT_CHANGED/);
});
test('previous durable original-job settlement refuses another dispatch',async()=>{
 const x=setup();
 x.add('personal_original_job_settlement',{
  original_work_id:workId,original_job_completed:true});
 await assert.rejects(readOwnerOriginalWorkGoalBeforeResume(x.args),
  /UPGRADE_FRESH_GOAL_ALREADY_SETTLED_NO_RETRY/);
});
test('runtime not registered in same original worldline means no resumption',async()=>{
 const x=setup();x.history.splice(0,1);
 await assert.rejects(readOwnerOriginalWorkGoalBeforeResume(x.args),
  /UPGRADE_FRESH_GOAL_ACTIVATION_NOT_IN_ORIGINAL_CONTINUITY/);
});
test('foreign principal or different conversation rejected before provider access',async()=>{
 const x=setup();
 await assert.rejects(readOwnerOriginalWorkGoalBeforeResume({
  ...x.args,session:{user_id:randomUUID(),config:{url}}}),
  /UPGRADE_FRESH_GOAL_AUTHENTICATED_SCOPE_REQUIRED/);
 await assert.rejects(readOwnerOriginalWorkGoalBeforeResume({
  ...x.args,conversationId:randomUUID()}),
  /UPGRADE_FRESH_GOAL_AUTHENTICATED_SCOPE_REQUIRED/);
});
