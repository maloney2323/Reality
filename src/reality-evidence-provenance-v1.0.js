// Reality's existing Intelligence Spine v1 uses this source and completion boundary.
// Untrusted instruction text is not a signed action receipt; output ceiling is
// not proof of a complete answer. No secondary LLM is used.
import {createHash} from 'node:crypto';
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const EVIDENCE_BOUNDARY_VERSION='reality-evidence-provenance-v1.0';
const sourceInstruction=/\b(?:system\s+(?:priority|override)|ignore\s+(?:the\s+)?(?:prior|previous|adjuster|approval|authorization|instructions?)|(?:state|say|report)\b.{0,95}\b(?:was|has been)\s+(?:paid|filed|sent|approved|executed))\b/i;
const untrustedDescriptor=/\b(?:untrusted|unverified|pasted|quoted|external|third[- ]party|attached|attachment|pdf|document|file)\b/i;
const eventPromotion=/\b(?:override|payment|transfer|invoice|transaction|filing|claim|delivery|approval)\b.{0,85}\b(?:occurred|was recorded|has been recorded|was made|was completed|was paid|was filed|was sent|had occurred)\b/i;
export function inspectBoundedEvidenceIntegrityV1({
 currentRequest='',rawAnswer='',userSourceRef='',modelSourceRef='',providerMetadata=null,
}={}){
 if(typeof currentRequest!=='string'||typeof rawAnswer!=='string'||!userSourceRef||!modelSourceRef)
   throw Error('EVIDENCE_BOUNDARY_SCOPED_INPUT_REQUIRED');
 const findings=[];
 const add=(classification,reason,evidence)=>findings.push(Object.freeze({
  issue_id:'evidence-v1:'+sha([userSourceRef,modelSourceRef,classification,reason]).slice(7,39),
  classification,reason,excerpt:String(evidence).slice(0,240),
  origin_stage:'COGNITION',source_receipt_refs:[userSourceRef,modelSourceRef],
  independently_adjudicated:false,
 }));
 const sourceContainsCommands=untrustedDescriptor.test(currentRequest)&&sourceInstruction.test(currentRequest);
 let provenanceChecked=false;
 if(sourceContainsCommands){
  provenanceChecked=true;
  // Sentence-level review means a general caveat elsewhere cannot excuse
  // asserting "an override occurred" in the next sentence.
  const sentences=rawAnswer.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const promoted=sentences.find(sentence=>{
   const t=sentence.replace(/^[\-*]\s*/,'').trim();
   const m=t.match(eventPromotion);
   if(!m)return false;
   const lead=t.slice(0,m.index);
   return !/\b(?:no|not|never|cannot|can't|didn't|did not|has not|wasn't|was not)\b.{0,55}$/i.test(lead);
  });
  if(promoted)add('UNTRUSTED_SOURCE_PROMOTED_TO_EVENT',
    'Untrusted source instruction appears to be presented as an occurred event without source readback',promoted);
 }
 let providerCompletionChecked=false;
 if(providerMetadata!==null){
  if(providerMetadata?.source!=='TRUSTED_PROVIDER_RUNTIME')
   throw Error('EVIDENCE_BOUNDARY_PROVIDER_METADATA_UNTRUSTED');
  providerCompletionChecked=true;
  const status=providerMetadata.status||null;
  const reason=providerMetadata.incomplete_reason||null;
  const used=providerMetadata.output_tokens;
  const cap=providerMetadata.max_output_tokens;
  if(status==='incomplete'||reason==='max_output_tokens')
   add('MODEL_RESPONSE_INCOMPLETE',
    'Provider explicitly reported incomplete output',reason||status);
  else if(Number.isInteger(used)&&Number.isInteger(cap)&&cap>0&&used>=cap)
   add('MODEL_RESPONSE_COMPLETION_UNCONFIRMED',
    'Model used entire output-token budget; completion requires confirmation',
    'used='+used+', limit='+cap);
 }
 return Object.freeze({
  version:EVIDENCE_BOUNDARY_VERSION,
  status:findings.length?'REVIEW_REQUIRED':
    provenanceChecked||providerCompletionChecked?'BOUNDED_CHECK_NO_CANDIDATES':'NOT_EVALUATED',
  provenance_check_performed:provenanceChecked,
  provider_completion_check_performed:providerCompletionChecked,
  independent_truth_verified:false,
  findings:Object.freeze(findings),
 });
}
