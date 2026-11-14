import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectSavedReplyForRecovery}
 from '../reality-chat-recover-unanswered-v1.js';
const id='a8c800f6-6848-492c-b6aa-e8deca0db3fe';
const request='3a2978fc-3188-44ec-a75c-a51e201a8e5a';
const source='supabase:reality_chat_messages:3d5f5555-44e5-4d43-a7ac-af0de70b2c2b';
const now=Date.parse('2026-11-14T16:00:00.000Z');
const msg={role:'user',request_id:request,source_ref:source,
 created_at:'2026-11-14T15:59:00.000Z'};
const pending={request_id:request,user_source_ref:source,
 status:'USER_MESSAGE_SAVED_REPLY_NOT_VERIFIED'};
const args={conversationId:id,messages:[msg],
 unansweredRequests:[pending],now};
test('fresh latest saved unanswered turn is eligible only for same-request recovery',()=>{
 const selected=selectSavedReplyForRecovery(args);
 assert.equal(selected.request_id,request);
 assert.equal(selected.source_ref,source);
 assert.equal(selected.creates_user_message,false);
 assert.equal(selected.execution_authorized,false);
 assert.equal(selected.installation_authorized,false);
});
test('no recovery when a later assistant answer, later user instruction, or no matching receipt',()=>{
 assert.equal(selectSavedReplyForRecovery({...args,messages:[msg,{...msg,
  role:'assistant'}]}),null);
 assert.equal(selectSavedReplyForRecovery({...args,messages:[msg,{...msg,
  request_id:'1a18ee38-3420-4320-93d6-7e22c5c3fdab',
  created_at:'2026-11-14T15:59:40Z'}]}),null);
 assert.equal(selectSavedReplyForRecovery({...args,unansweredRequests:[]}),null);
 assert.equal(selectSavedReplyForRecovery({...args,unansweredRequests:[{
  ...pending,user_source_ref:'supabase:reality_chat_messages:bad'}]}),null);
});
test('stale, future, unknown or malformed history cannot automatically resume',()=>{
 assert.equal(selectSavedReplyForRecovery({...args,now:now+25*60*60*1000}),null);
 assert.equal(selectSavedReplyForRecovery({...args,now:now-10*60*1000}),null);
 assert.equal(selectSavedReplyForRecovery({...args,conversationId:'not-uuid'}),null);
 assert.equal(selectSavedReplyForRecovery({...args,messages:[{
  ...msg,source_ref:'fake:assistant'}]}),null);
});
test('recovery UI wires exact request identity and reuses the existing signed reply-only path',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../reality-chat-recover-unanswered-v1.js',
  import.meta.url),'utf8');
 assert.match(html,/retry\.dataset\.recoverRequestId=message\.request_id/);
 assert.match(html,/window\.dispatchEvent\(new CustomEvent\('reality:saved-chat-readback'/);
 assert.match(html,/src="\/reality-chat-recover-unanswered-v1\.js"/);
 assert.match(html,/body:JSON\.stringify\(\{conversation_id:data\.conversation_id,\s*request_id:message\.request_id,message:message\.text\}\)/);
 assert.match(js,/window\.localStorage\?\.setItem\(key/);
 assert.match(js,/control\.click\(\)/);
 assert.doesNotMatch(js,/\/api\/reality\/personal-chat-intake/);
 assert.doesNotMatch(js,/AUTHORIZE_VERIFIED_ORIGINAL_DISCOVERY/);
});
