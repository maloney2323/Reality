import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {preparePersonalDiscoveredWorkHandoff,listPersonalDiscoveredWorkHandoffs}
 from '../src/reality-personal-discovered-work-handoff-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from '../src/reality-continuity-spine-v2.0.js';
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
const canonicalSpine=createContinuitySpine({
 continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:principal,
});
// This mock simulates the already-verified authenticated goal ledger with
// real canonical UUIDs and a linked, replayable tail.
function persistable(node,entityType=node.entity_type){
 return {...node,entity_type:entityType,
  provenance:{...node.provenance,
   continuity_spine:{version:'reality-continuity-spine-v2.1',
    prior_lineage_hash:node.prior_lineage_hash||null,
    transformation_receipt_id:node.transformation_receipt_id||null,
    source_event_id:node.event_id_source||null,
    source_entity_id:node.entity_id_source||null,
    source_continuity_root_id:node.continuity_root_source||null,
    source_worldline_id:node.worldline_source||null}},
 };
}
function seededGoalHistory(){
 const at='2026-10-27T12:00:00.000Z';
 const first=appendContinuityNode({
  spine:canonicalSpine,stage:'RAW_SIGNAL',entityId:'test:goal:source',
  eventId:'test:goal:source:event',effectiveTime:at,assertionTime:at,
  payload:{source:'test-authenticated-user-message'},
  provenance:{source:'test-goal-source'},
 });
 const goal=appendContinuityNode({
  spine:canonicalSpine,stage:'VERIFICATION',entityId:'test:goal:verification',
  eventId:goalReceipt,parentEventId:first.event_id,
  priorLineageHash:first.lineage_hash,effectiveTime:at,assertionTime:at,
  payload:{source:'test-verified-owner-goal'},
  provenance:{source:'test-goal-verification'},
 });
 return [persistable(first),persistable(goal)];
}
const state={
 principal_id:principal,continuity_root_id:canonicalSpine.continuity_root_id,
 world_id:scope.world,
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
 const events=seededGoalHistory(),calls={discovery:0,readGoal:0,reconstruct:0,append:0};
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
   const saved=persistable(event);
   events.push(saved);
   return {...saved,status:'PERSISTED'};
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
 const saved=s.events.find(x=>x.entity_type==='personal_discovered_work_handoff');
 assert.ok(saved,'expected appended scoped handoff event');
 assert.equal(saved.continuity_root_id,canonicalSpine.continuity_root_id);
 assert.equal(saved.worldline_id,canonicalSpine.worldline_id);
 assert.equal(saved.entity_id,continuityUuidFromSource(workId));
 assert.equal(saved.event_kind,'OBSERVATION');
 assert.equal(saved.parent_event_id,goalReceipt);
 assert.equal(saved.payload.goal_transition_receipt_id,goalReceipt);
 assert.equal(saved.payload.user_goal_source_ref,sourceRef);
 assert.equal(saved.payload.authority,'NOT_GRANTED');
 assert.equal(got.continuity_receipt_id,saved.event_id);
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
 const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x=>x[1]));
 const selectors=new Set([...html.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]));
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

