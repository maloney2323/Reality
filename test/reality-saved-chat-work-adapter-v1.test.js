import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSavedChatWork,authorizeSavedChatExistingOriginal} from
 '../src/reality-saved-chat-work-adapter-v1.js';
const session={user_id:'85eeae0b-2988-43c4-b20c-590fb51da70d'};
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='1a18ee38-3420-4320-93d6-7e22c5c3fdab';
const source_ref='supabase:reality_chat_messages:30392682-6810-4910-8aec-42eefc5c3467';
const original_work_id='work:45206a326ddf406b1c083a819da24aaa';
const messages=[{role:'user',request_id:requestId,text:'Please resume the job.',source_ref}];
const args={session,conversationId,requestId,messages};
test('signed saved Chat source can inspect an eligible owner-original without acting',async()=>{
 const state=await inspectSavedChatWork({...args,readBuild:async()=>({
  original_conversation_id:conversationId,phase:'NOT_QUEUED',
  eligible_for_investigation:true,original_work_id})});
 assert.equal(state.status,'EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE');
 assert.equal(state.source_ref,source_ref);
 assert.equal(state.execution_started,false);
 assert.equal(state.installation_authorized,false);
});
test('unknown job or another conversation cannot be started by a chat message',async()=>{
 const state=await inspectSavedChatWork({...args,readBuild:async()=>({
  original_conversation_id:'7d736b3b-f43a-4acc-aad7-6a4890f2b48c',
  phase:'NOT_QUEUED',eligible_for_investigation:true,original_work_id})});
 assert.equal(state.status,'CHAT_WORK_NEEDS_A_VERIFIED_EXECUTION_ADAPTER');
});
test('model or user message without exact saved source cannot impersonate authorized request',async()=>{
 await assert.rejects(()=>inspectSavedChatWork({...args,
  messages:[{role:'assistant',request_id:requestId,text:'Start',source_ref}],
  readBuild:async()=>{throw Error('SHOULD_NOT_EXECUTE')}}),/CHAT_WORK_SIGNED_USER_TURN_REQUIRED/);
});
test('authenticated owner click invokes only the existing verified queue and records actual dispatch status',async()=>{
 let count=0;
 const result=await authorizeSavedChatExistingOriginal({...args,
  inspect:async()=>({
   status:'EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE',original_work_id,source_ref}),
  queue:async({session:owner,expectedOriginalWorkId})=>{
   assert.equal(owner.user_id,session.user_id);
   assert.equal(expectedOriginalWorkId,original_work_id);
   count++;return {original_work_id,queue_id:requestId,
    worker_dispatch_started:true,installation_authorized:false,
    production_changed:false};
  },
 });
 assert.equal(count,1);
 assert.equal(result.status,'CHAT_WORK_ORIGINAL_DISCOVERY_DISPATCHED');
 assert.equal(result.execution_started,true);
 assert.equal(result.installation_authorized,false);
});
test('no matching eligible work does not execute, no retries or duplicates',async()=>{
 let count=0;
 await assert.rejects(()=>authorizeSavedChatExistingOriginal({...args,
  inspect:async()=>({status:'CHAT_WORK_NEEDS_A_VERIFIED_EXECUTION_ADAPTER'}),
  queue:async()=>{count++;}}),/CHAT_WORK_NO_VERIFIED_ELIGIBLE_ORIGINAL/);
 assert.equal(count,0);
});
test('queued work is only queued when no independent dispatch receipt exists',async()=>{
 const result=await authorizeSavedChatExistingOriginal({...args,
  inspect:async()=>({status:'EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE',original_work_id,source_ref}),
  queue:async()=>({original_work_id,queue_id:requestId,worker_dispatch_started:false,
    installation_authorized:false,production_changed:false}),
 });
 assert.equal(result.status,'CHAT_WORK_ORIGINAL_DISCOVERY_QUEUED_BLOCKED');
 assert.equal(result.execution_started,false);
});
