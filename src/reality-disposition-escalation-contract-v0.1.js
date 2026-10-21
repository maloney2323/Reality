import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

// This is an evidence-bound WORKFLOW DISPOSITION contract. It is not a
// hallucination classifier, general LLM grader, or action authorization.
// The policy signer must be independent of the agent under evaluation.
export const DISPOSITION_CONTRACT_VERSION = 'reality-disposition-escalation-v0.1';
export const CONTROL_FINDINGS = Object.freeze([
  'INTEGRITY_FAILURE',
  'AUTHORITATIVE_CONFLICT_REQUIRES_REVIEW',
  'SECURITY_POLICY_BYPASS',
  'UNRESOLVED_CRITICAL_FINDING',
  'CONTROL_HOLD',
  'MISSING_MANDATORY_EVIDENCE',
  'HISTORY_MUST_BE_PRESERVED',
]);
const DISPOSITIONS = new Set(['ALLOW','BLOCK','REQUEST_EVIDENCE','ESCALATE','BRANCH_HISTORY']);
const ESCALATION = new Set(CONTROL_FINDINGS.slice(0,4));
const VALID_FINDINGS = new Set(CONTROL_FINDINGS);
const str=v=>typeof v==='string'&&v.trim().length>0;
function stable(o){
  if(Array.isArray(o)) return o.map(stable);
  if(o&&typeof o==='object') return Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])]));
  return o;
}
export const dispositionDigest=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');

export function canonicalDispositionPolicyAttestation(a){
  return JSON.stringify({
    version:DISPOSITION_CONTRACT_VERSION,
    decision:'ASSERT_TRUSTED_CONTROL_FINDINGS',
    policy_signer_id:a?.policy_signer_id??null,
    work_item_id:a?.work_item_id??null,
    evidence_digest:a?.evidence_digest??null,
    findings:a?.findings??null,
    policy_version:a?.policy_version??null,
    source_readback_ref:a?.source_readback_ref??null,
    issued_at:a?.issued_at??null,
    expires_at:a?.expires_at??null,
    nonce:a?.nonce??null,
  });
}

export function verifyDispositionPolicyFacts({workItemId,evidence,attestation,trustedPublicKey=null}={}){
  if(!str(workItemId)||!Array.isArray(evidence)||!evidence.length||
    evidence.some(x=>!str(x?.id)||!str(x?.source)||!str(x?.authority)||!str(x?.text)) ||
    new Set(evidence.map(x=>x.id)).size!==evidence.length){
    throw Error('DISPOSITION_ADMITTED_EVIDENCE_REQUIRED');
  }
  if(attestation?.version!==DISPOSITION_CONTRACT_VERSION ||
    attestation.decision!=='ASSERT_TRUSTED_CONTROL_FINDINGS' ||
    attestation.work_item_id!==workItemId ||
    attestation.evidence_digest!==dispositionDigest(evidence) ||
    !str(attestation.policy_signer_id)||!str(attestation.policy_version) ||
    !str(attestation.source_readback_ref)||!str(attestation.nonce) ||
    !Array.isArray(attestation.findings)||
    !attestation.findings.every(x=>VALID_FINDINGS.has(x))||
    new Set(attestation.findings).size!==attestation.findings.length){
    throw Error('DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID');
  }
  const issued=Date.parse(attestation.issued_at),expires=Date.parse(attestation.expires_at),now=Date.now();
  if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>now||
    expires<=now||expires<=issued||expires-issued>86400000){
    throw Error('DISPOSITION_POLICY_ATTESTATION_EXPIRED');
  }
  const key=trustedPublicKey || process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY;
  if(!str(key)||!str(attestation.signature))throw Error('DISPOSITION_TRUSTED_SIGNER_NOT_CONFIGURED');
  let valid=false;
  try{
    const sig=Buffer.from(attestation.signature,'base64');
    valid=sig.length===64&&verifySignature(null,Buffer.from(canonicalDispositionPolicyAttestation(attestation)),
      createPublicKey(key),sig);
  }catch{valid=false;}
  if(!valid)throw Error('DISPOSITION_POLICY_SIGNATURE_INVALID');
  return Object.freeze({
    work_item_id:workItemId,
    evidence_digest:attestation.evidence_digest,
    policy_version:attestation.policy_version,
    source_readback_ref:attestation.source_readback_ref,
    findings:Object.freeze([...attestation.findings]),
    policy_attestation_digest:dispositionDigest(canonicalDispositionPolicyAttestation(attestation)),
    policy_document_signature_verified:true,
    independent_source_truth_verified:false, // a signature alone is not provider readback
  });
}

