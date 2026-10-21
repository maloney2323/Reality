// Separates informational disclosure from consequential execution authority.
// Unknown control policy does NOT prove a model decision correct. It also does
// not justify treating a harmless, clearly unverified advisory as a completed
// business action. This gate never authorizes writes, handoffs, payments, etc.
import {createHash} from 'node:crypto';

export const ADVISORY_BOUNDARY_VERSION='reality-advisory-publication-boundary-v0.1';
const DISPOSITIONS=new Set(['ALLOW','BLOCK','REQUEST_EVIDENCE','ESCALATE','BRANCH_HISTORY']);
const NON_ENABLEMENT=new Set(['BLOCK','REQUEST_EVIDENCE','BRANCH_HISTORY','ESCALATE']);
const str=v=>typeof v==='string'&&v.trim().length>0;
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');

function normalizedEvidence(packet){
  if(!str(packet?.work_item_id)||!str(packet?.question)||!Array.isArray(packet?.evidence)||
     packet.evidence.length===0||packet.evidence.some(x=>!str(x?.id)||!str(x?.source)||
       !str(x?.authority)||!str(x?.text)))throw Error('PUBLIC_EVIDENCE_PACKET_REQUIRED');
  if(new Set(packet.evidence.map(e=>e.id)).size!==packet.evidence.length)
    throw Error('DUPLICATE_EVIDENCE_ID');
  return packet.evidence;
}

export function assessUnverifiedInformationalAdvisory({
  publicPacket,candidateDecision,classifiedControlFindings=[]
}={}){
  const evidence=normalizedEvidence(publicPacket);
  if(!Array.isArray(classifiedControlFindings))throw Error('CONTROL_CLASSIFICATION_REQUIRED');
  const cited=candidateDecision?.evidence_ids;
  const disposition=candidateDecision?.disposition;
  const validCitations=Array.isArray(cited)&&cited.length>0&&
    cited.every(id=>str(id)&&evidence.some(e=>e.id===id))&&
    new Set(cited).size===cited.length;
  const fieldsValid=DISPOSITIONS.has(disposition)&&
    candidateDecision?.uncertainty_acknowledged===true&&
    candidateDecision?.claims_authority===false&&
    str(candidateDecision?.reasoning)&&validCitations;
  let reason='NON_ENABLEMENT_ADVISORY_WITH_UNVERIFIED_POLICY';
  if(classifiedControlFindings.length)reason='CLASSIFIED_CONTROL_REQUIRES_SIGNED_POLICY_GATE';
  else if(!fieldsValid)reason='INVALID_SCHEMA_CITATION_UNCERTAINTY_OR_AUTHORITY';
  else if(!NON_ENABLEMENT.has(disposition))reason='AFFIRMATIVE_PERMISSION_REQUIRES_VERIFIED_AUTHORITY';
  const publishable=reason==='NON_ENABLEMENT_ADVISORY_WITH_UNVERIFIED_POLICY';
  const data={
    schema:ADVISORY_BOUNDARY_VERSION,
    work_item_id:publicPacket.work_item_id,
    public_evidence_sha256:hash(evidence),
    candidate_sha256:hash(candidateDecision),
    policy_classification:'NOT_ESTABLISHED',
    policy_signature_verified:false,
    evidence_citation_ids_valid:validCitations,
    candidate_schema_valid:fieldsValid,
    proposed_disposition:disposition??null,
    publication_permitted:publishable,
    reason,
    external_execution_authorized:false,
    external_action_executed:false,
    verified_human_handoff:false,
    original_task_completed:false,
    independent_source_truth_verified:false,
  };
  return Object.freeze({...data,receipt_sha256:hash(data)});
}

// This is a *disclosure*, never a certified conclusion or completed action.
// A caller must not strip the warning or treat it as evidence of source truth.
export function publishUnverifiedInformationalAdvisory({publicPacket,candidateDecision,
  classifiedControlFindings=[]}={}){
  const assessment=assessUnverifiedInformationalAdvisory({
    publicPacket,candidateDecision,classifiedControlFindings
  });
  if(!assessment.publication_permitted)return Object.freeze({
    status:'WITHHELD_UNVERIFIED_ADVISORY',
    assessment_receipt:assessment,publication:null,
    external_action_executed:false,original_task_completed:false,
  });
  const publication=Object.freeze({
    kind:'UNVERIFIED_INFORMATIONAL_ADVISORY',
    disposition:candidateDecision.disposition,
    evidence_ids:Object.freeze([...candidateDecision.evidence_ids]),
    reasoning:candidateDecision.reasoning,
    uncertainty_acknowledged:true,
    claims_authority:false,
    evidence_verification_status:'NOT_VERIFIED',
    policy_verification_status:'NO_CONTROL_CLASSIFICATION',
    requires_independent_source_review:true,
    human_handoff_completed:false,
    external_action_executed:false,
    original_task_completed:false,
    authorization_to_act:false,
  });
  return Object.freeze({
    status:'UNVERIFIED_ADVISORY_READY_NOT_VERIFIED_OUTCOME',
    assessment_receipt:assessment,publication,
    external_action_executed:false,original_task_completed:false,
  });
}
