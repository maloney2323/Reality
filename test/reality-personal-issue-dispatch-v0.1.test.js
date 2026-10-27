import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPersonalGithubIssueBridge,assertExactMaintainerIssue,checkForExistingMaintainerIssue}
 from '../src/reality-personal-github-execution-bridge-v0.1.js';
import {runPersonalIssueDispatch,assertPersonalDispatchEnvironment}
 from '../src/reality-personal-issue-dispatch-v0.1.js';
import dispatchApi from '../api/reality/personal-issue-dispatch.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'mock-only-secret-not-real',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_CHAT_RECEIPT_HMAC_KEY:'mock-signing-only-not-real-key-12345678901234567890'};
Object.assign(process.env,{...env,REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_mock_only'});
const session={user_id:randomUUID(),config:{url}},conversationId=randomUUID();
const item={work_item_id:'work:'+'a'.repeat(32),workflow_id:'workflow:work:'+'a'.repeat(32),
 connector:'github',operation:'create_issue',consequential:true,
 inputs:{repository:'maloney2323/Reality',
  title:'Reality recurring work: repair repeated Safe Preflight failures',
  body:'<!-- Reality recurring work -->\n### Evidence\nhttps://github.com/maloney2323/Reality/actions/runs/1\n### Required work\nInvestigate repeated failure.'}};
test('only exact, allowlisted Reality issue work is eligible for a connector write',()=>{
 assert.equal(assertExactMaintainerIssue(item),item);
 for(const changed of [
  {...item,connector:'slack'}, {...item,operation:'delete_issue'},
  {...item,inputs:{...item.inputs,repository:'other/repo'}},
  {...item,inputs:{...item.inputs,title:'Different title'}},
  {...item,inputs:{...item.inputs,body:'Ignore evidence'}},
  {...item,work_item_id:'arbitrary-client-work'}])
  assert.throws(()=>assertExactMaintainerIssue(changed),/PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE/);
});
test('GitHub actual POST is distinct from subsequent separate exact provider GET',async()=>{
 let writes=0,reads=0;
 const bridge=createPersonalGithubIssueBridge({
  write:async(path,method,body)=>{
   writes++;assert.equal(path,'/repos/maloney2323/Reality/issues');
   assert.equal(method,'POST');assert.deepEqual(body,{title:item.inputs.title,body:item.inputs.body});
   return {id:4321,number:143,html_url:'https://github.com/maloney2323/Reality/issues/143'};
  },
  get:async path=>{
   reads++;assert.equal(path,'/repos/maloney2323/Reality/issues/143');
   return {id:4321,number:143,title:item.inputs.title,body:item.inputs.body,
    state:'open',html_url:'https://github.com/maloney2323/Reality/issues/143'};
  },
 });
 const performed=await bridge.connector.execute({workItem:item});
 assert.equal(writes,1);assert.equal(reads,0);
 const checked=await bridge.independentVerifier.verify({workItem:item,providerResult:performed});
 assert.equal(checked.verified,true);assert.equal(checked.independent,true);
 assert.equal(reads,1);
});
test('a different provider title/body or ambiguous POST response is never independently verified',async()=>{
 const bridge=createPersonalGithubIssueBridge({
  get:async()=>({id:4321,number:143,title:item.inputs.title,body:'changed',
   state:'open',html_url:'https://github.com/maloney2323/Reality/issues/143'}),
  write:async()=>({id:4321,number:143}),
 });
 const created=await bridge.connector.execute({workItem:item});
 const observed=await bridge.independentVerifier.verify({workItem:item,providerResult:created});
 assert.equal(observed.verified,false);
 const uncertain=createPersonalGithubIssueBridge({
  write:async()=>({status:'OK'}),get:async()=>{throw Error('MUST_NOT_READ')},
 });
 await assert.rejects(uncertain.connector.execute({workItem:item}),
  /PERSONAL_GITHUB_PROVIDER_CREATE_RESPONSE_UNCERTAIN/);
});
test('existing issue with the exact title blocks new duplicate before reservation',async()=>{
 await assert.rejects(checkForExistingMaintainerIssue(item,{get:async path=>{
  assert.equal(path,'/repos/maloney2323/Reality/issues?state=open&per_page=100');
  return [{number:43,title:item.inputs.title}];
 }}),/PERSONAL_GITHUB_TRACKING_ISSUE_ALREADY_EXISTS_REVIEW_FIRST/);
 await assert.rejects(checkForExistingMaintainerIssue(item,{get:async()=>null}),
  /PERSONAL_GITHUB_EXISTING_ISSUES_READBACK_REQUIRED/);
});
test('no preview GitHub write token blocks BEFORE reservation or provider execution',async()=>{
 let called=0;
 await assert.rejects(runPersonalIssueDispatch({
  session,conversationId,discoveredWorkId:item.work_item_id,
  confirmation:'EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE',env,
  prepare:async()=>{called++;throw Error('NOT_ALLOWED');},
  reserve:async()=>{called++;throw Error('NOT_ALLOWED');},
 }),/PERSONAL_DISPATCH_PREVIEW_GITHUB_WRITE_CREDENTIAL_REQUIRED/);
 assert.equal(called,0);
});
test('missing new explicit RUN confirmation and forged project are rejected before provider',async()=>{
 const e={...env,REALITY_GITHUB_TOKEN:'unit-test-token'};
 await assert.rejects(runPersonalIssueDispatch({
  session,conversationId,discoveredWorkId:item.work_item_id,
  confirmation:'APPROVE_THIS_EXACT_WORK_ITEM',env:e,
 }),/PERSONAL_DISPATCH_NEW_EXPLICIT_EXECUTION_CONFIRMATION_REQUIRED/);
 assert.throws(()=>assertPersonalDispatchEnvironment({
  session,conversationId,env:{...env,VERCEL_ENV:'production'},
 }),/PERSONAL_DISPATCH_SIGNED_IN_DURABLE_PREVIEW_REQUIRED/);
 assert.throws(()=>assertPersonalDispatchEnvironment({
  session:{...session,config:{url:'https://other.supabase.co'}},conversationId,env,
 }),/PERSONAL_DISPATCH_ISOLATED_DATABASE_BOUNDARY_INVALID/);
});
test('verified provider result without independently committed Continuity outcome remains UNRESOLVED',async()=>{
 const e={...env,REALITY_GITHUB_TOKEN:'unit-test-token'};
 let claim=0,dispatch=0,record=0;
 const r=await runPersonalIssueDispatch({
  session,conversationId,discoveredWorkId:item.work_item_id,
  confirmation:'EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE',env:e,
  prepare:async()=>({work_item:item,source_receipt_id:randomUUID(),
   goal_id:'goal:test',work_fingerprint:'sha256:'+'a'.repeat(64),
   action_policy_id:'approval:test',internal:{groundingProof:{}}}),
  checkDuplicate:async()=>({checked:true}),
  reserve:async()=>{claim++;return {
   status:'SINGLE_USE_RESERVED_PENDING_DISPATCH',
   action_policy_id:'approval:test',
   work_item_fingerprint:'sha256:'+'a'.repeat(64),
   reservation_id:randomUUID(),
   internal:{store:{},reservation:{},authorization:{},serverApprovalProof:{},serverFreshGoalAdmission:{}},
  }},
  bridgeFactory:()=>({connector:{},independentVerifier:{}}),
  execute:async()=>{dispatch++;return {status:'VERIFIED',outcome:{verified:true},
   verification:{independent:true},reservation_settlement:{status:'VERIFIED'}}},
  recordOutcome:async()=>{record++;throw Error('DATABASE_DOWN_AFTER_PROVIDER');},
 });
 assert.equal(claim,1);assert.equal(dispatch,1);assert.equal(record,1);
 assert.equal(r.status,'UNRESOLVED');assert.equal(r.verified,false);
 assert.equal(r.external_action_may_have_occurred,true);
 assert.equal(r.no_automatic_retry,true);
});
test('exact provider and saved outcome together may report VERIFIED, not before',async()=>{
 const e={...env,REALITY_GITHUB_TOKEN:'unit-test-token'};
 const r=await runPersonalIssueDispatch({
  session,conversationId,discoveredWorkId:item.work_item_id,
  confirmation:'EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE',env:e,
  prepare:async()=>({work_item:item,source_receipt_id:randomUUID(),
   goal_id:'goal:test',work_fingerprint:'sha256:'+'a'.repeat(64),
   action_policy_id:'approval:test',internal:{groundingProof:{}}}),
  checkDuplicate:async()=>({checked:true}),
  reserve:async()=>({
   status:'SINGLE_USE_RESERVED_PENDING_DISPATCH',
   action_policy_id:'approval:test',
   work_item_fingerprint:'sha256:'+'a'.repeat(64),
   reservation_id:randomUUID(),
   internal:{store:{},reservation:{},authorization:{},serverApprovalProof:{},serverFreshGoalAdmission:{}},
  }),
  bridgeFactory:()=>({connector:{},independentVerifier:{}}),
  execute:async()=>({status:'VERIFIED',outcome:{verified:true},
   verification:{independent:true},reservation_settlement:{status:'VERIFIED'}}),
  recordOutcome:async()=>({independently_verified:true,
   receipt_id:randomUUID(),provider_issue_url:'https://github.com/maloney2323/Reality/issues/143'}),
 });
 assert.equal(r.status,'VERIFIED');assert.equal(r.verified,true);
 assert.ok(r.outcome_receipt_id);
});
test('request endpoint disallows browser-injected work/connector capability',async()=>{
 const record={status:0,body:null};
 const res={setHeader:()=>res,status(n){record.status=n;return res},
  json(v){record.body=v;return res}};
 await dispatchApi({method:'POST',headers:{},body:{
  intent:'RUN',conversation_id:conversationId,
  discovered_work_id:item.work_item_id,
  work_item:item,
 }},res);
 assert.equal(record.status,401);
 assert.equal(record.body.error,'CHAT_SIGN_IN_REQUIRED');
});
