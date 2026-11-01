import test from 'node:test';
import assert from 'node:assert/strict';
import {openChatActivityStream} from '../src/reality-chat-live-activity-stream-v1.js';
import {readFileSync} from 'node:fs';

function response(){
 const calls={status:null,headers:{},frames:[],ended:false};
 const res={
  status(n){calls.status=n;return res;},
  setHeader(k,v){calls.headers[k.toLowerCase()]=v;return res;},
  flushHeaders(){calls.flushed=true;},
  write(v){calls.frames.push(v);return true;},
  end(){calls.ended=true;},
 };
 return {res,calls};
}
function entries(calls){return calls.frames.map(raw=>{
 const ev=raw.match(/^event: (\w+)/m)?.[1];
 const json=raw.match(/^data: (.+)$/m)?.[1];
 return {ev,...JSON.parse(json||'{}')};
});}
test('normal personal chat request stays JSON, with no stream mutation',()=>{
 const {res,calls}=response();
 assert.equal(openChatActivityStream({headers:{accept:'application/json'}},res),null);
 assert.equal(calls.status,null);
 assert.deepEqual(calls.frames,[]);
});
test('stream announces only observed stages and exact final verified payload',()=>{
 const {res,calls}=response();
 const stream=openChatActivityStream({headers:{accept:'text/event-stream'}},res);
 assert.equal(calls.status,200);
 assert.match(calls.headers['content-type'],/text\/event-stream/);
 assert.match(calls.headers['cache-control'],/no-store/);
 assert.equal(entries(calls)[0].stage,'session');
 stream.progress('message_saved','Saved original message');
 stream.progress('model_running','Governed answer review started');
 stream.progress('review_complete','Review passed');
 stream.progress('goal_checked','Goal current');
 stream.progress('answer_saved','Answer durably read back');
 assert.throws(()=>stream.progress('raw_private_chain_of_thought','hidden'),/NOT_SUPPORTED/);
 const final={ok:true,answer:'Checked answer',continuity:{current_answer_persisted:true}};
 stream.complete(final);
 assert.equal(calls.ended,true);
 const records=entries(calls);
 assert.equal(records.at(-1).ev,'result');
 assert.deepEqual(records.at(-1).continuity,final.continuity);
 assert.equal(records.filter(x=>x.ev==='progress').length,6);
});
test('failed or interrupted stream cannot send a fabricated settled response',()=>{
 const {res,calls}=response();
 const stream=openChatActivityStream({headers:{accept:'text/event-stream'}},res);
 assert.throws(()=>stream.complete({ok:false,answer:'faked'}),/NOT_VERIFIED/);
 stream.failure('UNEXPECTED_WITH_PRIVATE_DETAILS');
 assert.deepEqual(entries(calls).at(-1),{ev:'error',error:'CHAT_UNAVAILABLE'});
 assert.equal(calls.ended,true);
 assert.equal(stream.progress('answer_saved','should be ignored'),false);
});
test('backend keeps publish-and-readback proof before final streamed result',()=>{
 const source=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
 const a=source.indexOf('publishPrivateAssistantAtomically(session,{');
 const b=source.indexOf('CHAT_ASSISTANT_DURABILITY_NOT_VERIFIED',a);
 const c=source.indexOf('chatActivity.complete(responsePayload)',b);
 assert.ok(a>=0&&b>a&&c>b);
 assert.match(source,/chatActivity=openChatActivityStream\(req,res\)/);
 assert.match(source,/if\(chatActivity\)\{chatActivity\.failure\(e\.message\);return;\}/);
 assert.match(source,/return res\.status\(200\)\.json\(responsePayload\)/);
});
