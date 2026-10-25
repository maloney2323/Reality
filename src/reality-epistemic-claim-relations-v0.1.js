// Continuity Spine claim-relation inspection: model assertions are checked
// against each other and against event TYPE boundaries, never promoted to truth.
// This is deterministic candidate detection, not semantic adjudication.
// Cross-world relationships may be flagged without collapsing their world IDs.
import {createHash} from 'node:crypto';
export const EPISTEMIC_RELATIONS_VERSION='reality-epistemic-claim-relations-v0.1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0,32);
const excerpt=(s,start,end)=>String(s).slice(start,end).trim().slice(0,350);
function finding({classification,left,right,reason,answer,continuityRootId,
  modelResponseId,sourceRefs=[],relation=null}){
 return Object.freeze({
  issue_id:'conversation-claim:'+sha([continuityRootId,modelResponseId,classification,left?.index,right?.index]),
  classification,origin_stage:'COGNITION',
  source_receipt_refs:[...new Set([...sourceRefs,'model-response:'+modelResponseId])],
  observed_model_text:excerpt(answer,left.index,Math.max(left.index+left[0].length,
    right?.index===undefined?left.index+left[0].length:right.index+right[0].length)),
  claim_spans:[{start:left.index,end:left.index+left[0].length},
    ...(right?[{start:right.index,end:right.index+right[0].length}]:[])],
  relation,reason,
  diagnostic_scope:'EXPLICIT_MODEL_CLAIM_RELATIONS_ONLY',
  independently_adjudicated:false,verified_hallucination:false,auto_correction_authorized:false,
 });
}
const cleanText=t=>String(t||'').replace(/\r\n/g,'\n');
const negativeContext=s=>/\b(?:not|never|isn.t|aren.t|doesn.t|cannot|can.t|without|rather than|different from|distinct from)\b/i.test(s);
// Only an explicit, unqualified assertion from the assistant counts here.
// Quoted, reported, hypothetical or denied truth-status statements are out of scope.
function speakerOwned(answer,match){
 const before=answer.slice(Math.max(0,match.index-105),match.index);
 const clause=before.split(/[.!?\n]/).at(-1)||'';
 return !/\b(?:someone|vendor|manager|contractor|analyst|customer|they|he|she)\s+(?:said|says|claimed|claims|reports?|believes?)\b/i.test(clause) &&
  !/["“”]\s*$/.test(clause) && !/^\s*(?:>|["“])/.test(
    answer.slice(answer.lastIndexOf('\n',match.index)+1,match.index));
}
const statusAffirm=/\b(?:the\s+)?(?:only\s+)?(?:facts?|claims?|approvals?|items?|statements?)\s+(?:that\s+|which\s+)?(?:are|were|have\s+been|is|was)\s+(?:actually\s+|independently\s+)?verified\b/gi;
const statusReject=/\b(?:no|none\s+of\s+the|not\s+one)\s+(?:facts?|claims?|approvals?|items?|statements?)\b[^.!?\n]{0,90}?\b(?:verified|confirmed|authenticated)\b/gi;
function sourceRefsForContext(currentUserMessage,priorTurns,currentUserSourceRef){
 // These are conversation references, NOT fact attestations or permission.
 const refs=[];
 for(const t of priorTurns||[]){
  if(t?.role==='user'&&typeof t.text==='string'&&t.source_ref)
   refs.push({text:t.text,source_ref:t.source_ref});
 }
 return refs.concat([{text:String(currentUserMessage||''),source_ref:currentUserSourceRef}]);
}
// An event type is not interchangeable with an outcome in a different world.
// The list is a declarative TYPE boundary catalog, not an evidence database.
const eventBoundaries=Object.freeze([
 {source:'EDI_FILE_ACKNOWLEDGMENT',target:'PAYMENT_OR_FINANCING',
  sourcePattern:/\b(?:payer|edi|file|claim)\s+(?:file\s+)?acknowledg(?:e)?ment\b|\b(?:acknowledged|acknowledgment)\s+(?:the\s+)?(?:edi\s+)?file\b/i,
  targetPattern:/\b(?:payment|paid|financing|financial\s+(?:clearance|confirmation))\b/i},
 {source:'CI_PASS',target:'DEPLOYMENT',
  sourcePattern:/\b(?:ci|checks?|tests?|build)\s+(?:is\s+)?(?:green|passed|passing|successful|success)\b/i,
  targetPattern:/\b(?:deployment|deployed|shipped|published|released)\b/i},
 {source:'EDI_FILE_ACKNOWLEDGMENT',target:'CLAIM_ADJUDICATION',
  sourcePattern:/\b(?:payer|edi|file|claim)\s+(?:file\s+)?acknowledg(?:e)?ment\b|\b(?:acknowledged|acknowledgment)\s+(?:the\s+)?(?:edi\s+)?file\b/i,
  targetPattern:/\b(?:accepted\s+claim|approved\s+claim|claim\s+(?:approved|accepted|paid|adjudicated|adjudication))\b/i},
]);
// Check only asserted equivalences, not co-mentions, contrasts, or questions.
const equivPatterns=[
 /\b(?:payer|edi|file|claim)\s+(?:file\s+)?acknowledg(?:e)?ment\s*\(([^)\n]{2,100})\)/gi,
 /\b(?:payer|edi|file|claim)\s+(?:file\s+)?acknowledg(?:e)?ment\s+(?:is|means|proves|confirms|guarantees|counts\s+as|equals|is\s+equivalent\s+to)\s+([^.!?\n]{2,100})/gi,
 /\b(?:ci|checks?|tests?|build)\s+(?:is\s+)?(?:green|passed|passing|successful|success)\s+(?:means|proves|confirms|guarantees|equals|is\s+equivalent\s+to)\s+([^.!?\n]{2,100})/gi,
];

