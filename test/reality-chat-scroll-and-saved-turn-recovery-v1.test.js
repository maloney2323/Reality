import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('reality-chat-fullscreen-v2.css');
const exportsUI=read('reality-chat-conversation-export-v1.js');
const workspace=read('reality-chat-workspace-v1.js');

test('mobile thread owns vertical touch scrolling, and composer does not shrink',()=>{
 assert.match(css,/#privateChat \.reality-chat-conversation #privateTranscript\{/);
 assert.match(css,/touch-action:pan-y!important/);
 assert.match(css,/-webkit-overflow-scrolling:touch/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(css,/#realityChatComposer\{/);
 assert.match(css,/flex:0 0 auto!important/);
});

test('export controls are located in independently scrollable Chats sidebar, not transcript stack',()=>{
 assert.match(exportsUI,/document\.getElementById\('realityChatSidebar'\)/);
 assert.match(exportsUI,/sidebar\.append\(title,controls\)/);
 assert.doesNotMatch(exportsUI,/transcript\.insertAdjacentElement\('afterend',controls\)/);
 assert.match(workspace,/sidebar\.id = 'realityChatSidebar'/);
 assert.match(workspace,/conversation\.append\(threadHeader, transcript, composer\)/);
 assert.match(exportsUI,/Copy conversation/);
 assert.match(exportsUI,/Export Markdown/);
 assert.match(exportsUI,/Export JSON/);
 assert.match(exportsUI,/Print \/ Save PDF/);
});

test('failed request reads authenticated saved history before restoring draft and cannot imply job execution',()=>{
 assert.match(html,/savedUser=body\.messages\.find/);
 assert.match(html,/savedAnswer=body\.messages\.find/);
 assert.match(html,/x\.request_id===sentRequest&&x\.text===value/);
 assert.match(html,/source_ref\|\|''\)\.startsWith\('supabase:reality_chat_messages:'\)/);
 assert.match(html,/if\(!savedUser&&!el\('privatePrompt'\)\.value\.trim\(\)\)/);
 assert.match(html,/YOU · SAVED · REPLY NOT VERIFIED/);
 assert.match(html,/Do not resend this request or assume a development job started/);
 assert.match(html,/const status=s=>\{el\('privateStatus'\)\.textContent=typeof s==='string'/);
 assert.doesNotMatch(html,/el\('privateStatus'\)\.textContent=s;/);
});

test('signed-in history refresh retains prior scroll position when user is reading upthread',()=>{
 assert.match(html,/const atBottom=thread\.scrollHeight-thread\.scrollTop-thread\.clientHeight<=90/);
 assert.match(html,/thread\.scrollTop=atBottom\?thread\.scrollHeight:/);
 assert.match(html,/Math\.max\(0,previousTop\+\(thread\.scrollHeight-previousHeight\)\)/);
 assert.match(html,/window\.realityChatRefreshTranscript/);
});

test('Chat recovery does not mint a new job, rerun a failed request, or bypass installation authorization',()=>{
 assert.doesNotMatch(exportsUI,/authorize_employee|install_approved|create_original_job/i);
 assert.doesNotMatch(css,/position:\s*fixed;\s*top:\s*0;\s*left:\s*0;\s*right:\s*0/);
 assert.match(html,/window\.dispatchEvent\(new CustomEvent\('reality:chat-request-failed'/);
 assert.match(html,/Do not resend this request/);
});
