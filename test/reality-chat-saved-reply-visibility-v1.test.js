import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeSavedChatReplyReadback}
 from '../src/reality-saved-chat-reply-readback-v1.js';

const id=x=>'00000000-0000-4000-8000-'+String(x).padStart(12,'0');
const row=(role,request,num)=>({
 role,request_id:request,
 source_ref:'supabase:reality_chat_messages:'+id(num),
 created_at:'2026-11-14T06:11:55Z'
});
const user=row('user',id(1),11),reply=row('assistant',id(1),12);
test('a saved user message with no signed answer is reported as unanswered, never as a model reply',()=>{
 const result=summarizeSavedChatReplyReadback([user]);
 assert.equal(result.status,'UNANSWERED_AUTHENTICATED_SAVED_CHAT_REQUESTS');
 assert.equal(result.unanswered_requests.length,1);
 assert.equal(result.unanswered_requests[0].request_id,user.request_id);
 assert.equal(result.unanswered_requests[0].user_source_ref,user.source_ref);
 assert.equal(result.unanswered_requests[0].status,'USER_MESSAGE_SAVED_REPLY_NOT_VERIFIED');
 assert.equal(result.unanswered_requests[0].response_failure_reason,'NO_DURABLE_TERMINAL_ERROR_RECORDED');
 assert.equal(result.unanswered_requests[0].development_job_dispatched_by_this_chat_request,false);
 assert.equal(result.chat_endpoint_mode,'AUTHENTICATED_CHAT_PERSISTS_TO_GOVERNED_WORK_INTAKE');
 assert.equal(result.no_new_job_started_by_this_readback,true);
});
test('same request assistant publication removes the unanswered condition',()=>{
 const result=summarizeSavedChatReplyReadback([user,reply]);
 assert.equal(result.status,'NO_UNANSWERED_REQUESTS_IN_LOADED_HISTORY');
 assert.deepEqual(result.unanswered_requests,[]);
});
test('unrelated assistant message never substitutes for the same request verified reply',()=>{
 const result=summarizeSavedChatReplyReadback([user,
  row('assistant',id(2),24),row('user',id(2),23)]);
 assert.equal(result.unanswered_requests.length,1);
 assert.equal(result.unanswered_requests[0].request_id,id(1));
});
test('reject forged chat sources and bounded invalid histories',()=>{
 assert.equal(summarizeSavedChatReplyReadback([{
  ...user,source_ref:'model:said_it_was_saved'
 }]).unanswered_requests.length,0);
 assert.throws(()=>summarizeSavedChatReplyReadback(null),/INVALID_HISTORY/);
 assert.throws(()=>summarizeSavedChatReplyReadback(Array(242).fill(user)),/INVALID_HISTORY/);
});
test('authenticated GET and existing Chat UI show status, never pretend to have answered or executed',()=>{
 const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(api,/reply_readback:summarizeSavedChatReplyReadback\(history.messages\)/);
 assert.match(api,/execution:\{status:'NOT_EXECUTED',external_actions_authorized:false\}/);
 assert.match(html,/CHAT DELIVERY STATUS · NOT A REALITY ANSWER/);
 assert.match(html,/The exact server failure was not durably recorded/);
 assert.match(html,/Its separate governed work intake and worker status are shown above/);
 assert.match(html,/missing.user_source_ref===message.source_ref/);
 assert.match(html,/role','status'/);
 assert.doesNotMatch(api,/response_failure_reason:'CHAT_COMPLETED'/);
});