// General relation path. Observed events and downstream operational states
// are TYPE families. A causal leap across them is a candidate, not ground truth.
// The same rules apply to new wording; no single business scenario or quote
// is individually hard-coded as an answer.
const inferredTransitions=[
 {source:'INGESTION_RECEIPT',target:'MONEY_OR_ADJUDICATION',
  observed:/\b(?:edi|999|acknowledg(?:e)?ment|transmission|claim(?:s)?|submission)\b.{0,75}\b(?:receipt|received|acknowledg(?:ed|ment)|transmi(?:t|ssion))\b|\b(?:receipt|acknowledg(?:ed|ment))\b.{0,55}\b(?:edi|999|claim|batch|submiss|transmiss)/i,
  outcome:/\b(?:paid|payment|reimburs(?:ement|ed)|deposited|deposit|funds?|financ(?:ing|ial)|adjudicat(?:ed|ion)|claim\s+(?:approved|accepted))\b/i},
 {source:'INTERNAL_FULFILLMENT',target:'CUSTOMER_DELIVERY',
  observed:/\b(?:warehouse|picked?|pick.?list|pick\s+ticket|fulfillment|fulfilment|packing|scann?ed)\b/i,
  outcome:/\b(?:delivered|delivery|customer.{0,30}(?:received|got|took)|buyer.{0,25}(?:received|got)|possession|reached\s+(?:the\s+)?buyer|arrived)\b/i},
 {source:'ESTIMATE_DRAFT',target:'CUSTOMER_APPROVAL',
  observed:/\b(?:estimate|proposal|quote|change\s+order)\b.{0,50}\b(?:creat(?:ed|ion)|draft(?:ed)?|prepar(?:ed|ation)|issued|submitted|exists?)\b|\b(?:creat(?:ed|ion)|draft(?:ed)?|prepar(?:ed|ation))\b.{0,40}\b(?:estimate|proposal|quote|change\s+order)\b/i,
  outcome:/\b(?:homeowner|customer|client|owner)\b.{0,45}\b(?:approv(?:ed|al)|accept(?:ed|ance)|signed?|consent|authoriz(?:ed|ation))\b/i},
 {source:'TEST_RESULT',target:'CUSTOMER_RELEASE',
  observed:/\b(?:automated\s+)?(?:tests?|checks?|build|ci)\b.{0,30}\b(?:pass(?:ed|ing)?|success(?:ful)?|green)\b/i,
  outcome:/\b(?:live\s+for\s+customers?|production|released?|deployed?|shipped?|launch(?:ed)?)\b/i},
 {source:'INVOICE_SUBMISSION',target:'MONEY_SETTLEMENT',
  observed:/\b(?:invoice|bill)\b.{0,40}\b(?:submitt?ed|sent|created?|issued?|entered|raised)\b/i,
  outcome:/\b(?:paid|payment|settle(?:d|ment)|deposited|reimburs(?:ed|ement))\b/i},
 {source:'PERSONNEL_ONBOARDING',target:'PROTECTED_ACCESS_AUTHORITY',
  observed:/\b(?:hr|human resources|onboard(?:ed|ing)|employee\s+start)\b/i,
  outcome:/\b(?:phi|hipaa|production|health\s+record|protected)\b.{0,35}\b(?:access|permission|authoriz(?:ed|ation)|granted)\b/i},
 {source:'INSPECTION_APPOINTMENT',target:'PERMIT_APPROVAL',
  observed:/\b(?:inspector|inspection|appointment)\b.{0,30}\b(?:schedul(?:ed|ing)|booked|appointment)\b/i,
  outcome:/\b(?:permit|inspection)\b.{0,35}\b(?:pass(?:ed)?|approv(?:ed|al)|sign.?off)\b/i},
 {source:'PAYMENT_AUTHORIZATION',target:'SETTLEMENT',
  observed:/\b(?:card|processor|payment)\b.{0,40}\b(?:authoriz(?:ed|ation)|hold|pre.?auth)\b/i,
  outcome:/\b(?:funds?|payment|charge)\b.{0,35}\b(?:settle(?:d|ment)|clear(?:ed|ance)|transferr?ed|captured)\b/i},
 {source:'UNATTRIBUTED_COMMUNICATION',target:'CUSTOMER_APPROVAL',
  observed:/\b(?:unsigned|anonymous|unattribut(?:ed|able)|redacted|forwarded|unverified)\b.{0,45}\b(?:screenshot|text|photo|message|email|note)\b/i,
  outcome:/\b(?:customer|client|homeowner|owner)\b.{0,45}\b(?:approv(?:ed|al)|accept(?:ed|ance)|consent|sign(?:ed|off))\b/i},
];
const connector=/\b(?:and\s+therefore|therefore|thus|hence|so|which\s+(?:confirms?|proves?|shows?|means?|establishes?|indicates?)|means?|confirms?|proves?)\b/i;
function unsupportedInferences(answer,{continuityRootId,modelResponseId,refs,currentUserSourceRef}){
 const candidates=[];
 for(const m of answer.matchAll(/[^.!?\n]{16,300}/g)){
  const text=m[0],bridge=connector.exec(text);
  if(!bridge)continue;
  const lhs=text.slice(0,bridge.index),rhs=text.slice(bridge.index+bridge[0].length);
  // A separate receipt, explicit negation or acknowledged uncertainty on
  // the outcome side prevents an unsupported success classification.
  if(!lhs.trim()||!rhs.trim()||
     /\b(?:does\s+not|do\s+not|is\s+not|cannot|can't|doesn't|isn't)\s*$/i.test(lhs)||
     /\b(?:not|never|unknown|unverified|unconfirmed|could|might|may|cannot|can't|no\s+evidence|without)\b/i.test(rhs))continue;
  const start=m.index||0;
  const intro=answer.slice(Math.max(0,start-80),start+Math.min(75,text.length));
  if(/\b(?:vendor|manager|supplier|someone|analyst|contractor|client|employee|team)\s+(?:wrote|said|says|claimed|claims|reported|reports|quoted|argued)\b/i.test(intro) ||
     /["“][^"”]{0,120}$/.test(intro.slice(-120)))continue;
  for(const transition of inferredTransitions){
   if(!transition.observed.test(lhs)||!transition.outcome.test(rhs))continue;
   candidates.push(finding({
    classification:'UNSUPPORTED_STATE_TRANSITION',left:m,answer,
    continuityRootId,modelResponseId,
    sourceRefs:refs.filter(r=>transition.observed.test(r.text)).map(r=>r.source_ref).concat([currentUserSourceRef]),
    reason:'Assistant presents an upstream event as sufficient evidence of an independently verifiable downstream operational state.',
    relation:{source_event_type:transition.source,inferred_outcome_type:transition.target,
     claim_relation:'MISSING_INDEPENDENT_TRANSITION_EVIDENCE',
     source_is_not_outcome:true,independent_evidence_required:true},
   }));
  }
 }
 return candidates;
}
const namedSubjects=[
 ['PAYER',/\b(?:payer|insurance|insurer)\b/i],
 ['STATUS',/\b(?:status|statuses)\b/i],
 ['INVOICE',/\b(?:invoice|bill)\b/i],
 ['SEND_AUTHORITY',/\b(?:send|email|permission|authoriz(?:ed|ation))\b/i],
 ['HOMEOWNER',/\b(?:homeowner|homeowners?)\b/i],
 ['CUSTOMER',/\b(?:customer|client)\b/i],
 ['PROPOSAL',/\b(?:proposal|estimate|quote|revision)\b/i],
 ['PAYMENT',/\b(?:payment|settle(?:d|ment)|paid|funds?)\b/i],
 ['CI',/\b(?:ci|tests?|build|checks?|github)\b/i],
 ['RUN',/\b(?:run|latest\s+(?:verified\s+)?status)\b/i],
 ['PERMIT',/\b(?:permit|inspection)\b/i],
 ['CLAIM',/\b(?:claim|benefit)\b/i],
 ['DELIVERY',/\b(?:delivered|delivery|shipment)\b/i],
];
function sentencesWithPositions(answer){
 const list=[];
 for(const m of answer.matchAll(/[^.!?\n;]{14,260}/g)){
  const str=m[0].trim();
  if(str)list.push({text:str,index:(m.index||0)+m[0].indexOf(str)});
 }
 return list;
}
function statusOf(text){
 // Provenance scope matters: report/quote should not become assistant truth.
 if(/\b(?:vendor|supplier|contractor|analyst|manager|someone|they)\s+(?:said|says|reports?|claims?|wrote)\b/i.test(text))return null;
 if(/\b(?:no|not|none|nobody|no\s+one|unknown|unverified|unconfirmed|cannot|can't|haven't|hasn't|not\s+a\s+single|failure|failed|not\s+established)\b/i.test(text)){
   if(/\b(?:verif(?:ied|ication)|confirm(?:ed|ation)|establish(?:ed|ment)|proven|settle(?:d|ment)|approv(?:ed|al)|authoriz(?:ed|ation)|signed\s+off|fail(?:ure|ed))\b/i.test(text))return 'NOT_ESTABLISHED';
 }
 if(/\b(?:verified|confirmed|proven|settled|approved|signed\s+off|passing|successful|success)\b/i.test(text))return 'ESTABLISHED';
 return null;
}
function subjects(text){
 const s=new Set();
 for(const [key,pattern] of namedSubjects)if(pattern.test(text))s.add(key);
 if(/\b(?:latest|same\s+latest|current)\s+(?:verified\s+)?(?:ci\s+)?(?:run|status)\b/i.test(text))
   s.add('LATEST_WORKFLOW');
 return s;
}
function generalizedStatusContradictions(answer,{continuityRootId,modelResponseId,refs,currentUserSourceRef}){
 const clauses=sentencesWithPositions(answer),out=[];
 for(let i=0;i<clauses.length;i++){
  const lhs=clauses[i],pa=statusOf(lhs.text);
  if(!pa)continue;
  const a=subjects(lhs.text);
  for(let j=i+1;j<clauses.length&&j<=i+6;j++){
   const rhs=clauses[j],pb=statusOf(rhs.text);
   if(!pb||pa===pb)continue;
   const b=subjects(rhs.text);
   const intersection=[...a].filter(x=>b.has(x));
   // 'CI verified; homeowner approval not verified' is correct;
   // both statements need to refer to a reasonably matching subject.
   if(!intersection.length||(
    /\b(?:on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|yesterday|tomorrow)\b/i.test(lhs.text+rhs.text)
    &&!/\b(?:same|still|current|latest)\b/i.test(lhs.text+rhs.text)
   ))continue;
   const left=Object.assign([lhs.text],{index:lhs.index});
   const right=Object.assign([rhs.text],{index:rhs.index});
   out.push(finding({
    classification:'EPISTEMIC_STATUS_SELF_CONTRADICTION',left,right,answer,
    continuityRootId,modelResponseId,
    sourceRefs:refs.filter(r=>intersection.some(t=>namedSubjects.some(([key,pat])=>
      key===t&&pat.test(r.text)))).map(r=>r.source_ref).concat([currentUserSourceRef]),
    reason:'Two model statements give opposing verification/outcome status for apparently the same entity or active workflow scope. Check actor, time and provenance.',
    relation:{left_status:pa,right_status:pb,shared_subjects:intersection,
      claim_relation:'POTENTIAL_SAME_SUBJECT_POLARITY_CONFLICT'},
   }));
   break;
  }
 }
 return out;
}

export function inspectEpistemicClaimRelations({
 modelAnswer='',currentUserMessage='',priorTurns=[],continuityRootId='untracked',
 modelResponseId='untracked',currentUserSourceRef='current:user',
}={}){
 if(typeof modelAnswer!=='string'||!Array.isArray(priorTurns))
  throw Error('EPISTEMIC_RELATIONS_INPUT_INVALID');
 const answer=cleanText(modelAnswer);
 const refs=sourceRefsForContext(currentUserMessage,priorTurns,currentUserSourceRef);
 const findings=[];
 const positives=[...answer.matchAll(statusAffirm)].filter(m=>speakerOwned(answer,m));
 const negatives=[...answer.matchAll(statusReject)].filter(m=>speakerOwned(answer,m));
 const pos=positives.find(m=>!negativeContext(answer.slice(Math.max(0,m.index-22),m.index)));
 const neg=negatives.find(m=>!negativeContext(answer.slice(Math.max(0,m.index-22),m.index)));
 if(pos&&neg&&Math.abs(pos.index-neg.index)>pos[0].length){
  // A bare negative later in the answer might be a clarification. A self-
  // contradiction is still a review candidate, not proof the reply is wrong.
  findings.push(finding({
   classification:'EPISTEMIC_STATUS_SELF_CONTRADICTION',left:pos,right:neg,
   reason:'Assistant affirmatively describes facts as verified, then denies verification of the same stated fact set. Compare scope and provenance before release.',
   answer,continuityRootId,modelResponseId,
   sourceRefs:refs.filter(t=>/\b(?:verif|approv|authenticat|unverif)/i.test(t.text)).map(t=>t.source_ref),
   relation:{left_status:'VERIFIED',right_status:'NOT_VERIFIED',claim_relation:'POTENTIAL_SAME_SET'},
  }));
 }
 const structural={continuityRootId,modelResponseId,refs,currentUserSourceRef};
 findings.push(...unsupportedInferences(answer,structural));
 findings.push(...generalizedStatusContradictions(answer,structural));
 const seen=new Set();
 for(const re of equivPatterns){
  for(const m of answer.matchAll(re)){
   if(!speakerOwned(answer,m))continue;
   const rhs=String(m[1]||'');
   if(negativeContext(answer.slice(Math.max(0,m.index-16),m.index))||
      negativeContext(rhs))continue;
   const phrase=m[0];
   for(const edge of eventBoundaries){
    if(!edge.sourcePattern.test(phrase)||!edge.targetPattern.test(rhs))continue;
    const key=edge.source+':'+edge.target+':'+m.index;
    if(seen.has(key))continue;
    seen.add(key);
    const related=refs.filter(r=>edge.sourcePattern.test(r.text)||
      edge.targetPattern.test(r.text)).map(r=>r.source_ref);
    findings.push(finding({
     classification:'EVENT_TYPE_COLLAPSE',left:m,answer,continuityRootId,modelResponseId,
     sourceRefs:related.length?related:[currentUserSourceRef],
     reason:'Answer equates a source event type with a distinct operational outcome. An acknowledgment/test is not by itself evidence of payment, adjudication or deployment.',
     relation:{source_event_type:edge.source,inferred_outcome_type:edge.target,
      claim_relation:'UNSUPPORTED_EQUIVALENCE',source_is_not_outcome:true},
    }));
   }
  }
 }
 return Object.freeze({
  version:EPISTEMIC_RELATIONS_VERSION,status:findings.length?'CLAIM_RELATION_REVIEW_REQUIRED':'NO_EXPLICIT_RELATION_CONFLICT_OBSERVED',
  findings:Object.freeze(findings),independently_verified_error_count:null,
  assessed_scope:'EXPLICIT_EPISTEMIC_POLARITY_AND_TYPED_EVENT_EQUIVALENCE_ONLY',
  general_semantic_accuracy_assessed:false,external_action_authorized:false,
 });
}
