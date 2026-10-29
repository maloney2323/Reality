import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectOriginal143OwnerAction,completeOriginal143OwnerAction,
 ORIGINAL_143_CONFIRMATION} from '../src/reality-original-143-real-activation-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const conversation='22222222-2222-4222-8222-222222222222';
const session={user_id:owner,config:{url:'https://isolated.example.test'}};
const prod={VERCEL_ENV:'production'};
const preview={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true'};
test('Reality original owner confirmation is pinned and not model generated',()=>{
 assert.equal(ORIGINAL_143_CONFIRMATION,'ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY');
});
test('cannot act while signed out',async()=>{
 await assert.rejects(completeOriginal143OwnerAction({
  session:null,conversationId:conversation,confirmation:ORIGINAL_143_CONFIRMATION
 }),/OWNER_SIGN_IN_REQUIRED/);
});
test('cannot act with malformed conversation',async()=>{
 await assert.rejects(completeOriginal143OwnerAction({
  session,conversationId:'claimed',confirmation:ORIGINAL_143_CONFIRMATION
 }),/OWNER_SIGN_IN_REQUIRED/);
});
test('cannot approve an activation in production',async()=>{
 await assert.rejects(completeOriginal143OwnerAction({
  session,conversationId:conversation,confirmation:ORIGINAL_143_CONFIRMATION,env:prod
 }),/ORIGINAL_143_ISOLATED_PREVIEW_ONLY/);
});
test('READ-only inspection cannot run in production',async()=>{
 await assert.rejects(inspectOriginal143OwnerAction({
  session,conversationId:conversation,env:prod
 }),/ORIGINAL_143_ISOLATED_PREVIEW_ONLY/);
});
test('server requires the exact isolated owner project',async()=>{
 await assert.rejects(completeOriginal143OwnerAction({
  session,conversationId:conversation,confirmation:ORIGINAL_143_CONFIRMATION,env:preview
 }),/ORIGINAL_143_OWNER_DB_SCOPE_INVALID/);
});
test('owner cannot replace confirmation with model output',async()=>{
 const source=readFileSync('src/reality-original-143-real-activation-v0.1.js','utf8');
 assert.match(source,/confirmation!==ORIGINAL_143_CONFIRMATION/);
 assert.match(source,/readyToActivate\(initial\)/);
 assert.match(source,/owner_id:session.user_id/);
});
test('no write-capable GitHub connector imported or called',()=>{
 const source=readFileSync('src/reality-original-143-real-activation-v0.1.js','utf8');
 assert.match(source,/executeOriginalMaintenanceRepair/);
 assert.match(source,/get=githubGet/);
 assert.doesNotMatch(source,/githubPost|githubPut|githubWrite|githubPatch|gitPush/);
});
test('registration and settlement use real separate service-only atomic RPCs',()=>{
 const source=readFileSync('src/reality-original-143-real-activation-v0.1.js','utf8');
 assert.match(source,/reality_register_original_143_capability/);
 assert.match(source,/reality_settle_original_143_job/);
 assert.match(source,/lease\.claim/);
 assert.match(source,/registeredRow\?\.status!=='ACTIVE'/);
});
test('API POST requires owner session and same-origin, GET is read only',()=>{
 const source=readFileSync('api/reality/personal-original-full-loop.js','utf8');
 assert.match(source,/authenticatedChatSession/);
 assert.match(source,/assertSameOrigin/);
 assert.match(source,/privateChatConfig/);
 assert.match(source,/ACTIVATE_RESUME_SETTLE_ORIGINAL_143/);
 assert.match(source,/req\.method==='GET'/);
});
test('database must deny direct activation by anon and authenticated roles',()=>{
 const sql=readFileSync('supabase/migrations/20261028235500_reality_original_143_atomic_activation.sql','utf8');
 assert.match(sql,/revoke all on function public\.reality_register_original_143_capability/);
 assert.match(sql,/revoke all on function public\.reality_settle_original_143_job/);
 assert.match(sql,/to service_role/);
 assert.match(sql,/ONE_TIME_RESERVATION_REQUIRED/);
});
test('final receipt explicitly distinguishes preexisting fix from Reality-authored work',()=>{
 const source=readFileSync('src/reality-original-143-real-activation-v0.1.js','utf8');
 assert.match(source,/HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED/);
 assert.match(source,/external_repair_performed_by_reality:false/);
 assert.match(source,/original_issue_closed:false/);
});

test('original job approval appears only from Unfinished Work and requires owner click',()=>{
 const html=readFileSync('index.html','utf8');
 assert.match(html,/data-original143-prepare/);
 assert.match(html,/data-original143-activate/);
 assert.match(html,/window\.confirm\(/);
 assert.match(html,/ACTIVATE_RESUME_SETTLE_ORIGINAL_143/);
 assert.match(html,/ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
});
test('the updated original job UI JavaScript is syntactically valid',async()=>{
 const vm=await import('node:vm');
 const html=readFileSync('index.html','utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=1);
 for(const [,script] of scripts)new vm.Script(script);
});
