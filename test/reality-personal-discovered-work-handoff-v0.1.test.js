import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {preparePersonalDiscoveredWorkHandoff,listPersonalDiscoveredWorkHandoffs}
 from '../src/reality-personal-discovered-work-handoff-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {verifyPersonalWorkGroundingProof}
 from '../src/reality-personal-work-grounding-proof-v0.1.js';
import endpoint from '../api/reality/personal-discovered-work.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-only-local-credential',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_mock',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'unit-test-only-grounding-key-12345678901234567890',
};
Object.assign(process.env,env);
const principal=randomUUID(),conversationId=randomUUID();
const session={user_id:principal,config:{url}};
const workId='work:'+'a'.repeat(32),goalReceipt=randomUUID();
const refs=[
 'https://github.com/maloney2323/Reality/actions/runs/321',
 'https://github.com/maloney2323/Reality/actions/runs/322',
];
const candidate={
 kind:'SYSTEM_MAINTENANCE',work_id:workId,
 work_key:'workflow-failure:CI regression',
 state:'QUALIFIED',recurring:true,recurrence_count:2,
 authorization_required:true,
 evidence_refs:refs,
 source_observation_ids:['github-workflow-failure:CI regression:321','github-workflow-failure:CI regression:322'],
 last_observed_at:'2026-10-27T12:00:00.000Z',
 execution_work_item:{
  work_item_id:workId,workflow_id:'workflow:'+workId,
  action:'Create a bounded maintenance tracking issue',
  connector:'github',operation:'create_issue',
  inputs:{repository:'maloney2323/Reality',title:'CI regression',body:'Evidence 321 and 322'},
  consequential:true,status:'AWAITING_AUTHORIZATION',
 },
};
const scope=personalGoalScope({userId:principal,conversationId});
const sourceRef='supabase:reality_chat_messages:'+randomUUID();
const state={
 principal_id:principal,continuity_root_id:scope.root,world_id:scope.world,
 authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
 transition_count:1,active_goal_id:'goal:owner-verified',
 assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
 external_execution_authorized:false,
 active_goal:{goal_id:'goal:owner-verified',status:'ACTIVE',user_confirmed:true,
  source_user_message_ref:sourceRef,
  last_transition_receipt_id:goalReceipt,external_execution_authorized:false},
 recent_transition_receipts:[{event_id:goalReceipt,confirmed_by_user:true,
  principal_id:principal}],
};
function setup({work=candidate,authState=state}={}){
 const events=[],calls={discovery:0,readGoal:0,reconstruct:0,append:0};
 const discover=async()=>{calls.discovery++;return {work:work?[work]:[]}};
 const readGoal=async()=>{
  calls.readGoal++;
  return {principal_id:principal,conversation_id:conversationId,scope,
    state:authState};
 };
 const createPersistence=()=>({
  async reconstruct(){calls.reconstruct++;return [...events]},
  async appendEvent(event){
   calls.append++;
   events.push({...event,version:'persisted'});
   return {status:'PERSISTED'};
  },
 });
 return {events,calls,discover,readGoal,createPersistence};
}
function args(s,extra={}){
 return {session,conversationId,discoveredWorkId:workId,env,
  discover:s.discover,readGoal:s.readGoal,
  createPersistence:s.createPersistence,...extra};
}
test('server reobserves selected work and commits a durable source-linked non-authorizing handoff',async()=>{
 const s=setup();
 const got=await preparePersonalDiscoveredWorkHandoff(args(s));
 assert.equal(got.status,'DISCOVERED_WORK_GOAL_GROUNDED_PENDING_APPROVAL');
 assert.equal(got.discovered_work_id,workId);
 assert.equal(got.work_item.work_item_id,workId);
 assert.equal(got.work_item.discovered_work_id,workId);
 assert.equal(got.work_item.discovery_source,'github_actions');
 assert.deepEqual(got.work_item.discovery_evidence_refs,refs);
 assert.equal(got.action_approved,false);
 assert.equal(got.external_action_performed,false);
 assert.equal(s.calls.discovery,1);
 assert.equal(s.calls.readGoal,1);
 assert.equal(s.calls.append,1);
 assert.equal(s.calls.reconstruct,2);
 assert.equal(s.events[0].continuity_root_id,scope.root);
 assert.equal(s.events[0].worldline_id,scope.worldline);
 assert.equal(s.events[0].payload.goal_transition_receipt_id,goalReceipt);
 assert.equal(s.events[0].payload.user_goal_source_ref,sourceRef);
 assert.equal(s.events[0].payload.authority,'NOT_GRANTED');
 assert.equal(got.continuity_receipt_id,s.events[0].event_id);
 const proof=verifyPersonalWorkGroundingProof({proof:got.grounding_proof,
  principalId:principal,conversationId,env});
 assert.equal(proof.status,'PROOF_VALID_FOR_FRESHNESS_ONLY');
 assert.equal(proof.action_authorized,false);
});
test('repeat prepare with the same source and goal preserves the original receipt ID',async()=>{
 const s=setup();const one=await preparePersonalDiscoveredWorkHandoff(args(s));
 const two=await preparePersonalDiscoveredWorkHandoff(args(s));
 assert.equal(one.continuity_receipt_id,two.continuity_receipt_id);
 assert.equal(s.calls.append,1);
});
test('stale or missing source candidate is never substituted with client claims',async()=>{
 const s=setup({work:null});
 await assert.rejects(preparePersonalDiscoveredWorkHandoff(args(s)),
  /DISCOVERED_WORK_SOURCE_NO_LONGER_CURRENT/);
 assert.equal(s.calls.append,0);
});
test('unqualified candidate or out-of-repository evidence cannot enter authority path',async()=>{
 for(const changed of [
  {...candidate,state:'EVIDENCE_NEEDED'},
  {...candidate,evidence_refs:['https://evil.example/actions/runs/1',refs[1]]},
  {...candidate,execution_work_item:{...candidate.execution_work_item,
   inputs:{...candidate.execution_work_item.inputs,repository:'evil/project'}}},
  {...candidate,recurring:false},
 ]){
  const s=setup({work:changed});
  await assert.rejects(preparePersonalDiscoveredWorkHandoff(args(s)),
   /DISCOVERED_WORK_(?:NOT_SOURCE_QUALIFIED|SOURCE_OUT_OF_SCOPE|OPERATION_NOT_APPROVABLE)/);
  assert.equal(s.calls.append,0);
 }
});
test('no goal, altered principal, wrong environment or conversation fails closed',async()=>{
 for(const extra of [
  {env:{...env,VERCEL_ENV:'production'}},
  {session:{user_id:randomUUID(),config:{url}}},
  {conversationId:randomUUID()},
 ]){
  const s=setup();await assert.rejects(preparePersonalDiscoveredWorkHandoff(args(s,extra)));
  assert.equal(s.calls.append,0);
 }
 const s=setup({authState:{...state,active_goal:null}});
 await assert.rejects(preparePersonalDiscoveredWorkHandoff(args(s)),
  /DISCOVERED_WORK_CONFIRM_ACTIVE_GOAL_IN_PRIVATE_CONVERSATION/);
 assert.equal(s.calls.append,0);
});
function mockResponse(){
 const record={status:200,body:null};
 const res={setHeader(){return res},status(v){record.status=v;return res},
  json(v){record.body=v;return res}};
 return {res,record};
}
function req(body,headers={}){
 return {method:'POST',headers:{origin:'https://reality.test',
  host:'reality.test','content-type':'application/json',
  ...headers},body};
}
test('HTTP route rejects browser-supplied work item, goal or authority before any provider',async()=>{
 for(const extra of [
  {work_item:candidate.execution_work_item},
  {authorization:{authorized:true}},
  {goal_id:state.active_goal_id},
  {serverFreshGoalAdmission:{signature:'forged'}},
 ]){
  const {res,record}=mockResponse();
  await endpoint(req({intent:'PREPARE',conversation_id:conversationId,
   discovered_work_id:workId,...extra}),res);
  assert.equal(record.status,400);
  assert.equal(record.body.error,'DISCOVERED_WORK_CLIENT_WORK_OR_AUTHORITY_REJECTED');
  assert.equal(record.body.external_action_performed,false);
 }
});
test('HTTP route rejects untrusted cookie, cross-origin and production configuration',async()=>{
 let r=mockResponse();
 await endpoint(req({intent:'PREPARE',conversation_id:conversationId,
  discovered_work_id:workId},{cookie:'reality_principal=forged'}),r.res);
 assert.equal(r.record.status,401);
 assert.equal(r.record.body.error,'CHAT_SIGN_IN_REQUIRED');
 r=mockResponse();
 await endpoint(req({intent:'PREPARE',conversation_id:conversationId,
  discovered_work_id:workId},{origin:'https://attacker.test'}),r.res);
 assert.equal(r.record.status,403);
 assert.equal(r.record.body.external_action_performed,false);
 const old=process.env.VERCEL_ENV;process.env.VERCEL_ENV='production';
 try{
  r=mockResponse();
  await endpoint(req({intent:'PREPARE',conversation_id:conversationId,
   discovered_work_id:workId}),r.res);
  assert.equal(r.record.status,404);
  assert.equal(r.record.body.external_action_performed,false);
 }finally{process.env.VERCEL_ENV=old}
});
test('Home uses only canonical discovery ID, approval confirmation, freshness check, never generic POST',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes("post('/api/reality/personal-discovered-work'"));
 assert.ok(html.includes("post('/api/reality/personal-action-authority'"));
 assert.ok(html.includes("post('/api/reality/personal-execution-admission'"));
 assert.ok(html.includes("confirmation:'APPROVE_THIS_EXACT_WORK_ITEM'"));
 assert.ok(html.includes("intent:'CHECK'"));
 assert.equal(html.includes("fetch('/api/reality/authority',{method:'POST'"),false);
 assert.equal(html.includes("fetch('/api/reality/execute',{method:'POST'"),false);
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script),'Home JavaScript must parse');
});

