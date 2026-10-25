import crypto from 'node:crypto';

// Typed interpretation candidates. NEVER source truth, authorization, or a
// lifecycle transition. Continuity/Verifier own reconciliation and approval.
export const TYPED_SIGNAL_INTAKE_VERSION='signal-epistemic-intake-v1.1.0';
const digest=x=>'sha256:'+crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const verbs='(?:check|verify|find|research|look|review|prepare|draft|create|make|send|email|reply|dispatch|approve|purchase|buy|pay|transfer|deploy|merge|delete|publish|post|cancel|schedule|execute|update|write|change|show|tell|compare|summarize|open|close|hold)';
const actionStart=new RegExp('^(?:(?:please|just|now)\\s+)?'+verbs+'\\b','i');
const questionStart=/^(?:what|why|where|when|who|how|which|whose|did|does|do|are|is|was|were|can|could|should|would|will|have|has)\b/i;
const prohibition=/\b(?:do not|don't|never|must not|cannot|can't|no one should|without permission to)\s+(?:(?:\w+)[\s-]+){0,3}(?:send|email|dispatch|approve|pay|transfer|deploy|merge|delete|publish|post|execute|buy|purchase|contact|notify|issue)\b/i;
const hearsay=/\b(?:said|says|wrote|writes|quoted|claimed|claims|reported|told me|heard|according to|rumou?r|apparently|supposedly)\b/i;
const conditionStart=/^(?:(?:and|then|only)\s+)?(?:if|unless|once|provided|assuming|after|when)\b/i;
const hypothetical=/\b(?:might|could|would|hypothetically|suppose|imagining|perhaps|maybe)\b/i;
const doubt=/\b(?:not sure|unsure|unknown|unverified|unconfirmed|maybe|might|possibly|probably|alleged|pending)\b/i;
const retraction=/\b(?:actually|instead|correction:|correcting|withdrawn|revoked|rescinded|cancel that|scratch that|no longer|supersedes|superseded)\b/i;
const responseOnly=/^(?:yes|no|yep|nope|correct|incorrect|agreed|i agree|okay|ok|right|sure|maybe|not yet|done|understood)[.!?]*$/i;
const negate=/\b(?:not|never|without|no longer|don't|didn't|hasn't|haven't|can't|cannot|won't|isn't|wasn't|unverified|withdrawn|revoked)\b/i;
const timeCue=/\b(?:yesterday|today|tomorrow|previously|earlier|now|later|since|before|after|next week|last week|withdrawn|revoked|updated)\b/i;

function rangesOutsideQuotes(fragment){
  const text=fragment.cleaned_text||'';
  // Normalized length may differ from original. Build clause spans using
  // exact original source bytes, then derive quoted ranges independently.
  const raw=fragment._raw_for_typing;
  const spans=fragment.intake_observation?.quoted_spans||[];
  const blocked=Array.from({length:raw.length},()=>false);
  for(const q of spans){
    for(let i=Math.max(0,q.start);i<Math.min(raw.length,q.end);i++)blocked[i]=true;
  }
  const split=new Set();
  const punct=[...raw.matchAll(/[;\n]/g)];
  for(const m of punct)if(!blocked[m.index])split.add(m.index+1);
  const boundary=/,\s*(?=(?:and\s+)?(?:if|unless|once|provided|assuming|after|when|but|then|please|do not|don't|never|check|verify|prepare|draft|create|send|email|hold|cancel|no longer)\b)|(?:—|–)\s*(?=but\b)|\bbut\b(?=\s+(?:don't|do not|never|we|i|it|they)\b)/gi;
  for(const m of raw.matchAll(boundary)){
    if([...Array(m[0].length)].every((_,i)=>!blocked[m.index+i])){
      // split after comma/em dash, before bare "but", or before comma token.
      const at=m[0].startsWith('but')?m.index:
        m[0].startsWith(',')?m.index+1:m.index+1;
      split.add(at);
    }
  }
  const positions=[0,...[...split].filter(x=>x>0&&x<raw.length).sort((a,b)=>a-b),raw.length];
  const clauses=[];
  for(let i=0;i<positions.length-1;i++){
    let begin=positions[i],end=positions[i+1];
    while(begin<end&&/\s|[,;—–]/.test(raw[begin]))begin++;
    while(end>begin&&/\s|[,;—–]/.test(raw[end-1]))end--;
    if(begin<end)clauses.push({begin,end,text:raw.slice(begin,end)});
  }
  return clauses;
}

