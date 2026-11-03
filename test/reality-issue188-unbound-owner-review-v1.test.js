import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const page=readFileSync('index.html','utf8');
const route=readFileSync('api/reality/personal-issue188-candidate-review.js','utf8');
test('new independently verified but unbound review is visibly separate from owner installation queue',()=>{
 assert.match(page,/id="homeOwnerFollowonReview"/);
 assert.match(page,/homeOwnerShowUnboundFollowonReview/);
 assert.match(page,/HARDENED_SOURCE_VERIFIED_NOT_OWNER_WORK_BOUND/);
 assert.match(page,/new_owner_work_binding_required/);
 assert.match(page,/No receipt button is required/);
});
test('candidate review is GET-only, signed-in, preview-scoped and read-only',()=>{
 assert.match(route,/req\.method!=='GET'/);
 assert.match(route,/authenticatedChatSession\(req,res\)/);
 assert.match(route,/process\.env\.VERCEL_ENV!=='preview'/);
 assert.match(route,/hvkfreoagbrphwghjajw/);
 assert.match(route,/reality_read_owner_genuine_loop_v1/);
 assert.doesNotMatch(route,/reality_owner_approve_qualified_preview_v1/);
 assert.doesNotMatch(route,/\bmethod:'PUT'\b|\bmethod:'PATCH'\b|\bmethod:'DELETE'\b/);
});
test('new candidate cannot be represented as installed or approved',()=>{
 assert.match(route,/installed:false,qualified_for_owner_installation:false/);
 assert.match(route,/owner_approval_issued:false,new_original_work_id:null/);
 assert.match(route,/new_owner_work_binding_required:true/);
 assert.match(route,/previous_owner_work_already_settled:true/);
 assert.match(page,/Not authorized: no new work binding, no exact installation approval/);
});
test('source provider job, model artifact and independent verification artifact remain pinned',()=>{
 assert.match(route,/const ID=41547631404/);
 assert.match(route,/d084f46d840027acd412b67fceb1636fd35a64f2cc08b9ebb6666d470d1af43d/);
 assert.match(route,/a15f718461a9af61663f10797088df28abac312bf338269bb16b16f6cd0122b4/);
 assert.match(route,/166309eddaef9878341871551283989b5da0d612ebb799d2647d8163d8250bdd/);
});
test('all inline scripts on the actual homepage parse',()=>{
 const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=1);
 for(const [i,match] of scripts.entries())assert.doesNotThrow(()=>new Script(match[1],{filename:'index.html:inline:'+i}));
});
