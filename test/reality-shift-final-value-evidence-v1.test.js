import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {projectRealityShiftFinalValueReceipts}
 from '../src/reality-shift-final-value-evidence-v1.js';
import {renderRealityShiftValueReceiptPdf}
 from '../src/reality-shift-final-value-receipt-pdf-v1.js';

const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const hash='sha256:'+'a'.repeat(64);
const native={
 status:'INDEPENDENTLY_SETTLED_SOURCE_NATIVE_ORIGINAL',
 kind:'NATIVE_CODE_REPAIR',
 original_work_id:'work:873a6e74fd14c6beacc9042dd8021dfc',
 shift_id:shift,
 source_ref:'https://github.com/maloney2323/Reality/issues/263',
 source_proof_sha256:hash,
 final_receipt_ref:'supabase:riley_native_independent_final_receipts_v1:681ce4ab-4dd0-47cf-963b-dc65087468fc',
 final_receipt_sha256:hash,
 final_outcome:'SUCCEEDED',
 settled_at:'2026-11-13T13:36:02.011333Z',
 provider_proof_ref:'https://github.com/maloney2323/Reality/actions/runs/43425254534',
 installed_commit_sha:'de45ee4c557339b19aa1f320aba1cd5fba301dbb',
 independent_verification:true,
 model_output_tokens_recorded:660,
 model_usage_scope:'PARTIAL_NATIVE_DRAFT_AND_REVISION_OUTPUT_ONLY',
 model_cost_usd_verified:null,
 infrastructure_cost_usd_verified:null,
 human_baseline_minutes_verified:null,
 human_supervision_minutes_verified:null,
 verified_net_savings_usd:null,verified_roi_percent:null,
 economic_observations:[],
 economic_evidence_scope:'SOURCE_RECORDED_UNVERIFIED_NET_SAVINGS',
 production_changed:false
};
const review={
 ...native,kind:'PR_CODE_REVIEW',
 original_work_id:'work:94fc872f8ba9062f968920c59218c3ca',
 source_ref:'https://github.com/maloney2323/Reality/pull/57',
 final_receipt_ref:'supabase:riley_pr_review_originals_v1:6d699686-c233-4c9d-aad0-611474f70114',
 final_receipt_sha256:'sha256:'+'b'.repeat(64),
 provider_proof_ref:'https://github.com/maloney2323/Reality/pull/57#issuecomment-6840990886',
 installed_commit_sha:null,model_output_tokens_recorded:null,
 model_usage_scope:'PR_REVIEW_USAGE_NOT_RECORDED'
};
const base={
 status:'OWNER_SHIFT_FINAL_VALUE_RECEIPTS_READ_ONLY',
 owner_scope_verified:true,
 economic_calculation:'NO_UNSUPPORTED_SAVINGS_INFERRED',
 receipts:[native,review],
 installation_authorized:false,new_shift_created:false,
 original_job_replayed:false,production_changed:false
};
test('native and review receipts preserve independent identity while recording partial real model token counts',()=>{
 const r=projectRealityShiftFinalValueReceipts(base);
 assert.equal(r.independent_originals,2);
 assert.equal(r.financial_roi_verified,false);
 assert.equal(r.verified_net_savings_usd,null);
 assert.equal(r.receipts[0].model_output_tokens_recorded,660);
 assert.equal(r.receipts[0].value_evidence_status,'PARTIAL_SOURCE_MEASUREMENTS_NO_VERIFIED_ROI');
 assert.equal(r.receipts[1].model_output_tokens_recorded,null);
 assert.equal(r.receipts[1].value_evidence_status,'NO_VERIFIED_ECONOMIC_INPUTS');
 assert.equal(r.receipts[0].data_missing.length,4);
 assert.equal(r.read_only,true);
 assert.equal(r.original_receipts_unchanged,true);
});
test('do not infer measured savings from even source-labelled token or cost observations',()=>{
 const evidence={
  metric_type:'MODEL_PROVIDER_COST_USD',value:4.25,unit:'USD',
  source_class:'TRUSTED_PROVIDER_RECEIPT',
  evidence_sha256:'c'.repeat(64),
  source_ref:'provider:invoice:independent-model-run-12345',
  observed_at:'2026-11-13T13:33:00.000Z'
 };
 const r=projectRealityShiftFinalValueReceipts({...base,
  receipts:[{...native,economic_observations:[evidence]}]});
 assert.equal(r.receipts[0].economic_observations.length,1);
 assert.equal(r.receipts[0].verified_financial_roi,false);
 assert.equal(r.receipts[0].model_cost_usd_verified,null);
 assert.equal(r.verified_net_savings_usd,null);
 assert.match(r.receipts[0].economic_observations[0].evidence_status,/NOT_VERIFIED_NET_SAVINGS/);
});
test('wrong owner, duplicate final receipts, fabricated ROI or missing verifier fail closed',()=>{
 for(const x of [
  {...base,owner_scope_verified:false},
  {...base,receipts:[native,native]},
  {...base,receipts:[{...native,verified_net_savings_usd:250}]},
  {...base,receipts:[{...native,independent_verification:false}]},
  {...base,receipts:[{...native,source_ref:review.source_ref}]},
  {...base,receipts:[{...native,final_receipt_ref:'invented'}]},
  {...base,receipts:[{...native,provider_proof_ref:'https://evil.invalid'}]},
  {...base,receipts:[{...native,model_output_tokens_recorded:-1}]},
  {...base,receipts:[{...native,economic_observations:[{metric_type:'OWNER_SAVINGS',value:1000}]}]},
  {...base,installation_authorized:true}
 ])assert.throws(()=>projectRealityShiftFinalValueReceipts(x),
  /REALITY_SHIFT_VALUE_/);
});
test('source-native final receipt PDFs show actual partial evidence and no invented ROI',()=>{
 const report=projectRealityShiftFinalValueReceipts(base);
 const first=renderRealityShiftValueReceiptPdf(report.receipts[0],{verifiedReport:report});
 const text=first.toString('latin1');
 assert.equal(text.slice(0,8),'%PDF-1.4');
 assert.match(text,/VERIFIED JOB RECEIPT \+ ECONOMIC ACCOUNTABILITY/);
 assert.match(text,/Model output tokens recorded: 660/);
 assert.match(text,/PARTIAL/);
 assert.match(text,/VERIFIED NET SAVINGS: NOT MEASURED/);
 assert.match(text,/FINANCIAL ROI: NOT VERIFIED/);
 assert.match(text,/681ce4ab-4dd0-47cf-963b-dc65087468fc/);
 assert.match(text,/\/Count 1/);
 assert.ok(first.length>2000&&first.length<60000);
 const second=renderRealityShiftValueReceiptPdf(report.receipts[1],{verifiedReport:report});
 assert.match(second.toString('latin1'),/Model output tokens recorded: NOT RECORDED/);
 const output=process.env.REALITY_SHIFT_VALUE_PDF_SMOKE_OUT;
 if(output){mkdirSync(dirname(output),{recursive:true});writeFileSync(output,first)}
});
test('never render a PDF from forged independent receipt or an unverified financial amount',()=>{
 const report=projectRealityShiftFinalValueReceipts(base);
 for(const candidate of [
  {...report.receipts[0],verified_net_savings_usd:123},
  {...report.receipts[0],original_receipt_unchanged:false},
  {...report.receipts[0],independent_verification:false}
 ])assert.throws(()=>renderRealityShiftValueReceiptPdf(candidate,{verifiedReport:report}),
  /INDEPENDENT_SOURCE_NATIVE_RECEIPT_AND_VALUE_REQUIRED/);
});
test('trusted endpoints and database function cannot authorize or rewrite jobs',()=>{
 const readFile=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const migration=readFile('supabase/migrations/20261113_shift_final_receipt_economic_evidence_v1.sql');
 const code=readFile('src/reality-owner-shift-final-value-readback-v1.js');
 const json=readFile('api/reality/personal-shift-value-receipts.js');
 const pdf=readFile('api/reality/personal-shift-value-receipt-pdf.js');
 const ui=readFile('reality-economic-evidence-dashboard-v1.js');
 assert.match(migration,/security invoker/);
 assert.match(migration,/current_user <> 'service_role'/);
 assert.match(migration,/revoke all on function/);
 assert.match(migration,/grant execute.*reality_read_owner_shift_final_value_receipts_v1/s);
 assert.match(code,/session\.user_id/);
 assert.match(code,/p_owner_id:session.user_id/);
 assert.match(json,/authenticatedChatSession/);
 assert.match(pdf,/authenticatedChatSession/);
 assert.match(pdf,/req\.method!=='GET'/);
 assert.match(pdf,/renderRealityShiftValueReceiptPdf/);
 assert.match(ui,/personal-shift-value-receipts/);
 assert.match(ui,/personal-shift-value-receipt-pdf\?work_id=/);
 assert.doesNotMatch(json+pdf,/reality_authorize_employee_shift_v1|reality_record_genuine_final_receipt_v1/);
});
