import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityEightHourShiftDraft}
 from '../src/reality-eight-hour-shift-plan-v1.js';
import {ownerSettledOriginalSourceRefs}
 from '../api/reality/personal-governed-employee-shift.js';

const prefix='https://github.com/maloney2323/Reality/';
const owner='11111111-2222-4333-8444-555555555555';
const evidence=(id,type,source,link)=>({
 finding_id:'catalog:'+id.repeat(32),
 finding_type:type,source,
 state:'TRACKED_NEEDS_REVIEW',
 title:'Owner-backed work '+id,
 evidence_refs:[prefix+link],
 value_assessment:{triage_score:70},
 execution_work_item:null,authorization_required:false
});
const issue263=evidence('a','OPEN_ISSUE','github_issues','issues/263');
const issue143=evidence('b','OPEN_ISSUE','github_issues','issues/143');
const pr58={...evidence('c','OPEN_PULL_REQUEST','github_pull_requests','pull/58'),
 state:'OPEN_AWAITING_REVIEW'};
const issue185=evidence('d','OPEN_ISSUE','github_issues','issues/185');
function catalog(){
 return {
  version:'reality-work-catalog-v0.1',status:'OBSERVED',
  observed_at:'2026-11-08T13:00:00Z',
  authority:'NONE_GRANTED',execution_enabled:false,
  items:[issue263,issue143,pr58,issue185],
  source_coverage:{issues:'checked',pull_requests:'checked',actions:'checked',
   commits:'checked',customer_feedback:'not_connected',
   business_operations:'not_connected',external_research:'not_connected'}
 };
}
const settledPR={
 status:'OWNER_PR_REVIEW_ORIGINAL_READBACK',production_changed:false,
 jobs:[{
  original_work_id:'work:'+'a'.repeat(32),
  source_ref:prefix+'pull/58',phase:'SETTLED',
  original_job_completed:true,
  settlement_receipt_ref:
   'supabase:riley_pr_review_originals_v1:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
 }]
};
const settledTriage={
 status:'OWNER_SCOPED_VERIFIED_SHIFT_FAILURE_TRIAGE',production_changed:false,
 jobs:[{
  original_work_id:'work:'+'b'.repeat(32),
  source_ref:prefix+'issues/143',phase:'SETTLED',
  original_job_completed:true,
  settlement_receipt_ref:
   'supabase:riley_shift_failure_triage_v1:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
 }]
};
const settledNative={
 status:'OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK',
 does_not_authorize_new_work:true,production_changed:false,
 jobs:[{
  original_work_id:'work:873a6e74fd14c6beacc9042dd8021dfc',
  source_ref:prefix+'issues/263',source_proof_sha256:'sha256:'+'a'.repeat(64),
  phase:'SETTLED',original_job_completed:true,
  code_repair_completed:true,production_changed:false,
  original_settlement_receipt_ref:
   'supabase:riley_native_independent_final_receipts_v1:681ce4ab-4dd0-47cf-963b-dc65087468fc'
 }]
};
test('independently settled owner originals excluded from exact new source work',async()=>{
 const rpc=async(db,name,args)=>{
  assert.equal(args.p_owner_id,owner);
  return name==='reality_read_owner_riley_pr_review_v1'?
   settledPR:name==='reality_read_owner_riley_repair_original_v1'?
    settledNative:settledTriage;
 };
 const excluded=await ownerSettledOriginalSourceRefs({
  ownerId:owner,db:{},call:rpc});
 assert.deepEqual(excluded,[prefix+'issues/143',prefix+'issues/263',prefix+'pull/58']);
 const brief=buildRealityWorkdayOpportunityBrief(catalog());
 const plan=buildRealityEightHourShiftDraft(brief,{
  excludedSettledSourceRefs:excluded});
 const urls=plan.slots.slice(1,5).map(s=>s.candidate?.source_url)
  .filter(Boolean);
 assert.deepEqual(urls,[prefix+'issues/185']);
 assert.equal(urls.includes(prefix+'issues/143'),false);
 assert.equal(urls.includes(prefix+'issues/263'),false);
 assert.equal(urls.includes(prefix+'pull/58'),false);
 assert.equal(plan.counts.already_settled_source_records_excluded,3);
 assert.equal(plan.counts.selected_distinct_source_records,1);
});
test('receipt verification cannot be bypassed with invented success',async()=>{
 for(const [kind,fixture] of [
  ['review',{...settledPR,production_changed:true}],
  ['triage',{...settledTriage,status:'UNKNOWN_OWNER_SOURCE'}],
  ['native',{...settledNative,jobs:[{...settledNative.jobs[0],
    original_settlement_receipt_ref:'not-a-receipt'}]}],
  ['missing',{...settledPR,jobs:[{
   ...settledPR.jobs[0],settlement_receipt_ref:null}]}]
 ]){
  const call=async(db,name)=>{
   if(name==='reality_read_owner_riley_pr_review_v1')
    return ['review','missing'].includes(kind)?fixture:settledPR;
   if(name==='reality_read_owner_shift_failure_triage_143_v1')
    return kind==='triage'?fixture:settledTriage;
   if(name==='reality_read_owner_riley_repair_original_v1')
    return kind==='native'?fixture:settledNative;
   throw Error('UNEXPECTED_OWNER_READBACK');
  };
  await assert.rejects(
   ownerSettledOriginalSourceRefs({ownerId:owner,db:{},call}),
   /SHIFT_OWNER_SETTLED|SHIFT_SETTLED_JOB|SHIFT_NATIVE_SETTLED/);
 }
 const brief=buildRealityWorkdayOpportunityBrief(catalog());
 assert.throws(()=>buildRealityEightHourShiftDraft(brief,{
  excludedSettledSourceRefs:[prefix+'pull/58',prefix+'pull/58']
 }),/SETTLED_SOURCE_EXCLUSIONS_UNVERIFIED/);
});
test('both owner draft and start use the SAME independently checked exclusion set',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 assert.equal((api.match(/await ownerSettledOriginalSourceRefs\(/g)||[]).length,2);
 assert.equal((api.match(/excludedSettledSourceRefs:settledRefs/g)||[]).length,2);
 assert.match(ui,/previously_settled_original_source_refs_excluded/);
 assert.match(ui,/orders\.tasks\.some\(task=>exclusions\.includes\(task\.source_ref\)\)/);
 assert.match(ui,/id="rileyNextActionPanel"/);
 assert.match(ui,/showHistoricalEvidence\?shifts\[0\]:null/);
 assert.match(ui,/No fresh work ready/i);
});
