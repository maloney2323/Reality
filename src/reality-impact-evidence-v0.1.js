// Reality Impact is a READ-ONLY projection of independently verified receipts.
// Never turn a detector flag, assumed counterfactual, or sandbox candidate into
// a claimed prevented loss, fixed model output or released self-upgrade.
export const REALITY_IMPACT_VERSION='reality-impact-evidence-v0.1';
const defined=x=>typeof x==='string'&&x.trim().length>0;
const validNumber=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export function summarizeRealityImpact({
  evaluations=[],corrections=[],upgrades=[],benefits=[],
  authenticatedTenantId,
}={}){
 if(!defined(authenticatedTenantId))throw Error('IMPACT_AUTHENTICATED_TENANT_REQUIRED');
 for(const arr of [evaluations,corrections,upgrades,benefits]){
  if(!Array.isArray(arr))throw Error('IMPACT_RECORDS_INVALID');
  if(arr.some(x=>x?.tenant_id!==authenticatedTenantId))
   throw Error('IMPACT_CROSS_TENANT_RECORD');
 }
 // Only independently adjudicated evaluations define a denominator;
 // "no observations" is NOT a 0% drift rate.
 const measured=evaluations.filter(x=>x?.independent_grade_receipt_id&&
   defined(x?.turn_id)&&typeof x?.drift_confirmed==='boolean');
 const driftRate=measured.length?{
  numerator:measured.filter(x=>x.drift_confirmed).length,
  denominator:measured.length,
  unit:'TURN',
  percentage:100*measured.filter(x=>x.drift_confirmed).length/measured.length,
  coverage:'GRADED_TURNS_ONLY',
 }:null;
 const fixed=corrections.filter(x=>
   x?.status==='CORRECTION_VERIFIED'&&
   defined(x?.original_model_output_ref)&&
   defined(x?.independent_verification_receipt_id)&&
   defined(x?.corrected_outcome_ref));
 const promoted=upgrades.filter(x=>
   x?.status==='PROMOTED'&&
   defined(x?.promotion_authorization_receipt_id)&&
   defined(x?.independent_regression_receipt_id)&&
   defined(x?.release_receipt_id));
 // For verified ROI we additionally require a signed customer/time-accounting
 // receipt, actual directly attributable saved labor or expense, plus baseline.
 // Projected "avoided losses" remain estimates and NEVER count here.
 const supported=benefits.filter(x=>
   x?.status==='VERIFIED_REALIZED_BENEFIT'&&
   defined(x?.baseline_receipt_id)&&
   defined(x?.customer_confirmation_receipt_id)&&
   defined(x?.measured_outcome_receipt_id)&&
   validNumber(x?.verified_value_usd)&&validNumber(x?.attributable_cost_usd));
 const roi=supported.length?{
  verified_net_benefit_usd:supported.reduce((n,x)=>n+x.verified_value_usd-x.attributable_cost_usd,0),
  verified_gross_benefit_usd:supported.reduce((n,x)=>n+x.verified_value_usd,0),
  measured_cases:supported.length,
  attribution:'RECEIPT_BOUND_REALIZED_BENEFITS_ONLY',
 }:null;
 // Only show one observed event per ID. Unverified, partial and merely
 // proposed changes remain uncounted but can be listed elsewhere as such.
 return Object.freeze({
  version:REALITY_IMPACT_VERSION,tenant_id:authenticatedTenantId,
  model_drift:driftRate,
  verified_corrections:fixed.length,
  authorized_production_upgrades:promoted.length,
  verified_roi:roi,
  receipt_quality:'ONLY_EVIDENCE_BACKED_STATUSES_COUNTED',
  ungraded_turns:evaluations.length-measured.length,
  correction_candidates_excluded:corrections.length-fixed.length,
  upgrade_candidates_excluded:upgrades.length-promoted.length,
  benefits_excluded:benefits.length-supported.length,
  detector_interventions_not_equivalent_to_verified_corrections:true,
  values_must_not_be_displayed_as_total_business_savings:true,
 });
}
