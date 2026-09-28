import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const OPERATING_POINT_DEBT_VERSION = 'reality-operating-point-epistemic-debt-v0.1';
export const OPERATING_POINT_AUTHORITY = 'GOVERNED_OPERATING_MODE_ONLY';
export const EPISTEMIC_DEBT_AUTHORITY = 'UNRESOLVED_EPISTEMIC_OBLIGATION_ONLY';

export const IntelligencePolicy = Object.freeze({ STANDARD:'STANDARD', HIGH:'HIGH', MAXIMUM:'MAXIMUM' });
export const GovernancePolicy = Object.freeze({ STANDARD:'STANDARD', STRICT:'STRICT' });
export const AutonomyPolicy = Object.freeze({ ADVISORY:'ADVISORY', BOUNDED:'BOUNDED', CONSEQUENT_REVIEW:'CONSEQUENT_REVIEW' });
export const DebtStatus = Object.freeze({ OPEN:'OPEN', RESOLVED:'RESOLVED', SUPERSEDED:'SUPERSEDED' });

export const EPISTEMIC_GOVERNANCE_FLOOR = Object.freeze({
  evidence_before_establishment:true,
  contradictions_preserved:true,
  uncertainty_preserved:true,
  authority_separate_from_truth:true,
  authorization_separate_from_proposal:true,
  execution_separate_from_verification:true,
  no_authority_from_intelligence_setting:true,
  no_authority_from_layer_handoff:true,
  no_caller_supplied_identity:true,
  canonical_digest_required:true,
});

const sets = {
  intelligence:new Set(Object.values(IntelligencePolicy)),
  governance:new Set(Object.values(GovernancePolicy)),
  autonomy:new Set(Object.values(AutonomyPolicy)),
  debt:new Set(Object.values(DebtStatus)),
};

function fail(message){ throw new Error('Reality operating point invalid: '+message); }
function nonEmpty(v){ return typeof v==='string' && v.trim().length>0; }
function iso(v,field){ if(!nonEmpty(v)||!Number.isFinite(Date.parse(v))) fail(field+' must be a valid timestamp'); return new Date(v).toISOString(); }
function list(v,field,max=64){
  if(!Array.isArray(v)) fail(field+' must be an array');
  const out=[...new Set(v.filter(nonEmpty).map(x=>x.trim()))];
  if(out.length>max) fail(field+' exceeds maximum size');
  return out;
}
function deepFreeze(v,seen=new Set()){
  if(!v||typeof v!=='object'||seen.has(v)) return v;
  seen.add(v); for(const k of Object.keys(v)) deepFreeze(v[k],seen); return Object.freeze(v);
}
function clone(v){
  if(v===undefined||v===null||typeof v!=='object') return v??null;
  if(Array.isArray(v)) return v.map(clone);
  const out={}; for(const k of Object.keys(v)) out[k]=clone(v[k]); return out;
}
function validateFloor(floor){
  if(!floor||typeof floor!=='object'||Array.isArray(floor)) fail('governance_floor required');
  for(const [k,required] of Object.entries(EPISTEMIC_GOVERNANCE_FLOOR)){
    if(floor[k]!==required) fail('governance floor may not be weakened: '+k);
  }
}

export function normalizeOperatingPoint(input={}){
  const { intelligence_policy, governance_policy, autonomy_policy }=input;
  if(!sets.intelligence.has(intelligence_policy)) fail('invalid intelligence_policy');
  if(!sets.governance.has(governance_policy)) fail('invalid governance_policy');
  if(!sets.autonomy.has(autonomy_policy)) fail('invalid autonomy_policy');
  if(autonomy_policy===AutonomyPolicy.CONSEQUENT_REVIEW && governance_policy!==GovernancePolicy.STRICT) fail('CONSEQUENT_REVIEW requires STRICT governance');
  validateFloor(input.governance_floor||EPISTEMIC_GOVERNANCE_FLOOR);
  if(!nonEmpty(input.actor_identity)) fail('actor_identity required');
  if(!nonEmpty(input.key_reference)) fail('key_reference required');
  if(Object.keys(input).some(k=>/private|secret/i.test(k))) fail('raw key material is forbidden');
  return deepFreeze({
    schema_version:OPERATING_POINT_DEBT_VERSION,
    authority:OPERATING_POINT_AUTHORITY,
    intelligence_policy, governance_policy, autonomy_policy,
    governance_floor:{...EPISTEMIC_GOVERNANCE_FLOOR},
    actor_identity:input.actor_identity.trim(),
    key_reference:input.key_reference.trim(),
    policy_version:nonEmpty(input.policy_version)?input.policy_version.trim():'reality-operating-policy-v0.1',
    effective_at:iso(input.effective_at||new Date().toISOString(),'effective_at'),
    reason_ref:nonEmpty(input.reason_ref)?input.reason_ref.trim():null,
    canonical_digest:null,
  });
}

export async function buildOperatingPoint(input={}){
  const normalized=normalizeOperatingPoint(input);
  const {canonical_digest:_ignored,...body}=normalized;
  return deepFreeze({...body,canonical_digest:await sha256Hex(canonicalJson(body))});
}

