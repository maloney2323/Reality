import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope}
 from '../src/reality-personal-goal-readback-v0.1.js';
import {
 projectPersonalRecoverySource,projectRecoveryCheckpoint,
 persistPersonalRecoveryCheckpoint,inspectPersonalRecoveryCheckpoint,
} from '../src/reality-personal-recovery-checkpoint-v0.1.js';

const project='hvkfreoagbrphwghjajw';
const url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'only-test-no-provider',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
};
const userId=randomUUID(),conversationId=randomUUID();
const session={user_id:userId,config:{url}};
const scope=personalGoalScope({userId,conversationId});
const spine=createContinuitySpine({continuityRootId:scope.root,
 worldlineId:scope.worldline,subjectId:userId});
const workId='work:'+'a'.repeat(32),goalId=randomUUID();
const refs=[
 'https://github.com/maloney2323/Reality/actions/runs/123',
 'https://github.com/maloney2323/Reality/actions/runs/124',
];
const at='2026-10-27T22:00:00.000Z';
function chain(){
 const events=[];
 const append=(stage,entityType,payload,epistemicStatus='OBSERVED',evidenceRefs=[])=>{
  const prev=events.at(-1);
  const ev=appendContinuityNode({
   spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:prev?.event_id||null,
   priorLineageHash:prev?.lineage_hash||null,
   effectiveTime:at,assertionTime:at,
   epistemicStatus,payload,evidenceRefs,
  });
  const event={...ev,entity_type:entityType,
   provenance:{...ev.provenance,continuity_spine:{
    prior_lineage_hash:ev.prior_lineage_hash,
    transformation_receipt_id:ev.transformation_receipt_id,
   }},
  };
  events.push(event);return event;
 };
 append('RAW_SIGNAL','initial_user_goal',{goal_id:goalId});
 const hand=append('OBSERVATION','personal_discovered_work_handoff',{
  work_id:workId,goal_id:goalId,work_key:'workflow-failure:ci',
  work_item:{work_item_id:workId,connector:'github',operation:'create_issue',
   inputs:{repository:'maloney2323/Reality'}},
  evidence_refs:refs,authority:'NOT_GRANTED',external_action_performed:false,
 });
 const out=append('OUTCOME','personal_issue_execution_outcome',{
  work_id:workId,goal_id:goalId,source_receipt_id:hand.event_id,
  reservation_id:randomUUID(),outcome_state:'VERIFIED_OUTCOME',
  independently_verified:true,reservation_state:'VERIFIED',
  provider_issue_number:143,
  provider_issue_url:'https://github.com/maloney2323/Reality/issues/143',
 },'VERIFIED',['https://github.com/maloney2323/Reality/issues/143']);
 return {events,hand,out};
}
const readGoal=async()=>({
 principal_id:userId,conversation_id:conversationId,scope,
 state:{continuity_root_id:spine.continuity_root_id,world_id:scope.world,
  active_goal_id:goalId,active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true}},
});
const harness=(initial)=>{
 const history=[...initial];
 let writes=0;
 return {
  get writes(){return writes},
  get history(){return history},
  createPersistence:()=>({
   reconstruct:async()=>[...history],
   appendEvent:async event=>{
    writes++;
    const stored={...event,provenance:{
     ...event.provenance,continuity_spine:{
      prior_lineage_hash:event.prior_lineage_hash,
      transformation_receipt_id:event.transformation_receipt_id,
     },
    }};
    history.push(stored);return {...stored,status:'PERSISTED'};
   },
  }),
 };
};

