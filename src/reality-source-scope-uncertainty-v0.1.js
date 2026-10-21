// Scope calibration at the presentation boundary, NOT truth repair. This
// module cannot invent evidence, change dispositions, or grant permissions.
// It may explicitly disclose that no independent *live source readback* was
// performed when the input assessment did not do one. That uncertainty is real.
import {createHash} from 'node:crypto';
export const SCOPE_DISCLOSURE_VERSION='reality-source-scope-uncertainty-v0.1';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const str=x=>typeof x==='string'&&x.trim().length>0;
const nonEnabling=new Set(['BLOCK','REQUEST_EVIDENCE','ESCALATE','BRANCH_HISTORY']);
const contradictedClaims=/\b(?:guaranteed (?:correct|accurate|safe|valid)|100% certain|zero uncertainty|no uncertainty exists|independently verified (?:the|this|all)|checked the live (?:registry|system|api)|confirmed by a live api)\b/i;

export function discloseUnverifiedSourceScope({
  publicPacket,candidateDecision,independentSourceReadbackVerified=false,
}={}){
  if(!str(publicPacket?.question)||!Array.isArray(publicPacket?.evidence)||
     publicPacket.evidence.length===0||publicPacket.evidence.some(e=>!str(e?.id)||
     !str(e?.source)||!str(e?.authority)||!str(e?.text))||
     new Set(publicPacket.evidence.map(e=>e.id)).size!==publicPacket.evidence.length)
    throw Error('VALID_PUBLIC_FACTS_REQUIRED');
  const refs=new Set(publicPacket.evidence.map(e=>e.id));
  const ids=candidateDecision?.evidence_ids;
  const safeShape=nonEnabling.has(candidateDecision?.disposition)&&
    Array.isArray(ids)&&ids.length>0&&new Set(ids).size===ids.length&&
    ids.every(id=>str(id)&&refs.has(id))&&
    str(candidateDecision?.reasoning)&&candidateDecision?.claims_authority===false&&
    typeof candidateDecision?.uncertainty_acknowledged==='boolean'&&
    !contradictedClaims.test(candidateDecision.reasoning);
  const scopeUnverified=independentSourceReadbackVerified===false;
  const eligible=safeShape&&scopeUnverified;
  const needsDisclosure=eligible&&candidateDecision.uncertainty_acknowledged===false;
  const result=needsDisclosure?Object.freeze({
    ...candidateDecision,
    reasoning:candidateDecision.reasoning.trim()+
      ' Assessment is limited to the supplied records; no independent live source-system readback was performed.',
    uncertainty_acknowledged:true,
    original_uncertainty_acknowledged:false,
    source_scope_uncertainty_only:true,
    source_fact_uncertainty_not_asserted:true,
    independently_verified_source_truth:false,
  }):candidateDecision;
  const body={
    schema:SCOPE_DISCLOSURE_VERSION,
    candidate_sha256:hash(candidateDecision),
    result_sha256:hash(result),
    changed:needsDisclosure,
    permitted:eligible,
    reason:!safeShape?'INVALID_CANDIDATE_OR_UNSUPPORTED_CERTAINTY_CLAIM':
      !scopeUnverified?'NO_MISSING_SOURCE_SCOPE_TO_DISCLOSE':
      needsDisclosure?'DECLARED_REAL_LACK_OF_LIVE_SOURCE_READBACK':'UNCERTAINTY_ALREADY_ACKNOWLEDGED',
    original_disposition:candidateDecision?.disposition??null,
    result_disposition:result?.disposition??null,
    evidence_ids_unchanged:JSON.stringify(candidateDecision?.evidence_ids)===JSON.stringify(result?.evidence_ids),
    independent_source_truth_verified:false,
    external_action_executed:false,
    original_task_completed:false,
  };
  return Object.freeze({status:needsDisclosure?'DISCLOSED_SCOPE_LIMIT':eligible?'UNCHANGED':'WITHHELD_UNSUPPORTED_SCOPE',
    receipt:Object.freeze({...body,receipt_sha256:hash(body)}),
    candidate:eligible?Object.freeze(result):null});
}
