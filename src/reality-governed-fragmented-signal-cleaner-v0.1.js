import crypto from 'node:crypto';

// v1 is faithful intake, not a new judge, truth database or authorization gate.
export const GOVERNED_FRAGMENTED_SIGNAL_CLEANER_VERSION = '1.0.0';
export const CANONICAL_PACKET_VERSION = 'raw-signal-packet-v0.1';
export const SIGNAL_INTAKE_VERSION = 'signal-intake-semantics-v1.0';

const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function required(value,code) {
  if(typeof value!=='string'||!value.trim())throw Error(code);
  return value;
}
const normalize=text=>text.replace(/\r\n/g,'\n').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
function frozen(value){
  if(value&&typeof value==='object'){
    Object.values(value).forEach(frozen);Object.freeze(value);
  }
  return value;
}
// Extract exact slices, never split a quoted external "SYSTEM" message into
// an apparent command from the user. Raw span offsets are end-exclusive.
function segmentRaw(raw){
  const spans=[];let start=0,quote=null,fence=false;
  function emit(end){
    let a=start,b=end;
    while(a<b&&/\s/.test(raw[a]))a++;
    while(b>a&&/\s/.test(raw[b-1]))b--;
    if(a<b)spans.push({text:raw.slice(a,b),start:a,end:b});
    start=end;
  }
  for(let i=0;i<raw.length;i++){
    const ch=raw[i];
    if(raw.slice(i,i+3)==='\x60\x60\x60'){
      fence=!fence;i+=2;continue;
    }
    if(fence)continue;
    if(!quote&&(ch==='"'||ch==='“'||ch==='\x60')){
      quote=ch==='“'?'”':ch;
    }else if(quote&&ch===quote&&raw[i-1]!=='\\')quote=null;
    if(quote)continue;
    if(ch==='\n'){emit(i);start=i+1;}
    else if(/[.!?]/.test(ch)&&/\s/.test(raw[i+1]||'')&&
      /[A-Z0-9“"]/.test(raw.slice(i+1).trimStart()[0]||'')){
      emit(i+1);
      while(i+1<raw.length&&/[ \t]/.test(raw[i+1]))i++;
      start=i+1;
    }
  }
  emit(raw.length);
  return spans;
}
function quoteRanges(text){
  const result=[],re=/"[^"\n]*"|\u201c[^\u201d\n]*\u201d|\x60[^\x60\n]*\x60/g;
  let m;
  while((m=re.exec(text))){
    result.push({start:m.index,end:m.index+m[0].length,quote:m[0],
      untrusted_instruction_candidate:/\b(?:system|ignore|override|send|email|transfer|pay|deploy|merge|delete|execute)\b/i.test(m[0])});
  }
  return result;
}
const actionVerb='(?:send|email|dispatch|approve|purchase|buy|pay|transfer|deploy|merge|delete|publish|post|cancel|schedule|execute|write|change)';
function observe(text){
  const quotes=quoteRanges(text),chars=text.split('');
  for(const q of quotes)for(let i=q.start;i<q.end;i++)chars[i]=' ';
  const direct=chars.join('');
  const negation=/\b(?:not|never|no longer|without|cannot|can't|won't|isn't|wasn't|didn't|doesn't|haven't|hasn't|unverified|unconfirmed|withdrawn|revoked|not_sent|not_verified|not_approved)\b/i.test(direct);
  const prohibit=new RegExp("\\b(?:do not|don't|never|must not|cannot|can't)\\s+(?:(?:\\w+)[\\s-]+){0,3}"+actionVerb+"\\b",'i').test(direct);
  const hypothetical=/\b(?:if|unless|would|could|hypothetically|suppose|assuming)\b/i.test(direct);
  const uncertain=/\b(?:might|perhaps|possibly|probably|maybe|may not|unsure|unverified|unconfirmed|pending)\b/i.test(direct);
  const retracted=/\b(?:withdrawn|revoked|cancelled|canceled|rescinded|no longer)\b/i.test(direct);
  const temporal=/\b(?:now|previously|used to|latest|supersed(?:es|ed|ing)?|updated|changed|withdrawn|revoked)\b/i.test(direct);
  const attributed=quotes.length>0||/\b(?:someone|supplier|customer|homeowner|foreman|supervisor|vendor|note|rumou?r)\s+(?:said|says|claimed|claims|heard|reported)\b/i.test(direct);
  const question=/\?/.test(direct)||/^\s*(?:can we|could we|should we|is it|did|does|what|who|why|how|when|where)\b/i.test(direct);
  const imperative=new RegExp('^\\s*(?:please\\s+)?'+actionVerb+'\\b','i').test(direct)||
    new RegExp("\\b(?:please|go ahead and|can you|could you)\\s+(?:"+actionVerb+")\\b",'i').test(direct);
  const kind=!direct.trim()?'QUOTED_CONTENT_ONLY':
    prohibit?'PROHIBITION_CANDIDATE':
    question?'QUESTION_CANDIDATE':
    imperative?'ACTION_REQUEST_CANDIDATE':'STATEMENT_CANDIDATE';
  // Hints are never verified facts, scope-resolved negation or permission.
  return frozen({
    utterance_kind_candidate:kind,
    markers:{negation_present:negation,explicit_prohibition:prohibit,
      hypothetical_present:hypothetical,uncertainty_present:uncertain,
      retraction_present:retracted,temporal_change_present:temporal,
      quoted_or_attributed_source_present:attributed},
    quoted_spans:quotes,
    trust:'TEXT_OBSERVED_NOT_FACT_VERIFIED',
    execution_authority:'NONE',
    meaning_inference:'CANDIDATE_ONLY',
  });
}
export function createRawSignalPacket({message,source='USER_MESSAGE',observedAt=new Date().toISOString()}={}){
  const raw=required(message,'MESSAGE_REQUIRED');
  return frozen({
    packet_version:CANONICAL_PACKET_VERSION,
    packet_id:'rsp:'+hash({raw,source,observedAt}).slice(0,32),
    source,observed_at:observedAt,raw_content:raw,
    raw_content_digest:'sha256:'+hash(raw),
  });
}
export function cleanFragmentedSignal({packet,cleanerVersion=GOVERNED_FRAGMENTED_SIGNAL_CLEANER_VERSION}={}){
  if(!packet?.packet_id||!packet.raw_content_digest)throw Error('RAW_SIGNAL_PACKET_REQUIRED');
  if('sha256:'+hash(packet.raw_content)!==packet.raw_content_digest)
    throw Error('RAW_SIGNAL_DIGEST_MISMATCH');
  const spans=segmentRaw(packet.raw_content);
  const fragments=spans.map(({text:rawText,start,end},index)=>{
    const cleanedText=normalize(rawText);
    return frozen({
      fragment_id:'sig:'+hash({packet_id:packet.packet_id,index,rawText}).slice(0,32),
      packet_id:packet.packet_id,ordinal:index,
      raw_span:{start,end},
      raw_text_digest:'sha256:'+hash(rawText),
      cleaned_text:cleanedText,cleaned_text_digest:'sha256:'+hash(cleanedText),
      transformation:cleanedText===rawText?'IDENTITY':'NORMALIZE_WHITESPACE',
      epistemic_status:'OBSERVED',intake_observation:observe(rawText),
    });
  });
  const all=fragments.map(f=>f.intake_observation.markers);
  const objective=[...fragments].reverse().find(f=>[
    'QUESTION_CANDIDATE','ACTION_REQUEST_CANDIDATE','PROHIBITION_CANDIDATE',
  ].includes(f.intake_observation.utterance_kind_candidate))||null;
  const intake=frozen({
    intake_version:SIGNAL_INTAKE_VERSION,original_source:packet.source,
    source_claimed_truth:'NOT_VERIFIED_BY_INTAKE',authority_granted:false,
    source_observation_time:packet.observed_at,
    current_objective_candidate:objective?{
      fragment_id:objective.fragment_id,text:objective.cleaned_text,
      raw_span:objective.raw_span,
      kind:objective.intake_observation.utterance_kind_candidate,
    }:null,
    markers:{
      negation_present:all.some(m=>m.negation_present),
      explicit_prohibition:all.some(m=>m.explicit_prohibition),
      hypothetical_present:all.some(m=>m.hypothetical_present),
      uncertainty_present:all.some(m=>m.uncertainty_present),
      retraction_present:all.some(m=>m.retraction_present),
      temporal_change_present:all.some(m=>m.temporal_change_present),
      quoted_or_attributed_source_present:all.some(m=>m.quoted_or_attributed_source_present),
    },
    fragment_count:fragments.length,interpretation_status:'CANDIDATE_NOT_VERIFIED',
  });
  const transformationReceipt=frozen({
    receipt_version:'transformation-receipt-v1.0',
    receipt_id:'tr:'+hash({packet_id:packet.packet_id,cleanerVersion,fragments,intake}).slice(0,32),
    packet_id:packet.packet_id,cleaner_version:cleanerVersion,
    input_digest:packet.raw_content_digest,
    output_digest:'sha256:'+hash(fragments.map(x=>x.cleaned_text_digest)),
    fragment_count:fragments.length,
    transformations:fragments.map(x=>({
      fragment_id:x.fragment_id,transformation:x.transformation,
      input_digest:x.raw_text_digest,output_digest:x.cleaned_text_digest,raw_span:x.raw_span,
    })),
    intake_observation_digest:'sha256:'+hash(intake),
    meaning_change_claimed:false,created_at:new Date().toISOString(),
  });
  return frozen({
    cleaner_version:cleanerVersion,packet,fragments,intake_semantics:intake,
    transformation_receipt:transformationReceipt,
    lineage:{
      packet_id:packet.packet_id,
      transformation_receipt_id:transformationReceipt.receipt_id,
      continuity_required:true,interpretation_claimed_authority:false,
    },
  });
}
export function buildGovernedChatSignal({message,observedAt}={}){
  return cleanFragmentedSignal({packet:createRawSignalPacket({message,observedAt})});
}
