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
const session={user_id,config:{url}},work='work:24cda9611404e9bcb47909976067605c',
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


test('original #178 historical work is projected from its existing verified gap, never cloned',async()=>{
 const original='work:9b9578b3c65427589c4c6da68fe0fc87';
 const provider='github:actions:run:40962921090:job:123760052647';
 const transition=randomUUID(),evidenceHash='5'.repeat(64);
 const rows=history();
 const append=(stage,entity_type,payload,status='OBSERVED')=>{
  const prior=rows.at(-1);
  const node=appendContinuityNode({
   spine,stage,entityId:original,eventId:randomUUID(),
   parentEventId:prior.event_id,priorLineageHash:prior.lineage_hash,
   effectiveTime:at,assertionTime:at,epistemicStatus:status,payload,
   provenance:{principal_id:user_id,conversation_id:conversationId,
    source:'original-178-legacy-projection-test'},
  });
  rows.push({...node,entity_type});
  return node;
 };
 const originalReceipt=append('WORK','personal_first_self_upgrade_customer_work',{
  version:'reality-personal-first-upgrade-178-v0.1',
  status:'INVESTIGATION_APPROVED_GAP_WORK_NOT_COMPLETED',
  issue_url:'https://github.com/maloney2323/Reality/issues/178',
  issue_number:178,original_work_id:original,
  original_goal_id:goalId,goal_transition_receipt_ref:transition,
  pinned_red_run:'https://github.com/maloney2323/Reality/actions/runs/40962921090',
  gap_provider_receipt_ref:provider,gap_evidence_hash:evidenceHash,
  original_job_completed:false,installation_authorized:false,
 });
 append('OBSERVATION','personal_first_178_confirmed_gap',{
  original_work_id:original,original_source_receipt_ref:originalReceipt.event_id,
  provider_receipt_ref:provider,evidence_hash:evidenceHash,
  goal_id:goalId,owner_id:user_id,authorization_granted:false,
  original_job_completed:false,
 },'VERIFIED');
 const currentGoal={...goal,active_goal:{
  ...goal.active_goal,last_transition_receipt_id:transition}};
 const projected=projectUnfinishedFromConversation({
  conversationId,events:rows,goal:currentGoal,
 }).find(x=>x.original_work_id===original);
 assert.ok(projected,'must use actual original work');
 assert.equal(projected.state,'ORIGINAL_178_VERIFIED_GAP_AWAITING_CANDIDATE_READBACK');
 assert.equal(projected.source_receipt_id,originalReceipt.event_id);
 assert.equal(projected.original_provider_failed_run_id,40962921090);
 assert.equal(projected.job_completed,false);
 assert.equal(projected.can_resume_execution,false);
 const proof={
  independently_verified:true,issue_number:178,
  issue_url:'https://github.com/maloney2323/Reality/issues/178',
  original_failed_run_id:40962921090,
  original_source_sha:'6'.repeat(40),frozen_test_sha256:'b'.repeat(64),
  installed:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,
 };
 const read=async()=>({principal_id:user_id,conversation_id:conversationId,
  scope,state:{...currentGoal,
   continuity_root_id:spine.continuity_root_id,world_id:scope.world}});
 const result=await listAuthenticatedUnfinishedWork({
  session,env,listConversations:async()=>[{conversation_id:conversationId}],
  readGoal:read,createPersistence:()=>({reconstruct:async()=>rows}),
  readLegacyCandidate:async({issueNumber})=>{
   assert.equal(issueNumber,178);return proof;
  },
 });
 const existing=result.jobs.filter(x=>x.original_work_id===original);
 assert.equal(existing.length,1);
 assert.equal(existing[0].state,'REAL_SOURCE_BACKED_REPAIR_PENDING');
 assert.equal(existing[0].source_receipt_id,originalReceipt.event_id);
 assert.equal(existing[0].original_source_sha,proof.original_source_sha);
 assert.equal(existing[0].frozen_test_sha256,proof.frozen_test_sha256);
 assert.equal(existing[0].job_completed,false);
 assert.equal(existing[0].can_resume_execution,false);
 const blocked=await listAuthenticatedUnfinishedWork({
  session,env,listConversations:async()=>[{conversation_id:conversationId}],
  readGoal:read,createPersistence:()=>({reconstruct:async()=>rows}),
  readLegacyCandidate:async()=>({...proof,installation_authorized:true}),
 });
 assert.equal(blocked.jobs.find(x=>x.original_work_id===original).state,
  'ORIGINAL_178_VERIFIED_GAP_AWAITING_CANDIDATE_READBACK');
 const contaminated=rows.map(x=>({...x}));
 contaminated.at(-1).payload={...contaminated.at(-1).payload,owner_id:randomUUID()};
 assert.throws(()=>projectUnfinishedFromConversation({
  conversationId,events:contaminated,goal:currentGoal,
 }),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});
