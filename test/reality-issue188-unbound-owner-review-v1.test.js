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
 assert.match(page,/Approval is intentionally unavailable until Reality records a fresh owner-confirmed goal/);
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
 assert.match(route,/const ID=41533824456/);
 assert.match(route,/45d26806d0e192d6fdecd177464d13af2ab3b98a70070b8fd268a2f05bedee64/);
 assert.match(route,/de6318fcc6a9619aff9b946991c2ed5ace12f1a6a8d5745f77d4676c6c04cc59/);
 assert.match(route,/9367575b9f3eb7b23f70d4f8443310814675362e3f2ab2a1b3d81a09946385e0/);
});
test('all inline scripts on the actual homepage parse',()=>{
 const scripts=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>=1);
 for(const [i,match] of scripts.entries())assert.doesNotThrow(()=>new Script(match[1],{filename:'index.html:inline:'+i}));
});
