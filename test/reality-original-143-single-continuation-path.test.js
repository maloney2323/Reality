// The original full-loop checkpoint is not an invitation to build another
// queue, dispatch system or credential dependency. Keep one owner-authorized
// continuation path and ensure chat navigation is observational only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ui=readFileSync('index.html','utf8');
const endpoint=readFileSync('api/reality/personal-original-full-loop.js','utf8');
const original=readFileSync('src/reality-original-143-real-activation-v0.1.js','utf8');

test('Real original work has one direct path from Reality chat to verified Unfinished Work',()=>{
 assert.match(ui,/id="privateContinueOriginal143"/);
 assert.match(ui,/const original143WorkId='work:24cda9611404e9bcb47909976067605c'/);
 assert.match(ui,/await wcLoadUnfinishedWork\(\)/);
 assert.match(ui,/data-original143-prepare/);
 assert.match(ui,/target\.dataset\.original143Prepare\)target\.click\(\)/);
 assert.doesNotMatch(ui,/id="privateGovernedBuildQueue"/);
 assert.doesNotMatch(ui,/QUEUE_SAFE_AUTONOMOUS_DISCOVERY/);
});
test('Navigation is signed-in and exact job selection is verified by Work Center, not first-item discovery',()=>{
 assert.match(ui,/observed\.status==='ORIGINAL_JOB_IDENTIFIED_AWAITING_INDEPENDENT_GAP_OBSERVATION'/);
 assert.match(ui,/observed\.original_work_id===original143WorkId/);
 assert.match(ui,/el\('privateReady'\)\.style\.display==='none'/);
 assert.match(ui,/realityOriginal143Eligible=true;\s+continueButton\.disabled=false/);
 assert.match(ui,/ORIGINAL_143_NOT_IN_VERIFIED_UNFINISHED_WORK/);
 assert.match(ui,/realityOriginal143Eligible=false;\s+el\('privateContinueOriginal143'\)\.disabled=true;/);
});
test('Navigation cannot make a direct activation request or fake an owner receipt',()=>{
 const start=ui.indexOf("el('privateContinueOriginal143').onclick=");
 const end=ui.indexOf('\n function showSignedIn(yes){',start);
 assert.ok(start>0&&end>start);
 const handler=ui.slice(start,end);
 assert.doesNotMatch(handler,/fetch\('\/api\/reality\/personal-original-full-loop'/);
 assert.doesNotMatch(handler,/confirmation:|ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.doesNotMatch(handler,/\/api\/reality\/personal-governed-build/);
 assert.doesNotMatch(handler,/window\.confirm/);
 assert.match(handler,/No approval was given by this navigation/);
});
test('Only existing readback + explicit owner action can register and settle original work',()=>{
 assert.match(endpoint,/authenticatedChatSession/);
 assert.match(endpoint,/req\.method==='GET'/);
 assert.match(endpoint,/assertSameOrigin\(req\)/);
 assert.match(endpoint,/ACTIVATE_RESUME_SETTLE_ORIGINAL_143/);
 assert.match(endpoint,/ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(original,/lease\.claim\(/);
 assert.match(original,/reality_register_original_143_capability/);
 assert.match(original,/reality_settle_original_143_job/);
 assert.match(original,/PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY/);
 assert.match(original,/external_repair_performed_by_reality:false/);
});
test('Real chat and Work Center JavaScript parses and contains one activation handler',()=>{
 const scripts=[...ui.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 for(const [,js] of scripts)new vm.Script(js);
 assert.equal((ui.match(/intent:'ACTIVATE_RESUME_SETTLE_ORIGINAL_143'/g)||[]).length,1);
 assert.equal((ui.match(/data-original143-activate/g)||[]).length>=1,true);
});
