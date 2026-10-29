import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createContinuitySpine,appendContinuityNode} from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {projectUnfinishedFromConversation,listAuthenticatedUnfinishedWork}
 from '../src/reality-personal-unfinished-work-v0.1.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-scoped-key-not-provider',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
};
const user_id=randomUUID(),conversationId=randomUUID(),otherConversation=randomUUID();
const session={user_id,config:{url}},work='work:'+'c'.repeat(32),
 goalId='user-goal:test-original',at='2026-10-27T22:03:48.291Z';
const issue='https://github.com/maloney2323/Reality/issues/143';
const scope=personalGoalScope({userId:user_id,conversationId});
const spine=createContinuitySpine({
 continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:user_id,
});
function history({checkpoint=false,verified=true,settled=false,invalidSettlementLink=false}={}){
 const entries=[];
 const add=(stage,entity_type,payload,epistemicStatus='OBSERVED')=>{
  const prior=entries.at(-1);
  const receipt=appendContinuityNode({
   spine,stage,entityId:work,
   eventId:randomUUID(),
   parentEventId:prior?.event_id||null,
   priorLineageHash:prior?.lineage_hash||null,
   effectiveTime:at,assertionTime:at,epistemicStatus,payload,
  });
  const saved={...receipt,entity_type,provenance:{
   ...receipt.provenance,continuity_spine:{
    prior_lineage_hash:receipt.prior_lineage_hash,
    transformation_receipt_id:receipt.transformation_receipt_id,
   },
  }};
  entries.push(saved);return saved;
 };
 add('RAW_SIGNAL','raw_signal',{type:'test'});
 const discovery=add('OBSERVATION','personal_discovered_work_handoff',{
  work_id:work,goal_id:goalId,
  work_key:'workflow-failure:governed-ci',
  work_item:{work_item_id:work,connector:'github',operation:'create_issue',
   inputs:{repository:'maloney2323/Reality',title:'Repair failing CI workflows'}},
  evidence_refs:['run-1','run-2'],
  authority:'NOT_GRANTED',external_action_performed:false,
 });
 const outcome=add('OUTCOME','personal_issue_execution_outcome',{
  work_id:work,goal_id:goalId,
  source_receipt_id:discovery.event_id,reservation_id:randomUUID(),
  outcome_state:verified?'VERIFIED_OUTCOME':'UNRESOLVED',
  independently_verified:verified,reservation_state:verified?'VERIFIED':'UNKNOWN',
  provider_issue_number:143,provider_issue_url:issue,
 },verified?'VERIFIED':'UNKNOWN');
 if(checkpoint)add('WORK','personal_recovery_checkpoint',{
  original_work_id:work,
  verified_tracking_outcome_receipt_id:outcome.event_id,
  source_receipt_id:discovery.event_id,
  new_external_action_authorized:false,job_completed:false,
  retry_original_issue_creation:false,
 });
 if(settled){
  const registration=add('CAPABILITY','personal_original_executor_capability_registered',{
   original_work_id:work,original_goal_id:goalId,owner_id:user_id,
   conversation_id:conversationId,
   owner_confirmation:'ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY',
   runtime_activation_verified:true,registration_readback_verified:true,
  },'VERIFIED');
  add('OUTCOME','personal_original_job_final_settlement',{
   original_work_id:work,original_goal_id:goalId,owner_id:user_id,
   conversation_id:conversationId,
   registration_receipt_id:invalidSettlementLink?randomUUID():registration.event_id,
   original_issue_number:143,original_job_completed:true,
   independently_verified:true,
   outcome:'HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED',
  },'VERIFIED');
 }
 return entries;
}
const goal={active_goal_id:goalId,
 active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true}};
