import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {
 verifyRealMissingRepairIssue,discoverRealRepairOpportunities,
 authorizeExistingRealRepairWork,
} from '../src/reality-real-repair-opportunity-intake-v1.0.js';
import {projectUnfinishedFromConversation} from '../src/reality-personal-unfinished-work-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
const source='src/reality-extensions/reality-general-execution-receipt.mjs',
 frozen='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js';
const runId=41177409146,sha='8'.repeat(40),issueNumber=188;
const body='Source gap '+source+' Frozen test '+frozen+
 ' Failed GitHub run https://github.com/maloney2323/Reality/actions/runs/'+runId;
const rawTest="import test from 'node:test';import {verifyRealityCompletion} from '../../src/reality-extensions/reality-general-execution-receipt.mjs';test('owner',()=>{});";
const issue={number:issueNumber,title:'Missing real completion verifier',state:'open',
 repository_url:'https://api.github.com/repos/maloney2323/Reality',body};
const run={id:runId,status:'completed',conclusion:'failure',head_sha:sha,
 head_repository:{full_name:'maloney2323/Reality'},event:'push',name:'Frozen original acceptance'};
const jobs={jobs:[{id:1234,run_id:runId,head_sha:sha,
 conclusion:'failure',name:'frozen source acceptance',
 steps:[{name:'Frozen same-work missing capability acceptance',conclusion:'failure'}]}]};
const ROOT='https://api.github.com/repos/maloney2323/Reality/';
function fetcher({existing=false,successful=false,stale=false}={}){
 const calls=[],fetchImpl=async(url,opts={})=>{
  assert.ok(url.startsWith(ROOT),url);assert.equal(opts.method,'GET');
  calls.push(url);
  const path=url.slice(ROOT.length);
  if(path==='issues?state=open&per_page=20')
   return {ok:true,json:async()=>[issue]};
  if(path==='issues/'+issueNumber)return {ok:true,json:async()=>issue};
  if(path==='actions/runs/'+runId)
   return {ok:true,json:async()=>({...run,conclusion:successful?'success':'failure',
    head_sha:stale?'f'.repeat(40):sha})};
  if(path==='actions/runs/'+runId+'/jobs?per_page=100')
   return {ok:true,json:async()=>jobs};
  if(path==='contents/'+frozen+'?ref='+sha)
   return {ok:true,json:async()=>({encoding:'base64',
    content:Buffer.from(rawTest).toString('base64')})};
  if(path==='contents/'+source+'?ref='+sha)
   return existing?{ok:true,json:async()=>({type:'file'})}:
    {ok:false,status:404,json:async()=>({message:'Not found'})};
  throw Error('MOCK_UNEXPECTED_PROVIDER_URL '+path);
 };
 return {fetchImpl,calls};
}
test('real source missing and actual original failed run become discoverable evidence, not owner authority',async()=>{
 const mock=fetcher();
 const found=await verifyRealMissingRepairIssue({issueNumber,fetchImpl:mock.fetchImpl,env:{}});
 assert.equal(found.independently_verified,true);
 assert.equal(found.original_provider_failed_run_id,runId);
 assert.equal(found.source_sha,sha);
 assert.equal(found.source_path,source);
 assert.equal(found.frozen_test_sha256,createHash('sha256').update(rawTest).digest('hex'));
 assert.equal(found.owner_goal_bound,false);
 assert.equal(found.installation_authorized,false);
 assert.equal(found.job_completed,false);
 assert.ok(mock.calls.some(x=>x.includes('/actions/runs/')));
});
test('provider successful/stale run or existing implementation cannot be promoted into work',async()=>{
 for(const x of [{successful:true},{stale:true},{existing:true}]){
  const fake=fetcher(x);
  await assert.rejects(verifyRealMissingRepairIssue({issueNumber,
   fetchImpl:fake.fetchImpl,env:{}}),/REALITY_REAL_REPAIR_/);
 }
});
test('Reality discovers qualifying real open issue and ignores unsigned issue prose',async()=>{
 const fake=fetcher();
 const out=await discoverRealRepairOpportunities({env:{},fetchImpl:fake.fetchImpl});
 assert.equal(out.opportunities.length,1);
 assert.equal(out.opportunities[0].issue_number,issueNumber);
 assert.equal(out.owner_installation_authorized,false);
 assert.equal(out.external_action_performed,false);
});
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-only-local-key',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_mock',
};
Object.assign(process.env,env);
const owner=randomUUID(),conversationId=randomUUID(),goalReceipt=randomUUID();
const session={user_id:owner,config:{url}};
const personal=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({continuityRootId:personal.root,
 worldlineId:personal.worldline,subjectId:owner});
