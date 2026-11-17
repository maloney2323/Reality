import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSavedChatWork,continueVerifiedChatEngineering,
 CHAT_WORK_CAPABILITIES} from '../src/reality-saved-chat-work-adapter-v1.js';

const user='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const messageId='71e01bbd-5a5a-4b8c-869f-247478e82ac1';
const source_ref='supabase:reality_chat_messages:'+messageId;
const original='work:45206a326ddf406b1c083a819da24aaa';
const issue='https://github.com/maloney2323/Reality/issues/185';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const session={user_id:user,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const directive='Reality, build the code fix for GitHub issue #185.';
const messages=[{role:'user',source_ref,request_id:requestId,text:directive}];
const classified={kind:'WORK_REQUEST',capability_id:'governed-original-discovery',
 action_eligible:true,explicit_request:true,
 source_quote:'build the code fix for GitHub issue #185',
 objective:'Build source for existing issue #185'};
const work={status:'OWNER_CHAT_WORK_INTAKE_READBACK',owner_id:user,
 conversation_id:conversationId,installation_authorized:false,
 production_changed:false,
 items:[{request_id:requestId,source_ref,status:'INVESTIGATED_SCOPED',
  shift_id:shift,selected_source_refs:[issue],
  work_chain:[{original_work_id:original,shift_id:shift,source_ref:issue,
   current_evidence_stage:'CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI'}]}]};
const args={session,conversationId,requestId,messages,
 classify:async()=>classified,readWork:async()=>work,
 readBuild:async()=>{throw Error('DO_NOT_USE_DISCOVERY_FOR_BUILD')}};
test('exact authenticated build command selects the REAL scoped engineering adapter',async()=>{
 assert(CHAT_WORK_CAPABILITIES.some(x=>x.id==='governed-original-engineering'));
 const r=await inspectSavedChatWork(args);
 assert.equal(r.status,'CHAT_WORK_ENGINEERING_SCOPED_CI_READY');
 assert.equal(r.capability_id,'governed-original-engineering');
 assert.equal(r.original_work_id,original);
 assert.equal(r.original_source_ref,issue);
 assert.equal(r.action_eligible,true);
 assert.equal(r.execution_started,false);
 assert.equal(r.installation_authorized,false);
});
test('unrelated feature requests cannot reuse an old authorized original',async()=>{
 const r=await inspectSavedChatWork({...args,
  messages:[{...messages[0],text:'Build a new calendar dashboard'}],
  classify:async()=>({...classified,capability_id:'governed-original-engineering',
   source_quote:'Build a new calendar dashboard'})});
 assert.equal(r.status,'CHAT_WORK_ENGINEERING_SOURCE_NOT_EXPLICIT');
 assert.equal(r.capability_gap,true);
 assert.equal(r.action_eligible,false);
});
test('no selected source or ambiguous signed diagnosis never starts code generation',async()=>{
 for(const changed of [
  {...work,items:[{...work.items[0],status:'PENDING'}]},
  {...work,items:[{...work.items[0],selected_source_refs:[issue,issue]}]},
  {...work,owner_id:'7d736b3b-f43a-4acc-aad7-6a4890f2b48c'},
  {...work,items:[{...work.items[0],work_chain:[]}]},
 ]){
  const r=await inspectSavedChatWork({...args,readWork:async()=>changed});
  assert.equal(r.action_eligible,false);
  assert.equal(r.installation_authorized,false);
 }
});
test('model-draft preparation is visible but not mistaken for a dispatched CI build',async()=>{
 const r=await inspectSavedChatWork({...args,
  readWork:async()=>({...work,items:[{...work.items[0],
   work_chain:[{...work.items[0].work_chain[0],
    current_evidence_stage:'SOURCE_BACKED_ORIGINAL_AWAITING_NEXT_GOVERNED_ACTION'}]}]})});
 assert.equal(r.status,'CHAT_WORK_ENGINEERING_PREPARING_DRAFT');
 assert.equal(r.action_eligible,false);
});
const ready={status:'CHAT_WORK_ENGINEERING_SCOPED_CI_READY',
 action_eligible:true,capability_id:'governed-original-engineering',
 original_work_id:original,shift_id:shift,source_ref,
 original_source_ref:issue};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 url:session.config.url,secretKey:'x'.repeat(44)};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project};