const grounded=async()=>({
 principal_id:user_id,conversation_id:conversationId,scope,
 state:{...goal,continuity_root_id:spine.continuity_root_id,world_id:scope.world},
});
test('unfinished projection finds original job without requiring the user to select the old conversation',()=>{
 const rows=projectUnfinishedFromConversation({conversationId,events:history(),goal});
 assert.equal(rows.length,1);
 const item=rows[0];
 assert.equal(item.conversation_id,conversationId);
 assert.equal(item.work_id,work);
 assert.equal(item.issue_url,issue);
 assert.equal(item.action_completed,true);
 assert.equal(item.job_completed,false);
 assert.equal(item.can_save_recovery,true);
 assert.equal(item.can_resume_execution,false);
 assert.equal(item.external_action_performed,false);
 assert.equal(item.state,'TRACKING_DONE_REPAIR_UNFINISHED');
});
test('saved checkpoint is restored and disables duplicate save',()=>{
 const rows=projectUnfinishedFromConversation({conversationId,
  events:history({checkpoint:true}),goal});
 assert.equal(rows[0].state,'RECOVERY_CHECKPOINT_SAVED');
 assert.equal(rows[0].can_save_recovery,false);
 assert.ok(rows[0].recovery_receipt_id);
 assert.equal(rows[0].job_completed,false);
});
test('independently linked registration and settlement exclude original #143 from unfinished work',()=>{
 const entries=history({checkpoint:true,settled:true});
 const rows=projectUnfinishedFromConversation({conversationId,events:entries,goal});
 assert.equal(rows.length,0,'settled job must not be rediscovered for a second reservation');
});
test('unlinked purported settlement cannot silently hide incomplete work',()=>{
 const entries=history({checkpoint:true,settled:true,invalidSettlementLink:true});
 const rows=projectUnfinishedFromConversation({conversationId,events:entries,goal});
 assert.equal(rows.length,1);
 assert.equal(rows[0].job_completed,false);
});
test('changed goal and unresolved provider attempt never allow recovery save',()=>{
 const changed=projectUnfinishedFromConversation({conversationId,events:history(),
  goal:{...goal,active_goal_id:'user-goal:new'}});
 assert.equal(changed[0].goal_still_current,false);
 assert.equal(changed[0].can_save_recovery,false);
 const uncertain=projectUnfinishedFromConversation({conversationId,
  events:history({verified:false}),goal});
 assert.equal(uncertain[0].action_completed,false);
 assert.equal(uncertain[0].can_save_recovery,false);
 assert.equal(uncertain[0].state,'PRIOR_ACTION_UNRESOLVED');
});
test('tampered checkpoint is not accepted as evidence',()=>{
 const rows=history({checkpoint:true});
 const last=rows.at(-1);
 rows[rows.length-1]={...last,payload:{...last.payload,job_completed:true}};
 assert.throws(()=>projectUnfinishedFromConversation({
  conversationId,events:rows,goal}),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});
test('authenticated list traverses RLS-discovered conversations, scopes canonical Continuity, never writes',async()=>{
 const saved=history();
 let calls=0;
 const response=await listAuthenticatedUnfinishedWork({
  session,env,
  listConversations:async()=>[{conversation_id:otherConversation},
   {conversation_id:conversationId}],
  readGoal:async({conversationId:conv})=>{
   if(conv===otherConversation)throw Error('OTHER_CONVERSATION_HAS_NO_GOAL');
   return grounded();
  },
  createPersistence:()=>({reconstruct:async args=>{
   calls++;
   assert.equal(args.continuityRootId,spine.continuity_root_id);
   assert.equal(args.worldlineId,spine.worldline_id);
   return saved;
  }}),
 });
 assert.equal(calls,1);
 assert.equal(response.status,'PARTIAL_COVERAGE');
 assert.equal(response.unreadable_conversations,1);
 assert.equal(response.unfinished_count,1);
 assert.equal(response.jobs[0].work_id,work);
 assert.equal(response.jobs[0].conversation_id,conversationId);
 assert.equal(response.execution_authorized,false);
 assert.equal(response.external_action_performed,false);
});
test('invalid external scope and unsupported environment fail closed',async()=>{
 await assert.rejects(listAuthenticatedUnfinishedWork({
  session:{user_id:'external',config:{url}},env,
 }),/UNFINISHED_AUTHENTICATED_PREVIEW_REQUIRED/);
 await assert.rejects(listAuthenticatedUnfinishedWork({
  session,env:{...env,VERCEL_ENV:'production'},
 }),/UNFINISHED_AUTHENTICATED_PREVIEW_REQUIRED/);
});
test('UI places unfinished work above ending receipts and requires GET before any checkpoint POST',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(script);assert.doesNotThrow(()=>new Function(script));
 assert.ok(html.indexOf('id="wcUnfinishedCenter"')>0);
 assert.ok(html.indexOf('id="wcUnfinishedCenter"')<html.indexOf('id="wcCompletionCenter"'));
 assert.match(script,/\/api\/reality\/personal-unfinished-work/);
 assert.match(script,/wcLoadUnfinishedWork\(\)/);
 assert.match(script,/Save for recovery/);
 assert.match(script,/examined\.checkpoint_persisted===true/);
 assert.match(script,/examined\.state!=='RECOVERY_BLOCKED_NOT_YET_CHECKPOINTED'/);
 assert.match(script,/data\.execution_authorized!==false/);
 assert.match(script,/\/api\/reality\/personal-recovery\?conversation_id=/);
});
test('read-only list endpoint has authenticated session and cannot create work',()=>{
 const api=readFileSync(new URL('../api/reality/personal-unfinished-work.js',import.meta.url),'utf8');
 assert.match(api,/req\.method!=='GET'/);
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/listAuthenticatedUnfinishedWork/);
 assert.doesNotMatch(api,/runPersonalIssueDispatch|create_issue|executeAuthorizedWork|method:'POST'/);
});
