import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf("el('privateSend').onclick=async()=>");
const end=html.indexOf("window.realityChatRefreshTranscript",start);
const send=html.slice(start,end);
test('successful Chat response never waits for history or conversation-list GET before releasing Send',()=>{
 assert.ok(start>=0&&end>start);
 assert.ok(send.includes("void Promise.allSettled([loadSaved(),loadConversations()])"));
 assert.ok(!send.includes("await loadSaved();await loadConversations()"));
 assert.ok(send.includes("finally{el('privateSend').disabled=false}"));
 assert.ok(send.includes("signal:AbortSignal.timeout(95000)"));
});
test('all authenticated read-only refreshes have a finite deadline',()=>{
 for(const endpoint of [
  "/api/reality/personal-chat?list=1",
  "/api/reality/personal-chat?conversation_id=",
  "/api/reality/personal-goals?conversation_id="
 ]){
  const i=html.indexOf(endpoint);
  assert.ok(i>0,endpoint);
  assert.ok(html.slice(i,i+220).includes("AbortSignal.timeout(12000)"),endpoint);
 }
});
test('send preserves exact request identity and existing authorization boundaries',()=>{
 assert.ok(send.includes("conversation_id:sentConversation,request_id:sentRequest"));
 assert.ok(send.includes("goal_command:goalCommand"));
 assert.ok(!send.includes("installCapability("));
 assert.ok(!send.includes("dispatchWorker("));
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 assert.doesNotThrow(()=>new Script(inline));
});
