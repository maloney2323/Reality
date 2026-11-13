import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcileRealityMixedShiftReceipts}
 from '../src/reality-mixed-shift-receipts-v1.js';
import {buildRealityShiftConversationBrief}
 from '../src/reality-shift-conversation-brief-v1.js';
const shiftId='9460cfff-937a-4105-9093-2e41ab39a950';
const work263='work:873a6e74fd14c6beacc9042dd8021dfc';
const work57='work:94fc872f8ba9062f968920c59218c3ca';
const issue=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const pr=n=>'https://github.com/maloney2323/Reality/pull/'+n;
const sha=n=>'sha256:'+n.repeat(64);
const step=(n,source,status='SOURCE_CHECKED')=>({
 step_index:n,state:status,source_ref:source,source_status:source?
  (source.includes('/pull/')?'OPEN_PULL_REQUEST':'OPEN_ISSUE'):null,
 proof_sha256:source?sha('a'):null,
 completed_at:status==='SOURCE_CHECKED'?'2026-11-08T13:39:06.296Z':null
});
const shift={
 shift_id:shiftId,status:'AWAITING_EXACT_ORIGINAL_WORK',
 planned_start_at:'2026-11-08T13:34:36.755Z',planned_end_at:'infinity',
 close_report:null,
 steps:[
 {step_index:1,state:'SOURCE_CHECKED',source_ref:null,source_status:'READBACK_VERIFIED',
  proof_sha256:null,completed_at:'2026-11-08T13:35:00Z'},
 step(2,issue(263)),step(3,issue(185)),step(4,pr(57)),step(5,issue(62)),
 step(6,null,'AWAITING_EXACT_WORK'),step(7,null,'AWAITING_EXACT_WORK'),
 step(8,null,'QUEUED')
 ]
};
const reviews={status:'OWNER_PR_REVIEW_ORIGINAL_READBACK',production_changed:false,
 jobs:[{
 shift_id:shiftId,original_work_id:work57,source_ref:pr(57),phase:'SETTLED',
 original_job_completed:true,source_review_job_only:true,
 source_code_repaired:false,installation_authorized:false,
 provider_comment_url:pr(57)+'#issuecomment-6840990886',
 settlement_receipt_ref:'supabase:riley_pr_review_originals_v1:6d699686-c233-4c9d-aad0-611474f70114',
 production_changed:false
 }]};
const repairs={status:'OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK',
 does_not_authorize_new_work:true,production_changed:false,jobs:[{
 shift_id:shiftId,original_work_id:work263,source_ref:issue(263),
 source_proof_sha256:sha('a'),phase:'SETTLED',
 original_job_completed:true,code_repair_completed:true,
 candidate_commit_sha:'de45ee4c557339b19aa1f320aba1cd5fba301dbb',
 candidate_artifact_sha256:sha('c'),independent_proof_run_id:43411111111,
 original_settlement_receipt_ref:'supabase:riley_native_independent_final_receipts_v1:681ce4ab-4dd0-47cf-963b-dc65087468fc',
 installation_authorized:true,production_changed:false
 }]};
test('two independently settled original jobs from one owner shift are not erased by empty legacy claims',()=>{
 const result=reconcileRealityMixedShiftReceipts(shift,{prReadback:reviews,repairReadback:repairs});
 assert.equal(result.independently_settled_original_jobs,2);
 assert.deepEqual(result.completed_original_receipts.map(x=>x.original_work_id),[work263,work57]);
 assert.deepEqual(result.source_items_without_verified_final_receipt,[issue(185),issue(62)]);
 assert.equal(result.current_shift_complete,false);
 assert.equal(result.work_dispatched_by_projection,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.measured_net_cash_savings_usd,null);
 const briefing=buildRealityShiftConversationBrief([shift],[],new Date('2026-11-13T18:00:00Z'),result);
 assert.equal(briefing.verified_original_job_receipts,2);
 assert.equal(briefing.complete_shift_proven,false);
 assert.equal(briefing.status,'AWAITING_EXACT_ORIGINAL_WORK');
 assert.match(briefing.what_finished,/2 source-native original jobs/);
 assert.match(briefing.what_finished,/2 selected source observation/);
 assert.equal(briefing.events.filter(x=>x.code==='ORIGINAL_RECEIPT_MATCHED').length,2);
 assert.equal(briefing.verified_human_hours_saved,null);
});
test('partial or unavailable source-native readback never invents missing jobs',()=>{
 const x=reconcileRealityMixedShiftReceipts(shift,{prReadback:reviews});
 assert.equal(x.independently_settled_original_jobs,1);
 assert.deepEqual(x.source_items_without_verified_final_receipt,
  [issue(263),issue(185),issue(62)]);
 const no=reconcileRealityMixedShiftReceipts(shift,{});
 assert.equal(no.independently_settled_original_jobs,0);
 assert.equal(no.current_shift_complete,false);
});
test('closed source, wrong proof, malformed receipt and duplicate job fail closed',()=>{
 const wrong={...repairs,jobs:[{...repairs.jobs[0],source_proof_sha256:sha('f')}]};
 assert.throws(()=>reconcileRealityMixedShiftReceipts(shift,{repairReadback:wrong}),
  /NATIVE_ORIGINAL_INDEPENDENT_RECEIPT_INVALID/);
 const expired={...shift,steps:shift.steps.map(s=>
  s.step_index===4?{...s,state:'BLOCKED_PROVIDER'}:s)};
 assert.throws(()=>reconcileRealityMixedShiftReceipts(expired,{prReadback:reviews}),
  /INDEPENDENT_SOURCE_PROOF_REQUIRED/);
 const fake={...reviews,jobs:[{...reviews.jobs[0],settlement_receipt_ref:null}]};
 assert.throws(()=>reconcileRealityMixedShiftReceipts(shift,{prReadback:fake}),
  /PR_ORIGINAL_INDEPENDENT_RECEIPT_INVALID/);
 const twice={...reviews,jobs:[reviews.jobs[0],reviews.jobs[0]]};
 assert.throws(()=>reconcileRealityMixedShiftReceipts(shift,{prReadback:twice}),
  /DUPLICATE_OR_UNSETTLED_ORIGINAL/);
});
test('owner endpoint projects receipt reconciliation only after authenticated readback',()=>{
 const api=readFileSync(new URL('../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const home=readFileSync(new URL('../reality-shift-conversation-v1.js',import.meta.url),'utf8');
 assert.match(api,/reconcileRealityMixedShiftReceipts\(activeBrief/);
 assert.match(api,/shift_source_native_receipts_status/);
 assert.match(api,/riley_pr_review_jobs\.status==='OWNER_PR_REVIEW_ORIGINAL_READBACK'/);
 assert.match(api,/riley_code_repair_jobs\.status===/);
 assert.match(home,/b\.verified_original_job_receipts>4/);
 assert.match(api,/shift_source_native_receipts_status='SOURCE_NATIVE_RECEIPT_BINDING_UNVERIFIED'/);
});
