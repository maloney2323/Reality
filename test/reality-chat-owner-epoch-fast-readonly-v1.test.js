import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPrivateChatGoalPublicationEpoch}
 from '../src/reality-private-chat-store-v0.1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversation='9d5b6de1-ecf0-42d8-a86a-b9c5396a4139';
const savedRequest='821e77db-9cba-44cd-9bfb-a7492291a7ac';
const session={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const isolatedDb={url:session.config.url,strictSecrets:true,secretKey:'test-only-service-secret'};
const observed={goal_revision:0,goal_transition_event_id:null,
 user_message_revision:12,latest_user_request_id:savedRequest};
test('ordinary conversation directly reads EXISTING indexed owner epoch and preserves exact CAS',async()=>{
 let calls=0;
 const result=await readPrivateChatGoalPublicationEpoch(session,{
  conversationId:conversation,requestId:savedRequest,isolatedDb
 },{
  fetchImpl:async(url,options)=>{
   calls++;
   assert.equal(url,session.config.url+'/rest/v1/rpc/reality_read_execution_epoch');
   assert.equal(options.method,'POST');
   assert.equal(options.headers.authorization,'Bearer '+isolatedDb.secretKey);
   assert.equal(options.headers['content-type'],'application/json');
   assert.deepEqual(JSON.parse(options.body),{
    p_user_id:owner,p_conversation_id:conversation});
   assert.equal(typeof options.signal?.aborted,'boolean');
   return {ok:true,json:async()=>[observed]};
  }
 });
 assert.equal(calls,1);
 assert.equal(result.expected_revision,0);
 assert.equal(result.expected_last_goal_event_id,null);
 assert.equal(result.user_message_revision,12);
 assert.equal(result.latest_user_request_id,savedRequest);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.installation_authorized,false);
});
test('an earlier request is rejected even if the goal has not changed',async()=>{
 await assert.rejects(()=>readPrivateChatGoalPublicationEpoch(session,{
  conversationId:conversation,
  requestId:'a6da2917-8573-40d8-80d8-305eedfb777a',
  isolatedDb
 },{fetchImpl:async()=>({ok:true,json:async()=>[observed]})}),
 /CHAT_NEWER_USER_MESSAGE_DURING_COGNITION_RETRY_NEW_TURN/);
});
test('not owner scoped, no row, or corrupt epoch cannot grant a saved reply',async()=>{
 const cases=[
  {session:{...session,user_id:'not-an-owner'},isolatedDb},
  {session,isolatedDb:{...isolatedDb,url:'https://different.supabase.co'}},
 ];
 for(const c of cases){
  await assert.rejects(()=>readPrivateChatGoalPublicationEpoch(c.session,{
   conversationId:conversation,requestId:savedRequest,isolatedDb:c.isolatedDb
  },{fetchImpl:async()=>{throw Error('MUST_NOT_CONTACT_PROVIDER')}}),
  /CHAT_GOAL_EPOCH_OWNER_SCOPE_INVALID/);
 }
 for(const data of [[],[observed,observed],
  [{...observed,goal_revision:-1}],
  [{...observed,goal_transition_event_id:'invalid'}]]){
  await assert.rejects(()=>readPrivateChatGoalPublicationEpoch(session,{
   conversationId:conversation,requestId:savedRequest,isolatedDb
  },{fetchImpl:async()=>({ok:true,json:async()=>data})}),
  /CHAT_GOAL_EPOCH_EXACT_ROW_REQUIRED|CHAT_GOAL_EPOCH_INVALID/);
 }
});
test('actual previous 49s Continuity blockage is bypassed ONLY for read-only replies',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const store=readFileSync(new URL('../src/reality-private-chat-store-v0.1.js',import.meta.url),'utf8');
 assert.match(api,/const continuity=readOnlyTurn\?Object\.freeze\(/);
 assert.match(api,/await resolvePrivateChatContinuity\(/);
 const readOnly=api.slice(api.indexOf("stage='READ_ONLY_BOUNDED_CONTEXT'"),api.indexOf('// The signed human message entered'));
 assert.ok(readOnly.length>0);
 assert.match(readOnly,/publishPrivateConversationReply\(session/);
 assert.match(readOnly,/timeoutMs:1800/);
 assert.match(api,/continuityHistory:null/);
 assert.doesNotMatch(readOnly,/readPrivateChatGoalPublicationEpoch\(|resolvePrivateChatContinuity\(|publishPrivateAssistantAtomically\(|runLiveIntelligenceOrchestration\(/);
 assert.match(readOnly,/current_answer_persisted:Boolean\(publication\)/);
 assert.match(api,/stage='GOAL_SNAPSHOT_RECONCILIATION'/);
 assert.match(api,/compareAuthenticatedGoalSnapshots\(/);
 assert.match(api,/publishPrivateAssistantAtomically\(session/);
 assert.match(api,/expectedRevision:continuity\.verified_prior_goal_cas\?/);
 assert.match(api,/expectedLastEventId:continuity\.verified_prior_goal_cas\?/);
 assert.match(api,/stage='ASSISTANT_DURABILITY_READBACK'/);
 assert.match(store,/reality_read_execution_epoch/);
 assert.doesNotMatch(store,/grant.*authorization|auto.*install/i);
});
