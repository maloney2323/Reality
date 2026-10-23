// Reality Universe-backed Correction Verifier V1.
// Checks a model *proposed* claim against immutable, scoped Universe policy,
// independently reverified typed evidence, and a distinct external-effect
// receipt. This is a correction acceptance assessor, NEVER a tool permission.
//
// A user asking "send now" is an intention, NOT a signed homeowner scope,
// inspector approval, authenticated owner authorization, or send receipt.
// Verbatim model spans can be extracted by any LLM, but the extraction is
// untrusted. Incomplete extraction NEVER proves the whole answer correct.
import {createHash} from 'node:crypto';
import {validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';

export const UNIVERSE_CORRECTION_VERIFIER_VERSION='reality-universe-correction-verifier-v1.0';
export const UNIVERSE_CORRECTION_POLICY_KIND='CORRECTION_CONSEQUENCE_REQUIREMENT';
const fail=code=>{throw Error(code)};
const text=x=>typeof x==='string'&&x.trim().length>0;
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const iso=x=>text(x)&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const claimKinds=new Set([
 'ACTION_COMMITMENT','OUTCOME_COMPLETED','MATERIAL_FACT',
 'ATTRIBUTED_REPORT','DRAFT_ONLY','DENIAL_OF_ACTION','HYPOTHETICAL',
 'UNCERTAINTY_ADMISSION',
]);
const evidenceKinds=new Set(['INDEPENDENT_PRECONDITION','INDEPENDENT_AUTHORIZATION','INDEPENDENT_EFFECT','INDEPENDENT_SOURCE_REPORT','INDEPENDENT_MATERIAL_STATE']);
const NON_EXECUTION_CAPABILITIES=new Set([
 'GENERAL_ASSISTANCE','DRAFT_ESTIMATE','DRAFT_MESSAGE','CALCULATE_ESTIMATE',
]);
// These are cognition/draft operations, NOT actual connector effects. Unknown
// operations remain unverified; the model cannot grant execution authority
// by calling a send/dispatch operation "general assistance".
function possibleUnexaminedMaterialAssertion(answer,claims){
 if(claims.some(x=>x.claim_kind==='MATERIAL_FACT'))return false;
 return answer.split(/\n|[.!?]\s+/).some(line=>{
  const domain=/\b(?:units?|items?|on[ -]?site|on hand|stock|inventory|hardware|material|quantity|invoice|amount|owed|paid)\b/i.test(line);
  const certainty=/\b(?:definitely|certainly|guaranteed|verified|confirmed|at least|physically present)\b/i.test(line);
  const numerical=/\b\d+(?:\.\d+)?\b/.test(line);
  // A negative admission of missing proof is not evidence of material
  // overconfidence, even if it contains a count or invoice amount.
  const uncertainty=/\b(?:no|not|never|unknown|unverified|uncertain|disputed|conflicting|unreconciled|pending|not yet)\b/i.test(line);
  return domain&&certainty&&numerical&&!uncertainty;
 });
}

const MAX_POLICY=48,MAX_CLAIMS=50,MAX_EVIDENCE=120;
function validateScope(scope){
 if(!scope||!text(scope.continuity_root_id)||!text(scope.worldline_id)||
   !text(scope.owner_user_id)||!text(scope.work_item_id)||!iso(scope.as_of))
   fail('CORRECTION_SCOPE_REQUIRED');
 const keys=['continuity_root_id','worldline_id','owner_user_id','work_item_id'];
 if(keys.some(k=>scope[k].length>256))fail('CORRECTION_SCOPE_BOUNDS');
 return Object.freeze({
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id,
  as_of:iso(scope.as_of),
 });
}
function sourceMatches(entry,scope){
 return entry.continuity_root_id===scope.continuity_root_id&&
  entry.worldline_id===scope.worldline_id&&
  entry.provenance?.owner_user_id===scope.owner_user_id&&
  entry.provenance?.work_item_id===scope.work_item_id&&
  Date.parse(entry.assertion_time)<=Date.parse(scope.as_of)&&
  Date.parse(entry.effective_time)<=Date.parse(scope.as_of);
}
function checkRule(rule){
 if(!rule||!text(rule.operation)||!text(rule.resource)||rule.operation.length>100||
   rule.resource.length>256||!Array.isArray(rule.conditions)||rule.conditions.length<1||
   rule.conditions.length>16)fail('CORRECTION_POLICY_RULE_INVALID');
 for(const c of rule.conditions){
  if(!text(c?.proof_key)||!evidenceKinds.has(c.evidence_kind)||
    !text(c.source_family)||c.proof_key.length>128||
    c.source_family.length>128||!Object.hasOwn(c,'required_value')||
    c.required_value===null||typeof c.required_value==='object'||
    typeof c.required_value==='function'||
    (typeof c.required_value==='number'&&!Number.isFinite(c.required_value)))
   fail('CORRECTION_CONDITION_INVALID');
 }
 return rule;
}
function validEntry(e){
 validateUniverseEntry(e);
 return e;
}
// Source policies must originate from trusted persisted authoritative
// configuration/continuity, not a user message or model-proposed policy.
// A user command can propose a revision, but does not satisfy a required
// third-party approval. This validates provenance, not original account
// authentication: the caller must independently load owner-scope entries.
export function createCorrectionPolicyProjection({trustedScope,policyEntries=[]}={}){
 const scope=validateScope(trustedScope);
 if(!Array.isArray(policyEntries)||policyEntries.length>MAX_POLICY)
  fail('CORRECTION_POLICY_BOUNDS');
 const rules=[],sourceRefs=[],seen=new Set();
 for(const e of policyEntries){
  validEntry(e);
  if(!sourceMatches(e,scope)||e.event_kind!==UNIVERSE_CORRECTION_POLICY_KIND||
    e.provenance?.source!=='reality:verified-policy-record'||
    e.payload?.authority_kind!=='POLICY_REQUIREMENT_NOT_GRANT'||
    e.payload?.execution_authorized!==false)
   fail('CORRECTION_POLICY_UNTRUSTED_OR_OUT_OF_SCOPE');
  if(!text(e.payload?.policy_source_message_ref)||
    !e.evidence_references.includes(e.payload.policy_source_message_ref))
   fail('CORRECTION_POLICY_ORIGIN_MISSING');
  const rule=checkRule(e.payload.rule);
  const k=JSON.stringify([rule.resource,rule.operation]);
  if(seen.has(k))fail('CORRECTION_POLICY_DUPLICATE_REQUIRES_RECONCILIATION');
  seen.add(k);
  rules.push({operation:rule.operation,resource:rule.resource,
   conditions:rule.conditions.map(c=>({...c})),
   policy_entry_id:e.entry_id,policy_entry_hash:e.ledger_entry_hash,
   rule_source_ref:e.payload.policy_source_message_ref});
  sourceRefs.push(e.entry_id);
 }
 const body={
  version:UNIVERSE_CORRECTION_VERIFIER_VERSION,scope,
  rules:rules.sort((a,b)=>(a.resource+a.operation).localeCompare(b.resource+b.operation)),
  policy_entry_refs:sourceRefs.sort(),
  policy_scope:'SIGNED_OWNER_SCOPED_REQUIREMENT_NOT_FACTUAL_APPROVAL',
  authority_granted:false,
 };
 return Object.freeze({...body,policy_receipt_hash:digest(body)});
}
function requireProjection(projection){
 const {policy_receipt_hash,...body}=projection||{};
 if(!text(policy_receipt_hash)||body.version!==UNIVERSE_CORRECTION_VERIFIER_VERSION||
  digest(body)!==policy_receipt_hash||body.authority_granted!==false)
  fail('CORRECTION_POLICY_PROJECTION_TAMPERED');
 const scope=validateScope(body.scope);
 for(const r of body.rules||[])checkRule(r);
 return scope;
}
function validateCandidate(x,answer,scope,sourceRef){
 if(!x||!claimKinds.has(x.claim_kind)||!text(x.source_span)||
   x.source_span.length>1500||!answer.includes(x.source_span)||
   x.model_source_ref!==sourceRef||
   x.continuity_root_id!==scope.continuity_root_id||
   !text(x.resource)||x.resource.length>256||
   !text(x.operation)||x.operation.length>100)
  fail('CORRECTION_MODEL_CLAIM_UNTRUSTED');
 if(x.claim_kind==='MATERIAL_FACT'&&(!text(x.entity_ref)||!text(x.state_key)||
   !Object.hasOwn(x,'value')||
   (typeof x.value!=='string'&&typeof x.value!=='number'&&typeof x.value!=='boolean')||
   (typeof x.value==='number'&&!Number.isFinite(x.value))))
   fail('CORRECTION_MODEL_FACT_INVALID');
 return x;
}
function proofScopeMatches(p,scope){
 return p.continuity_root_id===scope.continuity_root_id&&
  p.worldline_id===scope.worldline_id&&
  p.owner_user_id===scope.owner_user_id&&
  p.work_item_id===scope.work_item_id;
}
function matchesCondition(p,c,claim){
 return p.evidence_kind===c.evidence_kind&&
  p.proof_key===c.proof_key&&p.source_family===c.source_family&&
  same(p.value,c.required_value)&&
  p.resource===claim.resource&&p.operation===claim.operation;
}
function typedFactProof(p,claim){
 return p.evidence_kind==='INDEPENDENT_MATERIAL_STATE'&&
  p.resource===claim.resource&&p.proof_key===claim.state_key&&
  same(p.value,claim.value);
}
// Independent verifier is trusted SERVER code. A browser/model cannot create
// authoritative proof by saying verified:true in its submitted JSON.
// Each record must be independently re-read or validated by verifier.verify.
// Verification outcome is bounded to exact proof, principal and scope.
async function verifySourceProofs({scope,independentEvidenceVerifier,evidenceEntries}){
 if(!independentEvidenceVerifier||
   typeof independentEvidenceVerifier.verify!=='function')
   fail('CORRECTION_INDEPENDENT_SOURCE_VERIFIER_REQUIRED');
 const admitted=[];
 for(const entry of evidenceEntries){
  validEntry(entry);
  if(entry.event_kind!=='CORRECTION_INDEPENDENT_EVIDENCE'||
   !sourceMatches(entry,scope)||entry.provenance?.source!=='reality:independent-evidence-admission'||
   entry.payload?.assertion_type!=='SOURCE_RECORDED_NOT_ABSOLUTE_TRUTH'||
   !text(entry.payload?.verification_ref)||
   !entry.evidence_references.includes(entry.payload.verification_ref))
   fail('CORRECTION_INDEPENDENT_PROOF_OUT_OF_SCOPE');
  const p=entry.payload.proof;
  if(!p||!evidenceKinds.has(p.evidence_kind)||
   !text(p.proof_key)||!text(p.source_family)||!text(p.resource)||
   !text(p.operation)||!Object.hasOwn(p,'value')||
   !proofScopeMatches(p,scope))fail('CORRECTION_PROOF_SHAPE_INVALID');
  const verdict=await independentEvidenceVerifier.verify({
   entry,scope,proof:p,claimedReceiptRef:entry.payload.verification_ref,
  });
  if(verdict?.verified!==true||verdict?.independent!==true||
    verdict?.entry_id!==entry.entry_id||
    verdict?.entry_hash!==entry.ledger_entry_hash||
    verdict?.verification_ref!==entry.payload.verification_ref||
    verdict?.continuity_root_id!==scope.continuity_root_id||
    verdict?.worldline_id!==scope.worldline_id||
    verdict?.owner_user_id!==scope.owner_user_id||
    verdict?.work_item_id!==scope.work_item_id)
   fail('CORRECTION_PROOF_INDEPENDENT_READBACK_NOT_VERIFIED');
  admitted.push({entry_id:entry.entry_id,ledger_entry_hash:entry.ledger_entry_hash,
   readback_ref:verdict.verification_ref,...p});
 }
 return admitted;
}
function finding(kind,claim,ref,why){
 return Object.freeze({
  issue_id:'correction:'+digest([kind,claim.model_source_ref,claim.source_span,ref]).slice(7,39),
  classification:kind,
  model_source_ref:claim.model_source_ref,
  observed_answer_span:claim.source_span,
  proof_refs:ref,reason:why,external_action_authorized:false,
 });
}
// Safe to call with zero proposed claims, but absence of extraction means
// UNKNOWN coverage, never "100% correct." For a specific candidate correction,
// a model-supplied "PASS" cannot override a policy record or a missing receipt.
export async function verifyCandidateCorrectionAgainstUniverse({
 policyProjection,modelAnswer,modelSourceRef,
 proposedClaims=[],evidenceEntries=[],independentEvidenceVerifier,
}={}){
 const scope=requireProjection(policyProjection);
 if(typeof modelAnswer!=='string'||!text(modelSourceRef)||
  !Array.isArray(proposedClaims)||proposedClaims.length>MAX_CLAIMS||
  !Array.isArray(evidenceEntries)||evidenceEntries.length>MAX_EVIDENCE)
  fail('CORRECTION_EVALUATION_INPUTS_INVALID');
 const claims=proposedClaims.map(x=>validateCandidate(x,modelAnswer,scope,modelSourceRef));
 const proofs=await verifySourceProofs({scope,independentEvidenceVerifier,evidenceEntries});
 const findings=[],assessments=[];
 for(const claim of claims){
  const action=['ACTION_COMMITMENT','OUTCOME_COMPLETED'].includes(claim.claim_kind);
  const factual=claim.claim_kind==='MATERIAL_FACT';
  const policy=policyProjection.rules.find(r=>
   r.resource===claim.resource&&r.operation===claim.operation);
  let status='NON_EXECUTION_INTELLIGENCE_PRESERVED';
  const refs=[];
  if(action){
   if(!policy&&NON_EXECUTION_CAPABILITIES.has(claim.operation)){
    status='NON_EXECUTION_ASSISTANCE_NOT_AN_ACTION_GATE';
   }else if(!policy){
    status='NO_ATTESTED_POLICY_FOR_MATERIAL_ACTION';
    findings.push(finding('UNVERIFIED_MATERIAL_ACTION_AUTHORITY',claim,[],
     'No independently sourced, scoped policy is available'));
   }else{
    const missing=[];
    for(const c of policy.conditions){
     const eligible=proofs.filter(p=>matchesCondition(p,c,claim));
     if(eligible.length)refs.push(...eligible.map(p=>p.entry_id));
     else missing.push(c.proof_key);
    }
    if(missing.length){
     status='ACTION_PRECONDITIONS_NOT_VERIFIED';
     findings.push(finding('UNVERIFIED_ACTION_PRECONDITION',claim,
       [policy.policy_entry_id,...refs],
       'Missing independently read-back preconditions: '+missing.join(', ')));
    }else status='SCOPE_MATCHED_EVIDENCE_NOT_EXECUTION_PERMISSION';
   }
   // Even approval does not prove that an external effect happened.
   if(claim.claim_kind==='OUTCOME_COMPLETED'&&
    !proofs.some(p=>p.evidence_kind==='INDEPENDENT_EFFECT'&&
      p.operation===claim.operation&&p.resource===claim.resource)){
    findings.push(finding('UNVERIFIED_EXECUTION_CLAIM',claim,refs,
      'No separately verified execution or delivery effect readback'));
    status='OUTCOME_NOT_INDEPENDENTLY_VERIFIED';
   }
  }else if(factual){
   const eligible=proofs.filter(p=>typedFactProof(p,claim));
   const competing=proofs.filter(p=>['INDEPENDENT_MATERIAL_STATE','INDEPENDENT_SOURCE_REPORT'].includes(p.evidence_kind)&&
     p.resource===claim.resource&&p.proof_key===claim.state_key);
   refs.push(...competing.map(p=>p.entry_id));
   if(!eligible.length){
    status=competing.length?'SOURCE_REPORT_NOT_INDEPENDENT_STATE_PROOF':'MATERIAL_FACT_NOT_GROUNDED';
    findings.push(finding('UNVERIFIED_MATERIAL_FACT',claim,refs,
      'No exact independently read-back typed factual source'));
   }else if(competing.some(p=>!same(p.value,claim.value))){
    status='CONFLICTING_SOURCE_FACTS';
    findings.push(finding('CONTESTED_SOURCE_REFERENCE',claim,refs,
      'Different independently observed values remain unreconciled'));
   }else status='SOURCE_MATCH_NOT_ABSOLUTE_TRUTH';
  }
  assessments.push({source_span:claim.source_span,claim_kind:claim.claim_kind,
   resource:claim.resource,operation:claim.operation,status,
   admitted_proof_refs:refs,action_authorized:false,external_effect_executed:false});
 }
 const actionCount=claims.filter(c=>['ACTION_COMMITMENT','OUTCOME_COMPLETED'].includes(c.claim_kind)).length;
 const coverage=claims.length?'PROPOSED_TYPED_SPANS_ONLY':
  'NO_STRUCTURED_MODEL_CLAIMS_NOT_ASSESSED';
 const potentialExtractionGap=possibleUnexaminedMaterialAssertion(modelAnswer,claims);
 const body={
  version:UNIVERSE_CORRECTION_VERIFIER_VERSION,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  model_source_ref:modelSourceRef,model_answer_hash:digest(modelAnswer),
  policy_receipt_hash:policyProjection.policy_receipt_hash,
  admitted_independent_proofs:proofs.map(p=>p.entry_id),
  assessed_typed_claim_count:claims.length,assessed_material_action_count:actionCount,
  coverage,assessments,findings,
  possible_unexamined_material_assertion:potentialExtractionGap,
  coverage_gap_status:potentialExtractionGap?'CANDIDATE_MISSING_TYPED_FACT':'NO_CERTAINTY_TRIGGER_OR_TYPED_FACT_PRESENT',
  result:findings.length?'CORRECTION_REJECTED_ON_EVIDENCE':
   claims.length?'NO_CONTRADICTION_IN_ASSESSED_CLAIMS':'INSUFFICIENT_EXTRACTION',
  autonomous_publication_authorized:false,external_action_authorized:false,
  independent_semantic_completeness_verified:false,
  underlying_llm_intelligence_restricted:false,
  live_execution_effect_performed:false,
 };
 return Object.freeze({...body,evaluation_receipt_hash:digest(body)});
}
