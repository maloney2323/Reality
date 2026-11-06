import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=get('reality-chat-simple.html');
const route=JSON.parse(get('vercel.json'));
// The app uses a module script; the later plain script is only the passkey helper.
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
const browserScript=script?.replace(/^\s*import\s+\{[^}]+\}\s*from\s*'[^']+';\s*/,'');

test('light Chat is on an isolated route without replacing the existing approvals view',()=>{
  assert.ok(route.rewrites.some(r=>r.source==='/chat-simple'&&r.destination==='/reality-chat-simple.html'));
  assert.ok(route.rewrites.some(r=>r.source==='/chat'&&r.destination==='/index.html'));
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.match(html,/Reality · Riley shift/);
  assert.match(html,/<nav class="reality-page-nav" aria-label="Reality pages">/);
  assert.match(html,/<a id="rileyNavHome" href="\/">Home<\/a>/);
  assert.match(html,/<a id="rileyNavChat" href="\/chat">Chat<\/a>/);
  assert.match(html,/<a id="rileyNavEvaluation" href="\/value#pre-automation">Evaluation<\/a>/);
  assert.match(html,/id="teamToggle" type="button" aria-expanded="false"/);
  assert.match(html,/id="employeeBoardPanel" aria-label="Reality proposed AI team" hidden/);
  assert.match(html,/Sending a chat message is not authorization/);
});
test('light Chat preserves existing private session and scoped saved conversation',()=>{
  assert.match(html,/\/api\/reality\/personal-session/);
  assert.match(html,/\/api\/reality\/personal-chat/);
  assert.match(html,/reality\.private\.chat\.conversation\.v1/);
  assert.match(script,/conversation_id:id,request_id:requestId,message:value/);
  assert.doesNotMatch(script,/dispatchWorker|installCapability|owner_install_approved|goal_command:/);
});
test('user message appears before network wait and answer appears without history refresh',()=>{
  assert.ok(script);
  assert.doesNotThrow(()=>new Script(browserScript));
  const optimistic=script.indexOf("bubble('user',value,'pending')");
  const request=script.indexOf("const data=await json(API,{method:'POST'");
  const reply=script.indexOf('waiting.lastChild.textContent=data.answer;');
  assert.ok(optimistic>0&&request>optimistic&&reply>request);
  assert.ok(script.includes('if(seq!==sequence||id!==active||pending)return;'));
  assert.ok(script.includes('Response failed or timed out. Check saved history to avoid duplicates.'));
});
