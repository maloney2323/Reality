import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readPriorIssueEffectsForPrincipal}
 from '../src/reality-principal-prior-effect-v0.1.js';
import {assertNoPriorPersonalIssueAttempt,ensureNoPriorPersonalIssueAttempt}
 from '../src/reality-personal-issue-dispatch-v0.1.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-only-not-real-database-key',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_test',
};
const user=randomUUID(),session={user_id:user,config:{url}};
const key='workflow-failure:Reality Durable Adversarial Workday — Safe Preflight';
const previousWork='work:'+'1'.repeat(32),currentWork='work:'+'2'.repeat(32);
const previousSource={entity_type:'personal_discovered_work_handoff',
 provenance:{principal_id:user},payload:{
  work_id:previousWork,work_key:key,authority:'NOT_GRANTED',
 }};
const previousOutcome={entity_type:'personal_issue_execution_outcome',
 provenance:{principal_id:user},payload:{
  work_id:previousWork,outcome_state:'UNRESOLVED',
  reservation_state:'UNCERTAIN',
 }};
const newSource={event_id:randomUUID(),entity_type:'personal_discovered_work_handoff',
 provenance:{principal_id:user},payload:{
  work_id:currentWork,work_key:key,authority:'NOT_GRANTED',
 }};
test('cross-conversation prior effect is detected for SAME stable workflow despite changed IDs',async()=>{
 const calls=[];
 const fetchImpl=async(input,options)=>{
  const u=new URL(input);calls.push(u);
  assert.equal(u.hostname,project+'.supabase.co');
  assert.equal(options.method,'GET');
  assert.equal(u.searchParams.get('provenance->>principal_id'),'eq.'+user);
  assert.equal(u.searchParams.get('select'),'entity_type,payload,provenance,event_id');
  assert.equal(u.searchParams.get('limit'),'100');
  const isHandoff=u.searchParams.get('entity_type')==='eq.personal_discovered_work_handoff';
  if(isHandoff){
   assert.equal(u.searchParams.get('payload->>work_key'),'eq.'+key);
   return {ok:true,json:async()=>[previousSource,newSource]};
  }
  assert.equal(u.searchParams.get('entity_type'),'eq.personal_issue_execution_outcome');
  assert.ok(u.searchParams.get('payload->>work_id').includes(previousWork));
  return {ok:true,json:async()=>[previousOutcome]};
 };
 const global=await readPriorIssueEffectsForPrincipal({session,workKey:key,env,fetchImpl});
 assert.equal(calls.length,2);
 assert.equal(global.length,3);
 assert.throws(()=>assertNoPriorPersonalIssueAttempt({
  history:global,discoveredWorkId:currentWork,workKey:key,
 }),/PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY/);
});
test('no historical source or effect gives a READ-ONLY clearance; never grants execution authority',async()=>{
 let queries=0;
 const result=await readPriorIssueEffectsForPrincipal({
  session,env,workKey:key,fetchImpl:async()=>{queries++;return {ok:true,json:async()=>[]}},
 });
 assert.equal(queries,1);assert.deepEqual(result,[]);
 assert.equal(assertNoPriorPersonalIssueAttempt({
  history:[newSource],discoveredWorkId:currentWork,workKey:key,
 }),true);
});
test('history service fails CLOSED on HTTP rejection, truncated pages and principal mismatch',async()=>{
 await assert.rejects(readPriorIssueEffectsForPrincipal({
  session,env,workKey:key,fetchImpl:async()=>({ok:false}),
 }),/PRIOR_EFFECT_HISTORY_READBACK_FAILED_CLOSED/);
 await assert.rejects(readPriorIssueEffectsForPrincipal({
  session,env,workKey:key,fetchImpl:async()=>({
   ok:true,json:async()=>Array(100).fill(previousSource),
  }),
 }),/PRIOR_EFFECT_HISTORY_INCOMPLETE_CLOSED/);
 await assert.rejects(readPriorIssueEffectsForPrincipal({
  session,env,workKey:key,fetchImpl:async()=>({
   ok:true,json:async()=>[{...previousSource,provenance:{principal_id:randomUUID()}}],
  }),
 }),/PRIOR_EFFECT_SOURCE_SCOPE_INVALID_CLOSED/);
});
test('different user and another work key never inherit this principal history',async()=>{
 const otherUser=randomUUID(),other={user_id:otherUser,config:{url}};
 const result=await readPriorIssueEffectsForPrincipal({
  session:other,env,workKey:key,
  fetchImpl:async(input)=>{
   const u=new URL(input);
   assert.equal(u.searchParams.get('provenance->>principal_id'),'eq.'+otherUser);
   return {ok:true,json:async()=>[]};
  },
 });
 assert.deepEqual(result,[]);
 const otherKey='workflow-failure:another-unrelated-maintenance';
 assert.equal(assertNoPriorPersonalIssueAttempt({
  history:[previousSource,previousOutcome],discoveredWorkId:currentWork,workKey:otherKey,
 }),true);
});
test('pre-dispatch gate rejects another conversation even when current worldline has no attempt',async()=>{
 const oldScope=randomUUID(),newConversation=randomUUID();
 const scope=(await import('../src/reality-personal-goal-readback-v0.1.js'))
  .personalGoalScope({userId:user,conversationId:newConversation});
 const {createContinuitySpine}=await import('../src/reality-continuity-spine-v2.0.js');
 const spine=createContinuitySpine({
  continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:user,
 });
 await assert.rejects(ensureNoPriorPersonalIssueAttempt({
  session,conversationId:newConversation,env,
  discoveredWorkId:currentWork,workKey:key,
  persistenceFactory:()=>({reconstruct:async()=>[]}),
  principalHistoryReader:async()=>[previousSource,previousOutcome],
 }),/PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY/);
});
