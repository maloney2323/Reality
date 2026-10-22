// Read-only, paired customer outcome scorecard. Reference IDs are assertions
// until admitted by authenticated source validation. Not a live ROI claim.
export const REALITY_VALUE_SCORECARD_VERSION='reality-value-scorecard-v0.1';
const lanes=['MODEL_ONLY','MODEL_PLUS_CLEANER','MODEL_PLUS_REALITY'];
const name=x=>typeof x==='string'&&x.trim().length>0;
const money=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const pct=(a,b)=>b?Math.round(a/b*10000)/100:null;
function isGraded(x){
 return x&&x.status==='INDEPENDENTLY_GRADED'&&x.independently_verified===true&&
  [x.case_id,x.model_id,x.case_digest,x.grading_contract_hash,
   x.independent_grade_receipt_id].every(name)&&lanes.includes(x.lane)&&
  typeof x.completed==='boolean'&&typeof x.drift_escaped==='boolean'&&
  money(x.total_cost_usd)&&money(x.human_review_minutes);
}
export function summarizePairedRealityValue({authenticatedTenantId,records=[]}={}){
 if(!name(authenticatedTenantId))throw Error('TENANT_REQUIRED');
 if(!Array.isArray(records))throw Error('RECORDS_INVALID');
 if(records.some(x=>x?.tenant_id!==authenticatedTenantId))throw Error('CROSS_TENANT_RECORD');
 const graded=records.filter(isGraded);
 const byCase=new Map();
 for(const x of graded){
  const group=byCase.get(x.case_id)||[];
  group.push(x);byCase.set(x.case_id,group);
 }
 const accepted=[],excluded=[];
 for(const [caseId,group] of byCase){
  const keys=new Set(group.map(x=>x.lane));
  const baseline=group.find(x=>x.lane==='MODEL_ONLY');
  const full=group.find(x=>x.lane==='MODEL_PLUS_REALITY');
  if(keys.size!==group.length){excluded.push({case_id:caseId,reason:'DUPLICATE_LANE'});continue;}
  if(!baseline||!full){excluded.push({case_id:caseId,reason:'UNPAIRED_CASE'});continue;}
  if(baseline.model_id!==full.model_id||
     baseline.case_digest!==full.case_digest||
     baseline.grading_contract_hash!==full.grading_contract_hash||
     new Set(group.map(x=>x.independent_grade_receipt_id)).size!==group.length){
   excluded.push({case_id:caseId,reason:'COMPARISON_PROVENANCE_MISMATCH'});continue;
  }
  const cleaner=group.find(x=>x.lane==='MODEL_PLUS_CLEANER')||null;
  if(cleaner&&(cleaner.model_id!==baseline.model_id||
     cleaner.case_digest!==baseline.case_digest||
     cleaner.grading_contract_hash!==baseline.grading_contract_hash)){
   excluded.push({case_id:caseId,reason:'CLEANER_PROVENANCE_MISMATCH'});continue;
  }
  accepted.push({caseId,baseline,full,cleaner});
 }
 const aggregate=lane=>{
  const runs=accepted.map(p=>p[lane]).filter(Boolean),n=runs.length;
  const successes=runs.filter(x=>x.completed).length;
  const escapes=runs.filter(x=>x.drift_escaped).length;
  const totalCost=runs.reduce((v,x)=>v+x.total_cost_usd,0);
  const minutes=runs.reduce((v,x)=>v+x.human_review_minutes,0);
  const detectorGraded=runs.filter(x=>typeof x.independent_error_present==='boolean'&&typeof x.detector_flagged==='boolean');
  const tp=detectorGraded.filter(x=>x.independent_error_present&&x.detector_flagged).length;
  const fp=detectorGraded.filter(x=>!x.independent_error_present&&x.detector_flagged).length;
  const fn=detectorGraded.filter(x=>x.independent_error_present&&!x.detector_flagged).length;
  return {graded_cases:n,completed:successes,completion_pct:pct(successes,n),
   drift_escapes:escapes,drift_escape_pct:pct(escapes,n),
   total_run_cost_usd:Math.round(totalCost*100)/100,
   cost_per_verified_completion_usd:successes?Math.round(totalCost/successes*100)/100:null,
   human_review_minutes:minutes,
   detection:{independently_graded_cases:detectorGraded.length,true_positives:tp,
    false_positives:fp,false_negatives:fn,
    precision_pct:pct(tp,tp+fp),recall_pct:pct(tp,tp+fn)}};
 };
 const b=aggregate('baseline'),f=aggregate('full'),c=aggregate('cleaner');
 return Object.freeze({
  version:REALITY_VALUE_SCORECARD_VERSION,tenant_id:authenticatedTenantId,
  measurement_status:accepted.length?'PAIRED_PROVISIONAL':'NOT_MEASURED',
  matched_cases:accepted.length,
  ungraded_or_ineligible_records:records.length-graded.length,
  excluded_cases:excluded,
  lanes:{model_only:b,model_plus_cleaner:c,model_plus_reality:f},
  reality_increment:accepted.length?{
   completion_percentage_points:Math.round((f.completion_pct-b.completion_pct)*100)/100,
   drift_escape_percentage_points:Math.round((f.drift_escape_pct-b.drift_escape_pct)*100)/100,
   human_review_minutes_difference:b.human_review_minutes-f.human_review_minutes,
   total_run_cost_usd_difference:Math.round((b.total_run_cost_usd-f.total_run_cost_usd)*100)/100,
  }:null,
  provenance_notice:'Receipt references require independent server-side readback, grader independence, and input authorization. This projection alone cannot verify those claims.',
  customer_roi_usd:null,
  verified_customer_savings_usd:null,
  source_admission_required:true,
  attribution_limitations:['No financial ROI can be derived from task completion deltas alone',
   'Unmatched cases excluded; estimates are not measured realized benefits',
   'Confidence intervals and holdout generalization require a larger independently sampled corpus'],
 });
}
