// An evaluator OUTSIDE the Reality drift detector. It cannot infer ground
// truth from the model's answer, detector flags, or expected scenario label.
// All customer claims require dated, reviewer-owned, source-backed observations.
export const BUSINESS_PROOF_SCORER_VERSION='reality-business-proof-scoring-v0.1';
const pct=(n,d)=>d?Number((100*n/d).toFixed(2)):null;
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const valid=v=>typeof v==='string'&&v.trim().length>0;
const bool=v=>typeof v==='boolean';
const sum=(a,fn)=>a.reduce((n,v)=>n+fn(v),0);

export function scoreIndependentReliability({observations=[],expectedTurns=null}={}){
 if(!Array.isArray(observations))throw Error('OBSERVATIONS_ARRAY_REQUIRED');
 if(expectedTurns!==null&&(!Number.isInteger(expectedTurns)||expectedTurns<1))
   throw Error('EXPECTED_TURNS_INVALID');
 const ids=new Set();
 const complete=[],unreviewed=[];
 for(const o of observations){
   if(!valid(o?.id)||ids.has(o.id))throw Error('DUPLICATE_OR_MISSING_CASE_ID');
   ids.add(o.id);
   // A blank field or self-graded model claim cannot turn into a clean case.
   if(!valid(o.reviewer_id)||!valid(o.source_evidence_ref)||
      !valid(o.model_output_receipt_id)||!valid(o.verified_at)||
      o.reviewer_id===o.detector_id||o.source_evidence_ref===o.model_output_receipt_id||
      !['EXTERNAL_BUSINESS_RECORD','INDEPENDENT_HUMAN_REVIEW','FROZEN_BENCHMARK_ORACLE'].includes(o.evidence_class)||
      !bool(o.true_drift)||!bool(o.false_factual_assertion)||!bool(o.detector_drift_flag)||
      !bool(o.detector_hallucination_flag)){
     unreviewed.push(o.id);continue;
   }
   // Even a human adjudicated lab record remains a LAB record, not a business.
   if(o.evidence_class==='FROZEN_BENCHMARK_ORACLE'&&o.customer_world===true)
     throw Error('FIXTURE_CANNOT_PROVE_CUSTOMER_WORLD');
   complete.push(o);
 }
 const driftCases=complete.filter(o=>bool(o.true_drift));
 const hallucinationCases=complete.filter(o=>bool(o.false_factual_assertion));
 const m=(field,flag)=>{
   const rows=complete.filter(o=>bool(o[field]));
   const errors=rows.filter(o=>o[field]===true).length;
   const detected=rows.filter(o=>o[field]===true&&o[flag]===true).length;
   const falseAlarms=rows.filter(o=>o[field]===false&&o[flag]===true).length;
   const clean=rows.filter(o=>o[field]===false).length;
   return {
     independently_reviewed_eligible_cases:rows.length,
     confirmed_error_cases:errors,
     error_rate_pct:pct(errors,rows.length),
     detected_confirmed_errors:detected,
     detector_recall_pct:pct(detected,errors),
     false_alarms:falseAlarms,
     false_positive_rate_pct:pct(falseAlarms,clean),
   };
 };
 const drift=m('true_drift','detector_drift_flag');
 const hallucinations=m('false_factual_assertion','detector_hallucination_flag');
 const recovered=complete.filter(o=>o.true_drift||o.false_factual_assertion)
   .filter(o=>valid(o.recovery_outcome_receipt_id)&&
     o.independent_recovery_verified===true &&
     o.recovery_outcome_receipt_id!==o.model_output_receipt_id &&
     o.recovery_outcome_receipt_id!==o.source_evidence_ref).length;
 const errorIncidents=complete.filter(o=>o.true_drift||o.false_factual_assertion);
 const customer=complete.filter(o=>o.customer_world===true &&
   o.evidence_class!=='FROZEN_BENCHMARK_ORACLE');
 const completeCount=complete.length;
 const missing=expectedTurns===null?null:Math.max(0,expectedTurns-completeCount);
 return {
   contract:BUSINESS_PROOF_SCORER_VERSION,
   observed_cases:observations.length,expected_turns:expectedTurns,
   independently_adjudicated_cases:completeCount,
   unreviewed_case_ids:unreviewed,
   missing_or_unadjudicated_turns:missing,
   full_coverage:expectedTurns!==null&&completeCount===expectedTurns,
   adjudicated_real_customer_cases:customer.length,
   separate_percentages:{drift,hallucinations},
   may_overlap:'The same response may contain both cross-turn drift and a false factual assertion; these are distinct numerators.',
   independently_verified_recoveries:recovered,
   independently_verified_recovery_rate_pct:pct(recovered,errorIncidents.length),
   customer_hallucination_rate_pct:customer.length?pct(
     customer.filter(o=>o.false_factual_assertion).length,customer.length):null,
   customer_drift_rate_pct:customer.length?pct(
     customer.filter(o=>o.true_drift).length,customer.length):null,
   customer_automation_continuation_verified:complete.some(o=>
     o.customer_world===true&&o.independent_recovery_verified===true&&
     valid(o.recovery_outcome_receipt_id)),
   no_unreviewed_assumed_clean:true,
 };
}

