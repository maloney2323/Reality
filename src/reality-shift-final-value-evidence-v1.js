// Read-only economic attachment projection for immutable settled native and PR
// originals. The original receipt stays unchanged; this is a current snapshot
// of separately sourced evidence. No baseline or ROI is inferred from runtime.
export const SHIFT_VALUE_EVIDENCE_VERSION='reality-shift-final-value-evidence-v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const DIGEST=/^sha256:[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(issues|pull)\/[1-9]\d*$/;
const RUN=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9]\d*$/;
const COMMENT=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*#issuecomment-[1-9]\d*$/;
const TYPES=new Set(['HUMAN_BASELINE_MINUTES','HUMAN_REVIEW_MINUTES',
 'MODEL_INPUT_TOKENS','MODEL_OUTPUT_TOKENS','MODEL_PROVIDER_COST_USD','INFRASTRUCTURE_COST_USD']);
const SOURCE_CLASSES=new Set(['OWNER_REPORTED_UNVERIFIED','TRUSTED_PROVIDER_RECEIPT']);
const fail=x=>{throw Error('REALITY_SHIFT_VALUE_'+x)};
function economicObservation(a){
 if(!TYPES.has(a?.metric_type)||
  !SOURCE_CLASSES.has(a.source_class)||
  typeof a.value!=='number'||!Number.isFinite(a.value)||a.value<0||a.value>1e12||
  a.unit!==(a.metric_type.endsWith('_MINUTES')?'MINUTES':
   a.metric_type.endsWith('_TOKENS')?'TOKENS':'USD')||
  (a.unit==='TOKENS'&&!Number.isSafeInteger(a.value))||
  !/^[a-f0-9]{64}$/.test(a.evidence_sha256||'')||
  typeof a.source_ref!=='string'||a.source_ref.length<15||a.source_ref.length>500||
  !Number.isFinite(Date.parse(a.observed_at||'')))
  fail('ECONOMIC_OBSERVATION_PROVENANCE_INVALID');
 return Object.freeze({...a,
  evidence_status:a.source_class==='TRUSTED_PROVIDER_RECEIPT'?
    'SOURCE_LABELLED_NOT_VERIFIED_NET_SAVINGS':
    'OWNER_REPORTED_UNVERIFIED',
  financial_roi_verified:false});
}
export function projectRealityShiftFinalValueReceipts(raw){
 if(raw?.status!=='OWNER_SHIFT_FINAL_VALUE_RECEIPTS_READ_ONLY'||
  raw.owner_scope_verified!==true||
  raw.economic_calculation!=='NO_UNSUPPORTED_SAVINGS_INFERRED'||
  raw.installation_authorized!==false||
  raw.new_shift_created!==false||
  raw.original_job_replayed!==false||
  raw.production_changed!==false||
  !Array.isArray(raw.receipts)||raw.receipts.length>12)
  fail('EXACT_OWNER_INDEPENDENT_RECEIPT_READBACK_REQUIRED');
 const ids=new Set(),refs=new Set();
 const receipts=raw.receipts.map(r=>{
  const m=SOURCE.exec(r?.source_ref||'');
  const native=r?.kind==='NATIVE_CODE_REPAIR';
  const pr=r?.kind==='PR_CODE_REVIEW';
  if(r.status!=='INDEPENDENTLY_SETTLED_SOURCE_NATIVE_ORIGINAL'||
   !(native||pr)||!WORK.test(r.original_work_id||'')||
   !UUID.test(r.shift_id||'')||!m||
   m[1]!== (native?'issues':'pull')||
   ids.has(r.original_work_id)||refs.has(r.final_receipt_ref)||
   !DIGEST.test(r.source_proof_sha256||'')||
   !DIGEST.test(r.final_receipt_sha256||'')||
   r.final_outcome!=='SUCCEEDED'||
   !Number.isFinite(Date.parse(r.settled_at||''))||
   r.independent_verification!==true||
   r.production_changed!==false||
   r.economic_evidence_scope!=='SOURCE_RECORDED_UNVERIFIED_NET_SAVINGS'||
   r.model_cost_usd_verified!==null||
   r.infrastructure_cost_usd_verified!==null||
   r.human_baseline_minutes_verified!==null||
   r.human_supervision_minutes_verified!==null||
   r.verified_net_savings_usd!==null||
   r.verified_roi_percent!==null||
   !Array.isArray(r.economic_observations)||r.economic_observations.length>100)
   fail('RECEIPT_OR_FINANCIAL_AUTHORITY_UNVERIFIED');
  if(native){
   if(!new RegExp('^supabase:riley_native_independent_final_receipts_v1:'+
     '[a-f0-9-]{36}$','i').test(r.final_receipt_ref||'')||
    !RUN.test(r.provider_proof_ref||'')||
    !COMMIT.test(r.installed_commit_sha||'')||
    r.model_usage_scope!=='PARTIAL_NATIVE_DRAFT_AND_REVISION_OUTPUT_ONLY'||
    !(r.model_output_tokens_recorded===null||
      (Number.isSafeInteger(r.model_output_tokens_recorded)&&
       r.model_output_tokens_recorded>0&&r.model_output_tokens_recorded<=1e9)))
    fail('NATIVE_FINAL_VERIFICATION_INVALID');
  }else if(!new RegExp('^supabase:riley_pr_review_originals_v1:[a-f0-9-]{36}$','i').test(
     r.final_receipt_ref||'')||
   !COMMENT.test(r.provider_proof_ref||'')||
   r.installed_commit_sha!==null||
   r.model_output_tokens_recorded!==null||
   r.model_usage_scope!=='PR_REVIEW_USAGE_NOT_RECORDED')
    fail('PR_FINAL_VERIFICATION_INVALID');
  const obs=r.economic_observations.map(economicObservation);
  ids.add(r.original_work_id);refs.add(r.final_receipt_ref);
  return Object.freeze({
   ...r,economic_observations:Object.freeze(obs),
   value_evidence_status:obs.length||r.model_output_tokens_recorded!==null?
    'PARTIAL_SOURCE_MEASUREMENTS_NO_VERIFIED_ROI':
    'NO_VERIFIED_ECONOMIC_INPUTS',
   verified_financial_roi:false,
   data_missing:Object.freeze([
    'VERIFIED_COMPARABLE_HUMAN_BASELINE',
    'MEASURED_HUMAN_SUPERVISION',
    'BILLABLE_MODEL_AND_INFRASTRUCTURE_COST',
    'NET_SAVINGS_AND_ROI_INDEPENDENT_VERIFICATION',
   ]),
   original_receipt_unchanged:true,
  });
 });
 return Object.freeze({
  version:SHIFT_VALUE_EVIDENCE_VERSION,
  status:'OWNER_FINAL_RECEIPTS_WITH_ECONOMIC_ACCOUNTABILITY',
  independent_originals:receipts.length,
  receipts:Object.freeze(receipts),
  financial_roi_verified:false,
  verified_net_savings_usd:null,
  owner_scope_verified:true,
  original_receipts_unchanged:true,
  read_only:true,
  new_work_authorized:false,installation_authorized:false,
  production_changed:false
 });
}
