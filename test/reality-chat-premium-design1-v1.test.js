import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const js = read('reality-chat-workspace-v1.js');
const css = read('reality-chat-fullscreen-v2.css');
const html = read('index.html');

test('design #1 reuses the existing signed-in chat, readback panels and approval inbox', () => {
 assert.ok(js.includes("window.location.pathname"));
 assert.ok(js.includes("const chat = get('privateChat'), ready = get('privateReady')"));
 assert.ok(js.includes("conversation.append(threadHeader, transcript, composer)"));
 assert.ok(js.includes("panels.approvals.append(get('realityChatApprovalInbox'))"));
 assert.ok(js.includes("get('realityChatShiftBrief')"));
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|installCapability|authorizeShift/.test(js));
 assert.doesNotThrow(() => new Script(js));
});

test('new chat and review buttons delegate to the previously authorized UI controls', () => {
 assert.ok(js.includes("get('privateNew')"));
 assert.ok(js.includes("existing.click()"));
 assert.ok(js.includes("reviewWork.addEventListener('click',()=>selectTab('approvals',true))"));
 assert.ok(js.includes("quickWork.addEventListener('click'"));
 assert.ok(js.includes("selectTab('work')"));
 assert.ok(!js.includes("get('privateSend').click()"));
});

test('premium desktop and mobile CSS preserve full-height conversation and separate evidence', () => {
 for(const token of [
   'APPROVED CHAT DESIGN #1','.reality-chat-quick-nav',
   '.reality-chat-review-action','#privateTranscript .bubble.user',
   '@media(max-width:950px)','@media(max-width:600px)',
   'height:calc(100dvh - 64px - env(safe-area-inset-bottom))!important',
   '.reality-chat-mobile-nav','@media(prefers-reduced-motion:reduce)'
 ]) assert.ok(css.includes(token),token);
 for(const id of ['privatePrompt','privateTranscript','realityChatShiftBrief','realityChatApprovalInbox'])
  assert.match(html,new RegExp('id="'+id+'"'));
});

test('navigation stays within existing routes and has no fictional cost or completion values',()=>{
 for(const route of ['/employees','/value','/chat'])
  assert.ok(js.includes(route),route);
 assert.ok(js.includes('No simulated progress'));
 assert.ok(!/\$6,480|48%|142 hrs|completed shift|saved money/i.test(js));
 assert.ok(js.includes('reality-chat-signed-in'));
 assert.ok(css.includes('.reality-chat-mobile-nav-item[aria-current="page"]'));
});
