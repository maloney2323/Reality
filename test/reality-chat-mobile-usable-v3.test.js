import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const css=read('reality-chat-mobile-usable-v3.css');
const workspace=read('reality-chat-workspace-v1.js');
const incident=read('reality-chat-operational-incident-briefing-v1.js');
const handoff=read('reality-chat-direct-work-handoff-v1.js');
test('a last-loaded mobile UX override wins after the unified shell and connection themes',()=>{
 const v=html.indexOf('/reality-chat-mobile-usable-v3.css');
 assert.ok(v>html.indexOf('/reality-unified-shell-v1.css'));
 assert.ok(v>html.indexOf('/reality-connections-workspace-v1.css'));
 assert.match(html,/<meta name="viewport" content="width=device-width,initial-scale=1">/);
 assert.ok(css.includes('@media(max-width:900px)'));
 assert.match(css,/\.reality-chat-signed-in main/);
 assert.match(css,/--rc-mobile-nav-reserve/);
 assert.match(css,/height:calc\(var\(--reality-chat-visible-height,100dvh\) - var\(--rc-mobile-nav-reserve\)\)!important/);
 assert.match(css,/\.reality-chat-signed-in #realityChatWorkspace/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(css,/\.reality-chat-signed-in[^\n]*#privateReady/);
 assert.match(css,/\.reality-chat-signed-in[^\n]*#privateChat/);
});
test('the top mission banner moves into account settings, retaining the original saved mission controls',()=>{
 assert.match(html,/id="privateAccountMissionBanner"/);
 assert.match(html,/id="privateMissionEditShortcut"/);
 assert.match(html,/id="privateMissionText"/);
 assert.match(html,/id="privateMissionConfirm"/);
 assert.match(workspace,/missionBanner=get\('privateAccountMissionBanner'\)/);
 assert.match(workspace,/settings\.insertBefore\(missionBanner,settings\.children\[1\]\|\|null\)/);
 assert.match(workspace,/sidebar\.append\(settings\)/);
 assert.doesNotMatch(workspace,/missionBanner\.remove\(/);
});
test('operational briefing is collapsed inside Work not mounted before transcript',()=>{
 assert.match(incident,/const root=node\('details','rx-owner-incidents'\)/);
 assert.match(incident,/const header=node\('summary','rx-owner-incidents-head'\)/);
 assert.match(incident,/getElementById\('realityChatPanelWork'\)/);
 assert.match(incident,/if\(workPanel\)workPanel\.prepend\(root\)/);
 assert.match(incident,/root\.append\(header,refresh,status,workerReceipt/);
 assert.match(incident,/window\.setInterval/);
 assert.match(css,/#realityOwnerIncidentChat/);
});
test('the saved-work handoff cannot crowd out Send on real mobile Work layout',()=>{
 assert.match(handoff,/ready\.contains\(composer\)/);
 assert.match(handoff,/getElementById\('realityChatPanelWork'\)/);
 assert.match(handoff,/if\(workPanel\)workPanel\.append\(panel\)/);
 assert.match(handoff,/else container\.insertBefore\(panel,composer\)/);
 assert.match(handoff,/reality:chat-intake-saved/);
 assert.match(handoff,/reality:chat-request-started/);
});
test('the ORIGINAL send control is mounted inside the bordered message field and bottom-aligned',()=>{
 for(const id of ['privatePrompt','privateSend','privateGoalCommand'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(workspace,/inputRow=node\('div','reality-chat-input-row'\)/);
 assert.match(workspace,/inputRow\.append\(get\('privatePrompt'\),get\('privateSend'\)\)/);
 assert.match(workspace,/composer\.append\(inputRow\)/);
 assert.match(workspace,/transcript\.append\(statusBar\)/);
 assert.match(workspace,/statusBar\.setAttribute\('role','status'\)/);
 assert.doesNotMatch(workspace,/conversation\.insertBefore\(statusBar,composer\)/);
 assert.doesNotMatch(workspace,/statusExpand\.textContent/);
 assert.match(workspace,/send\.textContent='Send'/);
 assert.match(workspace,/send\.setAttribute\('aria-label','Send message to Reality'\)/);
 assert.match(css,/\.reality-chat-input-row\{/);
 assert.match(css,/#realityChatComposer \.reality-chat-input-row #privateSend\{/);
 assert.match(css,/max-height:128px!important/);
 assert.match(html,/el\('privateSend'\)\.onclick/);
});
test('Chat never minimizes on mobile; header action and inspector remain available',()=>{
 assert.match(css,/\.reality-chat-signed-in \.top\{\s*display:none!important/);
 assert.match(css,/#realityChatFocusToggle/);
 assert.match(css,/display:none!important/);
 assert.match(workspace,/if\(smallScreen\(\)\)return;/);
 assert.doesNotMatch(workspace,/classList\.toggle\('reality-chat-compact'\)/);
 assert.match(workspace,/historyToggle\.addEventListener\('click'/);
 assert.match(workspace,/inspectorToggle\.addEventListener\('click'/);
 assert.match(workspace,/newChatHeader\.addEventListener\('click'/);
});
test('Android keyboard keeps composer visible without duplicating Send or hiding signed-out auth',()=>{
 assert.match(workspace,/window\.visualViewport/);
 assert.match(workspace,/viewport\.addEventListener\('resize',syncKeyboardViewport/);
 assert.match(workspace,/get\('privatePrompt'\)\?\.addEventListener\('focus',syncKeyboardViewport\)/);
 assert.match(workspace,/get\('privatePrompt'\)\?\.addEventListener\('blur'/);
 assert.match(css,/\.reality-chat-keyboard-open\{/);
 assert.match(css,/\.reality-chat-keyboard-open\s+\.rx-nav-mobile\{/);
 assert.match(css,/\.reality-chat-signed-in/);
 assert.doesNotMatch(css,/\bfetch\(/);
});
test('all implementation scripts parse without a new execution or owner-approval mechanism',()=>{
 assert.doesNotThrow(()=>new Script(workspace));
 assert.doesNotThrow(()=>new Script(incident));
 assert.doesNotThrow(()=>new Script(handoff));
 assert.match(incident,/getElementById\('privateReady'\)/);
 assert.match(handoff,/window\.realityChatDirectWorkEnabled=true/);
 assert.match(html,/id="realityChatApprovalInbox"/);
 assert.match(html,/id="realityChatComposer"/);
 assert.ok((css.match(/\{/g)||[]).length>25);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('Chat status and Work panels are inline messages; no mobile modal or mid-chat popup',()=>{
 assert.match(workspace,/const inlinePanels=node\('article','bubble reality-chat-inline-panels'\)/);
 assert.match(workspace,/transcript\.append\(inlinePanels\)/);
 assert.match(workspace,/const inlineScreen=\(\)=>window\.matchMedia\('\(max-width:950px\)'\)\.matches/);
 assert.match(workspace,/inlinePanels\.replaceChildren\(next==='history'\?sidebar:inspector\)/);
 assert.match(workspace,/function restorePanelNodes\(\)/);
 assert.match(workspace,/inlinePanels\.hidden=true/);
 assert.match(workspace,/statusBar\.hidden=!valid/);
 assert.match(workspace,/\(\?:null\)\+/);
 assert.doesNotMatch(workspace,/statusExpand|statusBar\.dataset\.expanded|conversation\.insertBefore\(statusBar,composer\)/);
 const frame=read('reality-chat-workspace-v1.css');
 assert.match(frame,/\.reality-chat-inline-panels \.(?:reality-chat-sidebar|reality-chat-inspector)/);
 assert.match(frame,/\.reality-chat-panel-scrim\{display:none!important\}/);
 assert.match(frame,/\.reality-chat-status-bar\[hidden\]/);
 assert.doesNotMatch(workspace,/\bfetch\s*\(/);
});