export function scorePaidBusinessSupervision({business=null,matchedTasks=[],additionalCostsUsd=0}={}){
 if(!Array.isArray(matchedTasks)||!finite(additionalCostsUsd))
   throw Error('SUPERVISION_INPUT_INVALID');
 const paid=valid(business?.business_id)&&valid(business?.verified_payment_receipt_id)&&
   valid(business?.work_authorization_ref);
 const measured=[],invalid=[],ids=new Set();
 for(const t of matchedTasks){
   if(!valid(t?.task_id)||ids.has(t.task_id))throw Error('PAIRED_TASK_ID_REQUIRED');
   ids.add(t.task_id);
   const complete=valid(t.external_reviewer_id)&&valid(t.baseline_receipt_id)&&
     valid(t.governed_receipt_id)&&t.baseline_receipt_id!==t.governed_receipt_id&&
     valid(t.baseline_work_description)&&valid(t.governed_work_description)&&
     finite(t.baseline_review_minutes)&&finite(t.governed_review_minutes)&&
     finite(t.baseline_rework_minutes)&&finite(t.governed_rework_minutes)&&
     bool(t.baseline_outcome_verified)&&bool(t.governed_outcome_verified)&&
     finite(t.baseline_run_cost_usd)&&finite(t.governed_run_cost_usd);
   if(!complete){invalid.push(t.task_id);continue}
   measured.push(t);
 }
 const baselineMinutes=sum(measured,t=>t.baseline_review_minutes+t.baseline_rework_minutes);
 const governedMinutes=sum(measured,t=>t.governed_review_minutes+t.governed_rework_minutes);
 const baselineCost=sum(measured,t=>t.baseline_run_cost_usd);
 const governedCost=sum(measured,t=>t.governed_run_cost_usd)+additionalCostsUsd;
 const saved=baselineMinutes-governedMinutes;
 const rate=business?.verified_hourly_labor_rate_usd;
 const monetized=finite(rate)&&paid&&measured.length>0 ?
   Number(((saved*rate/60)-(governedCost-baselineCost)).toFixed(2)):null;
 // A numeric negative result is allowed: Reality may COST the business time.
 return {
   contract:BUSINESS_PROOF_SCORER_VERSION,
   paid_business_verified:paid,
   matched_measured_tasks:measured.length,unmatched_or_incomplete_task_ids:invalid,
   baseline_review_and_rework_minutes:measured.length?baselineMinutes:null,
   reality_review_and_rework_minutes:measured.length?governedMinutes:null,
   net_supervision_minutes_saved:paid&&measured.length?saved:null,
   net_supervision_reduction_pct:paid&&measured.length?pct(saved,baselineMinutes):null,
   measured_operating_cost_difference_usd:paid&&measured.length?
     Number((governedCost-baselineCost).toFixed(2)):null,
   verified_net_labor_value_usd:monetized,
   baseline_verified_outcomes:sum(measured,t=>Number(t.baseline_outcome_verified)),
   reality_verified_outcomes:sum(measured,t=>Number(t.governed_outcome_verified)),
   pilot_status:paid&&measured.length&&invalid.length===0?'MEASURED_PAIRED_WORK':'NOT_YET_PROVEN',
   limitation:'One-business matched tasks are an observational pilot, not automatically a causal randomized effect; control order and task mix.',
 };
}