const graph={status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 owner_id:user,shift_id:shift,installation_authorized:false,
 production_changed:false,jobs:[{original_work_id:original,source_ref:issue,
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',phase:'SOURCE_ADMITTED'}]};
test('same signed owner and original reaches existing isolated CI broker once',async()=>{
 let count=0;
 const r=await continueVerifiedChatEngineering({
  session,conversationId,requestId,messages,env,
  inspect:async()=>ready,dbFactory:()=>db,
  callRpc:async(actual,name)=>{
   assert.equal(actual,db);
   assert.equal(name,'reality_read_current_shift_execution_graph_v1');
   return graph;
  },
  continueCI:async({db:actual})=>{
   count++;assert.equal(actual,db);
   return {status:'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
    original_work_id:original,installation_authorized:false,
    original_job_completed:false,production_changed:false,
    new_shift_started:false};
  }
 });
 assert.equal(count,1);
 assert.equal(r.status,'CHAT_WORK_ENGINEERING_CI_DISPATCH_VERIFIED');
 assert.equal(r.execution_started,true);
 assert.equal(r.original_work_id,original);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
 assert.equal(r.new_shift_started,false);
});
test('wrong original, owner, shift or environment fails before any provider write',async()=>{
 let writes=0;
 for(const scope of [
  {...ready,original_work_id:'work:'+'a'.repeat(32)},
  {...ready,shift_id:'7d736b3b-f43a-4acc-aad7-6a4890f2b48c'},
  {...ready,capability_id:'governed-original-discovery'}
 ]){
  await assert.rejects(()=>continueVerifiedChatEngineering({
   session,conversationId,requestId,messages,env,
   inspect:async()=>scope,dbFactory:()=>db,
   callRpc:async()=>graph,
   continueCI:async()=>{writes++}
  }),/CHAT_WORK_ENGINEERING/);
 }
 await assert.rejects(()=>continueVerifiedChatEngineering({
  session,conversationId,requestId,messages,
  env:{...env,VERCEL_ENV:'production'},
  inspect:async()=>ready,dbFactory:()=>db,
  callRpc:async()=>graph,
  continueCI:async()=>{writes++}
 }),/CHAT_WORK_ENGINEERING/);
 assert.equal(writes,0);
});
test('two unsettled engineering originals cannot cause the broker to stage a different repair',async()=>{
 let calls=0;
 const ambiguous={...graph,jobs:[...graph.jobs,{
  original_work_id:'work:'+'c'.repeat(32),
  source_ref:'https://github.com/maloney2323/Reality/issues/201',
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  phase:'SOURCE_ADMITTED'}]};
 await assert.rejects(()=>continueVerifiedChatEngineering({
  session,conversationId,requestId,messages,env,
  inspect:async()=>ready,dbFactory:()=>db,
  callRpc:async()=>ambiguous,
  continueCI:async()=>{calls++}
 }),/CHAT_WORK_ENGINEERING_CURRENT_WARRANT_DRIFT/);
 assert.equal(calls,0);
});
test('uncertain or mismatched provider response cannot grant install or claim successful build',async()=>{
 for(const result of [
  {status:'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
   original_work_id:'work:'+'a'.repeat(32),new_shift_started:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false},
  {status:'CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
   original_work_id:original,new_shift_started:false,
   installation_authorized:true,original_job_completed:false,
   production_changed:false}
 ]){
  await assert.rejects(()=>continueVerifiedChatEngineering({
   session,conversationId,requestId,messages,env,
   inspect:async()=>ready,dbFactory:()=>db,
   callRpc:async()=>graph,continueCI:async()=>result
  }),/CHAT_WORK_ENGINEERING_PROVIDER_ORIGINAL_MISMATCH/);
 }
});
test('Chat retains an independently refreshed engineering timeline after answer publication',()=>{
 const status=readFileSync(new URL('../reality-chat-request-status-v1.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-chat-work.js',import.meta.url),'utf8');
 assert.match(status,/workInterval=setInterval/);
 assert.match(status,/stopClocks\(\{keepWork:true\}\)/);
 assert.match(status,/reality:chat-engineering-ready/);
 assert.doesNotMatch(status,/method:\s*['"]POST['"]/);
 assert.match(index,/window\.addEventListener\('reality:chat-engineering-ready'/);
 assert.match(status,/bubble\.after\(block\)/);
 assert.match(status,/current_evidence_stage/);
 assert.match(index,/savedBubble\.dataset\.requestId=message\.request_id/);
 assert.match(index,/explicit_scoped_build:/);
 assert.match(index,/Continue verified engineering now/);
 assert.match(api,/CONTINUE_VERIFIED_SCOPED_ENGINEERING/);
 assert.doesNotMatch(api,/force:true|installation_authorized:true/);
});
