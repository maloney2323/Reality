import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const js=read('reality-chat-verified-cycle-v2.js');
const css=read('reality-chat-fullscreen-v2.css');
test('the same existing Chat route serves full-screen presentation and read-only lifecycle',()=>{
 assert.match(html,/<link rel="stylesheet" href="\/reality-chat-workspace-v1.css">/);
 assert.match(html,/<link rel="stylesheet" href="\/reality-chat-fullscreen-v2.css">/);
 assert.match(html,/<script defer src="\/reality-chat-workspace-v1.js"><\/script>/);
 assert.match(html,/<script defer src="\/reality-chat-verified-cycle-v2.js"><\/script>/);
 assert.ok(html.indexOf('reality-chat-workspace-v1.js')<html.indexOf('reality-chat-verified-cycle-v2.js'));
 assert.match(js,/\/\^\\\/chat\\\/\?\$\//);
 assert.doesNotThrow(()=>new Script(js));
});
test('readback strictly GET-only; does not create a worker, install, or approve',()=>{
 for(const endpoint of [
   '/api/reality/personal-chat?conversation_id=',
   '/api/reality/personal-goals?conversation_id=',
   '/api/reality/personal-governed-build',
   '/api/reality/personal-genuine-loop-status'
 ])assert.ok(js.includes(endpoint),'source '+endpoint);
 assert.match(js,/method:'GET'/);
 assert.doesNotMatch(js,/method:\s*['"]POST['"]|fetch\([^)]*\/install|\.click\(\).*privateSend|dispatchWorker|approveCapability|createOriginalJob/);
 assert.match(js,/authenticated conversation|source-linked|governed/i);
 assert.match(js,/A model reply cannot stand in for a job receipt/);
});
test('all original-work stages require matched, owner-scoped readback instead of model text',()=>{
 assert.match(js,/const originalId=admitted\?build.original_work_id:null/);
 assert.match(js,/build\.original_conversation_id===id/);
 assert.match(js,/build\.goal_id===gs\.active_goal_id/);
 assert.match(js,/build\.queued===true/);
 assert.match(js,/build\.dispatch_commit_sha/);
 assert.match(js,/original_work_id===originalId/);
 assert.match(js,/candidate_verified===true/);
 assert.match(js,/owner_install_approved===true/);
 assert.match(js,/isolated_installed===true/);
 assert.match(js,/independently_settled===true/);
 assert.match(js,/FULL_LOOP_INDEPENDENTLY_VERIFIED/);
 assert.match(js,/No running development job verified/);
 assert.doesNotMatch(js,/role==='assistant'.*(?:started|success|verified)/);
});
test('verified stages expand to show evidence and source while preserving text safety',()=>{
 assert.match(js,/div\('details','reality-cycle-stage'\)/);
 assert.match(js,/div\('summary','reality-cycle-stage-summary'\)/);
 assert.match(js,/Evidence source/);
 assert.match(js,/What we know/);
 assert.match(js,/Reference/);
 assert.match(js,/textContent=String\(text\)/);
 assert.match(js,/MutationObserver/);
 assert.match(js,/realityChatOpenInspector/);
 assert.match(js,/getComputedStyle\(button\)\.display/);
 assert.doesNotMatch(js,/\.innerHTML\s*=|insertAdjacentHTML|dangerouslySetInnerHTML/);
});
test('the small-screen layout dedicates the viewport to Chat and preserves side-panel controls',()=>{
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/#privateReady/);
 assert.match(css,/flex:1 1 0!important/);
 assert.match(css,/#privateTranscript/);
 assert.match(css,/height:0!important/);
 assert.match(css,/#realityChatComposer/);
 assert.match(css,/#realityChatDockClose\{display:none!important\}/);
 assert.match(css,/#privateGoalCommand/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/reality-cycle-stage-evidence/);
 assert.match(css,/reality-cycle-stage-status/);
});
test('existing canonical Chat, goal changes, authorization and evidence controls are not replaced',()=>{
 for(const id of [
  'privateChat','privateTranscript','privatePrompt','privateSend',
  'privateConversations','privateGoalCommand','privateGoalText',
  'realityChatApprovalInbox','realityChatShiftBrief','realityChatVerifiedRepairReview'
 ])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(html,/api\/reality\/personal-chat/);
 assert.match(html,/api\/reality\/personal-goals/);
});
