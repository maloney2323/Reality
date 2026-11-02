// Independent evidence gate for the full Reality operations mega-test.
// All receipts are produced by separate GitHub runners, not generated here.
// Absolutely no customer-job settlement or owner authorization is inferred.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const env=process.env,fail=x=>{throw Error('REALITY_MEGA_INDEPENDENT_GATE_'+x)};
const REPO='maloney2323/Reality',REF='refs/heads/feature/reality-general-capability-engine-20261101';
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_REPOSITORY!==REPO||
 env.GITHUB_REF!==REF||env.GITHUB_EVENT_NAME!=='push'||
 !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
 !/^[1-9][0-9]{7,17}$/.test(env.GITHUB_RUN_ID||''))
 fail('PINNED_BRANCH_RUN_REQUIRED');
const read=(path)=>JSON.parse(readFileSync(path,'utf8'));
const portfolio=read('artifact/portfolio/reality-30-work-batch-readonly-receipt.json');
const gap=read('artifact/gap/reality-gap-discrimination.json');
const operations=read('artifact/ci/reality-mega-current-ci-operations.json');
const recovered=read('artifact/recovery/reality-actual-interruption-recovery.json');
const readiness=read('artifact/readiness/reality-production-readiness.json');
const run=Number(env.GITHUB_RUN_ID),sha=env.GITHUB_SHA;
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
if(portfolio.schema!=='reality-independent-30-real-work-review-batch-v1'||
 portfolio.run_id!==run||portfolio.repository_sha!==sha||
 portfolio.exact_distinct_review_jobs!==30||portfolio.real_pull_request_review_tasks!==24||
 portfolio.real_open_issue_triage_tasks!==6||
 portfolio.processed_by_separate_github_workers!==2||
 portfolio.phase_one_durable_artifact_verified!==true||
 portfolio.resumed_from_same_checkpoint!==true||
 portfolio.duplicate_review_work_ids!==0||
 portfolio.external_actions_executed!==0||portfolio.production_changed!==false||
 !Array.isArray(portfolio.cases)||portfolio.cases.length!==30||
 new Set(portfolio.cases.map(x=>x.job_id)).size!==30)
 fail('PORTFOLIO_REAL_WORK_EVIDENCE_INVALID');
let last='0'.repeat(64);
for(const item of portfolio.cases){
 if(item.previous_hash!==last||!/^[a-f0-9]{64}$/.test(item.receipt_hash)||
 item.work_disposition!=='DRAFT_OWNER_REVIEW_ONLY'&&item.work_disposition!=='OPEN_ISSUE_TRIAGE_ONLY')
 fail('PORTFOLIO_CONTINUITY_BROKEN');
 last=item.receipt_hash;
}
if(last!==portfolio.final_chain_hash)fail('PORTFOLIO_FINAL_HASH_MISMATCH');
if(gap.schema!=='reality-authentic-upgrade-discrimination-v1'||
 gap.run_id!==run||gap.repository_sha!==sha||
 gap.issue_number!==188||gap.working_branch_source_absent!==true||
 gap.genuine_missing_module_path!=='src/reality-extensions/reality-general-execution-receipt.mjs'||
 gap.independently_reproduced_frozen_failure!=='ERR_MODULE_NOT_FOUND'||
 gap.classification!=='CONFIRMED_MISSING_SOURCE_CAPABILITY_ON_WORKING_BRANCH'||
 !Array.isArray(gap.previously_installed_not_new_gaps)||
 gap.previously_installed_not_new_gaps.length!==2||
 gap.previously_installed_not_new_gaps.some(x=>x.provider_installed_source_verified!==true)||
 gap.installation_authorized!==false||gap.production_changed!==false)
 fail('REAL_GAP_OR_FALSE_POSITIVE_CONTROLS_INVALID');
if(operations.schema!=='reality-megatest-12-live-provider-operational-audits-v1'||
 operations.git_run_id!==run||operations.repository_sha!==sha||
 operations.investigations!==12||
 operations.completed_with_source_readback!==12||
 !Array.isArray(operations.cases)||operations.cases.length!==12||
 new Set(operations.cases.map(x=>x.job_id)).size!==12||
 operations.external_changes!==0||operations.production_changed!==false)
 fail('TWELVE_REAL_OPERATING_INVESTIGATIONS_UNVERIFIED');