const goalId='user-goal:confirmed:original-repair';
const sourceRef='supabase:reality_chat_messages:'+randomUUID();
function persistable(node){
 return {...node,provenance:{...node.provenance,
  continuity_spine:{version:'reality-continuity-spine-v2.1',
   prior_lineage_hash:node.prior_lineage_hash||null,
   transformation_receipt_id:node.transformation_receipt_id||null,
   source_event_id:node.event_id_source||null,
   source_entity_id:node.entity_id_source||null,
   source_continuity_root_id:node.continuity_root_source||null,
   source_worldline_id:node.worldline_source||null}}};
}
function historySeed(){
 const at='2026-10-31T06:00:00.000Z';
 const first=appendContinuityNode({spine,stage:'RAW_SIGNAL',
  entityId:'original:owner:goal',
  effectiveTime:at,assertionTime:at,payload:{original_user_intent:true}});
 const goal=appendContinuityNode({spine,stage:'VERIFICATION',entityId:goalId,
  eventId:goalReceipt,parentEventId:first.event_id,
  priorLineageHash:first.lineage_hash,effectiveTime:at,assertionTime:at,
  payload:{goal_id:goalId,confirmed:true}});
 return [persistable(first),persistable(goal)];
}
function setup(){
 const events=historySeed(),calls={append:0};
 const readGoal=async()=>({
  principal_id:owner,conversation_id:conversationId,
  persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',
  scope:personal,
  state:{continuity_root_id:spine.continuity_root_id,
   world_id:personal.world,active_goal_id:goalId,
   active_goal:{goal_id:goalId,user_confirmed:true,status:'ACTIVE',
    last_transition_receipt_id:goalReceipt,
    source_user_message_ref:sourceRef}},
 });
 const createPersistence=()=>({
  reconstruct:async()=>[...events],
  appendEvent:async event=>{calls.append++;events.push(persistable(event));},
 });
 const issue=async()=>({
  independently_verified:true,issue_number:issueNumber,
  issue_url:'https://github.com/maloney2323/Reality/issues/'+issueNumber,
  original_provider_failed_run_id:runId,
  original_provider_failed_job_id:1234,source_sha:sha,
  source_path:source,frozen_test_path:frozen,
  frozen_test_sha256:createHash('sha256').update(rawTest).digest('hex'),
  actual_provider_failure_hash:'e'.repeat(64),
 });
 return {events,calls,readGoal,createPersistence,issue};
}
test('signed-in owner confirms new source-backed issue against existing goal and gets durable original-work receipt',async()=>{
 const h=setup();
 const args={session,conversationId,issueNumber,
  expectedFailedRunId:runId,expectedSourceSha:sha,env,
  discoverIssue:h.issue,listConversations:async()=>[{conversation_id:conversationId}],
  readGoal:h.readGoal,createPersistence:h.createPersistence};
 const result=await authorizeExistingRealRepairWork(args);
 assert.equal(result.status,'REAL_OWNER_ORIGINAL_WORK_CONFIRMED');
 assert.equal(result.installation_authorized,false);
 assert.equal(h.calls.append,1);
 const snapshot=await authorizeExistingRealRepairWork(args);
 assert.equal(snapshot.original_work_id,result.original_work_id);
 assert.equal(h.calls.append,1,'no duplicate work on retry');
 const q=projectUnfinishedFromConversation({
  conversationId,events:h.events,
  goal:(await h.readGoal()).state});
 const selected=q.find(x=>x.work_id===result.original_work_id);
 assert.equal(selected.action_completed,true);
 assert.equal(selected.job_completed,false);
 assert.equal(selected.goal_still_current,true);
 assert.equal(selected.issue_url,'https://github.com/maloney2323/Reality/issues/188');
});
test('changed provider source or foreign owner conversation cannot create work',async()=>{
 const h=setup(),args={session,conversationId,issueNumber,
  expectedFailedRunId:runId,expectedSourceSha:'e'.repeat(40),env,
  discoverIssue:h.issue,listConversations:async()=>[{conversation_id:conversationId}],
  readGoal:h.readGoal,createPersistence:h.createPersistence};
 await assert.rejects(authorizeExistingRealRepairWork(args),
  /REALITY_REAL_REPAIR_ISSUE_CHANGED_SINCE_OWNER_REVIEW/);
 await assert.rejects(authorizeExistingRealRepairWork({
  ...args,expectedSourceSha:sha,listConversations:async()=>[],
 }),/REALITY_REAL_REPAIR_EXISTING_OWNER_CONVERSATION_REQUIRED/);
 assert.equal(h.calls.append,0);
});


