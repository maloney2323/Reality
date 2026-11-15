import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acceptDurableChatTurn} from '../api/reality/personal-chat-intake.js';
const session={user_id:'85eeae0b-2988-43c4-b20c-590fb51da70d'};
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const otherId='e1445ef2-c7b7-424c-9a78-5c17eb796b7a';
const source_ref='supabase:reality_chat_messages:3d5f5555-44e5-4d43-a7ac-af0de70b2c2b';
const source={session,conversationId,requestId,
 message:'Could you explain the homepage headline change?'};
const row=(request_id=requestId,text=source.message)=>({
 role:'user',text,request_id,source_ref,
 created_at:'2026-11-15T12:16:20.000Z'});
test('single durable intake uses exact RLS request checks, never two full-history reads',async()=>{
 let records=0,exactReads=0,latestReads=0,existing=[];
 const result=await acceptDurableChatTurn(source,{
  readExact:async(_,{requestId:r})=>{
   exactReads++;assert.equal(r,requestId);
   return {messages:existing};
  },
  readLatest:async()=>{latestReads++;return null},
  record:async(_,{conversationId:c,requestId:r,role,text})=>{
   records++;assert.equal(c,conversationId);assert.equal(role,'user');
   existing=[row(r,text)];return {source_ref};
  },
 });
 assert.equal(result.ok,true);
 assert.equal(result.saved,true);
 assert.equal(result.source_ref,source_ref);
 assert.equal(result.request_id,requestId);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(records,1);assert.equal(exactReads,2);
 assert.equal(latestReads,1);
});
test('same request ID replays with unchanged message and no second insert',async()=>{
 let writes=0;
 const result=await acceptDurableChatTurn(source,{
  readExact:async()=>({messages:[row()]}),
  readLatest:async()=>null,
  record:async()=>{writes++},
 });
 assert.equal(result.replayed,true);
 assert.equal(result.duplicate_content,false);
 assert.equal(result.reply_verified,false);
 assert.equal(writes,0);
});
test('existing assistant reply is returned without re-publishing',async()=>{
 const result=await acceptDurableChatTurn(source,{
  readExact:async()=>({messages:[row(),{
   role:'assistant',text:'I can help.',
   request_id:requestId,
   source_ref:'supabase:reality_chat_messages:6e81c595-b99a-4d77-96a9-c9cd7b2b1630'}]}),
  readLatest:async()=>null,
  record:async()=>{throw Error('MUST_NOT_WRITE')},
 });
 assert.equal(result.reply_verified,true);
});
test('a second Send after a saved unanswered insert reuses original exact request',async()=>{
 let writes=0;
 const latest=row(otherId);
 const outcome=await acceptDurableChatTurn(source,{
  readExact:async(_,{requestId:r})=>({messages:r===otherId?[latest]:[]}),
  readLatest:async()=>latest,
  now:()=>Date.parse(latest.created_at)+7000,
  record:async()=>{writes++}
 });
 assert.equal(outcome.saved,true);
 assert.equal(outcome.replayed,true);
 assert.equal(outcome.duplicate_content,true);
 assert.equal(outcome.request_id,otherId);
 assert.equal(outcome.source_ref,source_ref);
 assert.equal(writes,0);
});
test('a previously answered identical request is allowed as a fresh intentional question',async()=>{
 const old=row(otherId);
 let wrote=0;
 const r=await acceptDurableChatTurn(source,{
  readExact:async(_,{requestId:r})=>({messages:r===otherId?
   [old,{role:'assistant',text:'Old answer',request_id:otherId}]:
   wrote?[row()]:[]}),
  readLatest:async()=>old,
  now:()=>Date.parse(old.created_at)+1000,
  record:async()=>{wrote++;return {source_ref}}
 });
 assert.equal(r.replayed,false);
 assert.equal(wrote,1);
});
test('different user message or old request never suppresses a fresh send',async()=>{
 for(const latest of [
  {...row(otherId),text:'An unrelated request'},
  {...row(otherId),created_at:'2026-11-11T00:00:00.000Z'}
 ]){
  let wrote=0;
  await acceptDurableChatTurn(source,{
   readExact:async(_,{requestId:r})=>({messages:
    r===requestId&&wrote?[row()]:[]}),
   readLatest:async()=>latest,
   now:()=>Date.parse('2026-11-15T12:20:00.000Z'),
   record:async()=>{wrote++;return {source_ref}}
  });
  assert.equal(wrote,1);
 }
});
test('request-ID collision fails before writing a different instruction',async()=>{
 await assert.rejects(()=>acceptDurableChatTurn({...source,message:'Different instruction'},{
  readExact:async()=>({messages:[row()]}),
  readLatest:async()=>null,
  record:async()=>{throw Error('MUST_NOT_WRITE')}
 }),/CHAT_REQUEST_ID_CONTENT_MISMATCH/);
});
test('independent exact readback failure never claims a saved user turn',async()=>{
 await assert.rejects(()=>acceptDurableChatTurn(source,{
  readExact:async()=>({messages:[]}),
  readLatest:async()=>null,
  record:async()=>({source_ref})
 }),/CHAT_USER_SAVE_READBACK_UNVERIFIED/);
});
test('intake has no full conversation scan and can report genuine reused identity',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat-intake.js',import.meta.url),'utf8');
 assert.doesNotMatch(api,/readPrivateChat\(/);
 assert.match(api,/readPrivateChatRequest/);
 assert.match(api,/readLatestPrivateChatUserTurn/);
 assert.match(api,/duplicate_content:true/);
 assert.match(api,/request_id:latest\.request_id/);
 assert.doesNotMatch(api,/authorizeShift|publishPrivateAssistantAtomically|installCapability/);
});
