import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectOperationalRoiEvidenceV2 as project} from '../src/reality-operational-roi-v2.js';
const id='work:'+'b'.repeat(32);
const row={
 original_work_id:id,capability_id:'reality-ci-failure-evidence',
 state:'SETTLED_ISOLATED',isolated_preview_only:true,
 original_work_verified:true,settlement_verified:true,
 business_job_completed_outside_isolated_preview:false,production_changed:false,
 source_claim_run_id:41390537103,
 gap_queued_at:'2026-11-02T01:10:36.656384+00:00',
 owner_approved_at:'2026-11-02T03:18:26.670008+00:00',
 claimed_at:'2026-11-02T04:49:15.496144+00:00',
 settled_at:'2026-11-02T04:49:44.542272+00:00',
 claim_to_settlement_ms:29046,
 gap_queue_to_settlement_ms:13147885,
 owner_approval_to_settlement_ms:5477872,
 technical_frozen_checks_passed:37,technical_candidate_checks_passed:7,
 technical_holdout_checks_passed:null,technical_counts_are_passes_not_rates:true,
 reconciliation_target_original_work_id:null,
 human_baseline_minutes:null,human_supervision_minutes:null,
 model_cost_usd:null,infrastructure_cost_usd:null,
 verified_hours_returned:null,verified_cash_savings_usd:null,
 workforce_fte_replaced:null,economic_observations:[],
};
const base={schema:'reality-owner-original-job-roi-evidence-v2',
 evidence_scope:'SIGNED_OWNER_SCOPED_ISOLATED_LEDGER_READBACK',
 owner_authorization_granted:false,work_executed_by_read:false,
 production_changed:false,jobs:[row]};
test('real stored timeline reconciles three different intervals without claiming full job hours',()=>{
 const r=project(base),j=r.jobs[0];
 assert.equal(j.lifecycle.gap_queue_to_settlement.value,13147885);
 assert.equal(j.lifecycle.approval_to_settlement.value,5477872);
 assert.equal(j.lifecycle.claim_to_settlement.value,29046);
 assert.equal(j.lifecycle.full_customer_job_start_to_finish.value,null);
 assert.equal(j.lifecycle.human_attention_minutes.value,null);
 assert.equal(j.economic_readiness,'NO_COST_OR_HUMAN_BASELINE_SOURCE_RECORDS');
 assert.equal(j.economic_value.verified_cash_savings_usd.value,null);
 assert.equal(j.human_labor_context.human_task_effort_hours.value,null);
 assert.equal(r.collection_state.separately_timed_lifecycle_jobs,1);
 assert.equal(r.collection_state.verified_cash_savings_usd,null);
 assert.equal(r.verified_customer_financial_roi,false);
});
test('provider-labelled cost observations are not independently verified net ROI',()=>{
 const observation={observation_id:'12345678-1234-4234-8234-123456789abc',
  metric_type:'MODEL_PROVIDER_COST_USD',numeric_value:10.25,unit:'USD',
  source_class:'TRUSTED_PROVIDER_RECEIPT',
  evidence_sha256:'c'.repeat(64),
  source_ref:'github:actions:run:41390537103:model-provider-usage-receipt',
  observed_at:'2026-11-02T04:49:15.000Z',
  recorded_at:'2026-11-02T04:49:16.000Z'};
 const r=project({...base,jobs:[{...row,economic_observations:[observation]}]});
 assert.equal(r.jobs[0].economic_observations[0].value,10.25);
 assert.match(r.jobs[0].economic_observations[0].evidence_status,/VALIDATION/);
 assert.equal(r.jobs[0].economic_value.total_operating_cost_usd.value,null);
 assert.equal(r.collection_state.billable_provider_cost_verified,0);
 assert.equal(r.verified_customer_financial_roi,false);
 const owner=project({...base,jobs:[{...row,economic_observations:[{
  ...observation,source_class:'OWNER_REPORTED_UNVERIFIED'}]}]});
 assert.match(owner.jobs[0].economic_observations[0].evidence_status,/NOT_INDEPENDENTLY_VALIDATED/);
});
test('timestamp inconsistencies, inflated value and duplicate economic receipts fail closed',()=>{
 const valid={observation_id:'12345678-1234-4234-8234-123456789abc',
  metric_type:'HUMAN_REVIEW_MINUTES',numeric_value:2,unit:'MINUTES',
  source_class:'OWNER_REPORTED_UNVERIFIED',evidence_sha256:'d'.repeat(64),
  source_ref:'owner:review-session:independent-source-001',
  observed_at:'2026-11-02T04:49:15.000Z',
  recorded_at:'2026-11-02T04:49:16.000Z'};
 for(const bad of [
  {...row,gap_queue_to_settlement_ms:1},
  {...row,owner_approval_to_settlement_ms:100},
  {...row,owner_approved_at:'2026-11-02T04:50:00Z'},
  {...row,human_supervision_minutes:2},
  {...row,economic_observations:[valid,valid]},
  {...row,economic_observations:[{...valid,metric_type:'MODEL_INPUT_TOKENS'}]},
  {...row,economic_observations:[{...valid,numeric_value:-3}]},
  {...row,economic_observations:[{...valid,source_class:'ASSISTANT_GENERATED'}]},
 ]){
  assert.throws(()=>project({...base,jobs:[bad]}),/REALITY_(OPERATIONAL_ROI|JOB_ROI)_/);
 }
});
test('strict owner-only route reads v2 source and does no financial or install mutation',()=>{
 const source=readFileSync(new URL('../api/reality/personal-operational-roi-v2.js',import.meta.url),'utf8');
 assert.ok(source.includes('authenticatedChatSession(req,res)'));
 assert.ok(source.includes('reality_read_owner_job_roi_evidence_v2'));
 assert.ok(source.includes('projectOperationalRoiEvidenceV2'));
 assert.ok(source.includes("req.method!=='GET'"));
 assert.ok(source.includes('Object.keys(req.query||{}).length'));
 assert.ok(source.includes("env.VERCEL_ENV!=='preview'"));
 assert.ok(!source.includes('reality_owner_approve_qualified_preview_v1'));
 assert.ok(!source.includes('original_claim('));
});
