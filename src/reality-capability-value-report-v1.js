// Read-only product-value report from the owner-scoped, signed candidate qualification.
// Technical test claims are drawn from durable receipts; dollar value is never assumed.
// Does not approve, install, activate, or settle customer work.
export const CAPABILITY_VALUE_REPORT_VERSION='reality-capability-value-report-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const PATH=/^(?:src|test)\/reality-extensions\/[a-z0-9._-]+\.(?:mjs|js)$/;
const RUN=/^[1-9][0-9]{6,17}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const DIGEST=/^sha256:[a-f0-9]{64}$/;
const MODEL=/^resp_[A-Za-z0-9_-]{12,160}$/;
const fail=code=>{throw Error('REALITY_CAPABILITY_VALUE_REPORT_'+code)};
const whole=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000;
const frozen=x=>Object.freeze(x);
const metric=(value,unit,status)=>frozen({value,unit,status});
const evidence=(text,kind)=>frozen({text,evidence_status:kind});

export function createCapabilityValueReport(entry){
 const q=entry?.qualification;
 const legacy=q?.schema==='reality-genuine-capability-qualification-v1';
 const supersession=q?.schema==='reality-genuine-requalification-supersession-v1';
 if(entry?.phase!=='AWAITING_OWNER_APPROVAL'||
    !WORK.test(entry?.original_work_id)||!CAP.test(entry?.capability_id)||
    (!legacy&&!supersession)||
    q.status!=='AWAITING_OWNER_APPROVAL'||
    q.original_work_id!==entry.original_work_id||
    !HASH.test(q.artifact_sha256)||!HASH.test(q.post_state_hash)||
    (legacy&&!HASH.test(q.pre_state_hash))||
    q.attestation_source!==(supersession?
     'SIGNED_GITHUB_WORKFLOW_INDEPENDENT_PROVIDER_AND_OFFLINE_SANDBOX':
     'SIGNED_GITHUB_WORKFLOW_WITH_INDEPENDENT_SANDBOX')||
    !RUN.test(String(q.provider_run_id||''))||
    !q.valid_time||!q.transaction_time||
    q.installation_authorized!==false||q.original_job_completed!==false||
    q.production_changed!==false)
  fail('TRUSTED_UNINSTALLED_QUALIFICATION_REQUIRED');
 // The signed supersession receipt intentionally omits the prior receipt's
 // test denominators and pre-state hash. Verify its distinct source-bound
 // evidence, without silently fabricating those absent historical fields.
 if(supersession&&(
    entry.capability_id!=='reality-continuity-settlement-reconciler'||
    !UUID.test(q.trigger_id)||!MODEL.test(q.model_response_id)||
    !HASH.test(q.prior_artifact_sha256)||
    q.prior_artifact_sha256===q.artifact_sha256||
    !DIGEST.test(q.verification_artifact_digest)||
    q.real_provider_holdout_verified!==true||
    q.real_provider_holdout_artifact_sha256!==q.artifact_sha256||
    !whole(q.holdout_pass)||q.holdout_pass<5))
  fail('SIGNED_SUPERSESSION_AND_REAL_PROVIDER_HOLDOUT_REQUIRED');
 if(!whole(q.frozen_pass)||!whole(q.candidate_pass)||
    q.frozen_pass===0||q.candidate_pass===0||
    (legacy&&(!whole(q.frozen_tests)||!whole(q.candidate_tests)||
     q.frozen_tests===0||q.candidate_tests===0||
     q.frozen_pass!==q.frozen_tests||
     q.candidate_pass!==q.candidate_tests)))
  fail('INDEPENDENT_GREEN_TEST_COUNTS_REQUIRED');
 if(!Array.isArray(entry.source_paths)||entry.source_paths.length<2||
    entry.source_paths.length>16||
    entry.source_paths.some(x=>!PATH.test(x))||
    new Set(entry.source_paths).size!==entry.source_paths.length)
  fail('EXACT_EXTENSION_SOURCE_PATHS_REQUIRED');
 if(entry.approval!==undefined&&entry.approval!==null)
  fail('AWAITING_APPROVAL_MUST_NOT_CONTAIN_APPROVAL');
 const runUrl='https://github.com/maloney2323/Reality/actions/runs/'+q.provider_run_id;
 const frozenStats=frozen({passed:q.frozen_pass,
  total:legacy?q.frozen_tests:null,
  pass_rate_percent:legacy?Number((100*q.frozen_pass/q.frozen_tests).toFixed(1)):null,
  count_status:legacy?'SIGNED_VERIFIED_COMPLETE_SUITE':'SIGNED_PASS_COUNT_TOTAL_NOT_INCLUDED'});
 const candidateStats=frozen({passed:q.candidate_pass,
  total:legacy?q.candidate_tests:null,
  pass_rate_percent:legacy?Number((100*q.candidate_pass/q.candidate_tests).toFixed(1)):null,
  count_status:legacy?'SIGNED_VERIFIED_COMPLETE_SUITE':'SIGNED_PASS_COUNT_TOTAL_NOT_INCLUDED'});
 return frozen({
  version:CAPABILITY_VALUE_REPORT_VERSION,
  scope:frozen({original_work_id:entry.original_work_id,
   capability_id:entry.capability_id,environment:'ISOLATED_PREVIEW',
   artifact_sha256:q.artifact_sha256,
   source_paths:frozen([...entry.source_paths]),
   independent_test_run_url:runUrl}),
  readiness:frozen({stage:'QUALIFIED_AWAITING_EXPLICIT_OWNER_APPROVAL',
   candidate_verified_by_durable_receipt:true,approval_granted:false,
   installed:false,activated:false,original_job_settled:false,
   production_ready:false}),
  technical_stats:frozen({
   frozen_acceptance:frozenStats,candidate_checks:candidateStats,
   combined_passed:q.frozen_pass+q.candidate_pass,
   combined_total:legacy?q.frozen_tests+q.candidate_tests:null,
   independent_verification_record:supersession?
    'DURABLE_SIGNED_SUPERSESSION_AND_PROVIDER_HOLDOUT':
    'DURABLE_SIGNED_WORKFLOW_QUALIFICATION',
   post_install_regression_count:metric(null,'count','NOT_YET_INSTALLED'),
   model_attempts:metric(null,'attempts','NOT_IN_QUALIFICATION_RECEIPT'),
  }),
  performance_comparison:frozen({
   before_success_rate:metric(null,'percent','NO_COMPARABLE_MEASURED_BASELINE'),
   after_install_success_rate:metric(null,'percent','NOT_YET_INSTALLED'),
   before_execution_ms:metric(null,'milliseconds','NO_COMPARABLE_MEASURED_BASELINE'),
   after_execution_ms:metric(null,'milliseconds','NOT_YET_INSTALLED'),
   error_rate_change:metric(null,'percentage_points','UNMEASURED'),
  }),
  business_value:frozen({
   actual_hours_returned:metric(null,'hours','NO_INDEPENDENT_BASELINE_AND_OUTCOME'),
   verified_savings_usd:metric(null,'USD','NO_INDEPENDENT_BASELINE_AND_OUTCOME'),
   actual_operating_cost_usd:metric(null,'USD','NO_VERIFIED_COST_RECEIPT'),
   estimated_net_value_usd:metric(null,'USD','NO_OWNER_GROUNDED_ASSUMPTIONS'),
   payback_days:metric(null,'days','NO_VERIFIED_NET_VALUE'),
   jobs_unlocked:metric(null,'jobs','NO_RECONCILED_OUTCOMES'),
   cross_business_reusability:'NOT_YET_VERIFIED',
  }),
  advantages:frozen([
   evidence('Original frozen acceptance suite passed in qualified sandbox','SOURCE_BOUND_QUALIFICATION'),
   evidence('Candidate test suite passed in qualified sandbox','SOURCE_BOUND_QUALIFICATION'),
   evidence('Exact upgrade artifact hash and original work ID were retained','SOURCE_BOUND_QUALIFICATION'),
   ...(supersession?[evidence('Mandatory real-provider holdout passed against the exact replacement artifact','SIGNED_REAL_PROVIDER_HOLDOUT')]:[]),
  ]),
  limitations_and_risks:frozen([
   evidence('Not yet installed or independently observed running','UNRESOLVED_DEPLOYMENT'),
   evidence('Original customer job has not yet resumed or settled','UNRESOLVED_ORIGINAL_JOB'),
   evidence('Maintenance burden, operating cost and post-install regressions remain unknown','NOT_MEASURED'),
   evidence('No verified customer labor savings, ROI or production readiness','NOT_MEASURED'),
  ]),
  next_action:'REQUEST_EXPLICIT_OWNER_APPROVAL_FOR_THIS_EXACT_UNINSTALLED_ARTIFACT',
  proof_status:'SOURCE_LINKED_QUALIFICATION_NOT_POST_INSTALL_PROOF',
  permission_effects:frozen({model_authorized_to_install:false,
   owner_installation_authorized:false,production_changed:false,
   original_job_completed:false}),
 });
}
export function summarizeQualifiedCapabilityValueReports(reports){
 if(!Array.isArray(reports)||reports.length>20||
   reports.some(r=>r?.version!==CAPABILITY_VALUE_REPORT_VERSION||
    r.readiness?.stage!=='QUALIFIED_AWAITING_EXPLICIT_OWNER_APPROVAL'||
    r.readiness?.installed!==false))
  fail('QUALIFIED_REPORTS_REQUIRED');
 const ids=reports.map(r=>r.scope.original_work_id);
 if(new Set(ids).size!==ids.length)fail('DUPLICATE_ORIGINAL_WORK_IN_PORTFOLIO');
 return frozen({
  version:'reality-qualified-capability-portfolio-v1',
  distinct_qualified_original_jobs:reports.length,
  distinct_qualified_capabilities:new Set(reports.map(x=>x.scope.capability_id)).size,
  checked_tests_passed:reports.reduce((s,r)=>s+r.technical_stats.combined_passed,0),
  checked_tests_total:reports.every(r=>r.technical_stats.combined_total!==null)?
   reports.reduce((s,r)=>s+r.technical_stats.combined_total,0):null,
  awaiting_owner_approval:reports.length,
  installed_count:0,
  verified_hours_saved:null,verified_usd_saved:null,
  realized_business_value_status:'NOT_MEASURED_FROM_AWAITING_APPROVAL_QUEUE',
  production_changed:false,
 });
}
