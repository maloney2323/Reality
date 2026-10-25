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
function sourceRefsForContext(currentUserMessage,priorTurns){
 // These are conversation references, NOT fact attestations or permission.
 const refs=[];
 for(const t of priorTurns||[]){
  if(t?.role==='user'&&typeof t.text==='string'&&t.source_ref)
   refs.push({text:t.text,source_ref:t.source_ref});
 }
 return refs.concat([{text:String(currentUserMessage||''),source_ref:'current:user'}]);
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
  targetPattern:/\b(?:accepted\s+claim|approved\s+claim|claim\s+(?:approved|accepted|paid|adjudicated))\b/i},
]);
// Check only asserted equivalences, not co-mentions, contrasts, or questions.
const equivPatterns=[
 /\b(?:payer|edi|file|claim)\s+(?:file\s+)?acknowledg(?:e)?ment\s*\(([^)\n]{2,100})\)/gi,
 /\b(?:payer|edi|file|claim)\s+(?:file\s+)?acknowledg(?:e)?ment\s+(?:is|means|proves|confirms|guarantees|counts\s+as|equals|is\s+equivalent\s+to)\s+([^.!?\n]{2,100})/gi,
 /\b(?:ci|checks?|tests?|build)\s+(?:is\s+)?(?:green|passed|passing|successful|success)\s+(?:means|proves|confirms|guarantees|equals|is\s+equivalent\s+to)\s+([^.!?\n]{2,100})/gi,
];
export function inspectEpistemicClaimRelations({
 modelAnswer='',currentUserMessage='',priorTurns=[],continuityRootId='untracked',
 modelResponseId='untracked',currentUserSourceRef='current:user',
}={}){
 if(typeof modelAnswer!=='string'||!Array.isArray(priorTurns))
  throw Error('EPISTEMIC_RELATIONS_INPUT_INVALID');
 const answer=cleanText(modelAnswer);
 const refs=sourceRefsForContext(currentUserMessage,priorTurns);
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