test('owner-confirmed real source automatically queues one governed trigger under same original work identity',async()=>{
 const h=setup();let calls=0;
 const args={session,conversationId,issueNumber,
  expectedFailedRunId:runId,expectedSourceSha:sha,
  env:{...env,REALITY_GOVERNED_AUTO_TRIGGER_ENABLED:'true'},
  discoverIssue:h.issue,listConversations:async()=>[{conversation_id:conversationId}],
  readGoal:h.readGoal,createPersistence:h.createPersistence,
  enqueueAutoTrigger:async scope=>{
   calls++;
   assert.equal(scope.originalWorkEventId,
    h.events.find(x=>x.entity_type==='reality_original_source_backed_repair_work')?.event_id);
   assert.equal(scope.goalTransitionEventId,goalReceipt);
   assert.equal(scope.evidence.original_provider_failed_run_id,runId);
   assert.equal(scope.env.REALITY_GOVERNED_AUTO_TRIGGER_ENABLED,'true');
   return {status:'PENDING_VERIFIED_GAP_REOBSERVATION',
    original_work_id:scope.originalWorkId,installation_authorized:false,
    original_job_completed:false,new_customer_job_created:false};
  },
 };
 const first=await authorizeExistingRealRepairWork(args);
 const repeated=await authorizeExistingRealRepairWork(args);
 assert.equal(first.original_work_id,repeated.original_work_id);
 assert.equal(first.governed_auto_trigger.status,'PENDING_VERIFIED_GAP_REOBSERVATION');
 assert.equal(first.governed_auto_trigger.original_work_id,first.original_work_id);
 assert.equal(first.installation_authorized,false);
 assert.equal(first.original_job_completed,false);
 assert.equal(calls,2,'idempotent DB upsert, never a new job');
 assert.equal(h.calls.append,1,'original customer work persisted only once');
});
test('failed trigger enqueue never invents a successful upgrade, settlement, or second job',async()=>{
 const h=setup();
 const x=await authorizeExistingRealRepairWork({
  session,conversationId,issueNumber,expectedFailedRunId:runId,expectedSourceSha:sha,
  env:{...env,REALITY_GOVERNED_AUTO_TRIGGER_ENABLED:'true'},
  discoverIssue:h.issue,listConversations:async()=>[{conversation_id:conversationId}],
  readGoal:h.readGoal,createPersistence:h.createPersistence,
  enqueueAutoTrigger:async()=>{throw Error('DATABASE_UNAVAILABLE')},
 });
 assert.equal(x.governed_auto_trigger.status,'TRIGGER_REGISTRATION_NEEDS_READBACK');
 assert.equal(x.original_job_completed,false);
 assert.equal(x.installation_authorized,false);
 assert.equal(h.calls.append,1);
});
