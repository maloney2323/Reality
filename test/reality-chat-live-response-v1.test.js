import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=get('index.html');
const js=get('reality-chat-request-status-v1.js');
const css=get('reality-chat-fullscreen-v2.css');
test('the live Chat request ID belongs to the real submit and exact persisted message',()=>{
 assert.match(html,/new CustomEvent\('reality:chat-request-started'/);
 assert.match(html,/conversation_id:sentConversation,request_id:sentRequest/);
 assert.match(js,/window\.addEventListener\('reality:chat-request-started',start\)/);
 assert.match(js,/x\.request_id===state\.requestId/);
 assert.match(js,/x\.role==='user'/);
 assert.match(js,/x\.role==='assistant'/);
 assert.match(js,/state\.saved=\{source_ref:user\.source_ref\}/);
 assert.match(js,/state\.answer=\{source_ref:answer\.source_ref\}/);
});
test('read-only provider evidence, no invented internal cognition or worker effects',()=>{
 assert.match(js,/\/api\/reality\/personal-chat\?conversation_id=/);
 assert.match(js,/method:'GET',credentials:'same-origin',cache:'no-store'/);
 assert.match(js,/Internal model reasoning and verification stages are not streamed/);
 assert.match(js,/No development worker was started/);
 assert.doesNotMatch(js,/method:\s*['"]POST['"]|\/api\/reality\/shift|\/api\/reality\/personal-governed-build/);
 assert.doesNotMatch(js,/innerHTML\s*=|insertAdjacentHTML/);
});
test('request status starts promptly, clears its timer on reply and survives failures',()=>{
 assert.match(js,/clockInterval=setInterval\(render,1000\)/);
 assert.match(js,/pollInterval=setInterval/);
 assert.match(js,/button\.disabled/);
 assert.match(js,/MutationObserver/);
 assert.match(js,/current\.complete=true/);
 assert.match(js,/clearInterval\(pollInterval\)/);
 assert.match(js,/block\.hidden=false/);
});
test('mobile status stays visible without covering conversation and honors reduced motion',()=>{
 assert.match(css,/\.reality-live-reply\[hidden\]/);
 assert.match(css,/max-height:30dvh/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.reality-live-reply-spinner/);
 assert.match(html,/<script defer src="\/reality-chat-request-status-v1\.js"><\/script>/);
});
test('browser JS compiles without replacing the existing Reality handler',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(html,/el\('privateSend'\)\.onclick=async/);
 assert.match(html,/await loadSaved\(\);await loadConversations\(\);/);
 assert.match(html,/const sentConversation=conversationId\(\),sentRequest=crypto\.randomUUID\(\)/);
});
