import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createPersonalGithubIssueBridge,assertExactMaintainerIssue,checkForExistingMaintainerIssue,verifyPersonalGithubIssueToken,inspectMatchingGithubIssueReadOnly}
 from '../src/reality-personal-github-execution-bridge-v0.1.js';
import {runPersonalIssueDispatch,assertPersonalDispatchEnvironment,assertNoPriorPersonalIssueAttempt}
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
  recordLearning:async()=>({receipt_id:randomUUID(),authority:'NOT_GRANTED',
   improvement_applied:false,improvement_tested:false}),
 });
 assert.equal(r.status,'VERIFIED');assert.equal(r.verified,true);
 assert.ok(r.outcome_receipt_id);
 assert.equal(r.learning_status,'EVIDENCE_BOUND_PROPOSAL_SAVED_NOT_AUTHORIZED');
 assert.ok(r.learning_receipt_id);
 assert.equal(r.improvement_applied,false);
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

test('Gap 3 UI only reveals live execution after credential check and new consent',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes("method:'GET',credentials:'same-origin',cache:'no-store'"));
 assert.ok(html.includes("data.status!=='PREVIEW_GITHUB_WRITE_ADAPTER_CONFIGURED'"));
 assert.ok(html.includes("checked.type='checkbox';checked.required=true"));
 assert.ok(html.includes("run.disabled=true"));
 assert.ok(html.includes("checked.onchange=()=>{run.disabled=!checked.checked;}"));
 assert.ok(html.includes("if(!checked.checked||!checked.checkValidity())return"));
 assert.ok(html.includes("if(!confirm('Create ONE real GitHub issue"));
 assert.ok(html.includes("confirmation:'EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE'"));
 assert.ok(html.includes("await revealGap3Action(review,receipt,exact,conv,w.work_id)"));
 assert.ok(html.includes('Gap 3 · GitHub write is not configured'));
 assert.ok(!html.includes("fetch('/api/reality/execute',{method:'POST'"));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});
test('server only accepts selected discovered work id and separate explicit RUN consent',()=>{
 const src=readFileSync(new URL('../api/reality/personal-issue-dispatch.js',import.meta.url),'utf8');
 assert.ok(src.includes("!['intent','conversation_id','discovered_work_id','confirmation'].includes(k)"));
 assert.ok(src.includes("b.confirmation!=='EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE'"));
 assert.ok(src.includes("assertSameOrigin(req)"));
 assert.ok(src.includes("authenticatedChatSession(req,res)"));
 assert.ok(src.includes("external_action_performed:false"));
});
test('exception after one-time reservation is unresolved, not safe to repeat',async()=>{
 const e={...env,REALITY_GITHUB_TOKEN:'mock-only-token'};
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
  execute:async()=>{throw Error('UNKNOWN_AFTER_DB_RESERVATION')},
 });
 assert.equal(r.status,'UNRESOLVED');
 assert.equal(r.verified,false);
 assert.equal(r.external_action_may_have_occurred,true);
 assert.equal(r.no_automatic_retry,true);
});

test('GitHub preview credential must authenticate owner AND read target issues before RUN is shown',async()=>{
 const urls=[];
 const granted=await verifyPersonalGithubIssueToken({get:async path=>{
  urls.push(path);
  if(path==='/user')return {login:'maloney2323'};
  if(path==='/repos/maloney2323/Reality/issues?state=open&per_page=1')return [];
  throw Error('FORBIDDEN_UNEXPECTED_GITHUB_QUERY');
 }});
 assert.deepEqual(urls,['/user','/repos/maloney2323/Reality/issues?state=open&per_page=1']);
 assert.equal(granted.credential_identity_verified,true);
 assert.equal(granted.repository_issues_read_verified,true);
 assert.equal(granted.github_issue_write_permission_not_yet_proven,true);
 assert.equal(granted.external_action_performed,false);
 await assert.rejects(verifyPersonalGithubIssueToken({
  get:async()=>({login:'other-owner'})
 }),/PERSONAL_GITHUB_CREDENTIAL_OWNER_UNVERIFIED/);
 await assert.rejects(verifyPersonalGithubIssueToken({
  get:async p=>p==='/user'?{login:'maloney2323'}:{message:'not accessible'}
 }),/PERSONAL_GITHUB_CREDENTIAL_ISSUES_READ_UNVERIFIED/);
});
test('readiness endpoint checks real credential and never equates token presence with permission',()=>{
 const source=readFileSync(new URL('../api/reality/personal-issue-dispatch.js',import.meta.url),'utf8');
 assert.ok(source.includes('inspectPreviewGithubRepositoryAccessReadOnly()'));
 assert.ok(source.includes("status='PREVIEW_GITHUB_CREDENTIAL_NOT_VERIFIED'"));
 assert.ok(source.includes("github_issue_write_permission_not_yet_proven:true"));
 assert.ok(!source.includes("Boolean(process.env.REALITY_GITHUB_TOKEN)?"));
});