export async function verifyOperatingPoint(point={}){
  try{
    if(point.schema_version!==OPERATING_POINT_DEBT_VERSION||point.authority!==OPERATING_POINT_AUTHORITY||!nonEmpty(point.canonical_digest)) return false;
    validateFloor(point.governance_floor);
    const {canonical_digest,...body}=point;
    return (await sha256Hex(canonicalJson(body)))===canonical_digest;
  }catch{return false;}
}

export function buildOperatingPointTransition({previous_point,next_point,transition_id,reason_ref=null}={}){
  if(!previous_point||!next_point||!nonEmpty(transition_id)) fail('previous_point, next_point, and transition_id required');
  validateFloor(next_point.governance_floor); validateFloor(previous_point.governance_floor);
  if(canonicalJson(previous_point.governance_floor)!==canonicalJson(next_point.governance_floor)) fail('governance floor cannot change');
  return deepFreeze({
    transition_id:transition_id.trim(), transition_type:'OPERATING_POINT_CHANGED',
    previous_operating_point_digest:previous_point.canonical_digest,
    resulting_operating_point_digest:next_point.canonical_digest,
    reason_ref:reason_ref||next_point.reason_ref||null,
    actor_identity:next_point.actor_identity, key_reference:next_point.key_reference,
    action_authorized:false, governance_change_authorized:false,
    implementation_authorized:false, code_write_authorized:false,
  });
}

export function normalizeEpistemicDebt(input={}){
  if(!nonEmpty(input.debt_id)||!nonEmpty(input.unresolved_uncertainty)||!nonEmpty(input.tolerated_risk)) fail('debt_id, unresolved_uncertainty, and tolerated_risk are required');
  const status=input.status||DebtStatus.OPEN;
  if(!sets.debt.has(status)) fail('invalid debt status');
  const origin_refs=list(input.origin_refs||[],'origin_refs');
  const evidence_required_to_retire=list(input.evidence_required_to_retire||[],'evidence_required_to_retire');
  const resolution_evidence_refs=list(input.resolution_evidence_refs||[],'resolution_evidence_refs');
  if(status===DebtStatus.RESOLVED&&resolution_evidence_refs.length===0) fail('RESOLVED debt requires resolution evidence');
  if(status===DebtStatus.OPEN&&resolution_evidence_refs.length>0) fail('OPEN debt cannot contain resolution evidence');
  return deepFreeze({
    schema_version:OPERATING_POINT_DEBT_VERSION, authority:EPISTEMIC_DEBT_AUTHORITY,
    debt_id:input.debt_id.trim(), status,
    unresolved_uncertainty:input.unresolved_uncertainty.trim(),
    tolerated_risk:input.tolerated_risk.trim(), origin_refs, evidence_required_to_retire,
    resolution_evidence_refs,
    linked_decision_ids:list(input.linked_decision_ids||[],'linked_decision_ids'),
    linked_premise_ids:list(input.linked_premise_ids||[],'linked_premise_ids'),
    created_at:iso(input.created_at||new Date().toISOString(),'created_at'),
    actor_identity:nonEmpty(input.actor_identity)?input.actor_identity.trim():null,
    key_reference:nonEmpty(input.key_reference)?input.key_reference.trim():null,
    establishes_truth:false, action_authorized:false, implementation_authorized:false,
    code_write_authorized:false, canonical_digest:null,
  });
}

export async function buildEpistemicDebt(input={}){
  const normalized=normalizeEpistemicDebt(input);
  const {canonical_digest:_ignored,...body}=normalized;
  return deepFreeze({...body,canonical_digest:await sha256Hex(canonicalJson(body))});
}

export async function verifyEpistemicDebt(debt={}){
  try{
    if(debt.schema_version!==OPERATING_POINT_DEBT_VERSION||debt.authority!==EPISTEMIC_DEBT_AUTHORITY||!nonEmpty(debt.canonical_digest)) return false;
    const {canonical_digest,...body}=debt;
    return (await sha256Hex(canonicalJson(body)))===canonical_digest;
  }catch{return false;}
}

export function retireEpistemicDebt({debt,resolution_evidence_refs=[],resolved_at,resolver_identity,resolver_key_reference}={}){
  if(!debt||debt.status!==DebtStatus.OPEN) fail('only OPEN debt may be retired');
  const refs=list(resolution_evidence_refs,'resolution_evidence_refs');
  if(!refs.length||!nonEmpty(resolved_at)||!Number.isFinite(Date.parse(resolved_at))) fail('retirement requires resolution evidence and resolved_at');
  if(!nonEmpty(resolver_identity)||!nonEmpty(resolver_key_reference)) fail('resolver identity and key reference required');
  return {...clone(debt),status:DebtStatus.RESOLVED,resolution_evidence_refs:refs,
    resolved_at:new Date(resolved_at).toISOString(),actor_identity:resolver_identity.trim(),
    key_reference:resolver_key_reference.trim(),establishes_truth:false,
    action_authorized:false,implementation_authorized:false,code_write_authorized:false,canonical_digest:null};
}

export async function finalizeRetiredDebt(input){
  const retired=retireEpistemicDebt(input); const {canonical_digest:_ignored,...body}=retired;
  return deepFreeze({...body,canonical_digest:await sha256Hex(canonicalJson(body))});
}