import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope,verifyStandaloneUser,
 rejectUnsafeStandalonePayload,authConfiguration,scopedTurnEntryId,assertStandalonePreviewIsolation}
 from '../src/reality-standalone-auth-v0.1.js';
import {processStandaloneChat,reconstructStandaloneHistory}
 from '../src/reality-standalone-chat-v0.1.js';
import {createUniverseEntry,validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';

const userA='e83340ec-4266-4c95-a6cd-929bc58b445e';
const userB='f44440ec-4266-4c95-a6cd-929bc58b445f';
const env={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_public_key',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 VERCEL_ENV:'preview',
};
const request=(other={})=>({
 method:'POST',headers:{authorization:'Bearer signed-session-test-token-abc123'},
 body:{message:'Remember that customer approval is required.',
  conversation_id:'job-1',turn_id:'turn-1',...other},
});
function authFetch({id=userA,ok=true}={}){
 return async(url,opts)=>{
  assert.equal(url,env.SUPABASE_URL+'/auth/v1/user');
  assert.equal(opts.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);
  assert.match(opts.headers.Authorization,/^Bearer signed-session/);
  return {status:ok?200:401,ok,json:async()=>({id,is_anonymous:false})};
 };
}
function chatEntry(scope,role,text,turnId,at){
 return createUniverseEntry({
  entry_id:scopedTurnEntryId({root:scope.continuity_root_id,turnId,role}),
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  event_kind:'AUTHENTICATED_CONVERSATION_MESSAGE',
  epistemic_kind:'OBSERVATION',assertion_time:at,effective_time:at,
  source_ref:'reality:authenticated:customer-conversation',
  payload:{role,text,turn_id:turnId,principal_id:scope.authenticated_user_id},
  evidence_references:[],provenance:{
   source:'REALITY_STANDALONE_AUTHENTICATED',
   authenticated_user_id:scope.authenticated_user_id,
  },
 });
}
test('Vercel standalone identity verifies the provider user, not request.claimed user',async()=>{
 const u=await verifyStandaloneUser(request({principal_id:'forged'}),{
  env,fetchImpl:authFetch()});
 assert.equal(u.user_id,userA);
 assert.equal(u.identity_basis,'SUPABASE_AUTH_SERVER_VERIFIED');
 const a=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 const b=createStandaloneConversationScope({userId:userB,conversationId:'job-1'});
 assert.notEqual(a.continuity_root_id,b.continuity_root_id);
 assert.equal(a.context_source,'REALITY_STANDALONE_AUTHENTICATED');
});
test('caller cannot insert root, history, evidence or authority into standalone entrypoint',()=>{
 for(const key of ['systemContext','authenticated_user_id','continuity_root_id',
  'universe_entries','authenticated_conversation_turns','authorization','action_authorized']){
  assert.throws(()=>rejectUnsafeStandalonePayload(request({[key]:true}).body),
   /STANDALONE_CONTEXT_OR_AUTHORITY_INJECTION_REJECTED/,key);
 }
});
test('auth configuration does not accept insecure, open-redirect or key misuse',()=>{
 assert.equal(authConfiguration(env).auth_url,'https://reality-example.supabase.co');
 for(const url of ['http://reality-example.supabase.co','https://evil.example',
  'https://reality-example.supabase.co/path',
  'https://someone@reality-example.supabase.co'])
  assert.throws(()=>authConfiguration({...env,SUPABASE_URL:url}),
   /STANDALONE_AUTH_URL_INVALID/);
 assert.throws(()=>authConfiguration({...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_PRIVATE'}),
  /STANDALONE_PUBLISHABLE_KEY_INVALID/);
});
test('authenticated conversation restores ONLY user-owned history, not another tenant',()=>{
 const a=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 const b=createStandaloneConversationScope({userId:userB,conversationId:'job-1'});
 const at='2026-10-22T19:00:00.000Z';
 const rows=[
  chatEntry(a,'user','Do not send estimate until approved.','t1',at),
  chatEntry(a,'assistant','I will wait.','t1','2026-10-22T19:00:01.000Z'),
  chatEntry(b,'user','Secret for someone else.','t1',at),
 ];
 const x=reconstructStandaloneHistory({scope:a,entries:rows});
 assert.equal(x.length,2);
 assert.equal(x[0].role,'user');
 assert.equal(x[1].role,'assistant');
 assert.equal(x.some(y=>y.text.includes('Secret')),false);
});
test('complete standalone proof: provider auth -> scope -> persisted user -> same cognition -> persisted assistant',async()=>{
 const log=[],root=createStandaloneConversationScope({userId:userA,conversationId:'job-1'}).continuity_root_id;
 const past=[chatEntry(createStandaloneConversationScope({userId:userA,conversationId:'job-1'}),
  'user','Do not send estimate until customer approves it.','old-1','2026-10-22T18:00:00.000Z')];
 const out=await processStandaloneChat(request(),{
  env,fetchImpl:authFetch(),now:()=> '2026-10-22T19:00:00.000Z',
  load:async args=>{log.push('load');assert.equal(args.continuityRootId,root);
   return {status:'AVAILABLE',entries:past}},
  store:async entry=>{validateUniverseEntry(entry);log.push(entry.payload.role);
   assert.equal(entry.continuity_root_id,root);
   return {status:'PERSISTED',entry}},
  run:async input=>{log.push('run');assert.equal(input.systemContext.continuity_root_id,root);
   assert.equal(input.systemContext.authenticated_conversation_turns.length,1);
   assert.match(input.systemContext.authenticated_conversation_turns[0].text,/customer approves/);
   assert.equal(input.systemContext.action_authorized,false);
   return {intelligence:{raw_model_answer:'I will preserve customer approval.',
       answer:'I will preserve customer approval.'},
    context:{continuity:{root_id:root,cognitive_readback_verified:true,
      signal_handoff_status:'STORED_AND_READ_BACK',event_id:'test:durable-event'}}}},
 });
 assert.deepEqual(log,['load','user','run','assistant']);
 assert.equal(out.receipt.cognitive_readback_verified,true);
 assert.equal(out.receipt.history_is_complete,false);
 assert.equal(out.response,'I will preserve customer approval.');
 assert.equal(out.external_action_executed,false);
});
test('unauthorized token never reaches durable read or model',async()=>{
 let called=false;
 await assert.rejects(()=>processStandaloneChat(request(),{
  env,fetchImpl:authFetch({ok:false}),
  load:async()=>{called=true},store:async()=>{called=true},
  run:async()=>{called=true},
 }),/AUTHENTICATED_SESSION_INVALID/);
 assert.equal(called,false);
});
test('disabled pilot and disabled persistence stop before any auth or side effects',async()=>{
 for(const bad of [{REALITY_STANDALONE_CHAT_ENABLED:'false'},
   {REALITY_UNIVERSE_PERSISTENCE_ENABLED:'false'}]){
  await assert.rejects(()=>processStandaloneChat(request(),{
    env:{...env,...bad},fetchImpl:()=>{throw Error('MUST_NOT_RUN')}
   }),/STANDALONE_CHAT_DISABLED|STANDALONE_DURABILITY_REQUIRED/);
 }
});
test('repeat turn IDs do not generate a second assistant reply',async()=>{
 const scope=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 const prior=[chatEntry(scope,'user','Old text','turn-1','2026-10-22T19:00:00Z')];
 let wrote=false;
 await assert.rejects(()=>processStandaloneChat(request(),{
  env,fetchImpl:authFetch(),
  load:async()=>({status:'AVAILABLE',entries:prior}),
  store:async()=>{wrote=true},run:async()=>{wrote=true},
 }),/STANDALONE_TURN_ID_ALREADY_USED/);
 assert.equal(wrote,false);
});
test('a model response without real continuity readback must not be presented as successful',async()=>{
 const scope=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 let persisted=0;
 await assert.rejects(()=>processStandaloneChat(request(),{
  env,fetchImpl:authFetch(),load:async()=>({status:'AVAILABLE',entries:[]}),
  store:async entry=>{persisted++;return {status:'PERSISTED',entry}},
  run:async()=>({context:{continuity:{root_id:scope.continuity_root_id,
    cognitive_readback_verified:false,signal_handoff_status:'NO'}}}),
 }),/STANDALONE_COGNITION_NOT_DURABLY_CONFIRMED/);
 assert.equal(persisted,1);
});


test('migration pilot refuses to mix standalone user auth with a different Universe project',async()=>{
 for(const config of [
  {REALITY_UNIVERSE_PERSISTENCE_URL:'https://another-project.supabase.co'},
  {SUPABASE_URL:'https://another-project.supabase.co'},
  {REALITY_STANDALONE_EXPECTED_PROJECT_REF:'another-project'},
  {VERCEL_ENV:'production'},
  {REALITY_STANDALONE_EXPECTED_PROJECT_REF:''},
 ]){
  let touched=false;
  const environment={...env,...config};
  assert.throws(()=>assertStandalonePreviewIsolation(environment),
    /STANDALONE_(?:PRODUCTION_RELEASE_NOT_AUTHORIZED|PREVIEW_PROJECT_BINDING_REQUIRED|AUTH_UNIVERSE_PROJECT_MISMATCH)/);
  await assert.rejects(()=>processStandaloneChat(request(),{
    env:environment,fetchImpl:async()=>{touched=true;throw Error('AUTH_USED')},
    load:async()=>{touched=true},store:async()=>{touched=true},run:async()=>{touched=true},
  }),/STANDALONE_(?:PRODUCTION_RELEASE_NOT_AUTHORIZED|PREVIEW_PROJECT_BINDING_REQUIRED|AUTH_UNIVERSE_PROJECT_MISMATCH)/);
  assert.equal(touched,false,'failed environment isolation must prevent all reads/writes');
 }
});