test('prior UNCERTAIN real issue attempt cannot be approved again under new policy or changed work ID',()=>{
 const oldWork='work:'+'b'.repeat(32),newWork='work:'+'c'.repeat(32);
 const workflowKey='workflow-failure:Reality Durable Adversarial Business Workday';
 const history=[
  {entity_type:'personal_discovered_work_handoff',payload:{work_id:oldWork,work_key:workflowKey}},
  {entity_type:'personal_issue_execution_outcome',payload:{
   work_id:oldWork,outcome_state:'UNRESOLVED',reservation_state:'UNCERTAIN',
   no_automatic_retry:true}},
  {entity_type:'personal_discovered_work_handoff',payload:{work_id:newWork,work_key:workflowKey}},
 ];
 for(const tested of [oldWork,newWork]){
  assert.throws(()=>assertNoPriorPersonalIssueAttempt({
   history,discoveredWorkId:tested,workKey:workflowKey,
  }),/PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY/);
 }
 assert.equal(assertNoPriorPersonalIssueAttempt({
  history,discoveredWorkId:'work:'+'d'.repeat(32),
  workKey:'workflow-failure:Unrelated work',
 }),true);
});
test('server checks prior Continuity outcome before minting any new dispatch authorization',()=>{
 const src=readFileSync(new URL('../src/reality-personal-issue-dispatch-v0.1.js',import.meta.url),'utf8');
 const check=src.indexOf(' await ensureNoPrior({');
 const proof=src.indexOf(' const groundingProof=issueProof(');
 const grant=src.indexOf(' const admitted=await prepare(');
 assert.ok(check>0&&check<proof&&proof<grant);
 assert.ok(src.includes("event.entity_type==='personal_issue_execution_outcome'"));
 assert.ok(src.includes('related.has(event.payload?.work_id)'));
});
test('previous unresolved work cannot expose another live Run control in UI',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes("intent:'CHECK',conversation_id:conversationId,discovered_work_id:workId"));
 assert.ok(html.includes("check.status!=='EXACT_SOURCE_AND_USER_APPROVAL_ADMITTED'"));
 assert.ok(html.includes('PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY'));
 const preflight=html.indexOf("intent:'CHECK',conversation_id:conversationId,discovered_work_id:workId");
 const checkbox=html.indexOf("checked.type='checkbox';checked.required=true");
 assert.ok(preflight>=0&&preflight<checkbox);
});

