// Independently readable owner-scoped job economics v2.
// Phase timestamps are provider/database facts. Economic source observations
// remain source-labelled facts, NOT independently verified business savings.
// No authority, execution, installation, or owner decisions in this module.
import {projectOwnerJobRoiEvidence} from './reality-original-job-roi-evidence-v1.js';
import {enrichOwnerJobRoiWithHumanLabor} from './reality-human-labor-benchmark-v1.js';

export const OPERATIONAL_ROI_EVIDENCE_VERSION='reality-operational-roi-evidence-v2';
const sha=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const kinds=Object.freeze({
 HUMAN_BASELINE_MINUTES:'MINUTES',
 HUMAN_REVIEW_MINUTES:'MINUTES',
 MODEL_INPUT_TOKENS:'TOKENS',
 MODEL_OUTPUT_TOKENS:'TOKENS',
 MODEL_PROVIDER_COST_USD:'USD',
 INFRASTRUCTURE_COST_USD:'USD',
});
const sources=new Set(['OWNER_REPORTED_UNVERIFIED','TRUSTED_PROVIDER_RECEIPT']);
const fail=x=>{throw Error('REALITY_OPERATIONAL_ROI_'+x)};
const freeze=Object.freeze;
const measured=(v,unit,scope)=>freeze({value:v,unit,scope,
 evidence_status:'RECORDED_SIGNED_OWNER_SCOPED_LEDGER_TIME'});
