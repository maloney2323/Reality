// Reality Universe Material Claim Coverage Contract V1.
// Verifies specific asserted claims in the complete *answer body*, not only
// the final operational decision. No phrase matcher or LLM extraction alone
// establishes complete coverage, evidence authenticity, or human authority.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry}
 from './reality-universe-persistence-contract-v1.0.js';

export const MATERIAL_CLAIM_VERIFIER_VERSION='reality-material-claim-verifier-v1.0';
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const fail=x=>{throw Error(x)};
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const date=x=>{
 if(!nonempty(x)||!Number.isFinite(Date.parse(x)))fail('MATERIAL_INVALID_TIME');
 return new Date(x).toISOString();
};
const sameScope=(a,s)=>a?.continuity_root_id===s.continuity_root_id&&
 a?.worldline_id===s.worldline_id&&
 a?.provenance?.owner_user_id===s.owner_user_id&&
 a?.provenance?.work_item_id===s.work_item_id;
const sourceKinds=new Set(['MATERIAL_EVIDENCE_ASSERTED','MATERIAL_EVIDENCE_REVOKED']);
const key=x=>JSON.stringify([x.subject_ref,x.state_key]);
function scopeOf(s){
 if(!s||!nonempty(s.continuity_root_id)||!nonempty(s.worldline_id)||
  !nonempty(s.owner_user_id)||!nonempty(s.work_item_id)||
  !s.as_of)fail('MATERIAL_SCOPE_REQUIRED');
 return {continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
  owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
  as_of:date(s.as_of)};
}
// Evidence event constructors create integrity-protected assertions. Their
// hashes alone do NOT authenticate the contents or the attributed issuer.
// This distinction is enforced by the external independent attestor below.
export function createMaterialEvidenceEvent({
 scope,entryId,subjectRef,stateKey,value,effectiveAt,knownAt,sourceRef,
}={}){
 const s=scopeOf(scope);
 if(![entryId,subjectRef,stateKey,sourceRef].every(nonempty)||
  !['string','number','boolean'].includes(typeof value)||
  (typeof value==='number'&&!Number.isFinite(value)))
  fail('MATERIAL_EVIDENCE_FIELDS_REQUIRED');
 return createUniverseEntry({
  entry_id:entryId,continuity_root_id:s.continuity_root_id,
  worldline_id:s.worldline_id,
  event_kind:'MATERIAL_EVIDENCE_ASSERTED',epistemic_kind:'ATTRIBUTED_REPORT',
  assertion_time:date(knownAt),effective_time:date(effectiveAt),
  source_ref:sourceRef,
  payload:{subject_ref:subjectRef,state_key:stateKey,
   asserted_value:value,
   source_authenticated_by_ledger:false,
   grants_execution_authority:false},
  evidence_references:[sourceRef],
  provenance:{source:MATERIAL_CLAIM_VERIFIER_VERSION,
   owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
   authority:'NONE'},
 });
}
export function createMaterialRevocationEvent({
 scope,entryId,subjectRef,targetEntryId,effectiveAt,knownAt,sourceRef,reason,
}={}){
 const s=scopeOf(scope);
 if(![entryId,subjectRef,targetEntryId,sourceRef,reason].every(nonempty))
  fail('MATERIAL_REVOCATION_FIELDS_REQUIRED');
 return createUniverseEntry({
  entry_id:entryId,continuity_root_id:s.continuity_root_id,
  worldline_id:s.worldline_id,
  event_kind:'MATERIAL_EVIDENCE_REVOKED',epistemic_kind:'OBSERVATION',
  assertion_time:date(knownAt),effective_time:date(effectiveAt),
  source_ref:sourceRef,
  payload:{subject_ref:subjectRef,target_entry_id:targetEntryId,
   reason,grants_execution_authority:false},
  evidence_references:[targetEntryId,sourceRef],
  provenance:{source:MATERIAL_CLAIM_VERIFIER_VERSION,
   owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
   authority:'NONE'},
 });
}
async function attest(e,attestor,s){
 const proof=await attestor({
  evidence_entry:e,expected_entry_hash:e.ledger_entry_hash,
  scope:s,subject_ref:e.payload?.subject_ref,
 });
 // Even a "verified=true" model-provided statement is not sufficient unless
 // the external verifier returned the EXACT referenced entry/hash and source.
 // A caller must wire this to an independently authenticated issuer adapter.
 return proof?.verified===true&&
  proof?.authenticated_entry_id===e.entry_id&&
  proof?.authenticated_entry_hash===e.ledger_entry_hash&&
  proof?.authenticated_source_ref===e.source_ref&&
  nonempty(proof?.attestation_receipt_id);
}
// Bitemporal, job-specific state resolution. Conflicting equally effective
// records remain contested rather than silently choosing latest assertion.
// A source's delayed revocation only applies once it became known.
export async function resolveMaterialEvidence({
 entries,scope,subjectRef,stateKey,validAt,knownAt,
 independentSourceAttestor,
}={}){
 const s=scopeOf(scope),v=Date.parse(date(validAt)),
  k=Date.parse(date(knownAt));
 if(!Array.isArray(entries)||entries.length>5000||
  !nonempty(subjectRef)||!nonempty(stateKey)||
  typeof independentSourceAttestor!=='function')
  fail('MATERIAL_EVIDENCE_RESOLVER_INPUT_REQUIRED');
 const matching=[],revocations=[],unverified=[];
 for(const e of entries){
  validateUniverseEntry(e);
  if(!sourceKinds.has(e.event_kind)||!sameScope(e,s)||
   e.payload?.subject_ref!==subjectRef||
   (e.event_kind==='MATERIAL_EVIDENCE_ASSERTED'&&
    e.payload?.state_key!==stateKey))
   continue;
  if(Date.parse(e.effective_time)>v||Date.parse(e.assertion_time)>k)
   continue;
  if(!await attest(e,independentSourceAttestor,s)){
   unverified.push(e.entry_id);continue;
  }
  if(e.event_kind==='MATERIAL_EVIDENCE_REVOKED')
   revocations.push(e);
  else matching.push(e);
 }
 const targetIds=new Set(matching.map(e=>e.entry_id));
 const revokedIds=new Set();
 for(const r of revocations)
  if(targetIds.has(r.payload.target_entry_id))revokedIds.add(r.payload.target_entry_id);
 const active=matching.filter(e=>!revokedIds.has(e.entry_id));
 const snapshot={subject_ref:subjectRef,state_key:stateKey,
  valid_at:date(validAt),known_at:date(knownAt),
  revoked_entry_ids:[...revokedIds].sort(),
  unverified_source_entries:unverified.sort(),
  unauthorized_effects_allowed:false};
 if(!active.length)return Object.freeze({...snapshot,
  status:'NO_CURRENT_ATTESTED_EVIDENCE',known_value:null,
  source_receipt_ids:[],candidate_values:[]});
 const latestValid=Math.max(...active.map(e=>Date.parse(e.effective_time)));
 const contenders=active.filter(e=>Date.parse(e.effective_time)===latestValid);
 const values=[...new Set(contenders.map(e=>JSON.stringify(e.payload.asserted_value)))];
 const sourceReceipts=contenders.map(e=>({entry_id:e.entry_id,
  entry_hash:e.ledger_entry_hash,source_ref:e.source_ref})).sort((a,b)=>
  a.entry_id.localeCompare(b.entry_id));
 if(values.length!==1)return Object.freeze({...snapshot,
  status:'CONTESTED_CURRENT_EVIDENCE',known_value:null,
  source_receipt_ids:sourceReceipts,
  candidate_values:values.map(x=>JSON.parse(x))});
 return Object.freeze({...snapshot,status:'ATTESTED_CURRENT_EVIDENCE',
  known_value:JSON.parse(values[0]),
  source_receipt_ids:sourceReceipts,
  candidate_values:[JSON.parse(values[0])],
 });
}
const acts=new Set(['ASSERTED_FACT','ATTRIBUTED_REPORT','HYPOTHETICAL','QUOTED_TEXT']);
export function validateMaterialClaim(claim,modelAnswer){
 if(!claim||!nonempty(claim.claim_id)||!nonempty(claim.subject_ref)||
  !nonempty(claim.state_key)||!nonempty(claim.source_span)||
  !acts.has(claim.speech_act)||!nonempty(modelAnswer)||
  !modelAnswer.includes(claim.source_span)||
  !['string','number','boolean'].includes(typeof claim.asserted_value)||
  (typeof claim.asserted_value==='number'&&!Number.isFinite(claim.asserted_value)))
  fail('MATERIAL_CLAIM_MALFORMED_OR_UNGROUNDED');
 // Quoted/attributed text is *not* a declaration of authenticated truth.
 // Truth status is checked only for the assistant's own asserted facts.
 return claim;
}
export async function evaluateMaterialClaimCoverage({
 scope,modelAnswer,modelResponseId,claims=[],
 independentSourceAttestor,entries=[],validAt,knownAt,
 independentCoverageAttestor=null,consequential=false,
}={}){
 const s=scopeOf(scope);
 if(!nonempty(modelAnswer)||!nonempty(modelResponseId)||
  !Array.isArray(claims)||claims.length>200||
  typeof independentSourceAttestor!=='function')
  fail('MATERIAL_CLAIM_EVALUATION_INPUT_REQUIRED');
 const seenIds=new Set(),findings=[],assessments=[],statuses=new Map();
 for(const claim of claims){
  validateMaterialClaim(claim,modelAnswer);
  if(seenIds.has(claim.claim_id))fail('MATERIAL_DUPLICATE_CLAIM_ID');
  seenIds.add(claim.claim_id);
  if(claim.speech_act!=='ASSERTED_FACT'){
   assessments.push({claim_id:claim.claim_id,
    status:'NON_ASSERTED_MATERIAL_NOT_PROMOTED_TO_FACT',
    source_span:claim.source_span});
   continue;
  }
  const k=key(claim);
  if(!statuses.has(k))statuses.set(k,await resolveMaterialEvidence({
   entries,scope:s,subjectRef:claim.subject_ref,stateKey:claim.state_key,
   validAt,knownAt,independentSourceAttestor,
  }));
  const source=statuses.get(k);
  const status=source.status!=='ATTESTED_CURRENT_EVIDENCE'?
   (source.status==='CONTESTED_CURRENT_EVIDENCE'?
    'CONTESTED_NEEDS_REVIEW':'UNSUPPORTED_NEEDS_REVIEW'):
   Object.is(claim.asserted_value,source.known_value)?
    'SUPPORTED_BY_ATTESTED_EVIDENCE':'CONTRADICTS_CURRENT_ATTESTED_EVIDENCE';
  const item={claim_id:claim.claim_id,status,
   subject_ref:claim.subject_ref,state_key:claim.state_key,
   source_span:claim.source_span,
   claimed_value:claim.asserted_value,
   current_attested_value:source.known_value,
   source_receipts:source.source_receipt_ids,
   as_of:{valid_at:date(validAt),known_at:date(knownAt)}};
  assessments.push(item);
  if(status!=='SUPPORTED_BY_ATTESTED_EVIDENCE')findings.push(item);
 }
 const answerHash=digest(modelAnswer),claimHash=digest(claims);
 const auth=typeof independentCoverageAttestor==='function'?
  await independentCoverageAttestor({
   modelResponseId,modelAnswerHash:answerHash,claimsHash:claimHash,
   scope:s,
  }):null;
 const coverageVerified=auth?.independently_audited_complete===true&&
  auth?.model_response_id===modelResponseId&&
  auth?.model_answer_hash===answerHash&&auth?.claims_hash===claimHash&&
  nonempty(auth?.coverage_receipt_id);
 // Even a verified claim subset is NOT a verified complete response. In
 // particular, an extraction model cannot self-attest coverage completeness.
 const contradiction=findings.some(x=>
  x.status==='CONTRADICTS_CURRENT_ATTESTED_EVIDENCE');
 const unresolved=findings.length>0||!coverageVerified;
 const disposition=contradiction?
  'STOP_MATERIAL_CLAIM_PUBLICATION_PENDING_CORRECTION':
  unresolved&&consequential?'WITHHOLD_CONSEQUENTIAL_AUTHORITY_REQUIRE_REVIEW':
  unresolved?'PRESERVE_USEFUL_RESPONSE_WITH_UNVERIFIED_COVERAGE':
  'PASS_MATERIAL_CLAIM_COVERAGE_ONLY';
 const report={
  version:MATERIAL_CLAIM_VERIFIER_VERSION,
  model_response_id:modelResponseId,model_answer_hash:answerHash,
  claims_hash:claimHash,assessed_material_claims:claims.length,
  independently_audited_complete_coverage:coverageVerified,
  independent_full_semantic_truth_proven:false,
  source_attestation_required:true,scope:s,
  valid_at:date(validAt),known_at:date(knownAt),
  findings,assessments,disposition,
  model_answer_original_unchanged:true,
  automatic_correction_authorized:false,
  independent_effect_execution_authority_granted:false,
 };
 return Object.freeze({...report,report_hash:digest(report)});
}
export async function auditAndReceiptMaterialClaims({
 ledger,scope,modelAnswer,modelResponseId,claims,
 entries,validAt,knownAt,independentSourceAttestor,
 independentCoverageAttestor,consequential,
}={}){
 const report=await evaluateMaterialClaimCoverage({
  scope,modelAnswer,modelResponseId,claims,entries,
  validAt,knownAt,independentSourceAttestor,
  independentCoverageAttestor,consequential,
 });
 if(typeof ledger?.append!=='function'||typeof ledger?.read!=='function')
  fail('MATERIAL_LEDGER_REQUIRED');
 const s=scopeOf(scope);
 const receipt=createUniverseEntry({
  entry_id:'material-claim-audit:'+report.report_hash.slice(7,39),
  continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
  event_kind:'MATERIAL_CLAIM_AUDIT',epistemic_kind:'OBSERVATION',
  effective_time:date(validAt),assertion_time:date(knownAt),
  source_ref:'verifier:'+MATERIAL_CLAIM_VERIFIER_VERSION,
  payload:{report,execution_authority_granted:false},
  evidence_references:report.assessments.flatMap(x=>
   (x.source_receipts||[]).map(r=>r.entry_id)),
  provenance:{source:MATERIAL_CLAIM_VERIFIER_VERSION,
   owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
   authority:'NONE'},
 });
 const wrote=await ledger.append(receipt);
 if(!['APPENDED_SANDBOX','PERSISTED','DUPLICATE_IDENTICAL',
  'DUPLICATE_IDENTICAL_CONCURRENT'].includes(wrote?.status))
  fail('MATERIAL_AUDIT_APPEND_FAILED');
 const readback=await ledger.read(receipt.entry_id);
 validateUniverseEntry(readback);
 if(readback.entry_id!==receipt.entry_id||
  readback.ledger_entry_hash!==receipt.ledger_entry_hash)
  fail('MATERIAL_AUDIT_READBACK_MISMATCH');
 return Object.freeze({report,receipt_id:receipt.entry_id,
  receipt_hash:receipt.ledger_entry_hash,
  verified_readback:true,customer_data_mutated:false,
  effect_executed:false});
}
