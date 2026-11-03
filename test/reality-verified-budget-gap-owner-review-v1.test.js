import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/reality/personal-gap-intake.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261103_verified_research_budget_gap_review_v1.sql',import.meta.url),'utf8');
const inline=page.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const a=inline.indexOf('function wcGapEvidenceCards(){'),b=inline.indexOf('async function wcLoadGapFeed()',a);
assert.ok(a>0&&b>a);
const jsx=inline.slice(a,b);
const p={
 key:'research:'+'6'.repeat(64),status:'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
 proof_kind:'EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT',installed:false,
 owner_install_authorized:false,fresh_original_work_verified:false,
 production_changed:false,
 repair_commit_sha:'a'.repeat(40),pull_request_number:211,
 baseline_run_id:41712961166,green_run_id:41713111625,
 independent_red_assertion_failures:3,independent_green_assertion_passes:5,
 proven_defect_scope:'Fingerprint omitted budget and evaluator never enforced cap',
 corrected_behavior:'Identity includes budget and evaluator enforces bounded callback quota',
 remaining_unproven:'Original job settlement and general token budget controls'
};
function render(proof=p){
 const state={
  wcGapFeedReady:true,
  wcGapFeed:[{
   title:'Runtime evaluation and budget controls',
   kind:'RESEARCH_OPPORTUNITY',stage:'IMPLEMENTATION_DEFECT_REPRODUCED_REPAIR_TESTED_OWNER_REVIEW',
   priority:0,what_it_does:'Bound research evaluator calls',
   potential_value:'Safer research execution',pros:['Independent evidence'],cons:['Limited scope'],
   risk:'General dollar metering is unknown',source_receipt:'owner-recorded-research',
   next_proof:'Owner review, then isolated installation and settlement',
   source_url:'https://www.salesforce.com/news/',repair_proof:proof
  }],
  wcGapHistory:[],
  wcGapCounts:{verified_current_gaps:0},
  wcGapFeedStatus:'1 independently proved implementation defect'
 };
 const ctx={...state,esc:x=>String(x).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]))};
 vm.createContext(ctx);vm.runInContext(jsx,ctx);
 return vm.runInContext('wcGapEvidenceCards()',ctx);
}
test('shows independently verified red->green proof and exact candidate PR',()=>{
 assert.doesNotThrow(()=>new vm.Script(inline));
 const html=render();
 assert.match(html,/IMPLEMENTATION DEFECT PROVEN/);
 assert.match(html,/Independent frozen RED/);
 assert.match(html,/3 failed checks/);
 assert.match(html,/5 passed/);
 assert.match(html,/pull\/211/);
 assert.match(html,/runs\/41712961166/);
 assert.match(html,/runs\/41713111625/);
 assert.match(html,/No new installation authorized/);
 assert.match(html,/Owner approval of exact candidate/);
});
test('no installation claim appears for forged approved or installed repair',()=>{
 for(const corrupt of [
  {...p,installed:true},
  {...p,owner_install_authorized:true},
  {...p,fresh_original_work_verified:true},
  {...p,repair_commit_sha:'not-a-sha'}
 ]){
  assert.doesNotMatch(render(corrupt),/IMPLEMENTATION DEFECT PROVEN/);
  assert.doesNotMatch(render(corrupt),/pull\/211/);
 }
});
test('owner-validated server joins only intact source-pinned proofs and never grants installation',()=>{
 for(const term of [
  "reality_read_owner_market_repair_proofs_v1",
  "p_owner_id:session.user_id",
  "SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK",
  "payload.items.some(item=>item.key===p.key",
  "FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED",
  "candidate_created_by!=='ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH'",
  "verified_missing_capability:false",
  "installation_authorized:false,executable_job:false",
  "owner_approval_needed:true",
  "fresh_original_work_verified!==false",
  "installation_authorized:false",
 ])assert.ok(api.includes(term),term);
});
test('frozen source receipt remains owner-bound and no new job or install is created',()=>{
 for(const phrase of [
 "market_independent_repair_proofs_v1","market_stage_investigations_v1",
 "FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED",
 "437308a4fafa1f1ee36336347118e15bbc679dc9cee6bcbb0804d1d789d7e85c",
 "41712961166,41713111625",
 "8368c5db6d5d5e3546b69ab2b86b022e40a00ed9",
 "fresh_original_work_verified boolean not null default false",
 "owner_install_authorized boolean not null default false",
 "installed boolean not null default false",
 "production_changed boolean not null default false",
 "grant select on reality_internal.market_independent_repair_proofs_v1 to service_role",
 "current_user<>'service_role'",
 "revoke all on function public.reality_read_owner_market_repair_proofs_v1(uuid)"
 ])assert.ok(sql.includes(phrase),phrase);
 assert.doesNotMatch(sql,/\b(update|delete)\s+reality_internal\.genuine_capability_queue_v1/i);
 assert.doesNotMatch(api,/startRepair|ownerApprove|installCapability|githubWrite/);
});
