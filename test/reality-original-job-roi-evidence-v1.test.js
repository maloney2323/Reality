import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOwnerJobRoiEvidence as project}
 from '../src/reality-original-job-roi-evidence-v1.js';
const id='work:'+'b'.repeat(32);
const claimed_at='2026-11-02T04:49:15.496Z';
const settled_at='2026-11-02T04:49:44.542Z';
const job={
 original_work_id:id,capability_id:'reality-ci-failure-evidence',
 state:'SETTLED_ISOLATED',isolated_preview_only:true,
 original_work_verified:true,settlement_verified:true,
 business_job_completed_outside_isolated_preview:false,
 production_changed:false,source_claim_run_id:41390537103,
 claimed_at,settled_at,claim_to_settlement_ms:29046,
 technical_counts_are_passes_not_rates:true,
 technical_candidate_checks_passed:7,technical_frozen_checks_passed:37,
 technical_holdout_checks_passed:null,
 reconciliation_target_original_work_id:null,
 human_baseline_minutes:null,human_supervision_minutes:null,
 model_cost_usd:null,infrastructure_cost_usd:null,
 verified_hours_returned:null,verified_cash_savings_usd:null,
 workforce_fte_replaced:null,
};
const base={schema:'reality-owner-original-job-roi-evidence-v1',
 evidence_scope:'SIGNED_OWNER_SCOPED_ISOLATED_LEDGER_READBACK',
 owner_authorization_granted:false,work_executed_by_read:false,
 production_changed:false,jobs:[job]};
test('separates 29-second claimed-to-settled interval from full job duration and cash ROI',()=>{
 const r=project(base);
 assert.equal(r.jobs[0].measured.claim_to_settlement_ms,29046);
 assert.equal(r.jobs[0].measured.full_job_duration_ms,null);
 assert.equal(r.jobs[0].measured.pass_rate_percent,null);
 assert.equal(r.jobs[0].measured.verified_check_pass_count,null);
 assert.equal(r.jobs[0].economic_value.verified_hours_returned.value,null);
 assert.equal(r.jobs[0].economic_value.verified_cash_savings_usd.value,null);
 assert.equal(r.financial_roi_verified,false);
});
test('no false measured money or mismatched date/read scope allowed',()=>{
 for(const update of [
 {jobs:[{...job,verified_cash_savings_usd:500000}]},
 {jobs:[{...job,claim_to_settlement_ms:100}]},
 {jobs:[{...job,settlement_verified:false}]},
 {jobs:[{...job,business_job_completed_outside_isolated_preview:true}]},
 {jobs:[job,job]},
 {owner_authorization_granted:true},
 {production_changed:true},
 ])assert.throws(()=>project({...base,...update}),/REALITY_JOB_ROI_/);
});