function quoteOnly(fragment,begin,end){
  const ranges=fragment.intake_observation?.quoted_spans||[];
  return ranges.some(q=>q.start<=begin&&q.end>=end);
}
function maskedDirect(fragment,begin,end,text){
  const ranges=fragment.intake_observation?.quoted_spans||[];
  const a=text.split('');
  for(const q of ranges){
    const s=Math.max(begin,q.start),e=Math.min(end,q.end);
    for(let i=s;i<e;i++)a[i-begin]=' ';
  }
  return a.join('').trim();
}
function interpret(clause,fragment,rawText){
  const {text,begin,end}=clause;
  const direct=maskedDirect(fragment,begin,end,text).replace(/^(?:and|but|then)\s+/i,'').trim();
  const quotation=quoteOnly(fragment,begin,end);
  const prohibited=prohibition.test(direct);
  const isQuestion=questionStart.test(direct)||/\?/.test(direct);
  const conditional=conditionStart.test(direct);
  const isCommand=actionStart.test(direct)||/^(?:can|could|would)\s+you\s+/i.test(direct);
  const isResponse=responseOnly.test(direct);
  const reported=hearsay.test(direct);
  const corrected=retraction.test(direct);
  const uncertain=doubt.test(direct),hypo=hypothetical.test(direct),neg=negate.test(direct);
  const modality=[];
  if(quotation)modality.push('QUOTED');
  if(reported)modality.push('HEARSAY');
  if(conditional)modality.push('CONDITIONAL');
  if(hypo)modality.push('HYPOTHETICAL');
  if(uncertain)modality.push('UNCERTAIN');
  if(neg)modality.push('NEGATED');
  if(isQuestion)modality.push('INTERROGATIVE');
  if(corrected)modality.push('REVISION_CANDIDATE');
  if(isResponse)modality.push('RESPONSE_CANDIDATE');
  if(!modality.length)modality.push('ASSERTED_CANDIDATE');
  const kind=quotation?'QUOTED_EVIDENCE':
    prohibited?'PROHIBITION_CANDIDATE':
    conditional?'CONDITION_CANDIDATE':
    isQuestion?'QUESTION_CANDIDATE':
    isResponse?'RESPONSE_CANDIDATE':
    corrected?'CORRECTION_CANDIDATE':
    isCommand?'TASK_REQUEST_CANDIDATE':
    reported?'REPORTED_ASSERTION_CANDIDATE':'STATEMENT_CANDIDATE';
  const agency=prohibited?'AUTONOMOUS_PROHIBITED_CANDIDATE':
    (isCommand&&!quotation)?'DIRECT_REQUEST_NOT_AUTHORIZED':
    conditional?'CONDITIONAL_PREMISE_ONLY':'NO_EXECUTION_DIRECTIVE';
  const sourceStart=fragment.raw_span.start+begin,sourceEnd=fragment.raw_span.start+end;
  // Ignore any malformed/misaligned spans rather than invent coordinates.
  if(rawText.slice(sourceStart,sourceEnd)!==text)
    throw Error('TYPED_INTAKE_SOURCE_SPAN_MISMATCH');
  return {
    clause_id:'epistemic:'+digest({fragment_id:fragment.fragment_id,begin,end,text}).slice(7,39),
    fragment_id:fragment.fragment_id,
    source_span:{start:sourceStart,end:sourceEnd},
    exact_source_text:text,
    source_text_digest:digest(text),
    kind,epistemic_modalities:modality,
    agency:{candidate:agency,execution_authorized:false},
    epistemic:{status:'UNVERIFIED_INTAKE',external_truth_established:false},
    source_attribution:'SOURCE_TEXT_ONLY_NOT_AUTHENTICATED_BY_PARSER',
    time_cue_present:timeCue.test(direct),
    candidate_relations:corrected?[{kind:'MAY_SUPERSEDE',target_signal_id:null,
      status:'CONTINUITY_RECONCILIATION_REQUIRED'}]:[],
    // Intentionally unresolved: no inferred target, verified approval or money.
    candidate_dependency:null,
    requires_semantic_review:!!(reported||corrected||conditional||quotation||
      uncertain||hypo||isResponse),
  };
}
export function buildTypedEpistemicIntake({packet,fragments}={}){
  if(!packet||!Array.isArray(fragments))throw Error('TYPED_INTAKE_SOURCE_REQUIRED');
  const clauses=[];
  const rawText=packet.raw_content;
  for(const fragment of fragments){
    if(!fragment?.raw_span||typeof fragment.raw_span.start!=='number')
      throw Error('TYPED_INTAKE_RAW_SPAN_REQUIRED');
    const raw=rawText.slice(fragment.raw_span.start,fragment.raw_span.end);
    // Trust raw offsets instead of possibly collapsed whitespace.
    const scoped={...fragment,_raw_for_typing:raw};
    // quote ranges from v1 are relative to the RAW fragment.
    for(const clause of rangesOutsideQuotes(scoped)){
      clauses.push(interpret(clause,scoped,rawText));
    }
  }
  // Preserve explicit conditions as dependency candidates, without creating
  // a task or asserting that the condition has been satisfied.
  for(let i=1;i<clauses.length;i++){
    const prev=clauses[i-1],cur=clauses[i];
    if(prev.kind==='CONDITION_CANDIDATE' &&
      cur.kind==='TASK_REQUEST_CANDIDATE'){
      cur.candidate_dependency={
        condition_clause_id:prev.clause_id,
        condition_status:'UNRESOLVED',
        handoff:'WORK_RUNTIME_AFTER_CONTINUITY_VERIFICATION',
        creates_execution_hook:false,
      };
      cur.agency={candidate:'AUTONOMOUS_CONDITIONAL_CANDIDATE',
        execution_authorized:false};
    }
  }
  const projection={
    version:TYPED_SIGNAL_INTAKE_VERSION,
    packet_id:packet.packet_id,source_digest:packet.raw_content_digest,
    clause_count:clauses.length,clauses,
    unresolved_conditions:clauses.filter(c=>c.kind==='CONDITION_CANDIDATE')
      .map(c=>({condition_clause_id:c.clause_id,status:'UNRESOLVED',
        resolved_by_intake:false})),
    correction_candidates:clauses.flatMap(c=>c.candidate_relations.map(r=>({
      from_clause_id:c.clause_id,...r,
    }))),
    review_recommended:clauses.some(c=>c.requires_semantic_review),
    status:'INTERPRETATION_CANDIDATES_NOT_GROUND_TRUTH',
    execution_authorized:false,
  };
  return freeze({...projection,projection_digest:digest(projection)});
}
