// Independent final acceptance against real customer operational outputs.
// Does not equate 12 diagnostic deliverables with 12 executed customer jobs.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const e=process.env,fail=x=>{throw Error('REALITY_BUSINESS_VALUE_FINAL_'+x)};
if(e.GITHUB_ACTIONS!=='true'||
 e.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 e.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||''))fail('ISOLATED_RUN_AUTHORITY_MISSING');
const work=JSON.parse(readFileSync('artifact/work/reality-12-work-independent-readback.json','utf8'));
const model=JSON.parse(readFileSync('artifact/model/reality-issue188-independent-value-verification.json','utf8'));
const parent=JSON.parse(readFileSync('artifact/generation/reality-issue188-model-value-receipt.json','utf8'));
const run=Number(e.GITHUB_RUN_ID);
if(work.schema!=='reality-business-value-independent-12-work-reconciliation-v1'||
 work.signed_run_id!==run||work.repository_sha!==e.GITHUB_SHA||
 work.independently_verified_deliverables!==12||
 work.original_customer_jobs_completed!==0||work.production_changed!==false||
 !Array.isArray(work.verified)||work.verified.length!==12||
 new Set(work.verified.map(x=>x.work_id)).size!==12)
 fail('OWNER_OPERATIONS_JOBS_NOT_INDEPENDENTLY_VERIFIED');
if(model.schema!=='reality-independent-uninstalled-source-value-v1'||
 model.signed_run_id!==run||model.repository_sha!==e.GITHUB_SHA||
 !['INDEPENDENT_SOURCE_CANDIDATE_PASSED','MODEL_DRAFTS_NOT_INDEPENDENTLY_QUALIFIED'].includes(model.status)||
 parent.schema!=='reality-uninstalled-source-repair-business-value-v1'||
 parent.run_id!==run||parent.base_sha!==e.GITHUB_SHA||
 parent.source_issue!==188||
 model.model_input_tokens!==parent.input_tokens||
 model.model_output_tokens!==parent.output_tokens||
 model.installation_performed!==false||
 model.original_customer_job_settled!==false||
 model.production_changed!==false)
 fail('UNINSTALLED_MODEL_EVIDENCE_INVALID');
const modelPass=model.status==='INDEPENDENT_SOURCE_CANDIDATE_PASSED';
if(modelPass&&(!(model.tested>=15)||model.failed!==0||
 !model.source_sha256||!model.model_response_id))
 fail('MODEL_PASSED_WITHOUT_INDEPENDENT_ACCEPTANCE');
const measure={
 research_deliverables_elapsed_ms:work.first_worker_run_time_ms,
 independent_provider_reverification_ms:work.independently_verified_run_time_ms,
 model_generation_total_elapsed_ms:parent.total_elapsed_ms,
 model_independent_sandbox_ms:model.independent_verification_ms??null,
 model_input_tokens:model.model_input_tokens,
 model_output_tokens:model.model_output_tokens,
 actual_model_provider_cost_usd:null,
 manually_observed_comparable_baseline_minutes:null,
 verified_human_time_returned_minutes:null,
 verified_labor_savings_usd:null,
 realized_recurring_revenue_usd:null
};
const report={
 schema:'reality-first-customer-operational-value-proof-v1',
 run_id:run,repository_sha:e.GITHUB_SHA,
 scorecard_decision:modelPass?
  'INTERNAL_RESEARCH_DELIVERABLES_AND_INDEPENDENT_SOURCE_CANDIDATE_VERIFIED':
  'INTERNAL_RESEARCH_DELIVERABLES_VERIFIED_SOURCE_REPAIR_BLOCKED',
 owner_customer:'REALITY_OWN_BUSINESS',
 real_source_backed_operational_deliverables:12,
 distinct_independently_verified_work_products:12,
 actual_original_customer_jobs_settled_in_this_test:0,
 independent_source_repaired_issue:188,
 independent_source_repair_verified:modelPass,
 independent_source_repair_tests:model.tested??0,
 independent_source_repair_passed_tests:model.passed??0,
 observed_model_attempts:model.model_attempts,
 unresolved_failed_model_candidate:!modelPass,
 source_temporal_discrepancies:work.changed_source_alerts,
 fresh_owner_install_approvals:0,
 authorized_installations_completed:0,
 external_consequential_actions:0,
 production_changes:0,
 business_impact_measurements:measure,
 operational_deliverables:work.verified,
 original_work_bound_settlement_proven:false,
 genuine_external_side_effect_exactly_once_proven:false,
 production_release_authorized:false,
 next_action:modelPass?
  'Present verified exact uninstalled repair for owner approval and plan actual customer-job execution':
  'Escalate genuine missing capability and independent model failures for correction; do not install',
 no_false_labor_savings_or_job_replacement_claims:true
};
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-first-customer-operational-value-scorecard.json',
 JSON.stringify(report,null,2)+'\n');
console.log('REALITY_FIRST_CUSTOMER_BUSINESS_VALUE_EVIDENCE',JSON.stringify({
 decision:report.scorecard_decision,
 verified_deliverables:report.distinct_independently_verified_work_products,
 independently_tested_capability_proposal:modelPass,
 tests:model.tested??0,
 model_attempts:report.observed_model_attempts,
 model_tokens:measure.model_input_tokens+measure.model_output_tokens,
 original_customer_jobs_settled:0,verified_time_saved_minutes:null,
 verified_dollars_saved:null,production_changed:false}));
