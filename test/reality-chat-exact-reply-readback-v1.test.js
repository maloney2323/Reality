import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPrivateChatRequest} from '../src/reality-private-chat-store-v0.1.js';
const user='85eeae0b-2988-43c4-b20c-590fb51da70d';
const conversationId='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const requestId='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const id='3d5f5555-44e5-4d43-a7ac-af0de70b2c2b';
const id2='6e81c595-b99a-4d77-96a9-c9cd7b2b1630';
const session={user_id:user,access_token:'test-session-token',
 config:{url:'https://test.supabase.co',key:'test-publishable-key'}};
const args={conversationId,requestId};
const row=(role,rowId)=>({
 id:rowId,user_id:user,conversation_id:conversationId,request_id:requestId,
 role,content:'Verified text',created_at:'2026-11-14T15:00:00Z'
});
test('exact signed request RLS readback fetches only one request, no broader history',async()=>{
 let calls=0;
 const out=await readPrivateChatRequest(session,args,{
  fetchImpl:async(url,opts)=>{
   calls++;
   assert.ok(url.includes('conversation_id=eq.'+conversationId));
   assert.ok(url.includes('request_id=eq.'+requestId));
   assert.ok(url.includes('user_id=eq.'+user));
   assert.ok(url.includes('limit=3'));
   assert.equal(opts.headers.authorization,'Bearer test-session-token');
   assert.equal(opts.headers.apikey,'test-publishable-key');
   return {ok:true,json:async()=>[row('user',id),row('assistant',id2)]};
  }
 });
 assert.equal(calls,1);
 assert.equal(out.status,'AUTHENTICATED_EXACT_REQUEST_RLS_READBACK');
 assert.deepEqual(out.messages.map(x=>x.role),['user','assistant']);
 assert.equal(out.messages[1].source_ref,'supabase:reality_chat_messages:'+id2);
 assert.equal(out.work_execution_authorized,false);
 assert.equal(out.installation_authorized,false);
});
test('cross-conversation, cross-owner, duplicate or malformed responses fail closed',async()=>{
 for(const records of [
  [{...row('user',id),user_id:'a8c800f6-6848-492c-b6aa-e8deca0db3fe'}],
  [{...row('user',id),conversation_id:user}],
  [row('user',id),row('user',id2)],
  [{...row('assistant',id),request_id:user}]
 ]){
  await assert.rejects(()=>readPrivateChatRequest(session,args,{
   fetchImpl:async()=>({ok:true,json:async()=>records})
  }),/CHAT_REQUEST_READBACK_ROWS_INVALID/);
 }
 await assert.rejects(()=>readPrivateChatRequest(session,{
  conversationId,requestId:'invalid'
 }),/CHAT_REQUEST_READBACK_IDENTITY_INVALID/);
});
test('progress polling bypasses full history and dashboard context and remains read-only',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const start=api.indexOf("if(req.method==='GET'&&String(req.query?.reply_readback||'')==='1')");
 const full=api.indexOf('const history=await readPrivateChat(session,conversationId);');
 assert.ok(start>=0&&full>start);
 const exact=api.slice(start,full);
 assert.match(exact,/readPrivateChatRequest\(session/);
 assert.doesNotMatch(exact,/collectOptionalChatEvidence/);
 assert.match(exact,/work_execution_authorized:false,installation_authorized:false/);
 const progress=readFileSync(new URL('../reality-chat-request-status-v1.js',import.meta.url),'utf8');
 assert.match(progress,/reply_readback=1&request_id=/);
 assert.match(progress,/signal:AbortSignal.timeout\(8000\)/);
});

test('saved Chat work status reads the exact authenticated request, without granting execution',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const start=api.indexOf("if(req.method==='GET'&&String(req.query?.work_readback||'')==='1')");
 const full=api.indexOf('const history=await readPrivateChat(session,conversationId);');
 assert.ok(start>0&&start<full,'work readback must run before full Chat history');
 const route=api.slice(start,full);
 assert.match(route,/readPrivateChatRequest\(session/);
 assert.match(route,/readOwnerChatWorkHandoff\(\{session,conversationId\}\)/);
 assert.match(route,/x\.request_id===targetRequestId&&x\.source_ref===source\.source_ref/);
 assert.match(route,/CHAT_WORK_INTAKE_IDENTITY_AMBIGUOUS/);
 assert.match(route,/NO_AUTHENTICATED_SAVED_USER_TURN/);
 assert.match(route,/WORK_HANDOFF_READBACK_UNAVAILABLE/);
 assert.match(route,/execution_authorized_by_chat:false/);
 assert.match(route,/installation_authorized:false,production_changed:false/);
 assert.doesNotMatch(route,/recordPrivateMessage|reality_claim_chat_work_for_shift_v1|fetch\('https:\/\/api.openai.com/);
});
test('in-flight Chat shows only verified work intake evidence tied to matching request ID',()=>{
 const progress=readFileSync(new URL('../reality-chat-request-status-v1.js',import.meta.url),'utf8');
 assert.match(progress,/work_readback=1&request_id=/);
 assert.match(progress,/data\.request_id!==state\.requestId/);
 assert.match(progress,/work\.request_id!==state\.requestId/);
 assert.match(progress,/work\.execution_authorized_by_chat!==false/);
 assert.match(progress,/work\.installation_authorized!==false/);
 assert.match(progress,/work\.production_changed!==false/);
 assert.match(progress,/Governed work handoff/);
 assert.match(progress,/Investigation recorded against existing authorized work; execution is not proven/);
 assert.doesNotMatch(progress,/reality\/governed-employee-shift-worker|personal-governed-employee-shift/);
});
