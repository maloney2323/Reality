// One deterministic, evidence-bound repair stage for informational decisions.
// The governing policy—not a model or benchmark oracle—specifies the required
// disposition. The repair is an advisory ONLY and never executes a handoff.
import {createHash} from 'node:crypto';
import {assessProposedDisposition} from './reality-disposition-escalation-contract-v0.1.js';

export const GOVERNED_REPAIR_VERSION='reality-governed-advisory-repair-v0.1';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function repairPolicyMisalignedAdvisory({
  publicPacket,policyAttestation,trustedPolicyPublicKey,candidateDecision
}={}){
  const assessment=assessProposedDisposition({
    workItemId:publicPacket?.work_item_id,evidence:publicPacket?.evidence,
    policyAttestation,trustedPublicKey:trustedPolicyPublicKey,
    candidateDecision
  }); // verification of signature/scope happens here; invalid signature throws
  const permittedMismatch=new Set([
    'ESCALATION_REQUIRED_NOT_MERELY_BLOCK',
    'PROPOSED_WORKFLOW_DISPOSITION_MISMATCH'
  ]);
  if(assessment.proposal_admissible||!permittedMismatch.has(assessment.reason)||
     !assessment.required_disposition){
    return Object.freeze({
      schema:GOVERNED_REPAIR_VERSION,
      status:assessment.proposal_admissible?'NO_REPAIR_REQUIRED':'NOT_SAFE_TO_REPAIR',
      original_disposition:candidateDecision?.disposition??null,
      required_disposition:assessment.required_disposition,
      assessment_receipt:assessment,publication:null,
      external_action_executed:false,independent_outcome_verified:false,
      reason:assessment.reason,
    });
  }
  // All original case evidence is bound into the signature. Do not cite
  // imaginary records or imply that a signed policy is a source readback.
  const cited=[...candidateDecision.evidence_ids];
  const original=candidateDecision.disposition;
  const required=assessment.required_disposition;
  const reasonCodes=assessment.reasons;
  const publication=Object.freeze({
    kind:'GOVERNED_CORRECTED_ADVISORY_ONLY',
    disposition:required,
    evidence_ids:Object.freeze(cited),
    uncertainty_acknowledged:true,claims_authority:false,
    reasoning:'The policy-signed evidence record requires '+required+
      ' because of '+reasonCodes.join(', ')+'. The model originally proposed '+original+
      '. This is a non-executing corrective advisory; independent source readback and any human handoff remain unverified.',
    original_model_disposition:original,
    verified_policy_document_signature:true,
    independently_verified_source_truth:false,
    correction_reason_codes:Object.freeze([...reasonCodes]),
    original_candidate_sha256:hash(candidateDecision),
    original_task_completed:false,external_action_executed:false,
    external_execution_authorized:false,
    human_handoff_completed:false,
    policy_review_required:true
  });
  const base={
    schema:GOVERNED_REPAIR_VERSION,
    status:'POLICY_BOUND_CORRECTION_ADVISORY_NOT_EXECUTION',
    original_disposition:original,required_disposition:required,
    assessment_receipt_sha256:assessment.receipt_sha256,
    candidate_sha256:hash(candidateDecision),
    publication_sha256:hash(publication),
    independent_source_truth_verified:false,
    external_action_executed:false,
    human_handoff_completed:false,
    original_task_completed:false,
  };
  return Object.freeze({
    ...base,receipt_sha256:hash(base),
    assessment_receipt:assessment,publication
  });
}
