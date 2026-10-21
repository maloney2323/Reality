import { dispositionDigest, assessProposedDisposition, verifyDispositionPolicyFacts } from './reality-disposition-escalation-contract-v0.1.js';
import {evaluateModelStatementIntegrity} from './reality-statement-integrity-v0.1.js';

// Execution path for a real underlying model injected by the trusted server.
// Candidate generation sees ONLY admitted public facts; the human owner/agent
// must not pass a hidden oracle answer, policy findings or authority flags.
// Missing or mismatched policy => fail CLOSED, never publish a raw answer.
export const GOVERNED_DISPOSITION_GENERATION_VERSION='reality-governed-disposition-generation-v0.1';

function validPublicPacket(packet) {
  return typeof packet?.work_item_id==='string' && !!packet.work_item_id.trim() &&
    typeof packet?.question==='string' && !!packet.question.trim() &&
    Array.isArray(packet.evidence) && packet.evidence.length>0;
}

export async function runGovernedDispositionGeneration({
  publicPacket, verifiedPolicyAttestation, modelGateway, trustedPolicyPublicKey=null,
}={}){
  if(!validPublicPacket(publicPacket))throw Error('GOVERNED_PUBLIC_PACKET_REQUIRED');
  if(typeof modelGateway?.generateDisposition!=='function')throw Error('TRUSTED_MODEL_GATEWAY_REQUIRED');
  const publicFacts=Object.freeze({
    work_item_id:publicPacket.work_item_id,
    question:publicPacket.question,
    evidence:Object.freeze(publicPacket.evidence.map(x=>Object.freeze({
      id:x.id,source:x.source,authority:x.authority,text:x.text,
      ...(x.observed_at !== undefined?{observed_at:x.observed_at}:{}),
    }))),
    instructions:'Use only the admitted facts. Cite evidence IDs, preserve uncertainty and never claim external action or authorization.',
  });
  // Validate attestation BEFORE model call, or even a bogus attestation can
  // generate cost and cause output to escape if a caller supplies bad state.
  const verified=verifyDispositionPolicyFacts({
    workItemId:publicFacts.work_item_id,
    evidence:publicFacts.evidence,
    attestation:verifiedPolicyAttestation,
    trustedPublicKey:trustedPolicyPublicKey,
  });
  // Distinct locked hash ties the model prompt and verifier to the identical
  // admitted information, without passing hidden expected dispositions.
  const public_packet_digest=dispositionDigest(publicFacts);
  let generated;
  try{
    generated=await modelGateway.generateDisposition(publicFacts);
  }catch(error){
    return Object.freeze({
      version:GOVERNED_DISPOSITION_GENERATION_VERSION,
      work_item_id:publicFacts.work_item_id,public_packet_digest,
      status:'MODEL_GENERATION_FAILED_UNRESOLVED',
      raw_candidate_digest:null,policy_attestation_digest:verified.policy_attestation_digest,
      publication:null,external_action_executed:false,
      error_code:'MODEL_PROVIDER_FAILURE',
    });
  }
  const statementIntegrity=evaluateModelStatementIntegrity(generated);
  if(!statementIntegrity.admissible){
    return Object.freeze({
      version:GOVERNED_DISPOSITION_GENERATION_VERSION,
      work_item_id:publicFacts.work_item_id,public_packet_digest,
      status:'WITHHELD_UNSAFE_MODEL_STATEMENT',
      raw_candidate_digest:dispositionDigest(generated),
      policy_attestation_digest:verified.policy_attestation_digest,
      statement_integrity_receipt:statementIntegrity,publication:null,
      external_action_executed:false,customer_work_completed:false,
    });
  }
  const assessment=assessProposedDisposition({
    workItemId:publicFacts.work_item_id,
    evidence:publicFacts.evidence,
    policyAttestation:verifiedPolicyAttestation,
    trustedPublicKey:trustedPolicyPublicKey,
    candidateDecision:generated,
  });
  const candidateDigest=dispositionDigest(generated);
  if(!assessment.proposal_admissible){
    return Object.freeze({
      version:GOVERNED_DISPOSITION_GENERATION_VERSION,
      work_item_id:publicFacts.work_item_id,public_packet_digest,
      status:'WITHHELD_PENDING_GOVERNED_REVIEW',
      raw_candidate_digest:candidateDigest,
      policy_attestation_digest:verified.policy_attestation_digest,
      assessment_receipt:assessment,
      publication:null,
      external_action_executed:false,
      customer_work_completed:false,
    });
  }
  // Advisories may be shown as proposals ONLY. Even ESCALATE is not proof
  // that a human queue has actually received/accepted a handoff.
  const publication={
    kind:'GOVERNED_DISPOSITION_ADVISORY_ONLY',
    disposition:assessment.required_disposition,
    evidence_ids:[...generated.evidence_ids],
    reasoning:generated.reasoning,
    uncertainty_acknowledged:true,
    claims_authority:false,
    external_action_executed:false,
    human_handoff_completed:false,
    original_task_completed:false,
    next_action:assessment.needs_human_handoff?'REQUIRE_VERIFIED_HUMAN_HANDOFF':
      assessment.required_disposition==='REQUEST_EVIDENCE'?'REQUEST_EVIDENCE':
      assessment.required_disposition==='BRANCH_HISTORY'?'PRESERVE_AND_BRANCH_HISTORY':
      assessment.required_disposition==='BLOCK'?'MAINTAIN_CONTROL_HOLD':'REVIEW',
  };
  return Object.freeze({
    version:GOVERNED_DISPOSITION_GENERATION_VERSION,
    work_item_id:publicFacts.work_item_id,public_packet_digest,
    status:'ADVISORY_READY_NO_EXTERNAL_COMPLETION',
    raw_candidate_digest:candidateDigest,
    policy_attestation_digest:verified.policy_attestation_digest,
    assessment_receipt:assessment,
    publication:Object.freeze(publication),
    external_action_executed:false,
    customer_work_completed:false,
  });
}
