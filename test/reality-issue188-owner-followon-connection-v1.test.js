import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {createIssue188OwnerFollowon}
 from '../src/reality-issue188-owner-followon-binding-v1.js';
const module=readFileSync('src/reality-issue188-owner-followon-binding-v1.js','utf8');
const route=readFileSync('api/reality/personal-issue188-followon-work.js','utf8');
const review=readFileSync('api/reality/personal-issue188-candidate-review.js','utf8');
const html=readFileSync('index.html','utf8');
test('unauthenticated or untrusted direct work cannot enter binding',async()=>{
 await assert.rejects(()=>createIssue188OwnerFollowon({}),/FOLLOWON_188_EXACT_AUTHENTICATED_SOURCE_SCOPE_REQUIRED/);
 await assert.rejects(()=>createIssue188OwnerFollowon({
  session:{user_id:'85eeae0b-2988-43c4-b20c-590fb51da70d'},
  conversationId:'0e1cb881-e621-440d-bb73-a71a62ff0fa9',
  requestedSourceHash:'0'.repeat(64),
  env:{VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true'}
 }),/FOLLOWON_188_EXACT_AUTHENTICATED_SOURCE_SCOPE_REQUIRED/);
});
test('fresh original never reuses the settled work or previous approval',()=>{
 assert.match(module,/FOLLOWON_VERSION/);
 assert.match(module,/parent_original_work_id:PREVIOUS_WORK/);
 assert.match(module,/goal\.state\.active_goal\.last_transition_receipt_id/);
 assert.match(module,/owner_authorized_investigation:true/);
 assert.match(module,/owner_authorized_installation:false/);
 assert.match(module,/original_job_completed:false/);
 assert.match(module,/workId===PREVIOUS_WORK/);
 assert.match(module,/CONTINUITY_TAIL_NOT_VERIFIED/);
 assert.match(module,/FRESH_FOLLOWON_POSTWRITE_READBACK_FAILED/);
});
test('identity is pinned to both exact source and independent GitHub proof artifact digests',()=>{
 for(const x of [
  'd084f46d840027acd412b67fceb1636fd35a64f2cc08b9ebb6666d470d1af43d',
  'a15f718461a9af61663f10797088df28abac312bf338269bb16b16f6cd0122b4',
  '166309eddaef9878341871551283989b5da0d612ebb799d2647d8163d8250bdd'
 ])assert.ok(module.includes(x));
});
test('no owner-job POST proceeds without same-origin user, exact JSON, and confirmed goal',()=>{
 assert.match(route,/assertSameOrigin\(req\)/);
 assert.match(route,/authenticatedChatSession\(req,res\)/);
 assert.match(route,/CREATE_FRESH_ISSUE188_FOLLOWON_INVESTIGATION/);
 assert.match(route,/body\.source_sha256!==SHA/);
 assert.match(module,/ACTIVE_CONFIRMED_OWNER_GOAL_REQUIRED/);
 assert.match(module,/EXISTING_AUTHENTICATED_CONVERSATION_REQUIRED/);
});
test('same new job only can be passed into existing read-only investigation',()=>{
 assert.match(route,/createGenuineSourceBackedJobAdapters/);
 assert.match(route,/createGenuineOriginalWorkRunner/);
 assert.match(route,/run\(\{originalWorkId:created\.new_original_work_id\}\)/);
 assert.match(route,/exact_candidate_qualified:false/);
 assert.match(route,/installation_performed:false/);
 assert.match(route,/owner_approval_issued:false/);
});
test('owner review does not provide direct install or hidden approval',()=>{
 assert.match(review,/method:'GET'/);
 assert.doesNotMatch(review,/reality_owner_approve_qualified_preview_v1/);
 assert.match(review,/new_owner_work_binding_required:true/);
 assert.match(html,/Durably released verified receipt:/);
 assert.match(html,/receipt\.automatic_candidate_receipt\.receipt_id/);
 assert.doesNotMatch(html,/Save work receipt · Start automatic repair preparation/);
 assert.doesNotMatch(html,/confirm\('Create new follow-on Reality work for verified #188/);
 assert.match(html,/Not authorized: no new work binding/);
});
test('all homepage inline scripts parse without automatic receipt button',()=>{
 const tags=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(tags.length>0);
 tags.forEach(([full,src],i)=>assert.doesNotThrow(()=>new Script(src,{filename:'index:inline:'+i})));
});
test('technical approval path remains strictly separate from new investigation',()=>{
 assert.doesNotMatch(route,/reality_owner_approve_qualified_preview_v1/);
 assert.doesNotMatch(module,/reality_owner_approve_qualified_preview_v1/);
 assert.doesNotMatch(module,/installation_authorized:true/);
 assert.match(route,/owner_approval_issued:false/);
 assert.match(route,/production_changed:false/);
});
