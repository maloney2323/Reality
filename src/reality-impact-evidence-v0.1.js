// Reality Impact is a READ-ONLY projection of independently verified receipts.
// Never turn a detector flag, assumed counterfactual, or sandbox candidate into
// a claimed prevented loss, fixed model output or released self-upgrade.
export const REALITY_IMPACT_VERSION='reality-impact-evidence-v0.1';
const defined=x=>typeof x==='string'&&x.trim().length>0;
const validNumber=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
export function summarizeRealityImpact({
  evaluations=[],detections=[],corrections=[],upgrades=[],benefits=[],
  authenticatedTenantId,
}={}){
 if(!defined(authenticatedTenantId))throw Error('IMPACT_AUTHENTICATED_TENANT_REQUIRED');
 for(const arr of [evaluations,detections,corrections,upgrades,benefits]){
  if(!Array.isArray(arr))throw Error('IMPACT_RECORDS_INVALID');
  if(arr.some(x=>x?.tenant_id!==authenticatedTenantId))
   throw Error('IMPACT_CROSS_TENANT_RECORD');
 }
 // Only independently adjudicated evaluations define a denominator;
 // "no observations" is NOT a 0% drift rate.
 // Duplicate or inconsistent grading of the same turn must not change the
 // denominator or manufacture certainty. Exclude ambiguous turn identities.
 const graded=evaluations.filter(x=>defined(x?.independent_grade_receipt_id)&&
   defined(x?.turn_id)&&typeof x?.drift_confirmed==='boolean');
 const gradeGroups=new Map();
 for(const row of graded){
   const group=gradeGroups.get(row.turn_id)||[];
   group.push(row); gradeGroups.set(row.turn_id,group);
 }
 const measured=[];
 for(const group of gradeGroups.values()){
   if(group.length!==1)continue; // Duplicate grading is ambiguous until reconciled.
   measured.push(group[0]);
 }
 const driftRate=measured.length?{
  numerator:measured.filter(x=>x.drift_confirmed).length,
  denominator:measured.length,
  unit:'TURN',
  percentage:100*measured.filter(x=>x.drift_confirmed).length/measured.length,
  coverage:'GRADED_TURNS_ONLY',
 }:null;
 // A model's error caught by Reality is valuable independently of any
 // external action, verified correction, or dollar savings. But a diagnostic
 // flag alone is NOT a verified catch. Every counted catch needs an independent
 // adjudication of the original output plus a traceable detector receipt.
 const verifiedCatchIds=new Set();
 const verifiedCatchRecords=[];
 for(const hit of detections){
  if(hit?.status!=='ERROR_INDEPENDENTLY_CONFIRMED' ||
     !defined(hit?.detection_id) ||
     !defined(hit?.original_model_output_ref) ||
     !defined(hit?.model_id) ||
     !defined(hit?.turn_id) ||
     !defined(hit?.detection_receipt_id) ||
     !defined(hit?.independent_error_grade_receipt_id) ||
     verifiedCatchIds.has(hit.detection_id))continue;
  verifiedCatchIds.add(hit.detection_id);
  verifiedCatchRecords.push(hit);
 }
 const contained=verifiedCatchRecords.filter(x=>
   x?.containment_status==='VERIFIED_BEFORE_EXTERNAL_ACTION' &&
   defined(x?.independent_containment_receipt_id) &&
   defined(x?.action_scope_ref));
 const correctionReceiptIds=new Set();
 const fixed=corrections.filter(x=>
   x?.status==='CORRECTION_VERIFIED'&&
   defined(x?.original_model_output_ref)&&
   defined(x?.independent_verification_receipt_id)&&
   defined(x?.corrected_outcome_ref)&&
   !correctionReceiptIds.has(x.independent_verification_receipt_id)&&
   Boolean(correctionReceiptIds.add(x.independent_verification_receipt_id)));
 const releasedReceiptIds=new Set();
 const promoted=upgrades.filter(x=>
   x?.status==='PROMOTED'&&
   defined(x?.promotion_authorization_receipt_id)&&
   defined(x?.independent_regression_receipt_id)&&
   defined(x?.release_receipt_id)&&
   !releasedReceiptIds.has(x.release_receipt_id)&&
   Boolean(releasedReceiptIds.add(x.release_receipt_id)));
 // For verified ROI we additionally require a signed customer/time-accounting
 // receipt, actual directly attributable saved labor or expense, plus baseline.
 // Projected "avoided losses" remain estimates and NEVER count here.
 const outcomeReceiptIds=new Set();
 const supported=benefits.filter(x=>
   x?.status==='VERIFIED_REALIZED_BENEFIT'&&
   defined(x?.baseline_receipt_id)&&
   defined(x?.customer_confirmation_receipt_id)&&
   defined(x?.measured_outcome_receipt_id)&&
   validNumber(x?.verified_value_usd)&&validNumber(x?.attributable_cost_usd)&&
   !outcomeReceiptIds.has(x.measured_outcome_receipt_id)&&
   Boolean(outcomeReceiptIds.add(x.measured_outcome_receipt_id)));
 const roi=supported.length?{
  verified_net_benefit_usd:supported.reduce((n,x)=>n+x.verified_value_usd-x.attributable_cost_usd,0),
  verified_gross_benefit_usd:supported.reduce((n,x)=>n+x.verified_value_usd,0),
  measured_cases:supported.length,
  verified_total_cost_usd:supported.reduce((n,x)=>n+x.attributable_cost_usd,0),
  verified_roi_percentage:supported.reduce((n,x)=>n+x.attributable_cost_usd,0)>0
    ? 100*supported.reduce((n,x)=>n+x.verified_value_usd-x.attributable_cost_usd,0)/
      supported.reduce((n,x)=>n+x.attributable_cost_usd,0):null,
  attribution:'RECEIPT_BOUND_REALIZED_BENEFITS_ONLY',
 }:null;
 // Only show one observed event per ID. Unverified, partial and merely
 // proposed changes remain uncounted but can be listed elsewhere as such.
 return Object.freeze({
  version:REALITY_IMPACT_VERSION,tenant_id:authenticatedTenantId,
  model_drift:driftRate,
  verified_underlying_model_errors_caught:verifiedCatchRecords.length,
  verified_errors_contained_before_action:contained.length,
  verified_corrections:fixed.length,
  authorized_production_upgrades:promoted.length,
  verified_roi:roi,
  receipt_quality:'RECEIPT_REFERENCES_PRESENT_CONTENT_REQUIRES_INDEPENDENT_READBACK',
  independent_receipt_readback_performed_by_projection:false,
  production_claim_requires_authenticated_source_admission:true,
  ungraded_turns:evaluations.length-graded.length,
  duplicate_or_ambiguous_grade_records_excluded:graded.length-measured.length,
  unverified_detection_candidates_excluded:detections.length-verifiedCatchRecords.length,
  correction_candidates_excluded:corrections.length-fixed.length,
  upgrade_candidates_excluded:upgrades.length-promoted.length,
  benefits_excluded:benefits.length-supported.length,
  detector_interventions_not_equivalent_to_verified_corrections:true,
  independently_verified_errors_caught_are_operational_value:true,
  error_caught_does_not_prove_financial_loss_prevented:true,
  values_must_not_be_displayed_as_total_business_savings:true,
 });
}