test('historical GitHub reconciliation reads closed and open issues without ANY writes',async()=>{
 const calls=[];const repository='https://github.com/maloney2323/Reality/issues/163';
 const get=async path=>{
  calls.push(path);
  if(path==='/repos/maloney2323/Reality/issues?state=all&per_page=100&page=1')
   return [{number:163,id:333,title:item.inputs.title,body:item.inputs.body,state:'closed'}];
  if(path==='/repos/maloney2323/Reality/issues/163')
   return {number:163,id:333,title:item.inputs.title,body:item.inputs.body,
    state:'closed',html_url:repository,created_at:'2026-10-27T17:00:00Z'};
  throw Error('UNEXPECTED_PROVIDER_QUERY');
 };
 const r=await inspectMatchingGithubIssueReadOnly({workItem:item,get});
 assert.deepEqual(calls,[
  '/repos/maloney2323/Reality/issues?state=all&per_page=100&page=1',
  '/repos/maloney2323/Reality/issues/163',
 ]);
 assert.equal(r.status,'EXACT_MATCH_OBSERVED_ATTRIBUTION_UNPROVEN');
 assert.equal(r.matching_issues[0].url,repository);
 assert.equal(r.verified_provider_effect,false);
 assert.equal(r.causal_attribution_proven,false);
 assert.equal(r.external_action_performed,false);
 assert.equal(r.no_automatic_retry,true);
});
test('zero GitHub matches is ONLY absence observed, never proof of no prior effect',async()=>{
 let calls=0;
 const r=await inspectMatchingGithubIssueReadOnly({
  workItem:item,get:async()=>{calls++;return []},
 });
 assert.equal(calls,1);
 assert.equal(r.status,'NO_EXACT_MATCH_OBSERVED');
 assert.equal(r.verified_provider_effect,false);
 assert.equal(r.no_automatic_retry,true);
});
test('GitHub reconciliation fails closed on a potentially truncated 500-issue history',async()=>{
 let count=0;
 const r=await inspectMatchingGithubIssueReadOnly({
  workItem:item,get:async()=>{count++;return Array.from({length:100},
   (_,i)=>({number:(count-1)*100+i+1,title:'other issue'}));},
 });
 assert.equal(count,5);
 assert.equal(r.status,'INCOMPLETE_PROVIDER_ISSUE_HISTORY');
 assert.equal(r.verified_provider_effect,false);
 assert.deepEqual(r.matching_issues,[]);
});
test('matching issue list but changed independent issue detail is not verified',async()=>{
 const r=await inspectMatchingGithubIssueReadOnly({
  workItem:item,
  get:async p=>p.includes('/issues?')?[{id:5,number:15,
   title:item.inputs.title,body:item.inputs.body}]:
   {id:5,number:15,title:item.inputs.title,body:'provider changed body',
    state:'open',html_url:'https://github.com/maloney2323/Reality/issues/15'},
 });
 assert.equal(r.status,'NO_EXACT_MATCH_OBSERVED');
 assert.equal(r.verified_provider_effect,false);
});
test('read-only recovery endpoint cannot mint reservation, approval or perform GitHub write',()=>{
 const source=readFileSync(new URL('../api/reality/personal-issue-dispatch.js',import.meta.url),'utf8');
 const recover=source.indexOf("if(b.intent==='RECONCILE')");
 const run=source.indexOf("if(b.intent!=='RUN'");
 assert.ok(recover>0&&recover<run);
 assert.ok(source.slice(recover,run).includes('inspectPersonalIssueAttemptsReadOnly'));
 assert.ok(source.slice(recover,run).includes('RECONCILIATION_IS_READ_ONLY'));
 assert.ok(!source.slice(recover,run).includes('runPersonalIssueDispatch('));
 const service=readFileSync(new URL('../src/reality-personal-issue-dispatch-v0.1.js',import.meta.url),'utf8');
 const section=service.slice(service.indexOf('export async function inspectPersonalIssueAttemptsReadOnly('),
  service.indexOf('export async function preparePersonalIssueDispatch('));
 assert.ok(section.includes('orderContinuityHistory('));
 assert.ok(section.includes("e.entity_type==='personal_issue_execution_outcome'"));
 assert.ok(section.includes('inspectGithub({workItem:exact})'));
 assert.ok(!section.includes('reserveAuthenticatedPersonalExecution('));
 assert.ok(!section.includes('executeAuthorizedWork('));
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('id="reconcileHistory"'));
 assert.ok(html.includes("intent:'RECONCILE',conversation_id:conv"));
 assert.ok(html.includes('Historical reservations remain locked'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script));
});

test('missing LEARNING receipt after verified provider effect never triggers a second write',async()=>{
 const e={...env,REALITY_GITHUB_TOKEN:'fake-token'};
 let writes=0,learning=0;
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
  execute:async()=>{writes++;return {status:'VERIFIED',outcome:{verified:true},
   verification:{independent:true},reservation_settlement:{status:'VERIFIED'}}},
  recordOutcome:async()=>({independently_verified:true,
   receipt_id:randomUUID(),provider_issue_url:'https://github.com/maloney2323/Reality/issues/143'}),
  recordLearning:async()=>{learning++;throw Error('LEARNING_DB_DOWN');},
 });
 assert.equal(writes,1);assert.equal(learning,1);
 assert.equal(r.status,'VERIFIED');assert.equal(r.verified,true);
 assert.equal(r.learning_receipt_id,null);
 assert.equal(r.learning_status,'LEARNING_READBACK_UNCONFIRMED_NO_PROVIDER_RETRY');
 assert.equal(r.no_automatic_retry,true);
});