test('Home guides account, active goal, source review and one explicit required checkbox',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('Approval setup · required steps'));
 for(const name of ['Private sign-in · Required',
  'Confirmed active goal · Required','Source and exact action review · Required',
  'Explicit approval · Required'])
   assert.ok(html.includes(name),name);
 assert.ok(html.includes('id="privateGoalText" required minlength="12" maxlength="700"'));
 assert.ok(html.includes('id="privateEmail" type="email" required'));
 assert.ok(html.includes('id="privatePassword" type="password" required'));
 assert.ok(html.includes("goalField.reportValidity()"));
 assert.ok(html.includes("checkbox.type='checkbox';checkbox.required=true"));
 assert.ok(html.includes("approve.disabled=true"));
 assert.ok(html.includes("checkbox.onchange=()=>{approve.disabled=!checkbox.checked;}"));
 assert.ok(html.includes("if(!checkbox.checked||!checkbox.checkValidity())return"));
 assert.ok(html.includes("cancel.onclick=()=>"));
 assert.ok(html.includes("Go to confirmed objective"));
 assert.ok(html.includes("Approved · Dispatch not enabled"));
});
test('Home checks signed-in goal before preparing source work and never silently executes',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sign=html.indexOf("if($('privateReady')?.style.display!=='block'");
 const goal=html.indexOf("const goalR=await fetch('/api/reality/personal-goals?");
 const prepare=html.indexOf("const prepared=await post('/api/reality/personal-discovered-work'");
 const approval=html.indexOf("const approved=await post('/api/reality/personal-action-authority'");
 const consent=html.indexOf("approve.onclick=async()=>");
 assert.ok(sign>=0&&sign<goal&&goal<prepare&&prepare<consent&&consent<approval);
 assert.equal(html.includes("post('/api/reality/personal-execution-admission',{\n        intent:'RESERVE'"),false);
 assert.equal(html.includes("post('/api/reality/execute'"),false);
 assert.ok(html.includes('No external action performed'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});

test('top-level three-step flow is the first task and optional tools are out of the way',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const start=html.indexOf('id="startFlow"'),account=html.indexOf('id="privateChat"'),
  matrix=html.indexOf('class="reality-matrix"'),
  work=html.indexOf('id="attentionQueue"'),advanced=html.indexOf('id="advancedShift"'),
  prompt=html.indexOf('id="optionalPrompt"');
 assert.ok(start>0&&start<account&&account<matrix&&matrix<work&&work<advanced&&advanced<prompt);
 assert.ok(html.includes('3 steps. That\'s it.'));
 assert.ok(html.includes('You do <strong>not</strong> need to type a Request'));
 for(const id of ['startStep1','startStep2','startStep3',
   'startAction1','startAction2','startAction3',
   'startStatus1','startStatus2','startStatus3','startNext'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('<details class="advanced-option" id="advancedShift"'));
 assert.ok(html.includes('<details class="advanced-option" id="optionalPrompt"'));
});
test('three-step controls respect signed-in goal readback and do not use model claims as authority',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes("guidedSetup.authenticated=yes"));
 assert.ok(html.includes("state.active_goal.user_confirmed===true"));
 assert.ok(html.includes("guidedSetup.goal=confirmedActiveGoal?'confirmed':'missing'"));
 assert.ok(html.includes("guidedSetup.goal='unavailable'"));
 assert.ok(html.includes("if(guidedSetup.goal!=='confirmed')return jumpToWorkSetup('goal')"));
 assert.ok(html.includes("realityWork.click()"));
 assert.ok(html.includes("if(guidedSetup.workFound)$('attentionQueue').scrollIntoView"));
 assert.ok(html.includes("guidedSetup.approved=true;paintGuidedSetup()"));
 assert.ok(html.includes("This preview supports governed discovery, explicit approval, and a separate one-time GitHub issue operation."));
 assert.ok(!html.includes("fetch('/api/reality/execute',{method:'POST'"));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});

test('live schema-compatible handoff uses UUID columns, links goal tail and roundtrips original work ID',async()=>{
 const s=setup();
 const outcome=await preparePersonalDiscoveredWorkHandoff(args(s));
 const saved=s.events.at(-1);
 for(const field of ['event_id','entity_id','continuity_root_id','worldline_id','parent_event_id'])
  assert.match(saved[field],/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
   field+' must match the real database UUID schema');
 assert.equal(saved.payload.work_id,workId);
 assert.equal(saved.event_id,outcome.continuity_receipt_id);
 const readback=await listPersonalDiscoveredWorkHandoffs({
  session,conversationId,env,readGoal:s.readGoal,
  createPersistence:s.createPersistence,
 });
 assert.equal(readback.items[0].work_id,workId);
 assert.equal(readback.items[0].continuity_receipt_id,outcome.continuity_receipt_id);
 assert.equal(readback.external_action_performed,false);
});
test('readback fails closed if stored UUID entity disagrees with immutable work source',async()=>{
 const s=setup();
 await preparePersonalDiscoveredWorkHandoff(args(s));
 s.events.at(-1).entity_id=randomUUID();
 await assert.rejects(listPersonalDiscoveredWorkHandoffs({
  session,conversationId,env,readGoal:s.readGoal,
  createPersistence:s.createPersistence,
 }),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});

test('new chat observations after the owner goal cannot force a stale-tail false rejection',async()=>{
 const s=setup();
 const at='2026-10-27T12:06:00.000Z';
 const newer=appendContinuityNode({
  spine:canonicalSpine,stage:'OBSERVATION',
  entityId:'later-user-chat-observation',
  eventId:'later-user-chat-observation-event',
  parentEventId:s.events.at(-1).event_id,
  priorLineageHash:s.events.at(-1).lineage_hash,
  effectiveTime:at,assertionTime:at,
  payload:{kind:'intervening-observation'},
  provenance:{source:'test-non-goal-chat-observation'},
 });
 s.events.push(persistable(newer));
 const result=await preparePersonalDiscoveredWorkHandoff(args(s));
 assert.equal(result.action_approved,false);
 assert.equal(s.events.at(-1).parent_event_id,newer.event_id);
 assert.equal(s.events.at(-1).payload.goal_transition_receipt_id,goalReceipt);
});
test('browser handoff masks raw database JSON error details to avoid exposing conversation scope',()=>{
 const source=readFileSync(new URL('../api/reality/personal-discovered-work.js',import.meta.url),'utf8');
 assert.ok(source.includes('DISCOVERED_WORK_CONTINUITY_STORAGE_UNAVAILABLE'));
 assert.ok(source.includes("dbFailure?'DISCOVERED_WORK_CONTINUITY_STORAGE_UNAVAILABLE'"));
 assert.ok(!source.includes("error:e.message||'DISCOVERED_WORK_HANDOFF_UNAVAILABLE'"));
});
