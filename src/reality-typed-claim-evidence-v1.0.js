// Reality V1: generic typed-claim vs owner-scoped attested evidence contract.
// A source readback proves a source record was observed, not that the source is
// truthful. Model-proposed claims remain untrusted; only native evidence judges.
// No domain-specific keys, second LLM judge, or external action authority.
import {createHash} from 'node:crypto';
import {validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {verifyObservationEnvelope,TRUSTED_OBSERVATION_ADMISSION_VERSION}
 from './reality-trusted-observation-admission-v0.1.js';

export const TYPED_CLAIM_EVIDENCE_VERSION='reality-typed-claim-evidence-v1.0';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const valueTypes=new Set(['STRING','NUMBER','BOOLEAN']);
const claimKinds=new Set(['FACT','OUTCOME']);
const fail=x=>{throw Error(x)};
const str=x=>String(x||'');
function plainValue(value,type){
 if(type==='NUMBER')return typeof value==='number'&&Number.isFinite(value)
   ?value:null;
 if(type==='BOOLEAN')return typeof value==='boolean'?value:null;
 return typeof value==='string'&&value.length<=512?value:null;
}
function typedKey(entity,key){return JSON.stringify([entity,key]);}
function statementEvidence(c,scope,answer){
 if(!c||typeof c!=='object'||!['FACT','OUTCOME'].includes(c.claim_kind)||
    !nonempty(c.entity_ref)||!nonempty(c.state_key)||!nonempty(c.source_span)||
    c.source_span.length>1200||!answer.includes(c.source_span)||
    !valueTypes.has(c.value_type)||plainValue(c.value,c.value_type)===null)
   fail('TYPED_CLAIM_PROPOSAL_INVALID');
 if(c.continuity_root_id!==scope.continuityRootId||
    c.model_source_ref!==scope.modelSourceRef)fail('TYPED_CLAIM_MODEL_SCOPE_MISMATCH');
 return {entity:c.entity_ref,key:c.state_key,kind:c.claim_kind,
  type:c.value_type,value:c.value,source_span:c.source_span};
}
function sourceRows(entries,root,world,asOf){
 const admitted=new Map();let excluded=0;
 for(const row of entries){
  if(row?.event_kind!=='SOURCE_OBSERVATION')continue;
  if(row.continuity_root_id!==root||row.worldline_id!==world ||
     row.provenance?.source!==TRUSTED_OBSERVATION_ADMISSION_VERSION){
   excluded++;continue;
  }
  // Hash errors and invalid envelopes fail closed: neither gets silently
  // rewritten into a supposedly trustworthy source record.
  try{validateUniverseEntry(row);}catch{excluded++;continue;}
  const o=row.payload?.observation,a=row.payload?.source_attestation;
  if(a?.independently_source_read!==true||
     !nonempty(a.verification_ref)||
     !row.evidence_references.includes(a.verification_ref)||
     a.observation_hash!==o?.observation_hash ||
     !Number.isFinite(Date.parse(o?.event_time))||
     !Number.isFinite(Date.parse(o?.observed_at))||
     !Number.isFinite(Date.parse(row.assertion_time))||
     Date.parse(o.observed_at)>asOf||Date.parse(row.assertion_time)>asOf||
     Date.parse(o.event_time)>asOf){
    excluded++;continue;
  }
  try{verifyObservationEnvelope(o,{continuityRootId:root});}
  catch{excluded++;continue;}
  const entityRefs=Array.isArray(o.object_refs)?o.object_refs:[];
  if(entityRefs.length!==1||!nonempty(entityRefs[0])){
   excluded++;continue; // no joining unrelated entities
  }
  const claims=o.content_or_metadata?.epistemic_claims;
  if(!Array.isArray(claims)){excluded++;continue;}
  for(const claim of claims){
   if(!nonempty(claim?.target_state_key)||!Object.hasOwn(claim,'value')||
      !['FACT','OUTCOME'].includes(claim.claim_kind))continue;
   const k=typedKey(entityRefs[0],claim.target_state_key);
   const refs=admitted.get(k)||[];
   refs.push({claim,entry_id:row.entry_id,entry_hash:row.ledger_entry_hash,
    observation_id:o.observation_id,observation_hash:o.observation_hash,
    event_time:o.event_time,verified_readback:a.verification_ref,
    effective_at:row.effective_time});
   admitted.set(k,refs);
  }
 }
 return {admitted,excluded};
}
function newFinding({classification,c,refs,reason,modelSourceRef}){
 const basis={classification,entity:c.entity,key:c.key,value:c.value,
   span:c.source_span,source_refs:refs};
 return {
  issue_id:'typed-evidence:'+sha(basis).slice(7,39),
  classification,origin_stage:'COGNITION',
  detection_source:'TYPED_ATTESTED_SOURCE_COMPARISON',
  source_receipt_refs:[modelSourceRef,...refs],
  excerpt:c.source_span.slice(0,240),reason,
  independently_adjudicated:false,
  verified_hallucination:false,external_action_authorized:false,
 };
}
export function compareTypedClaimsToUniverse({
 proposedClaims=[],ledgerEntries=[],continuityRootId,worldlineId='reality:primary',
 modelSourceRef,modelAnswer,asOf=null,
}={}){
 if(!Array.isArray(proposedClaims)||proposedClaims.length>40||
    !Array.isArray(ledgerEntries)||ledgerEntries.length>250)
   fail('TYPED_EVIDENCE_BOUNDS_INVALID');
 if(!nonempty(continuityRootId)||!nonempty(worldlineId)||
    !nonempty(modelSourceRef)||typeof modelAnswer!=='string')
   fail('TYPED_EVIDENCE_SCOPE_REQUIRED');
 if(!proposedClaims.length){
  const basis={version:TYPED_CLAIM_EVIDENCE_VERSION,status:'NOT_EVALUATED',
   coverage:'NO_TYPED_MODEL_CLAIMS_SUPPLIED',proposed_claim_count:0,
   compared_claim_count:0,unsupported_claim_count:0,source_excluded_count:0,
   findings:[],assessments:[],truth_established:false,
   execution_authorized:false};
  return Object.freeze({...basis,evidence_receipt_hash:sha(basis)});
 }
 if(!nonempty(asOf)||!Number.isFinite(Date.parse(asOf)))
   fail('TYPED_EVIDENCE_AS_OF_REQUIRED');
 const scope={continuityRootId,modelSourceRef};
 const claims=proposedClaims.map(c=>statementEvidence(c,scope,modelAnswer));
 const {admitted,excluded}=sourceRows(ledgerEntries,continuityRootId,
  worldlineId,Date.parse(asOf));
 const findings=[],assessments=[];
 for(const c of claims){
  const refs=admitted.get(typedKey(c.entity,c.key))||[];
  const eligible=refs.filter(r=>r.claim.claim_kind===c.kind&&
    plainValue(r.claim.value,c.type)!==null);
  const sources=[...new Set(eligible.map(r=>r.entry_id))];
  const observedValues=new Set(eligible.map(r=>
    JSON.stringify(canonical(r.claim.value))));
  let status;
  if(c.kind==='OUTCOME'){
   // Source metadata can *claim* independent verification but cannot grant
   // execution truth. A distinct external effect readback must be checked by
   // the governed execution/outcome layer; this module deliberately has no
   // such authority. Hence ALL completed-action claims remain unresolved.
   status='OUTCOME_REQUIRES_SEPARATE_EFFECT_READBACK';
   findings.push(newFinding({classification:'UNVERIFIED_EXECUTION_CLAIM',
      c,refs:sources,modelSourceRef,
      reason:'A source record is not independently verified execution or delivery'}));
  } else if(!eligible.length){
   status='UNKNOWN_NO_ATTESTED_SOURCE'; // do not call unknown a hallucination
  } else if(observedValues.size>1){
   status='CONTESTED_ATTESTED_SOURCES';
   findings.push(newFinding({classification:'CONTESTED_SOURCE_REFERENCE',
    c,refs:sources,modelSourceRef,
    reason:'Two or more attested source records disagree on a typed claim'}));
  } else if(eligible[0].claim.value!==c.value){
   status='MODEL_SOURCE_VALUE_MISMATCH';
   findings.push(newFinding({classification:'POTENTIAL_MATERIAL_DRIFT',
    c,refs:sources,modelSourceRef,
    reason:'Typed model assertion does not match the attested source record'}));
  } else status='SOURCE_VALUE_MATCH_NOT_TRUTH_PROOF';
  assessments.push({
   entity_ref:c.entity,state_key:c.key,claim_kind:c.kind,
   source_span:c.source_span.slice(0,240),status,
   source_entry_refs:sources,source_count:sources.length,
   value_disclosed:false,truth_established:false,
  });
 }
 const basis={version:TYPED_CLAIM_EVIDENCE_VERSION,
  status:findings.length?'REVIEW_REQUIRED':'BOUNDED_CHECK_COMPLETE',
  coverage:'TYPED_ASSERTIONS_ONLY_NOT_GENERAL_SEMANTIC_EXTRACTION',
  proposed_claim_count:claims.length,compared_claim_count:assessments.filter(
   a=>a.status!=='UNKNOWN_NO_ATTESTED_SOURCE').length,
  unsupported_claim_count:assessments.filter(
   a=>a.status==='UNKNOWN_NO_ATTESTED_SOURCE').length,
  source_excluded_count:excluded,findings,assessments,
  truth_established:false,execution_authorized:false,
 };
 return Object.freeze({...basis,evidence_receipt_hash:sha(basis)});
}
