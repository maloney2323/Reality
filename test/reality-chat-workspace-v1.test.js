import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const js=read('reality-chat-workspace-v1.js');
const css=read('reality-chat-workspace-v1.css');
const config=JSON.parse(read('vercel.json'));

test('Chat navigation resolves to actual full-page route and loads only presentation assets',()=>{
 assert.ok(config.rewrites.some(x=>x.source==='/chat'&&x.destination==='/index.html'));
 assert.match(html,/<a id="realityChatTab" href="\/chat"/);
 assert.match(html,/<link rel="stylesheet" href="\/reality-chat-workspace-v1\.css">/);
 assert.match(html,/<script defer src="\/reality-chat-workspace-v1\.js"><\/script>/);
 assert.match(css,/body\[data-reality-route="chat"\] #privateChat/);
 assert.match(css,/max-width:1780px!important/);
 assert.match(css,/\.reality-chat-workspace\{/);
 assert.match(css,/grid-template-columns:minmax\(195px,240px\) minmax\(0,1fr\) minmax\(300px,350px\)/);
});
test('reuses every actual Reality conversation, evidence, goal and single-approval control',()=>{
 const ids=[
  'privateChat','privateReady','privateLogin','privateAccountState',
  'privateTranscript','privatePrompt','privateGoalCommand','privateSend',
  'privateConversations','privateNew','privateSignOut','privateGoalStatus',
  'realityChatShiftBrief','realityChatShiftTimeline','realityChatActivity',
  'realityChatAutomationDiagnostics','realityChatApprovalInbox',
  'realityChatApprovalItems','realityChatVerifiedRepairReview',
  'realityChatRepairReviewItems','privateStatus','realityChatSettings',
 ];
 for(const id of ids){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);

 }
 assert.match(js,/ready\.append\(workspace\)/);
 assert.doesNotMatch(js,/document\.write|innerHTML\s*=|insertAdjacentHTML/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
 assert.doesNotMatch(js,/approveOnce\s*\(|installCapability\s*\(|startJob\s*\(/);
});
test('work panels are independently inspectable and do not simulate activity',()=>{
 assert.match(js,/panels\.work\.append\(get\('realityChatShiftBrief'\),get\('realityChatActivity'\),get\('realityChatAutomationDiagnostics'\)\)/);
 assert.match(js,/panels\.approvals\.append\(get\('realityChatApprovalInbox'\)\)/);
 assert.match(js,/panels\.proof\.append\(proofLead,get\('realityChatVerifiedRepairReview'\)\)/);
 assert.match(js,/get\('privateSend'\)/);
 assert.match(js,/get\('privateConversations'\)/);
 assert.match(js,/get\('privateGoalStatus'\)/);
 assert.match(js,/\.href='\/value'/);
 assert.match(js,/Source-backed status and decisions/);
 assert.match(js,/they never authorize or start a job/);
 assert.doesNotMatch(js,/\bownerApproved\s*=\s*true|installation_authorized:\s*true/);
});
test('mobile conversation has explicit accessible panel controls and Escape close',()=>{
 assert.match(css,/@media\(max-width:950px\)/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/data-reality-chat-panel="history"/);
 assert.match(css,/data-reality-chat-panel="work"/);
 assert.match(js,/aria-controls','realityChatSidebar'/);
 assert.match(js,/aria-controls','realityChatInspector'/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/role','tablist'/);
 assert.match(js,/role','tabpanel'/);
 assert.match(js,/role','tab'/);
 assert.match(js,/ArrowLeft','ArrowRight','Home','End'/);
});
test('the entire conversation remains accessible, no fake verification or new authority',()=>{
 assert.match(css,/max-height:none!important/);
 assert.match(css,/\.reality-chat-conversation/);
 assert.match(js,/MutationObserver\(refreshReadyDisplay\)/);
 assert.match(js,/realityChatStatusSummary/);
 assert.match(css,/reality-chat-signed-in/);
 assert.match(js,/privateTranscript/);
 assert.match(js,/\.classList\.contains\('bubble'\)/);
 assert.match(js,/No message grants installation permission/);
 assert.match(js,/event\.isComposing \|\| event\.shiftKey/);
 assert.match(js,/matchMedia && window\.matchMedia\('\(pointer:fine\)'\)/);
});
test('new page scripts and inherited inline full application compile',()=>{
 assert.doesNotThrow(()=>new Script(js));
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline?.length>100000);
 assert.doesNotThrow(()=>new Script(inline));
});
