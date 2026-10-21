// Shared post-model decision boundary. Runtime receives ONLY a public packet,
// source evidence policy and candidate; never a benchmark answer or scorer.
// A signed policy is verified for integrity but is NOT external provider truth.
// No original customer business action or human handoff occurs in this module.
import {createHash} from 'node:crypto';
import {reconcileTypedEvidenceFindings} from './reality-typed-evidence-findings-v0.1.js';
import {discloseUnverifiedSourceScope} from './reality-source-scope-uncertainty-v0.1.js';
import {publishUnverifiedInformationalAdvisory}
  from './reality-advisory-publication-boundary-v0.1.js';
import {runGovernedDispositionGeneration}
  from './reality-governed-disposition-generation-v0.1.js';
import {repairPolicyMisalignedAdvisory}
  from './reality-governed-advisory-repair-v0.1.js';
import {verifyDispositionPolicyFacts} from './reality-disposition-escalation-contract-v0.1.js';
export const SOURCE_DECISION_BOUNDARY_VERSION='reality-evidence-bound-decision-v0.1';
const digest=x=>createHash('sha256').update(JSON.stringify(x??null)).digest('hex');

export async function resolveEvidenceBoundDecision({
  publicPacket,legacyFindings=[],rawCandidate,
  policyAttestation=null,trustedPolicyPublicKey=null,
  independentSourceReadbackVerified=false,
}={}){
  if(!rawCandidate||typeof rawCandidate!=='object'||Array.isArray(rawCandidate))
    throw Error('MODEL_CANDIDATE_REQUIRED');
  // Typed reconciliation is independent of the model's preferred disposition.
  const typed=reconcileTypedEvidenceFindings(publicPacket,{legacyFindings});
  const scope=discloseUnverifiedSourceScope({
    publicPacket,candidateDecision:rawCandidate,
    independentSourceReadbackVerified,
  });
  const normalized=scope.candidate;
  const base={
    schema:SOURCE_DECISION_BOUNDARY_VERSION,
    work_item_id:publicPacket.work_item_id,
    raw_candidate_sha256:digest(rawCandidate),
    normalized_candidate_sha256:digest(normalized),
    typed_findings:typed,
    scope_uncertainty_receipt:scope.receipt,
    raw_candidate_modified:scope.receipt.changed,
    original_model_disposition:rawCandidate.disposition??null,
    independent_source_truth_verified:false,
    external_action_executed:false,
    human_handoff_completed:false,
    original_task_completed:false,
  };
  if(!typed.findings.length){
    if(policyAttestation)throw Error('UNCLASSIFIED_POLICY_MUST_NOT_CLAIM_SIGNED_AUTHORITY');
    // No trusted policy -> no positive authorization, and publish only if
    // a non-enabling informational advisory passes the separate schema gate.
    const advisory=publishUnverifiedInformationalAdvisory({
      publicPacket,candidateDecision:normalized||rawCandidate,
      classifiedControlFindings:[]
    });
    const response={...base,
      status:advisory.status,publication:advisory.publication,
      publication_assessment_receipt:advisory.assessment_receipt,
      policy_repair_receipt:null};
    return Object.freeze({...response,receipt_sha256:digest(response)});
  }
  // Gatekeeping is mandatory for all classified control facts.
  // The signed policy must match the actual typed public-evidence analysis.
  const same=Array.isArray(policyAttestation?.findings)&&
    policyAttestation.findings.length===typed.findings.length &&
    typed.findings.every(x=>policyAttestation.findings.includes(x));
  if(!same)throw Error('SIGNED_POLICY_FINDINGS_DO_NOT_MATCH_EVIDENCE');
  if(!trustedPolicyPublicKey)throw Error('TRUSTED_POLICY_SIGNER_REQUIRED');
  // Authenticate policy even if the candidate is invalid; a malformed model
  // answer must never cause this layer to describe a forged policy as trusted.
  verifyDispositionPolicyFacts({
    workItemId:publicPacket.work_item_id,evidence:publicPacket.evidence,
    attestation:policyAttestation,trustedPublicKey:trustedPolicyPublicKey
  });
  if(!normalized){
    const response={...base,status:'WITHHELD_INVALID_CANDIDATE',
      publication:null,policy_repair_receipt:null};
    return Object.freeze({...response,receipt_sha256:digest(response)});
  }
  const governed=await runGovernedDispositionGeneration({
    publicPacket,verifiedPolicyAttestation:policyAttestation,
    trustedPolicyPublicKey,modelGateway:{
      generateDisposition:async()=>normalized
    }
  });
  let pub=governed.publication;
  let status=governed.status,repair=null;
  if(status==='WITHHELD_PENDING_GOVERNED_REVIEW'){
    repair=repairPolicyMisalignedAdvisory({
      publicPacket,policyAttestation,trustedPolicyPublicKey,
      candidateDecision:normalized
    });
    if(repair.publication){pub=repair.publication;status=repair.status;}
  }
  const response={...base,status,publication:pub,
    publication_assessment_receipt:governed.assessment_receipt||null,
    policy_repair_receipt:repair};
  return Object.freeze({...response,receipt_sha256:digest(response)});
}
