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
  // The only permitted external script is the isolated, read-only Chat export helper.
  assert.deepEqual([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(x=>x[1]),
   ['/reality-chat-conversation-export-v1.js']);
  assert.match(html,/Reality · Riley shift/);
  assert.match(html,/<nav class="reality-page-nav" aria-label="Reality pages">/);
  assert.match(html,/<a id="rileyNavHome" href="\/">Home<\/a>/);
  assert.match(html,/<a id="rileyNavChat" href="\/chat">Chat<\/a>/);
  assert.match(html,/<a id="rileyNavEvaluation" href="\/value#pre-automation">Evaluation<\/a>/);
  assert.match(html,/id="teamToggle" type="button" aria-expanded="false"/);
  assert.match(html,/id="employeeBoardPanel" aria-label="Reality proposed AI team" hidden/);
  assert.match(html,/Start Fresh Riley \+ Taylor Jobs/);
  assert.match(html,/One authorization starts a verified fresh work batch/);
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

test('real shift remains visible and prevents duplicate approval when progress stalls at original-job gate',()=>{
 assert.equal((html.match(/id="shiftStatus"/g)||[]).length,1);
 assert.ok(html.indexOf('id="shiftStatus"')<
  html.indexOf('id="employeeBoardPanel"'));
 assert.match(html,/id="runFullShift" type="button" disabled/);
 assert.match(script,/activeState\.status==='AWAITING_EXACT_ORIGINAL_WORK'/);
 assert.match(script,/QUALIFICATION BLOCKER/);
 assert.match(script,/\$\('runFullShift'\)\.disabled=true/);
 assert.match(script,/Existing shift authorized/);
 assert.match(script,/Do not start a duplicate/);
 assert.match(script,/renderActiveRileyTaylorQueue\(data\)/);
 assert.match(script,/Shift status readback unavailable/);
 assert.match(script,/Status refreshed/);
 assert.doesNotMatch(script,/activeState\.hasActive\)\{[\s\S]{0,500}authorizeShiftFromChat\(/);
});

test('live automation jobs stay visible first while employee and support cards fold',()=>{
 const live=html.indexOf('id="rileyLiveProgressPanel"');
 const next=html.indexOf('id="rileyNextActionPanel"');
 const board=html.indexOf('id="employeeBoardPanel"');
 const conversation=html.indexOf('id="rileyConversationDisclosure"');
 assert.ok(live>0&&live<next&&next<board&&board<conversation);
 assert.match(html,/<section id="rileyLiveProgressPanel" class="team-value live-work-priority"/);
 assert.match(html,/id="rileyActiveAutomationCards" class="active-automation-grid"/);
 assert.match(html,/id="rileyActiveAutomationCount"/);
 assert.match(script,/function renderCurrentAutomationCards\(graph\)/);
 assert.match(script,/renderCurrentAutomationCards\(graph\);/);
 assert.match(script,/j\.phase!=='SETTLED'/);
 assert.match(script,/Tested candidate only\. Installation, approval and same-job settlement are not proven/);
 for(const id of ['rileyNextActionPanel','rileyTaylorCombinedQueue',
  'combinedShiftRoleHandoffs','employeeBoardPanel','rileyConversationDisclosure',
  'workforceSavingsPlanner'])
  assert.match(html,new RegExp('<details[^>]*id="'+id+'"'),id);
 assert.match(script,/const card=document\.createElement\('details'\);card\.className='team-card'/);
 assert.match(script,/const summary=document\.createElement\('summary'\);summary\.className='team-card-summary'/);
 assert.match(script,/panel\.open=!panel\.hidden/);
 assert.doesNotMatch(html,/<details[^>]*id="workforceSavingsPlanner"[^>]*\bopen\b/);
 assert.match(html,/<summary>Reality Chat · Expand conversation and message Reality<\/summary>/);
 for(const id of ['rileyLiveHeadline','rileyActualWorkerReceipt','rileyVerifiedOriginalJobRows',
  'rileyUnifiedOriginalGraph','rileyLiveTimeline','rileyOriginalActivityRows','prompt','composer','send'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
