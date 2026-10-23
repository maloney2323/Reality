import test from 'node:test';
import assert from 'node:assert/strict';
import {createStandaloneConversationScope,verifyStandaloneUser,
 rejectUnsafeStandalonePayload,authConfiguration,scopedTurnEntryId,assertStandalonePreviewIsolation,inspectStandaloneReadiness,requireStandaloneReady}
 from '../src/reality-standalone-auth-v0.1.js';
import {processStandaloneChat,reconstructStandaloneHistory,getStandaloneConversationHistory}
 from '../src/reality-standalone-chat-v0.1.js';
import {retrievePersistedUniverse} from '../src/reality-native-universe-persistence-v1.0.js';
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
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',
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
  run:async input=>{log.push('run');
   assert.equal(input.apiKey,env.REALITY_STANDALONE_OPENAI_API_KEY);
   assert.equal(input.model,env.REALITY_OPENAI_MODEL);
   assert.equal(input.systemContext.continuity_root_id,root);
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
  }),/STANDALONE_PREVIEW_PROJECT_BINDING_INVALID/);
  assert.equal(touched,false,'failed environment isolation must prevent all reads/writes');
 }
});


test('database query selects only authenticated conversation events within the owner root',async()=>{
 const scope=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 const prev=process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
 process.env.REALITY_UNIVERSE_PERSISTENCE_KEY='unit-test-only';
 let seen=false;
 try{
  const x=await retrievePersistedUniverse({
   continuityRootId:scope.continuity_root_id,
   worldlineId:scope.worldline_id,
   eventKind:'AUTHENTICATED_CONVERSATION_MESSAGE',
   limit:80,
   fetchImpl:async(url,opt)=>{
    const p=new URL(url).searchParams;
    assert.equal(p.get('event_kind'),'eq.AUTHENTICATED_CONVERSATION_MESSAGE');
    assert.equal(p.get('continuity_root_id'),'eq.'+scope.continuity_root_id);
    assert.equal(p.get('worldline_id'),'eq.reality:primary');
    assert.equal(p.get('limit'),'80');
    assert.equal(opt.method,'GET');
    seen=true;
    return {ok:true,status:200,json:async()=>[]};
   },
  });
  assert.equal(seen,true);
  assert.equal(x.status,'AVAILABLE');
  assert.equal(x.count,0);
  await assert.rejects(()=>retrievePersistedUniverse({
   eventKind:'AUTHENTICATED_CONVERSATION_MESSAGE,eq.public',
   fetchImpl:async()=>{throw Error('INVALID_FILTER_SHOULD_NOT_FETCH')},
  }),/UNIVERSE_EVENT_KIND_FILTER_INVALID/);
 }finally{
  if(prev===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_KEY;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=prev;
 }
});

test('cold restart restores Turn 1 intent for Turn 2 without browser-provided history',async()=>{
 const persisted=new Map(),calls=[];
 let stamp=0;
 const store=async entry=>{
  assert.equal(persisted.has(entry.entry_id),false);
  persisted.set(entry.entry_id,entry);
  return {status:'PERSISTED',entry};
 };
 const makeHandler=()=>({ // Fresh handler instance; only persisted ledger survives.
  env,
  fetchImpl:authFetch(),
  store,
  load:async scope=>{
   calls.push({scope:scope.continuityRootId,kind:scope.eventKind});
   return {status:'AVAILABLE',
    entries:[...persisted.values()].filter(e=>
     e.continuity_root_id===scope.continuityRootId&&
     e.worldline_id===scope.worldlineId&&
     e.event_kind===scope.eventKind)};
  },
  now:()=>new Date(Date.UTC(2026,9,22,19,stamp++,0)).toISOString(),
  run:async ({systemContext,message})=>{
   calls.push({history:systemContext.authenticated_conversation_turns.map(x=>x.text),
     history_source:systemContext.context_source,message});
   return {intelligence:{raw_model_answer:'I will maintain the approval condition.',
      answer:'I will maintain the approval condition.'},
    context:{continuity:{root_id:systemContext.continuity_root_id,
      signal_handoff_status:'STORED_AND_READ_BACK',cognitive_readback_verified:true,
      event_id:'verified:cognition:synthetic'}}};
  },
 });
 const original=request({message:'Do not send the estimate until the homeowner approves it.',turn_id:'t1'});
 const first=await processStandaloneChat(original,makeHandler());
 assert.equal(first.receipt.history_window_count,0);
 const second=await processStandaloneChat(request({
  message:'Any updates?',turn_id:'t2'}),makeHandler());
 assert.equal(second.receipt.history_window_count,2);
 const replay=calls.find(x=>x.message==='Any updates?');
 assert.equal(replay.history_source,'REALITY_STANDALONE_AUTHENTICATED');
 assert.equal(replay.history[0],original.body.message);
 assert.equal(replay.history[1],'I will maintain the approval condition.');
 assert.equal(calls.filter(x=>x.kind==='AUTHENTICATED_CONVERSATION_MESSAGE').length,2);
 assert.equal(persisted.size,4);
});

test('identical conversation selector for two users does not expose an earlier user history',async()=>{
 const persisted=new Map();
 const store=async entry=>{persisted.set(entry.entry_id,entry);return {status:'PERSISTED',entry}};
 const seen=[];
 const handler=id=>({
  env,fetchImpl:authFetch({id}),store,
  now:()=> '2026-10-22T19:10:00.000Z',
  load:async scope=>({status:'AVAILABLE',entries:[...persisted.values()].filter(e=>
    e.continuity_root_id===scope.continuityRootId&&e.event_kind===scope.eventKind)}),
  run:async arg=>{
   seen.push({id,root:arg.systemContext.continuity_root_id,
    prior:arg.systemContext.authenticated_conversation_turns});
   return {intelligence:{raw_model_answer:'Acknowledged',answer:'Acknowledged'},
    context:{continuity:{root_id:arg.systemContext.continuity_root_id,
      signal_handoff_status:'STORED_AND_READ_BACK',cognitive_readback_verified:true,
      event_id:'verified:synthetic'}}};
  },
 });
 const a=await processStandaloneChat(request({message:'Owner A secret',turn_id:'a1'}),handler(userA));
 const b=await processStandaloneChat(request({message:'Owner B confidential',turn_id:'b1'}),handler(userB));
 assert.notEqual(a.continuity_root_id,b.continuity_root_id);
 assert.equal(seen[0].prior.length,0);
 assert.equal(seen[1].prior.length,0);
 assert.equal(b.response,'Acknowledged');
});

test('storage race duplicate must never trigger a second model call',async()=>{
 let modelCalled=false;
 await assert.rejects(()=>processStandaloneChat(request(),{
  env,fetchImpl:authFetch(),load:async()=>({status:'AVAILABLE',entries:[]}),
  store:async entry=>({status:'DUPLICATE_IDENTICAL_CONCURRENT',entry}),
  run:async()=>{modelCalled=true},
 }),/STANDALONE_USER_MESSAGE_NOT_DURABLY_CONFIRMED/);
 assert.equal(modelCalled,false);
});

test('assistant persistence failure cannot produce successful customer reply',async()=>{
 let writes=0;
 await assert.rejects(()=>processStandaloneChat(request(),{
  env,fetchImpl:authFetch(),load:async()=>({status:'AVAILABLE',entries:[]}),
  store:async entry=>{writes++;
    return {status:writes===1?'PERSISTED':'DUPLICATE_IDENTICAL',entry}},
  run:async ({systemContext})=>({
   intelligence:{raw_model_answer:'Prepared only.',answer:'Prepared only.'},
   context:{continuity:{root_id:systemContext.continuity_root_id,
    signal_handoff_status:'STORED_AND_READ_BACK',
    cognitive_readback_verified:true,event_id:'synthetic:durable'}}
  }),
 }),/STANDALONE_ASSISTANT_MESSAGE_NOT_DURABLY_CONFIRMED/);
 assert.equal(writes,2);
});


test('authenticated cold-start history endpoint returns only this user and the displayed model response',async()=>{
 const scopeA=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 const scopeB=createStandaloneConversationScope({userId:userB,conversationId:'job-1'});
 const one=chatEntry(scopeA,'user','Do not send estimate before approval','a1','2026-10-22T19:00:00.000Z');
 const model=chatEntry(scopeA,'assistant',"I'll send it now.",'a1','2026-10-22T19:00:01.000Z');
 const modelWithNotice=createUniverseEntry({...model,
  payload:{...model.payload,display_text:"I'll send it now.\\n\\nReality integrity notice: potential drift."}});
 const other=chatEntry(scopeB,'user','Confidential other owner text','b1','2026-10-22T19:00:00.000Z');
 const load=async scope=>{
  assert.equal(scope.eventKind,'AUTHENTICATED_CONVERSATION_MESSAGE');
  return {status:'AVAILABLE',entries:[one,modelWithNotice,other]};
 };
 const query={conversation_id:'job-1',thought_id:'personal'};
 const a=await getStandaloneConversationHistory({
  headers:request().headers,query,
 },{env,fetchImpl:authFetch({id:userA}),load});
 assert.equal(a.history_is_complete,false);
 assert.equal(a.messages.length,2);
 assert.match(a.messages[1].text,/Reality integrity notice/);
 assert.equal(a.messages.some(x=>x.text.includes('Confidential')),false);
 const b=await getStandaloneConversationHistory({
  headers:request().headers,query,
 },{env,fetchImpl:authFetch({id:userB}),load});
 assert.equal(b.messages.length,1);
 assert.equal(b.messages[0].text,'Confidential other owner text');
 assert.notEqual(a.continuity_root_id,b.continuity_root_id);
});
test('read-only history refuses spoofed authority or unrelated query fields',async()=>{
 let called=false;
 await assert.rejects(()=>getStandaloneConversationHistory({
  headers:request().headers,
  query:{conversation_id:'job-1',thought_id:'personal',principal_id:userB},
 },{
  env,fetchImpl:authFetch(),
  load:async()=>{called=true;return {status:'AVAILABLE',entries:[]}},
 }),/STANDALONE_HISTORY_SELECTOR_INVALID/);
 assert.equal(called,false);
});
test('history route refuses a disabled pilot before touching auth or ledger',async()=>{
 let called=false;
 await assert.rejects(()=>getStandaloneConversationHistory({
  headers:request().headers,query:{conversation_id:'job-1'}
 },{
  env:{...env,REALITY_STANDALONE_CHAT_ENABLED:'false'},
  fetchImpl:async()=>{called=true},
  load:async()=>{called=true},
 }),/STANDALONE_CHAT_DISABLED/);
 assert.equal(called,false);
});
test('assistant message persists both raw words and exactly displayed warning',async()=>{
 const scope=createStandaloneConversationScope({userId:userA,conversationId:'job-1'});
 const entries=[];
 await processStandaloneChat(request(),{
  env,fetchImpl:authFetch(),load:async()=>({status:'AVAILABLE',entries:[]}),
  store:async entry=>{entries.push(entry);return {status:'PERSISTED',entry}},
  now:()=> '2026-10-22T20:00:00.000Z',
  run:async()=>({
   intelligence:{raw_model_answer:"I'll send the estimate now.",
    answer:"I'll send the estimate now.\\n\\nReality integrity notice: review customer approval."},
   context:{continuity:{root_id:scope.continuity_root_id,
    signal_handoff_status:'STORED_AND_READ_BACK',
    cognitive_readback_verified:true,event_id:'synthetic:event'}}
  }),
 });
 const record=entries.find(x=>x.payload.role==='assistant');
 assert.equal(record.payload.text,"I'll send the estimate now.");
 assert.match(record.payload.display_text,/Reality integrity notice/);
});


test('two messages from the same turn keep user-before-model order even at identical timestamps',()=>{
 const scope=createStandaloneConversationScope({userId:userA,conversationId:'same-ms'});
 const at='2026-10-22T20:00:00.000Z';
 const u=chatEntry(scope,'user','Do not send until customer approval.','t1',at);
 const a=chatEntry(scope,'assistant','I will wait for approval.','t1',at);
 const history=reconstructStandaloneHistory({entries:[a,u],scope});
 assert.deepEqual(history.map(e=>e.role),['user','assistant']);
 assert.deepEqual(history.map(e=>e.text),[u.payload.text,a.payload.text]);
});


test('standalone readiness reports missing explicit secret and model without leaking any values',async()=>{
 const missing=inspectStandaloneReadiness({
   ...env,REALITY_STANDALONE_CHAT_ENABLED:'false',
   REALITY_UNIVERSE_PERSISTENCE_KEY:'',
   REALITY_STANDALONE_OPENAI_API_KEY:'',
 });
 assert.equal(missing.status,'NOT_READY');
 assert.equal(missing.checks.preview_isolation,true);
 assert.ok(missing.missing.includes('REALITY_UNIVERSE_PERSISTENCE_KEY'));
 assert.ok(missing.missing.includes('REALITY_STANDALONE_OPENAI_API_KEY'));
 assert.ok(missing.missing.includes('REALITY_STANDALONE_CHAT_ENABLED'));
 assert.equal(JSON.stringify(missing).includes('sb_secret_TEST_ONLY_NOT_REAL'),false);
 assert.equal(JSON.stringify(missing).includes('sk-TEST_ONLY_NOT_REAL'),false);
 const ready=inspectStandaloneReadiness(env);
 assert.equal(ready.status,'CONFIGURED_NOT_LIVE_VERIFIED');
 assert.equal(ready.live_authentication_verified,false);
 assert.equal(ready.live_database_write_verified,false);
 assert.equal(ready.real_model_call_verified,false);
});
test('dedicated server persistence key must exist even if a generic shared preview secret exists',async()=>{
 let touched=false;
 const guarded={
   ...env,REALITY_UNIVERSE_PERSISTENCE_KEY:'',
   SUPABASE_SECRET_KEY:'sb_secret_UNRELATED_PROJECT_SHOULD_NEVER_BE_USED',
 };
 assert.throws(()=>requireStandaloneReady(guarded),
  /STANDALONE_DEDICATED_STORAGE_KEY_REQUIRED/);
 await assert.rejects(()=>processStandaloneChat(request(),{
   env:guarded,
   fetchImpl:async()=>{touched=true;throw Error('MUST_NOT_AUTH')},
   load:async()=>{touched=true},
   store:async()=>{touched=true},
   run:async()=>{touched=true},
 }),/STANDALONE_DEDICATED_STORAGE_KEY_REQUIRED/);
 assert.equal(touched,false);
});
test('model configuration must exist before a user turn is written into Universe',async()=>{
 let touched=false;
 await assert.rejects(()=>processStandaloneChat(request(),{
   env:{...env,REALITY_STANDALONE_OPENAI_API_KEY:'',REALITY_OPENAI_MODEL:''},
   fetchImpl:async()=>{touched=true;throw Error('MUST_NOT_AUTH')},
   load:async()=>{touched=true},
   store:async()=>{touched=true},
   run:async()=>{touched=true},
 }),/STANDALONE_MODEL_CONFIGURATION_REQUIRED/);
 assert.equal(touched,false);
});
test('native Universe adapter sends opaque Supabase sb_secret only as apikey, retaining legacy JWT compatibility',async()=>{
 const original={
  key:process.env.REALITY_UNIVERSE_PERSISTENCE_KEY,
  url:process.env.REALITY_UNIVERSE_PERSISTENCE_URL,
 };
 try{
  process.env.REALITY_UNIVERSE_PERSISTENCE_URL='https://reality-example.supabase.co';
  for(const k of ['sb_secret_TEST_ONLY_NOT_REAL_abcdefghijklmnop',
                  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature']){
   process.env.REALITY_UNIVERSE_PERSISTENCE_KEY=k;
   await retrievePersistedUniverse({
    continuityRootId:'root:test',
    limit:1,
    fetchImpl:async(_url,req)=>{
     assert.equal(req.headers.apikey,k);
     if(k.startsWith('sb_secret_'))
      assert.equal(Object.hasOwn(req.headers,'Authorization'),false);
     else assert.equal(req.headers.Authorization,'Bearer '+k);
     return {ok:true,status:200,json:async()=>[]};
    },
   });
  }
 }finally{
  for(const [key,value] of Object.entries({
   REALITY_UNIVERSE_PERSISTENCE_KEY:original.key,
   REALITY_UNIVERSE_PERSISTENCE_URL:original.url,
  })){if(value===undefined)delete process.env[key];else process.env[key]=value}
 }
});


test('preview chat cannot silently borrow existing production OPENAI_API_KEY',async()=>{
 const productionKey=process.env.OPENAI_API_KEY;
 try{
  process.env.OPENAI_API_KEY='sk-PRODUCTION-KEY-MUST-NOT-USE-abcdefgh123456';
  let used=false;
  const isolated={...env,REALITY_STANDALONE_OPENAI_API_KEY:''};
  await assert.rejects(()=>processStandaloneChat(request(),{
   env:isolated,fetchImpl:async()=>{used=true;throw Error('AUTH_CALLED')},
   load:async()=>{used=true;return {status:'AVAILABLE',entries:[]}},
   store:async()=>{used=true},
   run:async()=>{used=true},
  }),/STANDALONE_MODEL_CONFIGURATION_REQUIRED/);
  assert.equal(used,false,'production key must not activate preview');
 }finally{
  if(productionKey===undefined)delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY=productionKey;
 }
});
