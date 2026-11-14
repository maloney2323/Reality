import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptDurableChatTurn} from '../api/reality/personal-chat-intake.js';
const session={user_id:'85eeae0b-2988-43c4-b20c-590fb51da70d'};
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const source_ref='supabase:reality_chat_messages:3d5f5555-44e5-4d43-a7ac-af0de70b2c2b';
const source={session,conversationId,requestId,message:'Could you explain the homepage headline change?'};
test('accepts signed-in conversational question, saves first, reads exact matching row, grants no authority',async()=>{
 let rows=[],records=0,reads=0;
 const result=await acceptDurableChatTurn(source,{
  readChat:async()=>{reads++;return {messages:rows}},
  record:async(_,{conversationId,requestId,role,text})=>{
   records++;rows=[{role,text,request_id:requestId,source_ref}];return {source_ref};
  },
 });
 assert.equal(result.ok,true);
 assert.equal(result.saved,true);
 assert.equal(result.source_ref,source_ref);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(records,1);assert.equal(reads,2);
});
test('repeated request ID with unchanged message replays without duplicate insert',async()=>{
 let records=0;
 const saved=[{role:'user',text:source.message,request_id:requestId,source_ref}];
 const result=await acceptDurableChatTurn(source,{
  readChat:async()=>({messages:saved}),
  record:async()=>{records++;throw Error('DUPLICATE_INSERT')},
 });
 assert.equal(result.replayed,true);
 assert.equal(result.reply_verified,false);
 assert.equal(records,0);
});
test('existing assistant answer is marked verified without new user message or execution',async()=>{
 const result=await acceptDurableChatTurn(source,{
  readChat:async()=>({messages:[
   {role:'user',text:source.message,request_id:requestId,source_ref},
   {role:'assistant',text:'I can help with the headline.',request_id:requestId,
    source_ref:'supabase:reality_chat_messages:6e81c595-b99a-4d77-96a9-c9cd7b2b1630'},
  ]}),
  record:async()=>{throw Error('MUST_NOT_WRITE')},
 });
 assert.equal(result.reply_verified,true);
 assert.equal(result.execution_authorized,false);
});
test('request ID collision is rejected rather than silently changing saved user intent',async()=>{
 await assert.rejects(()=>acceptDurableChatTurn({...source,message:'Different instruction'},{
  readChat:async()=>({messages:[
   {role:'user',text:source.message,request_id:requestId,source_ref}]}),
  record:async()=>{throw Error('MUST_NOT_WRITE')},
 }),/CHAT_REQUEST_ID_CONTENT_MISMATCH/);
});
test('unverified storage readback does not claim a saved message',async()=>{
 await assert.rejects(()=>acceptDurableChatTurn(source,{
  readChat:async()=>({messages:[]}),
  record:async()=>({source_ref}),
 }),/CHAT_USER_SAVE_READBACK_UNVERIFIED/);
});
