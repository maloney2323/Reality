import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContinuitySpine,appendContinuityNode} from '../src/reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from '../src/reality-continuous-reliability-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {preparePersonalDiscoveredWorkHandoff,listPersonalDiscoveredWorkHandoffs}
 from '../src/reality-personal-discovered-work-handoff-v0.1.js';
import {recordAuthenticatedPersonalActionApproval}
 from '../src/reality-personal-action-authority-v0.1.js';
import {prepareAuthenticatedPersonalExecution}
 from '../src/reality-personal-execution-admission-service-v0.1.js';
import {preparePersonalIssueDispatch,runPersonalIssueDispatch,
 recordPersonalIssueExecutionOutcome,ensureNoPriorPersonalIssueAttempt}
 from '../src/reality-personal-issue-dispatch-v0.1.js';
import {reserveAuthenticatedPersonalExecution}
 from '../src/reality-personal-execution-reservation-service-v0.1.js';
import {createPersonalGithubIssueBridge,checkForExistingMaintainerIssue}
 from '../src/reality-personal-github-execution-bridge-v0.1.js';
import {fingerprintApprovedWorkItem}
 from '../src/reality-authority-v1.0.js';
import {deriveNextEvidenceBoundImprovement,recordNextEvidenceBoundImprovement}
 from '../src/reality-verified-improvement-handoff-v0.1.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-only-inmemory-not-real',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test_only',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'inmemory-vertical-proof-signature-00000000000000000000',
 REALITY_GITHUB_TOKEN:'inmemory-provider-only-no-real-token',
};
Object.assign(process.env,env);
const principal=randomUUID(),conversationId=randomUUID();
const session={user_id:principal,config:{url}};
const scope=personalGoalScope({userId:principal,conversationId});
const spine=createContinuitySpine({
 continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:principal,
});
const workId='work:'+'7'.repeat(32),goalId='goal:integration-proof';
const runs=[
 'https://github.com/maloney2323/Reality/actions/runs/101',
 'https://github.com/maloney2323/Reality/actions/runs/102',
];
const work={
 kind:'SYSTEM_MAINTENANCE',work_id:workId,
 work_key:'workflow-failure:isolated-proof-only',
 state:'QUALIFIED',recurring:true,recurrence_count:2,
 authorization_required:true,evidence_refs:runs,
 source_observation_ids:['github:run:101','github:run:102'],
 last_observed_at:'2026-10-27T12:00:00.000Z',
 execution_work_item:{
  work_item_id:workId,workflow_id:'workflow:'+workId,
  action:'Create an exact reviewed maintenance issue in mock GitHub',
  connector:'github',operation:'create_issue',consequential:true,
  status:'AWAITING_AUTHORIZATION',
  inputs:{repository:'maloney2323/Reality',
   title:'Reality recurring work: repair repeated isolated integration test failures',
   body:'<!-- Reality recurring work -->\n### Evidence\n'+runs.join('\n')+
    '\n### Required work\nInvestigate root cause and verify next CI run.'},
 },
};
const discover=async()=>({work:[work]});
function storeFixture(){
 const at=new Date(Date.now()-300000).toISOString();
 const goalReceipt=randomUUID();
 const first=appendContinuityNode({
  spine,stage:'RAW_SIGNAL',entityId:'mock:user:source',
  eventId:'mock:user:source:event',effectiveTime:at,assertionTime:at,
  payload:{source:'mock-signed-in-user-message'},
  provenance:{source:'mock-goal-source'},
 });
 const second=appendContinuityNode({
  spine,stage:'VERIFICATION',entityId:'mock:goal:verification',
  eventId:goalReceipt,parentEventId:first.event_id,
  priorLineageHash:first.lineage_hash,effectiveTime:at,assertionTime:at,
  payload:{source:'mock-owner-confirmed-goal'},
  provenance:{source:'mock-goal-confirmation'},
 });
 const wrap=x=>({...x,provenance:{...x.provenance,continuity_spine:{
  version:'reality-continuity-spine-v2.1',
  prior_lineage_hash:x.prior_lineage_hash||null,
  transformation_receipt_id:x.transformation_receipt_id||null,
  source_event_id:x.event_id_source||null,
  source_entity_id:x.entity_id_source||null,
  source_continuity_root_id:x.continuity_root_source||null,
  source_worldline_id:x.worldline_source||null,
 }}});
 const events=[wrap(first),wrap(second)];
 const authority=[];
 let providerWrites=0,providerReads=0,claims=0,begins=0,settles=0;
 let claimed=false,begun=false,settled=false;
 const reservationId=randomUUID();
 const userMessageId=randomUUID();
 const goalState={
  principal_id:principal,continuity_root_id:spine.continuity_root_id,
  world_id:scope.world,authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  transition_count:1,active_goal_id:goalId,
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,
  active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true,
   source_user_message_ref:'supabase:reality_chat_messages:'+randomUUID(),
   last_transition_receipt_id:goalReceipt,external_execution_authorized:false},
  recent_transition_receipts:[{event_id:goalReceipt,principal_id:principal,confirmed_by_user:true}],
 };
 const readGoal=async()=>({
  principal_id:principal,conversation_id:conversationId,scope,state:goalState,
 });
 const continuityStore={
  async reconstruct(){return [...events]},
  async appendEvent(event){
   const persisted=wrap(event);
   events.push(persisted);return persisted;
  },
 };
 const policyStore={
  async reconstruct(){return [...authority]},
  async appendEvent(e){authority.push({...e});return e;},
 };
 const reservationStore={
  async readEpoch(){return {
   goal_revision:1,goal_transition_event_id:goalReceipt,
   user_message_revision:1,latest_user_request_id:userMessageId,
  }},
  async claim({policyId,workFingerprint,goalId:claimedGoalId}){
   assert.ok(authority.some(e=>e.payload?.policy_id===policyId));
   assert.equal(workFingerprint,fingerprintApprovedWorkItem(
    events.find(e=>e.entity_type==='personal_discovered_work_handoff').payload.work_item));
   assert.equal(claimedGoalId,goalId);
   if(claimed)throw Error('EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY');
   claimed=true;claims++;
   return {status:'RESERVED_NOT_DISPATCHED',reservation_id:reservationId,
    principal_id:principal,conversation_id:conversationId,
    policy_id:policyId,work_fingerprint:workFingerprint};
  },
  async begin({reservationId:id}){
   if(id!==reservationId||!claimed||begun)throw Error('EXECUTION_ALREADY_CONSUMED');
   begun=true;begins++;
   return {status:'DISPATCHING',reservation_id:reservationId,single_use_claim_consumed:true};
  },
  async settle({reservationId:id,outcome}){
   if(id!==reservationId||!begun||settled)throw Error('EXECUTION_ALREADY_SETTLED');
   assert.equal(outcome,'VERIFIED');
   settled=true;settles++;
   return {status:outcome,reservation_id:reservationId};
  },
 };
 const issues=new Map();
 const readGithub=async path=>{
  providerReads++;
  if(path==='/repos/maloney2323/Reality/issues?state=open&per_page=100')
   return [...issues.values()];
  if(path==='/repos/maloney2323/Reality/issues/8401')
   return issues.get(8401)||null;
  throw Error('TEST_PROVIDER_QUERY_OUT_OF_SCOPE');
 };
 const writeGithub=async(path,method,body)=>{
  providerWrites++;
  assert.equal(path,'/repos/maloney2323/Reality/issues');
  assert.equal(method,'POST');
  assert.deepEqual(Object.keys(body).sort(),['body','title']);
  const issue={id:40001,number:8401,
   title:body.title,body:body.body,state:'open',
   html_url:'https://github.com/maloney2323/Reality/issues/8401'};
  issues.set(issue.number,issue);
  return {...issue};
 };
 return {events,authority,readGoal,continuityStore,policyStore,
  reservationStore,readGithub,writeGithub,stats:()=>({
   providerWrites,providerReads,claims,begins,settles,
   issueCount:issues.size,
  }),goalReceipt,goalState,reservationId};
}
test('SINGLE CONTIGUOUS vertical slice: source discovery → confirmed goal → exact approval → atomic claim → mocked GitHub POST → independent GET → durable outcome',async()=>{
 const s=storeFixture();
 const handoff=await preparePersonalDiscoveredWorkHandoff({
  session,conversationId,discoveredWorkId:workId,env,
  discover,readGoal:s.readGoal,createPersistence:()=>s.continuityStore,
 });
 assert.equal(handoff.status,'DISCOVERED_WORK_GOAL_GROUNDED_PENDING_APPROVAL');
 assert.equal(handoff.action_approved,false);
 assert.equal(s.stats().providerWrites,0);
 const approved=await recordAuthenticatedPersonalActionApproval({
  session,conversationId,workItem:handoff.work_item,
  groundingProof:handoff.grounding_proof,
  confirmedAction:'APPROVE_THIS_EXACT_WORK_ITEM',
  env,readGoal:s.readGoal,persistence:s.policyStore,
 });
 assert.equal(approved.action_approved_for_this_exact_goal,true);
 assert.equal(s.stats().providerWrites,0);
 const listHandoffs=opts=>listPersonalDiscoveredWorkHandoffs({
  ...opts,readGoal:s.readGoal,createPersistence:()=>s.continuityStore,
 });
 const prepareAdmission=opts=>prepareAuthenticatedPersonalExecution({
  ...opts,readGoal:s.readGoal,createPersistence:()=>s.policyStore,
 });
 const prepare=opts=>preparePersonalIssueDispatch({
  ...opts,discover,listHandoffs,readGoal:s.readGoal,
  prepare:prepareAdmission,
  ensureNoPrior:args=>ensureNoPriorPersonalIssueAttempt({
   ...args,persistenceFactory:()=>s.continuityStore,
  }),
 });
 const reserve=opts=>reserveAuthenticatedPersonalExecution({
  ...opts,prepare:prepareAdmission,storeFactory:()=>s.reservationStore,
 });
 const recordOutcome=opts=>recordPersonalIssueExecutionOutcome({
  ...opts,persistenceFactory:()=>s.continuityStore,
 });
 const bridgeFactory=()=>createPersonalGithubIssueBridge({
  get:s.readGithub,write:s.writeGithub,
 });
 const result=await runPersonalIssueDispatch({
  session,conversationId,discoveredWorkId:workId,env,
  confirmation:'EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE',
  prepare,reserve,recordOutcome,bridgeFactory,
  checkDuplicate:item=>checkForExistingMaintainerIssue(item,{get:s.readGithub}),
 });
 assert.equal(result.status,'VERIFIED',JSON.stringify(result));
 assert.equal(result.verified,true);
 assert.equal(result.provider_issue_url,'https://github.com/maloney2323/Reality/issues/8401');
 assert.ok(result.outcome_receipt_id);
 const stats=s.stats();
 assert.equal(stats.providerWrites,1);
 assert.ok(stats.providerReads>=2,'separate preflight and independent provider GET');
 assert.equal(stats.issueCount,1);
 assert.equal(stats.claims,1);
 assert.equal(stats.begins,1);
 assert.equal(stats.settles,1);
 const reconstructed=orderContinuityHistory(await s.continuityStore.reconstruct());
 const outcome=reconstructed.find(x=>x.event_id===result.outcome_receipt_id);
 assert.ok(outcome);
 assert.equal(outcome.entity_type,'personal_issue_execution_outcome');
 assert.equal(outcome.payload.outcome_state,'VERIFIED_OUTCOME');
 assert.equal(outcome.payload.independently_verified,true);
 assert.equal(outcome.payload.reservation_state,'VERIFIED');
 assert.equal(outcome.payload.source_receipt_id,handoff.continuity_receipt_id);
 const next=deriveNextEvidenceBoundImprovement({
  history:reconstructed,workId,
 });
 assert.equal(next.verified_outcome_receipt_id,result.outcome_receipt_id);
 assert.equal(next.status,'PROPOSED_REQUIRES_INDEPENDENT_TEST_AND_USER_APPROVAL');
 assert.equal(next.underlying_failure_repaired,false);
 assert.equal(next.improvement_applied,false);
 assert.equal(next.customer_business_value_verified,false);
 assert.equal(next.authority,'NOT_GRANTED');
 const persistedLearning=await recordNextEvidenceBoundImprovement({
  session,conversationId,workId,env,
  persistenceFactory:()=>s.continuityStore,
 });
 assert.equal(persistedLearning.receipt_id,next.proposal_id);
 assert.equal(persistedLearning.already_recorded,false);
 const idempotentLearning=await recordNextEvidenceBoundImprovement({
  session,conversationId,workId,env,
  persistenceFactory:()=>s.continuityStore,
 });
 assert.equal(idempotentLearning.receipt_id,next.proposal_id);
 assert.equal(idempotentLearning.already_recorded,true);
 const finalHistory=orderContinuityHistory(await s.continuityStore.reconstruct());
 const learning=finalHistory.find(x=>x.event_id===next.proposal_id);
 assert.equal(learning.event_kind,'LEARNING');
 assert.equal(learning.payload.authority,'NOT_GRANTED');
 assert.equal(learning.payload.improvement_tested,false);
 assert.equal(learning.payload.improvement_applied,false);
 assert.equal(learning.payload.customer_business_value_verified,false);
 await assert.rejects(prepare({
  session,conversationId,discoveredWorkId:workId,env,
 }),/PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY/);
 assert.equal(s.stats().providerWrites,1);
});

test('unverified or absent provider outcome cannot generate an improvement claim',async()=>{
 const s=storeFixture();
 const observedHistory=await s.continuityStore.reconstruct();
 assert.throws(()=>deriveNextEvidenceBoundImprovement({
  history:observedHistory,workId,
 }),/IMPROVEMENT_ONE_VERIFIED_OUTCOME_REQUIRED/);
 const tainted=[...observedHistory,{
  entity_type:'personal_issue_execution_outcome',event_kind:'OUTCOME',
  epistemic_status:'UNKNOWN',event_id:randomUUID(),payload:{
   work_id:workId,outcome_state:'UNRESOLVED',
   independently_verified:false,reservation_state:'UNCERTAIN',
   provider_issue_url:null,
  },
 }];
 assert.throws(()=>deriveNextEvidenceBoundImprovement({
  history:tainted,workId,
 }),/IMPROVEMENT_INDEPENDENTLY_VERIFIED_EXECUTION_REQUIRED|RELIABILITY_/);
});
