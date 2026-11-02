// Read-only economic measurement projection from separately verified original
// Continuity and isolated settlement receipts. No new authority or ROI claims.
export const ORIGINAL_JOB_ROI_EVIDENCE_VERSION='reality-owner-original-job-roi-projection-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const UUID=/^[0-9]+$/;
const fail=x=>{throw Error('REALITY_JOB_ROI_'+x)};
const immutable=x=>Object.freeze(x);
const unknown=(unit,why)=>immutable({value:null,unit,evidence_status:why});
const whole=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;
const optionalCount=x=>x===null||whole(x);
function checkedDate(x){
 if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(x))fail('INVALID_SETTLEMENT_TIMESTAMP');
 const value=Date.parse(x);
 if(!Number.isFinite(value))fail('INVALID_SETTLEMENT_TIMESTAMP');
 return value;
}
export function projectOwnerJobRoiEvidence(receipt){
 if(receipt?.schema!=='reality-owner-original-job-roi-evidence-v1'||
    receipt.evidence_scope!=='SIGNED_OWNER_SCOPED_ISOLATED_LEDGER_READBACK'||
    receipt.owner_authorization_granted!==false||
    receipt.work_executed_by_read!==false||
    receipt.production_changed!==false||
    !Array.isArray(receipt.jobs)||receipt.jobs.length>20)
   fail('SIGNED_OWNER_LEDGER_READBACK_REQUIRED');
 const seen=new Set();
 const jobs=receipt.jobs.map(j=>{
  if(!WORK.test(j?.original_work_id)||!CAP.test(j?.capability_id)||
     seen.has(j.original_work_id)||j.state!=='SETTLED_ISOLATED'||
     j.isolated_preview_only!==true||j.original_work_verified!==true||
     j.settlement_verified!==true||
     j.business_job_completed_outside_isolated_preview!==false||
     j.production_changed!==false||
     !Number.isSafeInteger(j.claim_to_settlement_ms)||
     j.claim_to_settlement_ms<0||j.claim_to_settlement_ms>1000*60*60*24*45||
     !UUID.test(String(j.source_claim_run_id||''))||
     j.technical_counts_are_passes_not_rates!==true||
     !optionalCount(j.technical_candidate_checks_passed)||
     !optionalCount(j.technical_frozen_checks_passed)||
     !optionalCount(j.technical_holdout_checks_passed)||
     (j.reconciliation_target_original_work_id!==null&&
       !WORK.test(j.reconciliation_target_original_work_id)))
    fail('JOB_IDENTITY_OR_VERIFICATION_INVALID');
  const start=checkedDate(j.claimed_at),end=checkedDate(j.settled_at);
  if(end<start||Math.abs(end-start-j.claim_to_settlement_ms)>2)
   fail('INDEPENDENT_DURATION_TIMESTAMPS_DISAGREE');
  for(const x of ['human_baseline_minutes','human_supervision_minutes',
     'model_cost_usd','infrastructure_cost_usd','verified_hours_returned',
     'verified_cash_savings_usd','workforce_fte_replaced']){
   if(j[x]!==null)fail('UNVERIFIED_CUSTOMER_ECONOMIC_CLAIM');
  }
  seen.add(j.original_work_id);
  const counts=[
    j.technical_frozen_checks_passed,
    j.technical_candidate_checks_passed,
    j.technical_holdout_checks_passed
  ];
  return immutable({
   original_work_id:j.original_work_id,
   capability_id:j.capability_id,
   technical_settlement_status:'INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW',
   reconciliation_target_original_work_id:j.reconciliation_target_original_work_id,
   source_run_url:'https://github.com/maloney2323/Reality/actions/runs/'+j.source_claim_run_id,
   measured:immutable({
    claim_to_settlement_ms:j.claim_to_settlement_ms,
    measurement_label:'EXECUTION_CLAIM_TO_DURABLE_SETTLEMENT_ONLY',
    interval_start:j.claimed_at,interval_end:j.settled_at,
    frozen_checks_passed:j.technical_frozen_checks_passed,
    candidate_checks_passed:j.technical_candidate_checks_passed,
    holdout_checks_passed:j.technical_holdout_checks_passed,
    verified_check_pass_count:counts.every(x=>x!==null)?
      counts.reduce((sum,n)=>sum+n,0):null,
    pass_rate_percent:null,
    full_job_duration_ms:null,
   }),
   economic_value:immutable({
    comparable_human_minutes:unknown('minutes','BASELINE_NOT_IN_LEDGER'),
    human_supervision_minutes:unknown('minutes','REVIEW_NOT_IN_LEDGER'),
    total_operating_cost_usd:unknown('USD','PROVIDER_COSTS_NOT_VERIFIED'),
    verified_hours_returned:unknown('hours','COMPARABLE_JOB_BASELINE_REQUIRED'),
    verified_cash_savings_usd:unknown('USD','CASH_EFFECT_NOT_VERIFIED'),
    workforce_fte_replaced:unknown('FTE','ROLE_AND_COVERAGE_EVIDENCE_REQUIRED'),
    realized_roi_percent:unknown('percent','COSTS_AND_BENEFITS_UNVERIFIED'),
   }),
   execution_authorized_by_read:false,
   production_changed:false,
  });
 });
 return immutable({
  version:ORIGINAL_JOB_ROI_EVIDENCE_VERSION,
  status:jobs.length?'VERIFIED_ISOLATED_SETTLEMENT_EVIDENCE':'NO_SETTLED_JOB_EVIDENCE',
  distinct_isolated_jobs_verified:jobs.length,
  financial_roi_verified:false,
  scope:'ISOLATED_SETTLEMENT_NOT_ENTIRE_BUSINESS_WORKFLOW',
  jobs:immutable(jobs),
  owner_authorization_granted:false,production_changed:false,
 });
}
