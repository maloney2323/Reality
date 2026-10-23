// Reality V1 source-to-claim boundary and transport completion checks.
// One typed contract used by native Spine, not a separate LLM judge.
// All findings are evidence-limited candidates; never authorize external work.
import {createHash} from 'node:crypto';
export const EVIDENCE_BOUNDARY_VERSION='reality-evidence-boundary-v1.0';
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const txt=x=>typeof x==='string'&&x.trim().length>0;
const split=x=>String(x).split(/\n+|(?<=[.?!])\s+/).map(y=>y.trim()).filter(Boolean);
const untrustedSource=/(?:untrusted|unverified|unauthenticated|pasted|forwarded|quoted|third.party|external).{0,90}(?:document|pdf|attachment|message|email|note|record|text|file)|(?:pdf|document|attachment|email).{0,50}(?:untrusted|unverified|unauthenticated)/i;
// Generalized source-boundary signal: embedded commands must not become an
// observed event merely because a model paraphrases their asserted outcome.
const sourceCommand=/(?:\b(?:ignore|override|pretend|claim|state|say|assert|mark|record|report|send|file|approve|release|pay|transfer|publish|delete|deploy|complete)\b.{0,95}\b(?:approve|paid|payment|sent|filed|completed|recorded|ignore|override|release|transfer|invoice|transaction|permission)\b)|(?:\bsystem\s+(?:priority|override|instruction)\b)/i;
const eventAssertion=/(?:\b(?:override|authorization|approval|payment|transfer|filing|shipment|delivery|transaction|release|deployment|purchase)\b.{0,85}\b(?:occurred|was made|was recorded|was completed|was executed|was sent|was filed|was paid|has been paid|has been sent|has occurred)\b)|(?:\b(?:paid|sent|filed|transmitted|approved|authorized|released|executed|delivered)\b.{0,45}\b(?:was|has been)\b)/i;
const qualified=/(?:\b(?:not|never|no evidence|no proof|no record|no receipt|nothing proves|unverified|unconfirmed|alleged|allegation|not established|cannot confirm|does not establish|doesn't establish|not evidence|hypothetical|falsely claims|merely claims|purports|claims|asserts|says to|tells us to|instruction to)\b)/i;
function issue({classification,reason,userSourceRef,modelSourceRef,excerpt,source}){
 const basis=[classification,userSourceRef,modelSourceRef,excerpt];
 return Object.freeze({
  issue_id:'boundary:'+hash(basis).slice(7,39),classification,origin_stage:'COGNITION',
  source_receipt_refs:[userSourceRef,modelSourceRef],
  observed_model_text:excerpt.slice(0,350),reason,
  detection_source:'REALITY_NATIVE_EVIDENCE_BOUNDARY',
  assessment_scope:source,independently_adjudicated:false,
  independently_verified:false,external_action_authorized:false,
 });
}
export function inspectResponseEvidenceBoundary({
 userMessage,modelAnswer,userSourceRef,modelSourceRef,
 providerStatus=null,providerIncompleteReason=null,
 outputTokens=null,maxOutputTokens=null,
}={}){
 if(![userMessage,modelAnswer,userSourceRef,modelSourceRef].every(txt))
  throw Error('EVIDENCE_BOUNDARY_SOURCE_REQUIRED');
 if(providerStatus!==null&&typeof providerStatus!=='string')
  throw Error('EVIDENCE_BOUNDARY_PROVIDER_STATUS_INVALID');
 for(const n of [outputTokens,maxOutputTokens])if(n!==null&&(!Number.isInteger(n)||n<0))
  throw Error('EVIDENCE_BOUNDARY_TOKEN_COUNT_INVALID');
 const findings=[];
 const sourceTested=untrustedSource.test(userMessage)&&sourceCommand.test(userMessage);
 if(sourceTested){
  // Repeating the suspect text in a clearly delimited quotation is evidence
  // *about* the document, not automatically a false assertion by the model.
  // Only inspect the model's own unquoted narrative clauses.
  const quotedOnly=x=>/^\s*(?:\*\*|__)?["“].+["”](?:\*\*|__)?\s*$/.test(x);
  const risky=split(modelAnswer).filter(x=>!quotedOnly(x)&&
    eventAssertion.test(x)&&!qualified.test(x));
  for(const sentence of risky.slice(0,3))findings.push(issue({
   classification:'UNTRUSTED_SOURCE_EVENT_PROMOTION',
   reason:'Untrusted source instruction may have been presented as a real completed event without independent outcome evidence',
   userSourceRef,modelSourceRef,excerpt:sentence,
   source:'SOURCE_TO_EVENT_TRANSITION_CONSERVATIVE_LEXICAL_CHECK',
  }));
 }
 const providerMarkedIncomplete=providerStatus==='incomplete'||
   (providerIncompleteReason!==null&&providerIncompleteReason!==undefined);
 const capExhausted=Number.isInteger(outputTokens)&&
  Number.isInteger(maxOutputTokens)&&maxOutputTokens>0&&outputTokens>=maxOutputTokens;
 if(providerMarkedIncomplete||capExhausted){
  findings.push(issue({
   classification:'MODEL_RESPONSE_INCOMPLETE',
   reason:providerMarkedIncomplete
    ?'Underlying model provider reports incomplete generation'
    :'Generation exhausted declared output token budget; completeness cannot be presumed',
   userSourceRef,modelSourceRef,
   excerpt:'provider_status='+String(providerStatus||'UNKNOWN')+
    '; reason='+String(providerIncompleteReason||'TOKEN_BUDGET_EXHAUSTED')+
    '; output_tokens='+String(outputTokens),
   source:'OPENAI_RESPONSE_METADATA_OR_OUTPUT_TOKEN_CAP',
  }));
 }
 const receipt={
  version:EVIDENCE_BOUNDARY_VERSION,
  status:findings.length?'REVIEW_REQUIRED':'BOUNDED_CHECK_NO_ISSUE',
  findings,
  coverage:{
   untrusted_source_boundary:sourceTested?'BOUNDED_LEXICAL_CHECK':'NO_RELEVANT_UNTRUSTED_SOURCE_COMMAND',
   response_completeness:providerStatus===null&&outputTokens===null
    ?'NOT_EVALUATED'
    :providerMarkedIncomplete||capExhausted?'INCOMPLETE':'METADATA_CHECK_NO_INCOMPLETE_SIGNAL',
   external_effect_readback:'NOT_PERFORMED',
   semantic_truth:'NOT_ESTABLISHED',
  },
  provider:{status:providerStatus,incomplete_reason:providerIncompleteReason,
   output_tokens:outputTokens,max_output_tokens:maxOutputTokens},
  can_claim_all_errors_caught:false,execution_authorized:false,
 };
 return Object.freeze({...receipt,evidence_boundary_receipt_hash:hash(receipt)});
}