const missing=(unit,reason)=>freeze({value:null,unit,evidence_status:reason});
function milliseconds(ts){
 if(typeof ts!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(ts))
  fail('TIMESTAMP_INVALID');
 const t=Date.parse(ts);
 if(!Number.isFinite(t))fail('TIMESTAMP_INVALID');
 return t;
}
function elapsed(from,to,elapsedMs){
 if(from===null){
  if(elapsedMs!==null)fail('MISSING_START_WITH_REPORTED_INTERVAL');
  return null;
 }
 const delta=milliseconds(to)-milliseconds(from);
 if(delta<0||delta>1000*60*60*24*90||
    !Number.isSafeInteger(elapsedMs)||elapsedMs<0||
    Math.abs(delta-elapsedMs)>2)
  fail('PROVIDER_TIMELINE_INTERVAL_DISAGREES');
 return elapsedMs;
}
function observations(rows){
 if(!Array.isArray(rows)||rows.length>100)
  fail('ECONOMIC_OBSERVATION_SET_INVALID');
 const seen=new Set();
 return freeze(rows.map(x=>{
  if(!uuid.test(x?.observation_id)||seen.has(x.observation_id)||
    !(x.metric_type in kinds)||kinds[x.metric_type]!==x.unit||
    !sources.has(x.source_class)||
    typeof x.numeric_value!=='number'||
    !Number.isFinite(x.numeric_value)||x.numeric_value<0||
    x.numeric_value>1e12||
    (x.unit==='TOKENS'&&!Number.isSafeInteger(x.numeric_value))||
    !sha.test(x.evidence_sha256)||
    typeof x.source_ref!=='string'||x.source_ref.length<15||
    x.source_ref.length>500||
    milliseconds(x.observed_at)>milliseconds(x.recorded_at)+300000)
   fail('ECONOMIC_OBSERVATION_NOT_TRUSTWORTHY');
  seen.add(x.observation_id);
  return freeze({
   observation_id:x.observation_id,metric_type:x.metric_type,
   value:x.numeric_value,unit:x.unit,
   source_ref:x.source_ref,evidence_sha256:x.evidence_sha256,
   observed_at:x.observed_at,recorded_at:x.recorded_at,
   evidence_status:x.source_class==='OWNER_REPORTED_UNVERIFIED'?
    'OWNER_REPORTED_NOT_INDEPENDENTLY_VALIDATED':
    'PROVIDER_RECEIPT_RECORDED_REQUIRES_SEPARATE_COST_AND_SCOPE_VALIDATION',
  });
 }));
}
export function projectOperationalRoiEvidenceV2(raw){
 if(raw?.schema!=='reality-owner-original-job-roi-evidence-v2'||
    raw.evidence_scope!=='SIGNED_OWNER_SCOPED_ISOLATED_LEDGER_READBACK'||
    raw.production_changed!==false||
    raw.owner_authorization_granted!==false||
    raw.work_executed_by_read!==false||
    !Array.isArray(raw.jobs)||raw.jobs.length>20)
  fail('SOURCE_VERIFIED_OWNER_ROI_V2_REQUIRED');
 // The existing independently checked v1 contract remains the baseline.
 const baseline=projectOwnerJobRoiEvidence({
  ...raw,schema:'reality-owner-original-job-roi-evidence-v1',
 });
 const withHuman=enrichOwnerJobRoiWithHumanLabor(baseline);
 const jobIndex=new Map(raw.jobs.map(j=>[j.original_work_id,j]));
 const jobs=withHuman.jobs.map(j=>{
  const rawJob=jobIndex.get(j.original_work_id);
  const claim=elapsed(rawJob.claimed_at,rawJob.settled_at,
    rawJob.claim_to_settlement_ms);
  const queue=elapsed(rawJob.gap_queued_at,rawJob.settled_at,
    rawJob.gap_queue_to_settlement_ms);
  const approve=elapsed(rawJob.owner_approved_at,rawJob.settled_at,
    rawJob.owner_approval_to_settlement_ms);
  if(queue!==null&&queue<claim||
    approve!==null&&approve<claim||
    (rawJob.gap_queued_at!==null&&rawJob.owner_approved_at!==null&&
      milliseconds(rawJob.gap_queued_at)>milliseconds(rawJob.owner_approved_at))||
    (rawJob.owner_approved_at!==null&&
      milliseconds(rawJob.owner_approved_at)>milliseconds(rawJob.claimed_at)))
   fail('LIFECYCLE_ORDER_INCONSISTENT');
  const economic=observations(rawJob.economic_observations);
  return freeze({
   ...j,
   lifecycle:freeze({
    gap_queued_at:rawJob.gap_queued_at,
    owner_approved_at:rawJob.owner_approved_at,
    execution_claimed_at:rawJob.claimed_at,
    independently_settled_at:rawJob.settled_at,
    gap_queue_to_settlement:queue===null?
      missing('milliseconds','GAP_QUEUE_TIMESTAMP_MISSING'):
      measured(queue,'milliseconds','QUEUED_CAPABILITY_GAP_TO_ISOLATED_SETTLEMENT'),
    approval_to_settlement:approve===null?
      missing('milliseconds','OWNER_APPROVAL_TIMESTAMP_MISSING'):
      measured(approve,'milliseconds','OWNER_APPROVAL_TO_ISOLATED_SETTLEMENT'),
    claim_to_settlement:measured(claim,'milliseconds','EXECUTION_CLAIM_TO_ISOLATED_SETTLEMENT'),
    full_customer_job_start_to_finish:missing('milliseconds',
      'ORIGINAL_BUSINESS_JOB_START_NOT_RECORDED'),
    human_attention_minutes:missing('minutes',
      'APPROVAL_TIMESTAMP_DOES_NOT_MEASURE_REVIEW_EFFORT'),
   }),
   economic_observations:economic,
   economic_readiness:economic.length?
    'RECORDED_SOURCE_OBSERVATIONS_NOT_VERIFIED_NET_SAVINGS':
    'NO_COST_OR_HUMAN_BASELINE_SOURCE_RECORDS',
   financial_roi_verified:false,
   workforce_reduction_verified:false,
  });
 });
 return freeze({
  ...withHuman,version:OPERATIONAL_ROI_EVIDENCE_VERSION,
  jobs:freeze(jobs),
  collection_state:freeze({
   separately_timed_lifecycle_jobs:jobs.filter(j=>
    j.lifecycle.gap_queue_to_settlement.value!==null).length,
   jobs_with_recorded_economic_inputs:jobs.filter(j=>j.economic_observations.length>0).length,
   comparable_human_work_verified:0,
   billable_provider_cost_verified:0,
   verified_cash_savings_usd:null,
  }),
  verified_customer_financial_roi:false,
  production_changed:false,job_execution_authorized_by_analysis:false,
 });
}