test('trusted previously verified issue is a pending REPAIR, not a completed job',()=>{
 const {events}=chain();
 const source=projectPersonalRecoverySource({history:events,workId,activeGoalId:goalId});
 assert.equal(source.original_work_id,workId);
 assert.equal(source.status,'ORIGINAL_REPAIR_UNFINISHED');
 assert.equal(source.blocker_classification,'CAPABILITY_GAP_NOT_YET_PROVEN');
 assert.equal(source.retry_original_issue_creation,false);
 assert.equal(source.job_completed,false);
 const projected=projectRecoveryCheckpoint({history:events,source});
 assert.equal(projected.checkpoint_persisted,false);
 assert.equal(projected.ready_for_governed_execution,false);
});
test('recovery checkpoint durable readback is idempotent with same work, no connector calls',async()=>{
 const {events}=chain();const h=harness(events);
 const args={session,conversationId,workId,env,
  readGoal,createPersistence:h.createPersistence};
 const saved=await persistPersonalRecoveryCheckpoint(args);
 assert.equal(saved.checkpoint_persisted,true);
 assert.equal(saved.state,'RECOVERY_BLOCKED_DURABLY_RECORDED');
 assert.equal(saved.job_completed,false);
 assert.equal(saved.new_external_action_authorized,false);
 assert.equal(h.writes,1);
 const reopened=await inspectPersonalRecoveryCheckpoint(args);
 assert.equal(reopened.checkpoint_receipt_id,saved.checkpoint_receipt_id);
 assert.equal(reopened.checkpoint_persisted,true);
 assert.equal(reopened.original_work_id,workId);
 const repeated=await persistPersonalRecoveryCheckpoint(args);
 assert.equal(repeated.already_recorded,true);
 assert.equal(h.writes,1);
});
test('no verified provider effect means no recovery source',()=>{
 const {events}=chain();
 assert.throws(()=>projectPersonalRecoverySource({
  history:events.slice(0,2),workId,activeGoalId:goalId,
 }),/RECOVERY_EXACT_ORIGINAL_SOURCE_AND_OUTCOME_REQUIRED/);
 const source=events.map(x=>x.entity_type==='personal_issue_execution_outcome'?
  {...x,payload:{...x.payload,outcome_state:'UNRESOLVED'}}:x);
 assert.throws(()=>projectPersonalRecoverySource({history:source,workId,
  activeGoalId:goalId}),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});
test('new goal prevents recording an old job under different authorization',async()=>{
 const {events}=chain();const h=harness(events);
 await assert.rejects(persistPersonalRecoveryCheckpoint({
  session,conversationId,workId,env,
  readGoal:async()=>({
   ...await readGoal(),state:{...((await readGoal()).state),
    active_goal_id:randomUUID()}}),
  createPersistence:h.createPersistence,
 }),/RECOVERY_CONFIRMED_ACTIVE_GOAL_REQUIRED/);
 assert.equal(h.writes,0);
});
test('the checkpoint does not infer a new capability from CI failures',async()=>{
 const {events}=chain();const h=harness(events);
 const saved=await persistPersonalRecoveryCheckpoint({
  session,conversationId,workId,env,readGoal,
  createPersistence:h.createPersistence,
 });
 const event=h.history.find(x=>x.event_id===saved.checkpoint_receipt_id);
 assert.equal(event.payload.blocker_classification,'CAPABILITY_GAP_NOT_YET_PROVEN');
 assert.equal(event.payload.new_external_action_authorized,false);
 assert.equal(event.payload.retry_original_issue_creation,false);
 assert.equal(event.payload.job_completed,false);
});
test('canonical parent hash and scoped principal are enforced',async()=>{
 const {events}=chain();const h=harness(events);
 const saved=await persistPersonalRecoveryCheckpoint({
  session,conversationId,workId,env,readGoal,
  createPersistence:h.createPersistence,
 });
 const event=h.history.find(x=>x.event_id===saved.checkpoint_receipt_id);
 assert.equal(event.parent_event_id,events.at(-1).event_id);
 assert.equal(event.prior_lineage_hash,events.at(-1).lineage_hash);
 assert.equal(event.continuity_root_id,spine.continuity_root_id);
 assert.equal(event.worldline_id,spine.worldline_id);
 assert.equal(event.provenance.principal_id,userId);
});


test('preview route rejects forged work/authorization input and supports only checkpoint/readback',()=>{
 const api=readFileSync(new URL('../api/reality/personal-recovery.js',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/\['intent','conversation_id','work_id'\]/);
 assert.match(api,/body\.intent!=='CHECKPOINT'/);
 assert.match(api,/inspectPersonalRecoveryCheckpoint/);
 assert.match(api,/persistPersonalRecoveryCheckpoint/);
 assert.doesNotMatch(api,/runPersonalIssueDispatch|githubWrite|executeAuthorizedWork/);
});
test('the Work Center recovery button labels the original job unfinished and does not retry issue creation',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(js);
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/Record original job for recovery/);
 assert.match(js,/repair job is still unfinished/);
 assert.match(js,/\/api\/reality\/personal-recovery/);
 assert.match(js,/data-recovery-checkpoint/);
 assert.match(js,/data\.job_completed!==false/);
 assert.match(js,/data\.external_action_performed!==false/);
 assert.match(js,/async function wcHydrateRecoveryCheckpoints/);
 assert.match(js,/method:'POST'/);
 assert.match(js,/if\(data\.reports\.length\)await wcHydrateRecoveryCheckpoints\(conv\)/);
 assert.match(js,/data\.checkpoint_persisted===true/);
 assert.match(js,/data\.checkpoint_persisted===false/);
 assert.match(js,/Recovery checkpoint could not be checked/);
});
