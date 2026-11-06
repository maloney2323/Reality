import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerExistingRileySourcePriority}
 from '../api/reality/personal-governed-employee-shift.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityEightHourShiftDraft}
 from '../src/reality-eight-hour-shift-plan-v1.js';
import {computeShiftFingerprint}
 from '../src/reality-governed-shift-boundary-v1.js';
const ROOT='https://github.com/maloney2323/Reality/issues/';
const OWNER='11111111-2222-4333-8444-555555555555';
const no={status:'NO_PRIOR_ORIGINAL',installation_authorized:false,
 job_completed:false,production_changed:false};
const legacy={
 status:'EXISTING_UNFINISHED_ORIGINAL',queue_id:'22222222-3333-4444-8555-666666666666',
 original_work_id:'work:'+'a'.repeat(32),phase:'QUEUED_DISCOVERY',
 installation_authorized:false,job_completed:false,production_changed:false
};
const c=(n,title,i)=>({
 finding_id:'catalog:'+i.repeat(32),finding_type:'OPEN_ISSUE',
 source:'github_issues',state:'TRACKED_NEEDS_REVIEW',
 evidence_refs:[ROOT+n],title,category:'reliability',
 value_assessment:{triage_score:100-i.charCodeAt(0)},
 execution_work_item:null,authorization_required:false
});
const catalog={
 version:'reality-work-catalog-v0.1',status:'OBSERVED',
 authority:'NONE_GRANTED',execution_enabled:false,
 observed_at:'2026-11-06T00:00:00Z',
 items:[
  c(178,'Review open issue #178: previous first job','a'),
  c(185,'Review open issue #185: full self repair loop','b'),
  c(263,'Review open issue #263: Riley employee shift handoff','c')
 ],
 source_scans:{issues:{query_scope_fully_reconciled:true}},
 source_coverage:{issues:'checked',pull_requests:'checked',actions:'checked',
  commits:'checked',customer_feedback:'not_connected',
  business_operations:'not_connected',external_research:'not_connected'}
};
const loop={status:'OWNER_GOVERNED_LOOP_READBACK',jobs:[],
 owner_installation_authorized_by_read:false,
 external_action_performed:false,production_changed:false};
const call=async(_db,name,payload)=>{
 if(name==='reality_read_owner_genuine_loop_v1'){
  assert.equal(payload.p_owner_id,OWNER);return loop;
 }
 if(name==='reality_read_owner_existing_original_issue_v1'){
  assert.equal(payload.p_owner_id,OWNER);
  return payload.p_issue_number===178?legacy:no;
 }
 throw Error('UNEXPECTED_RPC');
};
test('shift selects existing unfinished Riley work before historical #178 observation',async()=>{
 const brief=buildRealityWorkdayOpportunityBrief(catalog);
 const selected=await ownerExistingRileySourcePriority({
  catalog,brief,ownerId:OWNER,db:{},call});
 assert.deepEqual(selected.refs,[ROOT+'263',ROOT+'185']);
 assert.equal(selected.ranked,3);
 const defaultPlan=buildRealityEightHourShiftDraft(brief);
 const plan=buildRealityEightHourShiftDraft(brief,{
  prioritySourceRefs:selected.refs});
 assert.equal(defaultPlan.slots[1].candidate.source_url,ROOT+'178');
 assert.equal(plan.slots[1].candidate.source_url,ROOT+'263');
 assert.equal(plan.slots[2].candidate.source_url,ROOT+'185');
 assert.notEqual(computeShiftFingerprint(plan),computeShiftFingerprint(defaultPlan));
 assert.equal(plan.read_only,true);
 assert.equal(plan.job_started,false);
 assert.equal(plan.installation_authorized,false);
 assert.equal(plan.ready_to_execute_batch,false);
 assert.equal(plan.source_scope,'REALITY_GITHUB_REPOSITORY_ONLY');
});
test('untrusted source priorities and out-of-brief URLs fail closed',()=>{
 const brief=buildRealityWorkdayOpportunityBrief(catalog);
 assert.throws(()=>buildRealityEightHourShiftDraft(brief,{
  prioritySourceRefs:[ROOT+'263',ROOT+'263']
 }),/REALITY_EIGHT_HOUR_SHIFT_OWNER_SOURCE_PRIORITY_INVALID/);
 assert.throws(()=>buildRealityEightHourShiftDraft(brief,{
  prioritySourceRefs:[ROOT+'400']
 }),/REALITY_EIGHT_HOUR_SHIFT_OWNER_PRIORITY_SOURCE_NOT_IN_REVIEWED_BRIEF/);
 assert.throws(()=>buildRealityEightHourShiftDraft(brief,{
  prioritySourceRefs:['https://evil.example/issue/1']
 }),/REALITY_EIGHT_HOUR_SHIFT_OWNER_SOURCE_PRIORITY_INVALID/);
 assert.equal(computeShiftFingerprint(buildRealityEightHourShiftDraft(brief)),
  computeShiftFingerprint(buildRealityEightHourShiftDraft(brief,{prioritySourceRefs:[]})));
});
test('same owner-backlog priority is used when drafting and authorizing shift',()=>{
 const api=readFileSync(new URL(
  '../api/reality/personal-governed-employee-shift.js',import.meta.url),'utf8');
 assert.match(api,/ownerExistingRileySourcePriority/);
 assert.equal((api.match(/prioritySourceRefs:priority\.refs/g)||[]).length,2);
 assert.match(api,/existing_owner_backlog_priorities:priority\.refs/);
 assert.match(api,/expected_fingerprint/);
 assert.match(api,/finge(r)?print!==b\.expected_fingerprint/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.doesNotMatch(api,/installation_authorized:true/);
});