last='0'.repeat(64);
for(const row of operations.cases){
 const {receipt_hash,...data}=row;
 if(row.parent_receipt_hash!==last||hash(data)!==receipt_hash||
 row.provider_readback_verified!==true||
 row.external_change_executed!==false||row.owner_approval_implied!==false)
 fail('OPERATIONS_SOURCE_HASH_CHAIN_MISMATCH');
 last=receipt_hash;
}
if(last!==operations.last_receipt_hash)fail('OPERATIONS_TERMINAL_RECEIPT_MISMATCH');
if(recovered.schema!=='reality-actual-inflight-worker-continuity-proof-v1'||
 recovered.signed_run_id!==run||
 recovered.active_worker_stopped!==true||
 recovered.checkpoint_denied_while_halted!==true||
 recovered.old_worker_terminated!==true||
 recovered.new_worker_process_resumed!==true||
 recovered.stale_worker_lease_rejected!==true||
 recovered.previous_checkpoint_preserved!==true||
 recovered.same_original_audit_settled!==true||
 recovered.checkpoints_verified!==3||
 !Array.isArray(recovered.checkpoint_universe_event_ids)||
 new Set(recovered.checkpoint_universe_event_ids).size!==3||
 recovered.original_customer_job_reexecuted!==false||
 recovered.emergency_mode_after_drill!=='RUNNING'||
 recovered.production_changed!==false)
 fail('REAL_INTERRUPTED_WORKER_RECOVERY_NOT_PROVEN');
if(readiness.release_decision!=='NOT_READY'||
 readiness.release_authorized!==false||
 readiness.production_changed!==false)
 fail('PRODUCTION_RELEASE_GUARD_INVALID');
const now=Date.now();
const result={
 schema:'reality-independent-business-operations-megatest-v1',
 run_id:run,source_sha:sha,observed_at:new Date(now).toISOString(),
 overall_decision:'PASSED_READ_ONLY_OPERATIONS_AND_RECOVERY',
 production_readiness_decision:'NOT_READY',
 source_review_work:30,
 independently_executed_operational_investigations:12,
 real_work_items_in_research_batch:42,
 number_of_distinct_customer_jobs_fully_executed_in_this_test:0,
 verified_new_missing_source_capabilities:1,
 previously_installed_capabilities_correctly_not_duplicated:2,
 possible_gap_signals_unverified:portfolio.potential_capability_gap_cases.length,
 live_interruption_recovery_achieved:true,
 same_job_universe_checkpoints_verified:3,
 recorded_cross_worker_receipt_chains:2,
 duplicate_receipts_detected:0,
 provider_ci_current_failures:operations.current_provider_failures,
 provider_ci_review_needed:operations.source_current_review_needed,
 provider_investigation_measured_elapsed_ms:operations.investigation_elapsed_ms,
 manual_work_baseline_minutes:null,
 measured_human_labor_hours_saved:null,
 measured_business_dollars_saved:null,
 measured_provider_API_cost_usd:null,
 full_customer_job_automation_proven:false,
 external_consequential_side_effect_recovery_proven:false,
 owner_approvals_new:0,
 upgrades_installed_new:0,
 unauthorized_external_actions:0,
 production_changes:0,
 report_is_not_approval_for_installation_or_release:true,
 audit_readiness_release_blockers:readiness.release_blockers?.length??null,
 evidence:{
  source_portfolio_final_sha256:portfolio.final_chain_hash,
  ci_operational_investigation_final_sha256:operations.last_receipt_hash,
  frozen_issue_188_acceptance_sha256:gap.frozen_test_sha256,
  final_universe_checkpoint_sha256:recovered.final_checkpoint_hash,
  real_issue_188_url:gap.issue_url,
  original_customer_repair_used_as_recovery_source:recovered.source_original_work_id,
  original_job_not_reexecuted:recovered.original_customer_job_reexecuted===false,
 },
 next_phase_exact_requirement:'Owner-bind eligible real original work before generating, installing, or executing consequential upgrades; prove original-job settlement and external effect exactly once.',
 };
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-business-operations-megatest-scorecard.json',JSON.stringify(result,null,2)+'\n');
console.log('REALITY_FULL_VALUE_MEGATEST_INDEPENDENTLY_VERIFIED',JSON.stringify({
 run_id:run,decision:result.overall_decision,review_cases:30,
 operational_investigations:12,verified_new_gap:1,
 interruption_recovery_passed:true,universe_checkpoints:3,
 provider_current_failures:result.provider_ci_current_failures,
 new_installations:0,customer_jobs_fully_executed:0,
 production_readiness:'NOT_READY',production_changed:false}));