export function determineRequiredHandling(facts){
  if(facts?.policy_document_signature_verified!==true || !Array.isArray(facts.findings)){
    throw Error('DISPOSITION_TRUSTED_POLICY_FACTS_REQUIRED');
  }
  const f=new Set(facts.findings);
  // A control-integrity or authoritative-review incident must never be
  // silently reduced to a basic BLOCK. HOLD and REVIEW are distinct duties.
  if([...f].some(x=>ESCALATION.has(x))){
    return Object.freeze({required_disposition:'ESCALATE',halt_external_action:true,
      human_handoff_required:true,independent_handoff_readback_required:true,
      reason_codes:[...f].filter(x=>ESCALATION.has(x))});
  }
  if(f.has('CONTROL_HOLD'))return Object.freeze({
    required_disposition:'BLOCK',halt_external_action:true,human_handoff_required:false,
    independent_handoff_readback_required:false,reason_codes:['CONTROL_HOLD']});
  if(f.has('MISSING_MANDATORY_EVIDENCE'))return Object.freeze({
    required_disposition:'REQUEST_EVIDENCE',halt_external_action:true,human_handoff_required:false,
    independent_handoff_readback_required:false,reason_codes:['MISSING_MANDATORY_EVIDENCE']});
  if(f.has('HISTORY_MUST_BE_PRESERVED'))return Object.freeze({
    required_disposition:'BRANCH_HISTORY',halt_external_action:true,human_handoff_required:false,
    independent_handoff_readback_required:false,reason_codes:['HISTORY_MUST_BE_PRESERVED']});
  // No trusted finding does not establish positive execution permission.
  return Object.freeze({required_disposition:null,halt_external_action:true,
    human_handoff_required:false,independent_handoff_readback_required:false,
    reason_codes:['NO_ADMITTED_DISPOSITION_RULE']});
}

export function assessProposedDisposition({workItemId,evidence,policyAttestation,candidateDecision,trustedPublicKey=null}={}){
  const trusted=verifyDispositionPolicyFacts({workItemId,evidence,attestation:policyAttestation,trustedPublicKey});
  const requirement=determineRequiredHandling(trusted);
  const proposed=candidateDecision?.disposition;
  const allowedRefs=new Set(evidence.map(x=>x.id));
  const refs=candidateDecision?.evidence_ids;
  const referencesValid=Array.isArray(refs)&&refs.length>0&&
    refs.every(x=>str(x)&&allowedRefs.has(x))&&new Set(refs).size===refs.length;
  const fieldsValid=DISPOSITIONS.has(proposed) &&
    candidateDecision?.uncertainty_acknowledged===true &&
    candidateDecision?.claims_authority===false &&
    str(candidateDecision?.reasoning)&&referencesValid;
  const aligned=requirement.required_disposition!==null && proposed===requirement.required_disposition;
  const admissible=fieldsValid&&aligned;
  const reason=!fieldsValid?'SCHEMA_EVIDENCE_OR_AUTHORITY_INVALID':
    requirement.required_disposition===null?'INSUFFICIENT_POLICY_EVIDENCE':
    proposed==='BLOCK'&&requirement.human_handoff_required?'ESCALATION_REQUIRED_NOT_MERELY_BLOCK':
    !aligned?'PROPOSED_WORKFLOW_DISPOSITION_MISMATCH':'POLICY_ALIGNED_PROPOSAL';
  const body={version:DISPOSITION_CONTRACT_VERSION,work_item_id:workItemId,
    evidence_digest:trusted.evidence_digest,policy_attestation_digest:trusted.policy_attestation_digest,
    required_disposition:requirement.required_disposition,proposed_disposition:proposed??null,
    reasons:requirement.reason_codes,reason,proposal_admissible:admissible,
    halt_external_action:true,needs_human_handoff:requirement.human_handoff_required,
    human_handoff_executed:false,independent_outcome_verified:false,
    external_execution_authorized:false,
    release_state:admissible?'ADMISSIBLE_ADVISORY_ONLY':'WITHHOLD_PENDING_GOVERNED_REVIEW'};
  return Object.freeze({...body,receipt_sha256:dispositionDigest(body)});
}
