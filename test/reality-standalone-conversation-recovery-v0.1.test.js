import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {createStandaloneConversationScope,STANDALONE_HISTORY_PROVENANCE}
 from '../src/reality-standalone-auth-v0.1.js';
import {summarizeOwnerConversations,listOwnerConversations,
 readOwnerConversationRows,previewOwnerLegacyConversation}
 from '../src/reality-standalone-conversation-recovery-v0.1.js';

const owner='e83340ec-4266-4c95-a6cd-929bc58b445e';
const stranger='f44440ec-4266-4c95-a6cd-929bc58b445f';
const env={
 VERCEL_ENV:'preview',REALITY_STANDALONE_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_publictestkey',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_PreviewOnlyTestCredential999',
 REALITY_STANDALONE_CHAT_ENABLED:'true',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
};
function entry(user,conversation,turn,selector=true,role='user'){
 const scope=createStandaloneConversationScope({userId:user,conversationId:conversation});
 const timestamp='2026-10-23T05:27:45.679Z';
 return createUniverseEntry({
  entry_id:'test-'+user.slice(0,8)+'-'+conversation+'-'+turn+'-'+role,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  event_kind:'AUTHENTICATED_CONVERSATION_MESSAGE',epistemic_kind:'OBSERVATION',
  assertion_time:timestamp,effective_time:timestamp,
  source_ref:'reality:authenticated:customer-conversation',
  payload:{role,text:'User text',epistemic_status:'USER_ASSERTED_INTENT',
   turn_id:turn,principal_id:user,
   ...(selector?{client_conversation_selector:conversation,thought_id:'personal'}:{})},
  evidence_references:[],provenance:{
   source:STANDALONE_HISTORY_PROVENANCE,authenticated_user_id:user,
   owner_scoped_root:scope.continuity_root_id,authority_granted:false,
  },
 });
}
function response(body,status=200){
 return {ok:status>=200&&status<300,status,json:async()=>body};
}
test('server inventory restores owner-bound selectors, never another user',()=>{
 const own=entry(owner,'thought-one','t1');
 const different=entry(stranger,'thought-one','t2');
 const items=summarizeOwnerConversations([different,own],owner);
 assert.equal(items.length,1);
 assert.equal(items[0].conversation_id,'thought-one');
 assert.equal(items[0].recovery_mode,'RESUMABLE_BY_SELECTOR');
});
test('older user message remains discoverable but never treated as verified model result',()=>{
 const items=summarizeOwnerConversations([entry(owner,'legacy-thought','t1',false)],owner);
 assert.equal(items.length,1);
 assert.equal(items[0].conversation_id,null);
 assert.equal(items[0].recovery_mode,'LEGACY_READ_ONLY');
});
test('model responses alone cannot establish a recoverable conversation',()=>{
 const items=summarizeOwnerConversations([entry(owner,'x','t1',true,'assistant')],owner);
 assert.equal(items.length,0);
});
test('unexpected selector/root pairing fails closed even for claimed owner',()=>{
 const e=entry(owner,'a','t1');
 const bad=createUniverseEntry({...e,payload:{...e.payload,client_conversation_selector:'b'}});
 assert.throws(()=>summarizeOwnerConversations([bad],owner),/RECOVERY_SELECTOR_ROOT_MISMATCH/);
});
test('server limits storage scan to verified principal and expected event kind',async()=>{
 let calls=0;
 const tokenUser={id:owner,is_anonymous:false};
 const fetchImpl=async (url,options)=>{
  calls++;
  if(url.endsWith('/auth/v1/user'))return response(tokenUser);
  const target=new URL(url);
  assert.equal(target.searchParams.get('provenance->>authenticated_user_id'),'eq.'+owner);
  assert.equal(target.searchParams.get('event_kind'),'eq.AUTHENTICATED_CONVERSATION_MESSAGE');
  assert.equal(target.searchParams.get('limit'),'300');
  assert.equal(options.headers.apikey,env.REALITY_UNIVERSE_PERSISTENCE_KEY);
  return response([entry(owner,'conversation1','t1')]);
 };
 const output=await listOwnerConversations({headers:{authorization:'Bearer '+('a'.repeat(32))},query:{}},{env,fetchImpl});
 assert.equal(calls,2);
 assert.equal(output.conversations[0].conversation_id,'conversation1');
 assert.equal(output.server_owned,true);
});
test('legacy preview allows owner user message only; never publishes assistant output',async()=>{
 const original=entry(owner,'old-one','turn-1',false);
 const fetchImpl=async(url)=>response({id:owner,is_anonymous:false});
 const result=await previewOwnerLegacyConversation({
  headers:{authorization:'Bearer '+('a'.repeat(32))},
  query:{root_id:original.continuity_root_id}
 },{env,fetchImpl,loadRows:async()=>[original,entry(owner,'old-one','turn-1',false,'assistant')]});
 assert.equal(result.read_only,true);
 assert.equal(result.assistant_completion_verified,false);
 assert.equal(result.messages.length,1);
 assert.equal(result.messages[0].role,'user');
});
test('legacy preview cannot read another user root',async()=>{
 const other=entry(stranger,'old-one','turn-1',false);
 const fetchImpl=async()=>response({id:owner,is_anonymous:false});
 await assert.rejects(previewOwnerLegacyConversation({
  headers:{authorization:'Bearer '+('a'.repeat(32))},query:{root_id:other.continuity_root_id}
 },{env,fetchImpl,loadRows:async()=>[other]}),/RECOVERY_CONVERSATION_NOT_FOUND/);
});
test('invalid bearer and production environment fail before storage discovery',async()=>{
 await assert.rejects(listOwnerConversations({headers:{},query:{}},{env,fetchImpl:async()=>{throw Error('must not call')}}),/AUTHENTICATED_SESSION_REQUIRED/);
 await assert.rejects(readOwnerConversationRows({userId:owner,env:{...env,VERCEL_ENV:'production'},fetchImpl:async()=>{throw Error('must not call')}}),/STANDALONE_PRODUCTION_RELEASE_NOT_AUTHORIZED/);
});
