// Business value projection for the SAME independently verified original job.
// Technical failure evidence proves the gap, NOT projected revenue or ROI.
// This metadata cannot mint authority, trigger generation, or confer reuse.
export const CAPABILITY_VALUE_PASSPORT_VERSION='reality-capability-value-passport-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const REF=x=>typeof x==='string'&&(
 /^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/.test(x)||
 /^vercel:provider-verified:[A-Za-z0-9_.:/-]{8,340}$/.test(x)||
 /^reality:provider-verified:[a-z][a-z0-9_-]{2,40}:[A-Za-z0-9_.:/-]{12,340}$/.test(x));
export const BUSINESS_CATEGORIES=Object.freeze([
 'SALES_REVENUE','FINANCIAL_OPERATIONS','LABOR_PRODUCTIVITY',
 'CUSTOMER_EXPERIENCE','OPERATIONS_DELIVERY','INVENTORY_PROCUREMENT',
 'MARKETING_GROWTH','RISK_COMPLIANCE','DATA_INTEGRATIONS',
 'COMPETITIVE_ADVANTAGE','STRATEGY_INNOVATION','UPGRADES_IMPROVEMENTS',
 'UNCLASSIFIED',
]);
export const VALUE_DIMENSIONS=Object.freeze([
 'REVENUE_GROWTH','LABOR_RETURNED','COST_REDUCTION','EXECUTION_SPEED',
 'RELIABILITY','CUSTOMER_EXPERIENCE','COMPETITIVE_ADVANTAGE',
 'SCALABILITY','RISK_REDUCTION','COMPLIANCE_AUDIT',
 'KNOWLEDGE_ADVANTAGE','REUSE_COMPOUNDING',
]);
const KIND_CATEGORIES=Object.freeze({
 REVENUE_OPPORTUNITY:'SALES_REVENUE',
 CUSTOMER_COMMITMENT:'CUSTOMER_EXPERIENCE',
 RECURRING_OPERATION:'OPERATIONS_DELIVERY',
 FOLLOW_UP:'CUSTOMER_EXPERIENCE',
 CAPABILITY_BUILD:'UPGRADES_IMPROVEMENTS',
 RISK_REDUCTION:'RISK_COMPLIANCE',
 SYSTEM_MAINTENANCE:'UPGRADES_IMPROVEMENTS',
});
const clean=x=>typeof x==='string'&&x.trim()?
 x.trim().slice(0,360):null;
const err=x=>{throw Error('GENUINE_CAPABILITY_VALUE_'+x)};
export function createCapabilityValuePassport({
 originalWorkId,capabilityId,originalWorkEventId,
 providerFailureRef,originalBusinessEvidence=null,
}={}){
 if(!WORK.test(originalWorkId)||!CAP.test(capabilityId)||
    !UUID.test(originalWorkEventId)||!REF(providerFailureRef))
  err('ORIGINAL_VERIFIED_GAP_REQUIRED');
 const evidence=originalBusinessEvidence&&
   !Array.isArray(originalBusinessEvidence)&&
   typeof originalBusinessEvidence==='object'?
   originalBusinessEvidence:{};
 // Source-linked original owner description is a CLAIM, not independently
 // verified business value; no free-form economic figures enter this record.
 const category=BUSINESS_CATEGORIES.includes(evidence.business_category)?
   evidence.business_category:
   KIND_CATEGORIES[evidence.work_kind]||'UNCLASSIFIED';
 const ownerOutcome=clean(evidence.expected_business_outcome);
 const listed=Array.isArray(evidence.value_dimensions)?
   evidence.value_dimensions.filter(x=>VALUE_DIMENSIONS.includes(x)):[];
 const dimensions=[...new Set(listed)].sort();
 return Object.freeze({
  passport_version:CAPABILITY_VALUE_PASSPORT_VERSION,
  original_work_id:originalWorkId,
  original_work_event_id:originalWorkEventId,
  capability_id:capabilityId,
  technical_gap_source_ref:providerFailureRef,
  business_category:category,
  expected_business_outcome:ownerOutcome,
  expected_outcome_evidence_status:ownerOutcome?
   'OWNER_SOURCE_LINKED_CLAIM_NOT_OUTCOME_VERIFIED':'NOT_SPECIFIED',
  value_dimensions:Object.freeze(dimensions),
  value_dimensions_status:dimensions.length?
   'OWNER_NOMINATED_NOT_MEASURED':'PENDING_BUSINESS_EVIDENCE',
  primary_unlock:'CONTINUE_SAME_UNFINISHED_ORIGINAL_JOB',
  estimated_annual_net_value_usd:null,
  measured_net_value_usd:null,
  payback_period_days:null,
  competitive_benchmark:null,
  competitive_advantage_status:'UNMEASURED',
  reuse_potential_status:'UNVERIFIED',
  reuse_authorized:false,
  tenant_scope:'ORIGINAL_JOB_ONLY',
  technical_gap_evidence_status:'INDEPENDENTLY_OBSERVED_NOT_YET_FROZEN_REPRODUCED',
  qualification_status:'BUSINESS_VALUE_ASSESSMENT_PENDING',
  generation_authorized:false,
  installation_authorized:false,
  original_job_completed:false,
  production_changed:false,
 });
}