test('authenticated Continuity receipt is discoverable after a new request without minting action authority',async()=>{
 const s=setup();
 const prepared=await preparePersonalDiscoveredWorkHandoff(args(s));
 const prior=await listPersonalDiscoveredWorkHandoffs({
  session,conversationId,env,readGoal:s.readGoal,
  createPersistence:s.createPersistence,
 });
 assert.equal(prior.status,'READ_ONLY_DISCOVERED_WORK_CONTINUITY');
 assert.equal(prior.items.length,1);
 assert.equal(prior.items[0].work_id,workId);
 assert.equal(prior.items[0].continuity_receipt_id,prepared.continuity_receipt_id);
 assert.equal(prior.items[0].goal_still_current,true);
 assert.equal(prior.items[0].action_approved_by_handoff,false);
 assert.equal(prior.external_action_performed,false);
});
test('changed goal does not re-authorize a previously recorded work receipt',async()=>{
 const s=setup();await preparePersonalDiscoveredWorkHandoff(args(s));
 const old=s.readGoal;
 const prior=await listPersonalDiscoveredWorkHandoffs({
  session,conversationId,env,createPersistence:s.createPersistence,
  readGoal:async()=>({...await old(),state:{...state,
   active_goal:{...state.active_goal,goal_id:'changed'}}}),
 });
 assert.equal(prior.items[0].goal_still_current,false);
 assert.equal(prior.items[0].action_approved_by_handoff,false);
});
test('readback enforces original signed-in person and private conversation',async()=>{
 const s=setup();await preparePersonalDiscoveredWorkHandoff(args(s));
 await assert.rejects(listPersonalDiscoveredWorkHandoffs({
  session:{...session,user_id:randomUUID()},conversationId,env,
  createPersistence:s.createPersistence,readGoal:s.readGoal,
 }),/DISCOVERED_WORK_CONTINUITY_SCOPE_NOT_VERIFIED/);
 await assert.rejects(listPersonalDiscoveredWorkHandoffs({
  session,conversationId:randomUUID(),env,
  createPersistence:s.createPersistence,readGoal:s.readGoal,
 }),/DISCOVERED_WORK_CONTINUITY_SCOPE_NOT_VERIFIED/);
});
test('read-only GET does not expose personal work receipts without verified session',async()=>{
 const {res,record}=mockResponse();
 await endpoint({method:'GET',headers:{cookie:'reality_principal=not-supabase'},
  query:{conversation_id:conversationId}},res);
 assert.equal(record.status,401);
 assert.equal(record.body.error,'CHAT_SIGN_IN_REQUIRED');
 assert.equal(record.body.external_action_performed,false);
});

test('every Home selector has a real element including live health labels',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ids=new Set([...html.matchAll(/\\bid=["']([^"']+)["']/g)].map(x=>x[1]));
 const selectors=new Set([...html.matchAll(/\\$\\('([^']+)'\\)/g)].map(x=>x[1]));
 const missing=[...selectors].filter(x=>!ids.has(x));
 assert.deepEqual(missing,[],'script must not write textContent into missing nodes');
 for(const id of ['productState','liveHeadline','liveDetail','privateGoalStatus',
  'privateGoalText','privateChat','attentionQueue','workResult'])
  assert.ok(ids.has(id),'missing '+id);
});
test('Home explains missing owner goal and gives a direct navigation action',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('Go to confirmed objective'));
 assert.ok(html.includes("scrollIntoView({behavior:'smooth'"));
 assert.ok(html.includes("No work was authorized or executed"));
 assert.ok(html.includes('DISCOVERED_WORK_CONFIRM_ACTIVE_GOAL_IN_PRIVATE_CONVERSATION'));
});
