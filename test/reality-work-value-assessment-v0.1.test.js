import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEvidenceBackedWork,prioritizeEvidenceBackedFindings,
 projectHypotheticalWorkValue}
 from '../src/reality-work-value-assessment-v0.1.js';
const root='https://github.com/maloney2323/Reality';
const issue={
 finding_id:'catalog:issue',finding_type:'OPEN_ISSUE',category:'operations',
 state:'TRACKED_NEEDS_REVIEW',evidence_refs:[root+'/issues/42'],
};
const commit={
 finding_id:'catalog:commit',finding_type:'RECENT_CHANGE_TO_VERIFY',
 category:'bugs',evidence_refs:[root+'/commit/'+'a'.repeat(40)],
 state:'OBSERVED_NOT_AN_OPEN_DEFECT',
};
const recurring={
 finding_id:'catalog:failure',finding_type:'RECURRING_FAILURE',
 category:'reliability',evidence_refs:[root+'/actions/runs/123',root+'/actions/runs/124'],
 authorization_required:true,
 execution_work_item:{connector:'github',operation:'create_issue'},
};
test('ranking prioritizes existing actionable-looking review evidence over historical commits without inventing impact',()=>{
 const result=prioritizeEvidenceBackedFindings([commit,issue,recurring]);
 assert.deepEqual(result.map(x=>x.finding_id),['catalog:failure','catalog:issue','catalog:commit']);
 for(const {value_assessment:a} of result){
  assert.equal(a.business_impact.status,'UNMEASURED');
  assert.equal(a.business_impact.estimated_dollars,null);
  assert.equal(a.labor.manual_minutes,null);
  assert.equal(a.labor.full_job_automation_minutes,null);
  assert.equal(a.savings.forecast_usd,null);
  assert.equal(a.savings.verified_usd,null);
  assert.equal(a.cost.estimated_credits,null);
  assert.equal(a.execution_authorized,false);
  assert.equal(a.return_on_investment_verified,false);
  assert.match(a.score_definition,/TRIAGE/);
 }
 assert.equal(result[2].value_assessment.automation.full_job_autonomy_verified,false);
 assert.equal(result[2].value_assessment.triage_band,'WATCH_OR_VALIDATE');
});
test('supported operation means issue tracking only, NOT automated repair or cleared prior reservation',()=>{
 const a=assessEvidenceBackedWork(recurring);
 assert.equal(a.automation.known_operation,'github.create_issue');
 assert.equal(a.automation.level,'TRACKING_ONLY_AFTER_NEW_EXACT_APPROVAL');
 assert.equal(a.automation.prior_attempt_clearance,'REQUIRED');
 assert.equal(a.automation.full_job_autonomy_verified,false);
 const x=assessEvidenceBackedWork({...recurring,authorization_required:false});
 assert.equal(x.automation.known_operation,null);
});
test('security-tagged review is elevated risk, but cannot claim business savings',()=>{
 const x=assessEvidenceBackedWork({...issue,category:'security'});
 assert.equal(x.risk.level,'HIGH');
 assert.equal(x.savings.verified_hours_returned,null);
});
test('reject unverifiable source links or unsupported findings instead of fabricating evidence',()=>{
 assert.throws(()=>assessEvidenceBackedWork({...issue,
  evidence_refs:['https://github.com/other/repo/issues/4']}),/EVIDENCE_REQUIRED/);
 assert.throws(()=>assessEvidenceBackedWork({...issue,finding_type:'MYSTERY'}),
  /UNRECOGNIZED_FINDING_TYPE/);
});
test('hypothetical ROI is calculated ONLY from explicit input and remains unverified',()=>{
 const projection=projectHypotheticalWorkValue({
  manual_minutes_per_occurrence:30,occurrences_per_month:40,
  automatable_fraction:0.5,hourly_labor_value_usd:30,
  estimated_automation_cost_usd_per_month:120,
 });
 assert.equal(projection.assumed_hours_recoverable_per_month,10);
 assert.equal(projection.labor_value_equivalent_usd_per_month,300);
 assert.equal(projection.hypothetical_net_value_usd_per_month,180);
 assert.equal(projection.verified_hours_saved,null);
 assert.equal(projection.verified_dollars_saved,null);
 assert.equal(projection.cannot_infer_job_reduction,true);
 const noCost=projectHypotheticalWorkValue({
  manual_minutes_per_occurrence:30,occurrences_per_month:40,
  automatable_fraction:0.5,hourly_labor_value_usd:30,
 });
 assert.equal(noCost.hypothetical_net_value_usd_per_month,null);
});
test('reject missing/out-of-range assumptions, NaN and unsupported implied coverage',()=>{
 for(const input of [
  {},{manual_minutes_per_occurrence:-1,occurrences_per_month:40,automatable_fraction:1,hourly_labor_value_usd:30},
  {manual_minutes_per_occurrence:30,occurrences_per_month:0,automatable_fraction:1,hourly_labor_value_usd:30},
  {manual_minutes_per_occurrence:30,occurrences_per_month:40,automatable_fraction:1.1,hourly_labor_value_usd:30},
  {manual_minutes_per_occurrence:30,occurrences_per_month:40,automatable_fraction:.5,hourly_labor_value_usd:30,
   estimated_automation_cost_usd_per_month:-1},
 ])assert.throws(()=>projectHypotheticalWorkValue(input),/VALUE_PROJECTION_/);
});
